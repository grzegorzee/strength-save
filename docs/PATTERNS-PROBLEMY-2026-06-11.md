# Problemy i patterny — sesja release-prep + monetyzacja (2026-06-11)

> Log problemów z tej sesji, prób rozwiązania i wzorców do ponownego użycia.
> Bugfixy treningowe (timer/scroll/IndexedDB) opisane w DECYZJE.md cz. 4 i CLAUDE.md projektu.

---

## 1. ASC API — tworzenie i zarządzanie subskrypcjami (`scripts/asc_subscriptions.py`)

### Problem: POST /v1/subscriptionPrices → 409 ENTITY_ERROR.RELATIONSHIP.INVALID
- Pierwsza próba: relacja `territory` w payloadzie → odrzucana (terytorium WYNIKA z price pointu).
- Druga próba: bez territory → nadal 409 "An error occurred while processing the pricing information".
- **Rozwiązanie:** nowa subskrypcja NIE MA dostępności terytorialnej. Najpierw `POST /v1/subscriptionAvailabilities` (availableInNewTerritories + lista 175 territories), DOPIERO potem ceny.
- **Kolejność tworzenia produktu:** grupa → subskrypcja → lokalizacje → **availability** → ceny → intro offers → screenshot recenzji.

### Pattern: ID price pointu to base64 JSON
`eyJzIjoi...` dekoduje się do `{"s": subscriptionId, "t": "USA", "p": "10036"}` — terytorium wyciąga się z ID bez include. ID wpisu ceny (subscriptionPrices) ma inny format: `{"a":..., "c":"AE" (2-literowy!), ...}` — nie mieszać.

### Pattern: ceny globalne przez equalizację
1. Ustaw kotwicę (u nas USA) + jawne wyjątki (POL).
2. `GET /v1/subscriptionPricePoints/{usPP}/equalizations?limit=200` (UWAGA: **/v1**, nie /v2 — /v2 daje 404 "path does not match").
3. POST ceny dla każdego terytorium z equalizacji.
4. **Zmiana ceny przed publikacją** = ten sam POST z nowym price pointem; stary wpis znika, wchodzi od razu.

### Problem: rotujące 500 UNEXPECTED_ERROR przy hurtowych POST-ach
- Objaw: ~10-25 terytoriów pada, za każdym razem INNE (CYM/KNA/KWT, potem GRC/GRD/GTM) — rate limiting przebrany za 500.
- Ślepe retry całego skryptu nie zbiega.
- **Rozwiązanie:** weryfikacja stanu per terytorium (czego FAKTYCZNIE brakuje) + punktowy POST tylko braków, z `time.sleep(0.4)` między wywołaniami i backoffem przy 500. Po sprawdzeniu: braki = 0 (wszystkie "błędy" to były re-POSTy już zastosowanych zmian).

### Pattern: weryfikuj ceny po `customerPrice`, NIE po ID price pointu
Apple ma wiele price pointów o tej samej cenie klienta (różne proceeds). Porównanie ID daje fałszywe negatywy (nasz przypadek: "brakuje POL", a POL miał poprawne 14,99). Read-only check: `GET /v1/subscriptions/{id}/prices?filter[territory]=X&include=subscriptionPricePoint` → porównaj `customerPrice`.

### Problem: intro offers → 409 "You must provide a value for the relationship 'territory'"
Wbrew dokumentacyjnym sugestiom territory jest WYMAGANE. **Rozwiązanie:** pętla po wszystkich 175 terytoriach, jedna oferta na terytorium (350 POST-ów dla 2 produktów — działa).

### Problem: screenshot recenzji FAILED bez komunikatu błędu
- Objaw: upload 200, commit 200 (UPLOAD_COMPLETE), po chwili `assetDeliveryState.state = FAILED`, `sourceFileChecksum` puste, wygenerowane nowe uploadOperations.
- Przyczyna: **PNG z iPhone'a w profilu Display P3** — pipeline assetów Apple go odrzuca.
- **Rozwiązanie:** konwersja `sips -s format jpeg --matchTo '/System/Library/ColorSync/Profiles/sRGB Profile.icc'` → DELETE starego zasobu → POST/PUT/PATCH od nowa → COMPLETE w ~1-2 min.
- Flow uploadu: `POST /v1/subscriptionAppStoreReviewScreenshots` (fileName+fileSize) → PUT bajtów na `uploadOperations[0].url` z nagłówkami z odpowiedzi → `PATCH {uploaded: true, sourceFileChecksum: md5}`.

### Pattern: MISSING_METADATA blokuje sandbox
StoreKit (w tym sandbox/TestFlight) NIE zwraca produktów w stanie MISSING_METADATA. Komplet do READY_TO_SUBMIT: lokalizacje + ceny + availability + **screenshot recenzji**. Po świeżej aktywacji Paid Apps Agreement dolicz godziny propagacji.

### Drobiazgi
- Opis lokalizacji subskrypcji: **max 55 znaków** (409 TOO_LONG).
- Nazwa sekretu Firebase: auto-normalizacja do UPPER_SNAKE_CASE — defineSecret musi się zgadzać z finalną nazwą.

## 2. RevenueCat — konfiguracja przez REST API v2

- Klucz secret `sk_...` (Project settings → API keys) pozwala skonfigurować WSZYSTKO poza webhookami (endpointów webhooks/integrations brak w v2 → dashboard ręcznie).
- **Pułapka onboardingu RC:** kreator tworzy produkty w "Test Store" (`monthly`/`yearly`) i podpina je do pakietów. Pakiety $rc_monthly/$rc_annual trzymają po JEDNYM produkcie per sklep — produkty App Store (`strengthsave_pro_*`) trzeba DOPIĄĆ obok (attach), nie zastępować.
- Sekwencja: `GET /v2/projects` → `GET .../apps` (sprawdź `subscription_key_configured: true`) → `POST .../products` (store_identifier + app_id + type subscription) → `POST .../entitlements/{id}/actions/attach_products` → `GET .../offerings` → `POST .../packages/{id}/actions/attach_products` `{products: [{product_id, eligibility_criteria: "all"}]}`.
- Test webhooka: dashboard "Send test event" → event `type: TEST` → funkcja ma go zignorować (nasza loguje "bez wpływu na stan"); 401 w logach = zły Authorization header.

## 3. Build iOS / narzędzia

- **SPM "Could not resolve package dependencies: Couldn't fetch updates from remote repositories"** (po dodaniu pluginu z zależnością zdalną, u nas RevenueCat): `xcodebuild -resolvePackageDependencies -scmProvider system -project ios/App/App.xcodeproj -scheme App` (systemowy git zamiast libgit2), potem normalny build.
- **Bump wersji:** `CURRENT_PROJECT_VERSION` ma **6 wystąpień** (App ×2, StrengthWatch ×2, Widgets ×2) i wszystkie muszą być równe; `sed s/= N;/= M;/g`.
- **Kolizja build number między sesjami:** ASC zwraca `ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE` z `previousBundleVersion` — bumpnij PONAD tę wartość z aktualnego HEAD (po git pull). Jedna sesja buduje naraz.
- **Package.swift/Package.resolved po `cap sync` COMMITOWAĆ** — bez nich świeży checkout nie zbuduje apki z nowymi pluginami.
- **RTK (token saver) kompresuje JSON z curla do schematu** — gdy potrzebny surowy JSON: `rtk proxy curl ...` albo grep/cut na wyjściu.
- **Bash: cwd PERSYSTUJE między wywołaniami** — `cd functions && ...` psuje kolejne komendy (objaw: "functions/: No such file", "Missing script: firebase"). Używać ścieżek absolutnych albo wracać `cd` na końcu.
- `firebase deploy` czyta SKOMPILOWANE functions/lib — po zmianie nazwy sekretu/kodu najpierw `npm run build` w functions.

## 4. Formalności Apple (ASC Business) — ścieżka dla polskiej JDG

Kolejność wymuszona przez ASC: **zaktualizowana ADP License Agreement** (developer.apple.com; blokuje wszystko) → **Edit Legal Entity** → **DSA trader compliance** (trader=YES; dane będą publiczne na karcie apki w UE) → wiersz **Paid Apps Agreement** się pojawia → akceptacja → bank + tax.
- **Dokument "English (US)" dla name+address:** wydruk z **VIES** (ec.europa.eu/taxation_customs/vies, NIP → nazwa+adres po angielsku, Cmd+P → PDF). Ten sam PDF przechodzi jako Name i Address Identification Document. CEIDG jest po polsku — VIES omija problem.
- **Bank:** routing # = cyfry 3-10 NRB (po dwóch cyfrach kontrolnych); mBank SWIFT BREXPLPWMBK.
- **W-8BEN:** Foreign TIN = NIP; treaty benefits: Poland, **art. 8 (business profits), 0%**, radio "Income from the sale of applications"; uzasadnienie: rezydent PL bez permanent establishment w USA. Certificate of Foreign Status: Individual/Sole proprietor, Title "Owner".
- **SBP (15%):** zapis dopiero gdy Paid Apps Active; associated accounts: rola Marketing/Admin w cudzym teamie się NIE liczy (tylko Account Holder/własność).

## 5. Patterny procesowe (meta)

- **Dokument audytu ≠ stan kodu.** Przed "naprawianiem" pozycji z planu/audytu zweryfikuj każdą w kodzie i testami — u nas 7/9 pozycji było już naprawionych wcześniej; realne bugi siedziały gdzie indziej (closeout, weekly-digest).
- **Weryfikacja wizualna znajduje bugi, których asercje nie łapią:** E2E przechodził, a screenshot pokazał zera w closeout (liczone na żywo zamiast snapshotu). Po fixie: asercje na KONKRETNE liczby (28/32, 88%) + screenshot.
- **Resend SDK nie rzuca wyjątku przy odrzuceniu** — błąd w `response.error`; każdy `emails.send` musi go sprawdzić.
- **Spoofowalne pole `platform` w syncUserProfile** (security finding, ryzyko zaakceptowane): właściwy fix = Firebase App Check (App Attest), zaplanowany na tydzień 2.
- **Pętla /loop + taski + commit po każdym domkniętym etapie** — kolizje z równoległą sesją wykrywane na pull/uploadzie, nie na końcu.
