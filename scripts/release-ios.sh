#!/usr/bin/env bash
# Pelny release iOS jedna komenda: build + upload na TestFlight + auto-dystrybucja
# do testerow ZEWNETRZNYCH (podpiecie do grupy + zgloszenie na Beta App Review).
#
# Wymaga wczesniejszego BUMPU build number w ios/App/App.xcodeproj/project.pbxproj
# (CURRENT_PROJECT_VERSION, 6 wystapien, wszystkie rowne — pilnuje release-ios-preflight).
# Robert (tester zewnetrzny) dostaje build automatycznie po zatwierdzeniu przez Apple —
# bez recznych krokow w App Store Connect.
#
# Uzycie:
#   scripts/release-ios.sh "Co testowac w tym buildzie"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

# Zaladuj .env jesli istnieje (preflight wymaga VITE_REVENUECAT_APPLE_API_KEY w env;
# vite build czyta .env sam, ale procesy node/preflight juz nie).
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

WHATS_NEW="${1:-Poprawki i testy.}"
npm run preflight:ios-release
export ASC_KEY_ID="${ASC_KEY_ID:-UD43687FB9}"
export ASC_ISSUER_ID="${ASC_ISSUER_ID:-c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9}"
export ASC_KEY_PATH="${ASC_KEY_PATH:-/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8}"

if [ ! -f "$ASC_KEY_PATH" ]; then
  echo "BLAD: brak klucza App Store Connect: $ASC_KEY_PATH" >&2
  echo "Ustaw ASC_KEY_PATH na istniejacy plik .p8 (klucz API z App Store Connect)." >&2
  exit 1
fi

VER="$(grep -m1 'CURRENT_PROJECT_VERSION' ios/App/App.xcodeproj/project.pbxproj | grep -oE '[0-9]+')"
echo "==> Release iOS build ${VER}"

echo "==> [1/2] build + upload na TestFlight"
scripts/ios-testflight.sh

echo "==> [2/2] auto-dystrybucja do testerow zewnetrznych (Beta App Review)"
uv run --with pyjwt --with cryptography python scripts/testflight_external.py "${VER}" --whats-new "${WHATS_NEW}"

echo "==> Release ${VER} gotowy. Robert dostanie build po zatwierdzeniu przez Apple."
