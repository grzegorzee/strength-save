#!/usr/bin/env bash
# Pelny release iOS jedna komenda: build + upload na TestFlight + auto-dystrybucja
# do testerow ZEWNETRZNYCH (podpiecie do grupy + zgloszenie na Beta App Review).
#
# Wymaga wczesniejszego BUMPU build number w ios/App/App.xcodeproj/project.pbxproj
# (CURRENT_PROJECT_VERSION, 2 wystapienia). Robert (tester zewnetrzny) dostaje build
# automatycznie po zatwierdzeniu przez Apple — bez recznych krokow w App Store Connect.
#
# Uzycie:
#   scripts/release-ios.sh "Co testowac w tym buildzie"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

WHATS_NEW="${1:-Poprawki i testy.}"
export ASC_KEY_ID="${ASC_KEY_ID:-UD43687FB9}"
export ASC_ISSUER_ID="${ASC_ISSUER_ID:-c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9}"
export ASC_KEY_PATH="${ASC_KEY_PATH:-/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8}"

VER="$(grep -m1 'CURRENT_PROJECT_VERSION' ios/App/App.xcodeproj/project.pbxproj | grep -oE '[0-9]+')"
echo "==> Release iOS build ${VER}"

echo "==> [1/2] build + upload na TestFlight"
scripts/ios-testflight.sh

echo "==> [2/2] auto-dystrybucja do testerow zewnetrznych (Beta App Review)"
uv run --with pyjwt --with cryptography python scripts/testflight_external.py "${VER}" --whats-new "${WHATS_NEW}"

echo "==> Release ${VER} gotowy. Robert dostanie build po zatwierdzeniu przez Apple."
