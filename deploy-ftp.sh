#!/usr/bin/env bash
# Buduje aplikacje i wysyla zawartosc dist/ na hosting jestnadzieja.adwent.pl (FTP).
# Uruchamiac z katalogu Aplikacja-nowa/ w Git Bash:
#
#   bash deploy-ftp.sh              # build + wyslanie tylko zmienionych plikow
#   bash deploy-ftp.sh --all        # build + wyslanie wszystkiego (pierwszy raz, albo po zmianie hostingu)
#   bash deploy-ftp.sh --no-build   # wyslanie istniejacego dist/ bez przebudowy
#
# Dane FTP siedza POZA repozytorium (jest publiczne) w ~/.jestnadzieja-ftp:
#   FTP_HOST=s1.go3.pl
#   FTP_USER=ftp@jestnadzieja.adwent.pl
#   FTP_PASS=...
#   FTP_DIR=/public_html
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

[ -f "$CRED" ] || { echo "brak $CRED - zaloz plik z danymi FTP (opis w naglowku skryptu)" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CRED"
: "${FTP_HOST:?}" "${FTP_USER:?}" "${FTP_PASS:?}" "${FTP_DIR:?}"

if [ "$BUILD" = 1 ]; then
  echo ">> build (base = / , bez VITE_BASE)"
  unset VITE_BASE || true
  npm run build
fi

[ -d dist ] || { echo "brak dist/ - uruchom bez --no-build" >&2; exit 1; }

# .htaccess musi trafic na serwer, inaczej odswiezenie strony na trasie typu
# /pl/biblia/Gen/1 konczy sie bledem 404 (fallback SPA robi wlasnie .htaccess).
[ -f dist/.htaccess ] || { echo "UWAGA: brak dist/.htaccess - sprawdz public/.htaccess" >&2; exit 1; }

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
# Jedno wywolanie curl na paczke plikow: to samo poloczenie FTP obsluguje
# wszystkie transfery w paczce, wiec setki plikow nie oznaczaja setek logowan.
BASEURL="ftp://${FTP_HOST}${FTP_DIR%/}/"
CFG="$TMP/curl.cfg"
# curl.exe to program natywny Windows, a MSYS2_ARG_CONV_EXCL wyzej wylacza
# tlumaczenie sciezek MSYS -> Windows. Bez cygpath curl dostaje doslowne
# '/tmp/...' i konczy sie bledem "cannot read config from".
if command -v cygpath >/dev/null 2>&1; then CFG_ARG="$(cygpath -m "$CFG")"; else CFG_ARG="$CFG"; fi
CHUNK=80
TOTAL=$(wc -l < "$TMP/todo.txt")
DONE=0

split -l "$CHUNK" -d "$TMP/todo.txt" "$TMP/part."
for part in "$TMP"/part.*; do
  {
    printf 'user = "%s:%s"\n' "$FTP_USER" "$FTP_PASS"
    printf 'ftp-create-dirs\n--fail\n--silent\n--show-error\n'
    while IFS= read -r f; do
      printf 'url = "%s%s"\n' "$BASEURL" "$f"
      printf 'upload-file = "dist/%s"\n' "$f"
    done < "$part"
  } > "$CFG"
  curl -K "$CFG_ARG"
  DONE=$((DONE + $(wc -l < "$part")))
  echo "   wyslano $DONE / $TOTAL"
done

cp "$TMP/manifest.txt" "$STATE"
echo ">> gotowe -> https://jestnadzieja.adwent.pl/"
