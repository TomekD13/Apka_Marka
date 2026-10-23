#!/usr/bin/env bash
# Buduje aplikacje i wysyla zawartosc dist/ na hosting jestnadzieja.adwent.pl (SFTP).
# Uruchamiac z katalogu Aplikacja-nowa/ w Git Bash:
#
#   bash deploy-ftp.sh              # build + wyslanie tylko zmienionych plikow
#   bash deploy-ftp.sh --all        # build + wyslanie wszystkiego (pierwszy raz, albo po zmianie hostingu)
#   bash deploy-ftp.sh --no-build   # wyslanie istniejacego dist/ bez przebudowy
#
# Dane siedza POZA repozytorium (jest publiczne) w ~/.jestnadzieja-ftp:
#   SFTP_HOST=s1.go3.pl
#   SFTP_PORT=22
#   SFTP_USER=adwentjestnadzieja
#   SFTP_KEY=$HOME/.ssh/jestnadzieja_sftp   (klucz prywatny, logowanie bez hasla)
#   SFTP_DIR=public_html
# Od 2026-10-14 hosting wylaczyl zwykle FTP (konto ftp@jestnadzieja.adwent.pl dostaje 530),
# zostal tylko SFTP na porcie 10022. Stare zmienne FTP_* skrypt juz pomija.
# Od 2026-10-23 hosting przejelo LH.pl (ten sam adres s1.go3.pl, nowe klucze serwera):
# SFTP na domyslnym porcie 22, porty 10022 i 40022 sa zamkniete.
#
# GitHub Pages publikuje osobny skrypt deploy.sh (tam build idzie z VITE_BASE=/aplikacja/).
# Tutaj subdomena serwuje z korzenia, wiec build leci bez VITE_BASE (base = '/').
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

CRED="$HOME/.jestnadzieja-ftp"
STATE="$HOME/.jestnadzieja-ftp-state"   # manifest ostatniej wysylki (md5 + sciezka), poza repo
BUILD=1
ALL=0

for a in "$@"; do
  case "$a" in
    --all) ALL=1 ;;
    --no-build) BUILD=0 ;;
    *) echo "nieznany argument: $a" >&2; exit 2 ;;
  esac
done

[ -f "$CRED" ] || { echo "brak $CRED - zaloz plik z danymi SFTP (opis w naglowku skryptu)" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CRED"
: "${SFTP_HOST:?}" "${SFTP_PORT:?}" "${SFTP_USER:?}" "${SFTP_KEY:?}" "${SFTP_DIR:?}"

if [ "$BUILD" = 1 ]; then
  echo ">> build (base = / , bez VITE_BASE)"
  unset VITE_BASE || true
  npm run build
fi

[ -d dist ] || { echo "brak dist/ - uruchom bez --no-build" >&2; exit 1; }

# Lokalna baza statystyk nie moze trafic na hosting, takze przy --no-build
# przerwij wdrozenie, jesli ktos recznie skopiowal ja do dist/.
if find dist/stat -maxdepth 1 -type f -name 'dane*.sqlite*' -print -quit 2>/dev/null | grep -q .; then
  echo "BLAD: dist/stat zawiera lokalna baze SQLite (dane*.sqlite*); wdrozenie przerwane." >&2
  exit 1
fi

# .htaccess musi trafic na serwer, inaczej odswiezenie strony na trasie typu
# /pl/biblia/Gen/1 konczy sie bledem 404 (fallback SPA robi wlasnie .htaccess).
[ -f dist/.htaccess ] || { echo "UWAGA: brak dist/.htaccess - sprawdz public/.htaccess" >&2; exit 1; }
# dist/ jest wspolny z deploy-beta.sh, ktory buduje z baza /beta/. Wyslanie takiego builda
# do korzenia zostawia strone bez aplikacji (index.html wola /beta/assets/, .htaccess
# przepisuje trasy na /beta/index.html i dodaje noindex) - zdarzylo sie 2026-09-21.
if grep -q '="/[a-z]*/assets/' dist/index.html; then
  echo "dist/ jest zbudowany z podkatalogiem w bazie ($(grep -o '="/[a-z]*/assets/' dist/index.html | head -1)) - to nie jest build korzenia. Uruchom bez --no-build." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- co wyslac -------------------------------------------------------------
( cd dist && find . -type f -printf '%P\n' | sort ) > "$TMP/files.txt"
( cd dist && while IFS= read -r f; do printf '%s  %s\n' "$(md5sum "$f" | cut -d' ' -f1)" "$f"; done < "$TMP/files.txt" ) > "$TMP/manifest.txt"

if [ "$ALL" = 1 ] || [ ! -f "$STATE" ]; then
  cut -d' ' -f3- "$TMP/manifest.txt" > "$TMP/todo.txt"
  echo ">> wysylka pelna ($(wc -l < "$TMP/todo.txt") plikow)"
else
  # tylko pliki o zmienionej sumie kontrolnej (lub nowe)
  comm -13 <(sort "$STATE") <(sort "$TMP/manifest.txt") | cut -d' ' -f3- | sort -u > "$TMP/todo.txt"
  echo ">> wysylka roznicowa ($(wc -l < "$TMP/todo.txt") z $(wc -l < "$TMP/files.txt") plikow)"
  # pliki, ktore zniknely z builda - do rozwazenia recznie, skrypt nic nie usuwa
  comm -23 <(cut -d' ' -f3- "$STATE" | sort) <(cut -d' ' -f3- "$TMP/manifest.txt" | sort) > "$TMP/gone.txt" || true
  if [ -s "$TMP/gone.txt" ]; then
    echo ">> na serwerze zostaja pliki, ktorych nie ma w nowym buildzie ($(wc -l < "$TMP/gone.txt")):"
    sed 's/^/     /' "$TMP/gone.txt"
    echo "   (skrypt nic nie usuwa - jesli maja zniknac, usun je w FileZilli)"
  fi
fi

if [ ! -s "$TMP/todo.txt" ]; then
  echo ">> nic sie nie zmienilo, koniec"
  exit 0
fi

# --- wysylka ---------------------------------------------------------------
# Jedna sesja sftp na wszystkie pliki: najpierw katalogi (z "-", zeby istniejace
# nie przerywaly wsadu), potem put kazdego pliku. Bez "-" przy put: pierwszy
# blad konczy sftp kodem != 0 i manifest nie zostaje zapisany.
BATCH="$TMP/sftp.batch"
TOTAL=$(wc -l < "$TMP/todo.txt")
{
  printf 'cd "%s"\n' "$SFTP_DIR"
  # wszystkie poziomy katalogow, od najplytszych
  while IFS= read -r f; do
    d="$(dirname "$f")"
    while [ "$d" != "." ]; do echo "$d"; d="$(dirname "$d")"; done
  done < "$TMP/todo.txt" | sort -u | awk -F/ '{print NF "\t" $0}' | sort -n | cut -f2- \
    | while IFS= read -r d; do printf -- '-mkdir "%s"\n' "$d"; done
  while IFS= read -r f; do
    printf 'put "dist/%s" "%s"\n' "$f" "$f"
  done < "$TMP/todo.txt"
} > "$BATCH"

if command -v cygpath >/dev/null 2>&1; then BATCH_ARG="$(cygpath -m "$BATCH")"; else BATCH_ARG="$BATCH"; fi
echo ">> sftp ${SFTP_USER}@${SFTP_HOST}:${SFTP_PORT}/${SFTP_DIR} ($TOTAL plikow)"
sftp -q -b "$BATCH_ARG" -i "$SFTP_KEY" -P "$SFTP_PORT" \
  -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new \
  "${SFTP_USER}@${SFTP_HOST}" > "$TMP/sftp.log" 2>&1 || {
    echo "BLAD sftp - manifest NIE zapisany, ponowne uruchomienie wysle wszystko jeszcze raz:" >&2
    grep -vE '^sftp> (put|-mkdir|cd)' "$TMP/sftp.log" | tail -20 >&2
    exit 1
  }
echo "   wyslano $TOTAL / $TOTAL"

cp "$TMP/manifest.txt" "$STATE"
echo ">> gotowe -> https://jestnadzieja.adwent.pl/"
