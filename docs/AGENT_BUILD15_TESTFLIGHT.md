# Zadanie: build 15 z nowym logo → TestFlight → review dla Roberta

> ⚠️ URUCHOM LOKALNIE na Macu (wymaga Xcode + lokalny klucz `.p8`). NIE w chmurze/remote — build iOS i tak nie zadziała bez macOS/Xcode.

## Cel
Zbudować iOS build **15** (wersja 0.0.1) z **nowym logo** (już zacommitowane, `91db013`), wgrać do TestFlight, podpiąć do grupy zewnętrznej i wysłać na Beta App Review, żeby tester **Robert** dostał najnowszą wersję. Build 14 (poprzedni, ze starym logo, obecnie `WAITING_FOR_REVIEW`) porzucamy.

## Kontekst / stałe

- Katalog: `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`
- Bundle: `com.grzegorzjasionowicz.strengthsave`, rekord apki ASC: **6777446137**
- App Store Connect API key (Admin):
  - `ASC_KEY_ID=UD43687FB9`
  - `ASC_ISSUER_ID=c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9`
  - `ASC_KEY_PATH=/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8`
  - (te same dane w `/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/appstore-connect.env`)
- Build number: `CURRENT_PROJECT_VERSION = 15` już ustawione w `ios/App/App.xcodeproj/project.pbxproj` (ostatni na TestFlight to 14 → 15 jest wolne). MARKETING_VERSION `0.0.1`.
- Nowe logo jest w `ios/App/App/Assets.xcassets/` (AppIcon + Splash) — `build:mobile` i `cap sync` ich NIE nadpisują (to natywne assety, nie webdir).

### Dane Roberta (tester)
- Email: `robertzapala@icloud.com`, imię/nazwisko: **Robert Zapala**
- Tester ID (ASC): `474bf8a1-52fc-4144-8c3d-9671a01fb680`
- **Już jest** w grupie zewnętrznej (nie dodawać ponownie).

### Grupy beta (ASC)
- External **"Testerzy zewnętrzni"**: `4ad8388a-a717-42a6-b7a7-7aeb737d29e8` ← Robert tu jest, build 15 podpiąć TUTAJ
- Internal **"Wewnętrzni"**: `48daa230-813f-4bcc-8158-cc12e69d354c` (opcjonalnie też podpiąć — dla siebie)

## Kroki

### 1. Pre-check
```bash
cd /Users/grzegorzjasionowicz/FIRMA/projekty/strength_save
git log --oneline -3          # potwierdź że 91db013 (nowe logo) jest w historii
grep -n CURRENT_PROJECT_VERSION ios/App/App.xcodeproj/project.pbxproj   # ma być 15
```
Jeśli build number ≤ 14 — podbij oba wystąpienia na 15.
(Inne niezacommitowane zmiany w `src/` — praca nad kg/lbs — zostaw, nie dotykaj.)

### 2. Build + upload do TestFlight
```bash
ASC_KEY_ID=UD43687FB9 \
ASC_ISSUER_ID=c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9 \
ASC_KEY_PATH=/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8 \
  ./scripts/ios-testflight.sh
```
Skrypt robi: `npm run build:mobile` (base `./`, KONIECZNE — web build daje biały ekran na iOS) → `cap sync ios` → archive `CODE_SIGNING_ALLOWED=NO` → export manual signing (`ios/ExportOptions-manual.plist`, cert Distribution + profil "Strength Save App Store" już istnieją) → `altool --upload-app`.

**Pułapki (z poprzednich buildów):**
- Używaj `./node_modules/.bin/cap`, NIE `npx cap` (RTK hook psuje `npx`).
- Jeśli signing padnie (brak cert/profilu w keychain) — odtwórz przez `python3 scripts/ios_signing.py` (tworzy cert Distribution + App Store profil + import do keychain + ExportOptions-manual). p12 z openssl 3 wymaga `-legacy`.
- Po `cap sync` zweryfikuj `grep 'src="' ios/App/App/public/index.html` → musi być `./assets/...`, NIE `/strength-save/assets/...`.

### 3. Poczekaj aż build 15 będzie VALID
Processing po uploadzie trwa kilka–kilkanaście minut. Poll przez API (JWT ES256, patrz wzór niżej):
```
GET /v1/builds?filter[app]=6777446137&sort=-version&limit=3
```
Czekaj aż build z `version: "15"` ma `processingState: VALID`. Dopiero wtedy krok 4.

### 4. Podepnij build 15 do grupy "Testerzy zewnętrzni"
```
POST /v1/betaGroups/4ad8388a-a717-42a6-b7a7-7aeb737d29e8/relationships/builds
body: {"data":[{"type":"builds","id":"<ID_BUILDA_15>"}]}
```
(opcjonalnie to samo dla internal `48daa230-...`)

### 5. "What to Test" + wyślij na Beta App Review
Pobierz `GET /v1/builds/<ID_15>/betaBuildLocalizations`, dla locale en-US zrób
`PATCH /v1/betaBuildLocalizations/<locId>` z `{"data":{"type":"betaBuildLocalizations","id":"<locId>","attributes":{"whatsNew":"New app logo + general testing."}}}`.
Potem:
```
POST /v1/betaAppReviewSubmissions
body: {"data":{"type":"betaAppReviewSubmissions","relationships":{"build":{"data":{"type":"builds","id":"<ID_15>"}}}}}
```
(betaAppReviewDetail: kontakt + demo account john791751@gmail.com — już wypełnione, nie ruszaj.)

### 6. Weryfikacja
`GET /v1/builds/<ID_15>/betaAppReviewSubmission` → `betaReviewState: WAITING_FOR_REVIEW`. Gotowe — po zatwierdzeniu Apple Robert dostanie mail z najnowszą wersją (build 15, nowe logo).

## Wzór JWT (Python, uv) — do wszystkich wywołań API
```bash
uv run --with pyjwt --with cryptography python - <<'PY'
import time, jwt, json, urllib.request
KEY_ID="UD43687FB9"; ISSUER="c7dc0c6f-bae0-43ee-a96c-fbb0eabab7b9"
KEY="/Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/AuthKey_UD43687FB9.p8"
t=jwt.encode({"iss":ISSUER,"iat":int(time.time()),"exp":int(time.time())+1200,"aud":"appstoreconnect-v1"},
             open(KEY).read(), algorithm="ES256", headers={"kid":KEY_ID,"typ":"JWT"})
# req = urllib.request.Request("https://api.appstoreconnect.apple.com"+PATH, headers={"Authorization":"Bearer "+t}, ...)
print(t)
PY
```

## Po zakończeniu
- Zacommituj bump build number jeśli zmieniałeś (`chore(ios): build 15 — nowe logo`).
- NIE pushuj/deployuj weba bez polecenia użytkownika.
- Build 14 zostaw — zostanie zignorowany (Robert dostanie 15). Można go ewentualnie expire w TestFlight, ale niewymagane.
