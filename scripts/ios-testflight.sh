#!/usr/bin/env bash
# Build + archive + upload Strength Save do TestFlight (bez Xcode GUI, bez fastlane).
# Signing zarządzany automatycznie przez App Store Connect API key.
#
# Wymagane zmienne środowiskowe:
#   ASC_KEY_ID     — Key ID klucza App Store Connect API
#   ASC_ISSUER_ID  — Issuer ID
#   ASC_KEY_PATH   — ścieżka do pliku AuthKey_XXXXX.p8
#
# Użycie:
#   ASC_KEY_ID=ABC123 ASC_ISSUER_ID=xxxx-... ASC_KEY_PATH=~/.../AuthKey_ABC123.p8 \
#     scripts/ios-testflight.sh
#
# Wymaga wcześniej istniejącego rekordu apki w App Store Connect
# (Bundle com.grzegorzjasionowicz.strengthsave).

set -euo pipefail

: "${ASC_KEY_ID:?ustaw ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?ustaw ASC_ISSUER_ID}"
: "${ASC_KEY_PATH:?ustaw ASC_KEY_PATH (sciezka do .p8)}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJ="ios/App/App.xcodeproj"
SCHEME="App"
BUILD_DIR="build/ios"
ARCHIVE="$BUILD_DIR/StrengthSave.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
OPTS="ios/ExportOptions.plist"

# altool szuka klucza w ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
KEY_STORE="$HOME/.appstoreconnect/private_keys"
mkdir -p "$KEY_STORE"
cp "$ASC_KEY_PATH" "$KEY_STORE/AuthKey_${ASC_KEY_ID}.p8"

echo "==> 1/5 web build (mobile base ./)"
npm run build:mobile

# Bramka po incydencie Z85 (biały ekran build 50): bundle musi realnie wystartować
# w przeglądarce, nie tylko się zbudować.
echo "==> 1.5/5 smoke test dist"
npm run check:dist-smoke

echo "==> 2/5 cap sync ios"
./node_modules/.bin/cap sync ios

# Archive BEZ podpisu — podpis Distribution (App Store) zakładamy przy eksporcie.
# Development signing wymagałby zarejestrowanego urządzenia; Distribution nie.
echo "==> 3/5 archive (bez podpisu)"
rm -rf "$ARCHIVE"
xcodebuild -project "$PROJ" -scheme "$SCHEME" -configuration Release \
  -archivePath "$ARCHIVE" -destination 'generic/platform=iOS' archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO

# Export z manual signing (cert + profil utworzone wcześniej przez ios_signing.py).
# Fallback do automatic ExportOptions jeśli manual nie istnieje.
MANUAL_OPTS="ios/ExportOptions-manual.plist"
[ -f "$MANUAL_OPTS" ] && OPTS="$MANUAL_OPTS"
echo "==> 4/5 export IPA ($OPTS)"
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" -exportOptionsPlist "$OPTS"

IPA="$(ls "$EXPORT_DIR"/*.ipa | head -1)"
echo "==> 5/5 upload do TestFlight: $IPA"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Gotowe. Build pojawi się w App Store Connect → TestFlight po przetworzeniu (kilka-kilkanaście min)."
