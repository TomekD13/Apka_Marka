#!/usr/bin/env bash
# Wydanie TESTOWE: buduje aplikacje z baza /beta/ i wysyla ja na
# https://jestnadzieja.adwent.pl/beta/ (FTP, katalog <FTP_DIR>/beta).
# Glownej strony nie dotyka. Uruchamiac w Git Bash z katalogu repozytorium:
#
#   bash deploy-beta.sh              # build + wyslanie tylko zmienionych plikow
#   bash deploy-beta.sh --all        # build + wyslanie wszystkiego
#   bash deploy-beta.sh --no-build   # wyslanie istniejacego dist/ bez przebudowy
#
# Dane FTP jak w deploy-ftp.sh: ~/.jestnadzieja-ftp (poza repozytorium).
# Manifest ostatniej wysylki bety: ~/.jestnadzieja-ftp-state-beta.
#
# UWAGA: service worker glownej strony przechwytuje nawigacje w calej domenie.
# Dopoki glowna strona nie zostanie wydana z wyjatkiem /beta/ (vite.config.ts),
# osoba, ktora ma ja juz otwarta, zobaczy bete dopiero po twardym odswiezeniu
# (Ctrl+Shift+R) albo w oknie prywatnym.
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

SUB="beta"
CRED="$HOME/.jestnadzieja-ftp"
STATE="$HOME/.jestnadzieja-ftp-state-$SUB"
BUILD=1
ALL=0

for a in "$@"; do
  case "$a" in
    --all) ALL=1 ;;
    --no-build) BUILD=0 ;;
    *) echo "nieznany argument: $a" >&2; exit 2 ;;
  esac
done

[ -f "$CRED" ] || { echo "brak $CRED - zaloz plik z danymi FTP (opis w deploy-ftp.sh)" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CRED"
: "${FTP_HOST:?}" "${FTP_USER:?}" "${FTP_PASS:?}" "${FTP_DIR:?}"

if [ "$BUILD" = 1 ]; then
  echo ">> build (base = /$SUB/)"
  VITE_BASE="/$SUB/" npm run build
fi
[ -d dist ] || { echo "brak dist/ - uruchom bez --no-build" >&2; exit 1; }
grep -q "=\"/$SUB/assets/" dist/index.html || { echo "dist/ nie jest zbudowany z baza /$SUB/ - uruchom bez --no-build" >&2; exit 1; }

# .htaccess podkatalogu zastepuje reguly z korzenia, wiec fallback SPA i przekierowanie
# na https musza wskazywac /beta/. Do tego zakaz indeksowania - to wersja robocza.
[ -f dist/.htaccess ] || { echo "UWAGA: brak dist/.htaccess - sprawdz public/.htaccess" >&2; exit 1; }
sed -i -e "s#RewriteRule \. /index\.html \[L\]#RewriteRule . /$SUB/index.html [L]#" \
       -e "s#https://%{HTTP_HOST}/\$1#https://%{HTTP_HOST}/$SUB/\$1#" dist/.htaccess
grep -q "/$SUB/index.html" dist/.htaccess || { echo "nie udalo sie przestawic fallbacku w dist/.htaccess" >&2; exit 1; }
printf '\n<IfModule mod_headers.c>\n  Header set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n' >> dist/.htaccess
# panel statystyk zyje tylko w korzeniu
rm -rf dist/stat

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

( cd dist && find . -type f -printf '%P\n' | sort ) > "$TMP/files.txt"
( cd dist && while IFS= read -r f; do printf '%s  %s\n' "$(md5sum "$f" | cut -d' ' -f1)" "$f"; done < "$TMP/files.txt" ) > "$TMP/manifest.txt"

if [ "$ALL" = 1 ] || [ ! -f "$STATE" ]; then
  cut -d' ' -f3- "$TMP/manifest.txt" > "$TMP/todo.txt"
  echo ">> wysylka pelna ($(wc -l < "$TMP/todo.txt") plikow)"
else
  comm -13 <(sort "$STATE") <(sort "$TMP/manifest.txt") | cut -d' ' -f3- | sort -u > "$TMP/todo.txt"
  echo ">> wysylka roznicowa ($(wc -l < "$TMP/todo.txt") z $(wc -l < "$TMP/files.txt") plikow)"
fi

if [ ! -s "$TMP/todo.txt" ]; then
  echo ">> nic sie nie zmienilo, koniec"
  exit 0
fi

BASEURL="ftp://${FTP_HOST}${FTP_DIR%/}/$SUB/"
CFG="$TMP/curl.cfg"
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
echo ">> gotowe -> https://jestnadzieja.adwent.pl/$SUB/"
