# WP-D: Pomiary ciała — zdjęcia dla wszystkich, wpis tylko-zdjęcie, kadrowanie, przypomnienie po miesiącu

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj najpierw `00-OVERVIEW.md`.

**Goal:** (1) zdjęcia sylwetki + porównanie before/after dostępne dla KAŻDEGO usera (nie za flagą admina); (2) zdjęcie można dodać NIEZALEŻNIE od pomiarów (wpis tylko-zdjęcie); (3) kadrowanie zdjęcia przed uploadem; (4) po miesiącu treningu przypomnienie "dodaj fotkę i zrób before/after" (push + dzwonek in-app), maksymalnie raz.

**Architecture:** cała infrastruktura JUŻ ISTNIEJE (T13a/b): `Measurements.tsx`, `MeasurementsForm.tsx`, `BodyPhotoCompare.tsx`, Storage `body-photos/{uid}/`, kompresja `image-compress.ts`. Zmiany: flaga domyślnie ON, poluzowanie walidacji "co najmniej jedno pole" na "co najmniej jedno pole LUB zdjęcie", krok kadrowania (react-easy-crop, czysty JS — bez cap sync), nowa scheduled function wzorem `reduced-mode-push.ts`.

**Tech stack:** React + TS, react-easy-crop (NOWA zależność — jedyna dozwolona w tym pakiecie), Firebase Functions v2, vitest.

**Spec / kontekst (ustalone rozpoznaniem):**
- Gate: `canUseBodyPhotos` w `src/contexts/UserContext.tsx:215` = `hasAppAccess && (profile.features.bodyPhotos ?? role === 'admin')`. Admin toggle: `src/pages/admin/admin-user-types.ts:15`.
- Formularz: `src/components/MeasurementsForm.tsx` — submit `:61-89`, sekcja foto `:147-184` (ukryty `<input type="file" accept="image/*">` — WKWebView pokazuje natywny sheet Camera/Library; ŚWIADOMIE bez plugina Capacitor — zostaje tak).
- Upload: `Measurements.tsx:51-73` (`handleSave`), kompresja `src/lib/image-compress.ts` (canvas, max 1280 px, JPEG q=0.8, HEIC→JPEG).
- Model: `BodyMeasurement` `src/types/index.ts:87-107`; kolekcja `measurements`, pola `photoUrl` (≤1000) + `photoPath` (≤300). Rules: `validMeasurementShape()` `firestore.rules:148-169`, blok `:172-183` (zamknięty `hasOnly`).
- Walidacja: `src/lib/measurement-validation.ts` (`validateMeasurement`, `MEASUREMENT_LIMITS`).
- Porównanie: `BodyPhotoCompare.tsx` renderowane w `Measurements.tsx:158-160`.
- Wzorzec przypomnienia "N dni po X": `functions/src/reduced-mode-push.ts` — daily `onSchedule`, query `where(pole, '==', todayDate)`, DI-testowalne deps (`:17-28`), teksty PL/EN (`:30-49`), cleanup martwych tokenów. Dzwonek in-app: `src/lib/user-events.ts` (`emitUserEvent:70`, deterministyczne id `${userId}-${key}`, typy `'pr'|'badge'|'week'|'plan'|'announcement'`).
- Eksport funkcji: barrel `functions/src/index.ts` (dopisz eksport przy istniejących z registration/weekly-digest — patrz `:46-101`).

**Files:**
- Modify: `src/contexts/UserContext.tsx` (:215), `src/components/MeasurementsForm.tsx`, `src/pages/Measurements.tsx`, `src/lib/measurement-validation.ts`, `firestore.rules` (TYLKO blok measurements :148-183 — anchor `validMeasurementShape`), `package.json` (react-easy-crop), `functions/src/index.ts` (eksport)
- Create: `src/components/PhotoCropDialog.tsx`, `functions/src/photo-reminder.ts`
- Test: `src/test/measurement-validation.test.ts` (rozszerz/utwórz), `src/test/measurements-photo-only.test.tsx` (nowy), `functions` test dla photo-reminder (wzorem testów reduced-mode-push — znajdź po nazwie), `src/test/photo-crop.test.tsx` (nowy)
- i18n: anchor `measurements.*`

**Interfaces:**
- Produces: `PhotoCropDialog` props: `{ open: boolean; file: File | null; onCancel(): void; onCropped(blob: Blob): void; aspect?: number }` — dialog na istniejącym prymitywie `Dialog` (ma X), aspect domyślnie 3/4 (portret sylwetki). Wynik przechodzi przez istniejące `compressImage` przed uploadem.

## Edge cases

1. Wpis tylko-zdjęcie: `date` + `photoUrl`/`photoPath`, ZERO pól liczbowych — walidacja przepuszcza, rules przepuszczają (sprawdź czy `validMeasurementShape` nie wymaga pól liczbowych; jeśli wymaga min. jednego, poszerz warunek o "albo photoUrl"), wykresy NIE dostają pustych punktów (buildMeasurementSeries musi ignorować wpisy bez danego pola — sprawdź, prawdopodobnie już tak jest).
2. Kadrowanie na HEIC z iPhone'a: plik najpierw przez `compressImage` normalizację czy crop przed kompresją? Kolejność: crop na oryginale (createImageBitmap radzi sobie z HEIC w WKWebView? — NIE zakładaj: podawaj do croppera dataURL wygenerowany przez istniejącą ścieżkę normalizacji z image-compress; jeśli image-compress nie wystawia osobno normalizacji, dodaj tam export `normalizeToJpegDataUrl(file)` i użyj go).
3. Anulowanie cropa = powrót do formularza bez zdjęcia (stan czyszczony).
4. Przypomnienie: warunki wysyłki — user ma ≥1 trening ukończony ≥30 dni temu ORAZ zero zdjęć w `measurements` ORAZ nie dostał jeszcze tego przypomnienia. Znacznik wysyłki: `users/{uid}.photoReminderSentAt` (ISO) — pole na dokumencie usera wymaga sprawdzenia rules (users doc ma zamknięty schemat? — funkcja pisze przez admin SDK, rules nie obowiązują; ale mapper `mapAppUserProfile` — lekcja build 88: NOWE POLE DOKUMENTU = sprawdź mapper; pole czytane tylko przez backend, więc mapper może je pominąć świadomie — odnotuj).
5. Reminder wysyłany o stałej godzinie (np. 10:00 Europe/Warsaw), scheduled function daily; brak tokenów push → tylko dzwonek in-app (`emitUserEvent` typ `'announcement'`, key `photo-reminder`, deterministyczne id gwarantuje raz).
6. Użytkownik z wyłączonymi pushami (`notificationPrefs`) — respektuj istniejący wzorzec eligibility z reduced-mode-push (jeśli tam pref nie jest sprawdzany, nie dodawaj nowego prefa — użyj `dailyReminder` jako zgody zbiorczej na przypomnienia treningowe i odnotuj w raporcie).
7. Before/after "w dowolnym momencie": sekcja porównania widoczna gdy ≥2 zdjęcia; gdy 1 zdjęcie — pokaż zachętę "dodaj drugie, aby porównać" (nowy klucz i18n), gdy 0 — CTA dodania pierwszego.

## Tasks

### Task D1: zdjęcia dla wszystkich (flaga domyślnie ON)

- [ ] Test: w `src/test/` znajdź test pokrywający `canUseBodyPhotos` (grep); dodaj przypadek: zwykły user (role 'user', bez `features.bodyPhotos`) z `hasAppAccess` → true; user z jawnym `features.bodyPhotos === false` → false (admin może wyłączyć). Run → FAIL.
- [ ] Implementacja `UserContext.tsx:215`: `hasAppAccess && (profile.features.bodyPhotos ?? true)`. Run → PASS.

### Task D2: wpis tylko-zdjęcie (walidacja + rules)

- [ ] Test w `src/test/measurement-validation.test.ts`: pomiar z samym `photoUrl`+`photoPath`+`date` przechodzi `validateMeasurement`; pomiar bez niczego — odrzucony. Run → FAIL (jeśli walidacja dziś wymaga pola liczbowego).
- [ ] Implementacja w `measurement-validation.ts`: warunek "≥1 pole liczbowe LUB zdjęcie".
- [ ] `firestore.rules` blok measurements (:148-183): upewnij się, że photo-only przechodzi. Jeśli zmieniasz rules — uruchom `npm run test:rules` (wymaga JDK21 z homebrew: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` lub odpowiednik — patrz istniejące skrypty).
- [ ] UI: w `MeasurementsForm.tsx` submit nie blokuje zapisu bez pól liczbowych, gdy jest zdjęcie; przycisk "Dodaj zdjęcie" dostępny bez wypełniania pól. W `Measurements.tsx` wpis photo-only renderuje się w historii (miniatura + data, bez pustych metryk).
- [ ] Test `src/test/measurements-photo-only.test.tsx`: render formularza, wybór pliku (mock File), zapis bez pól → `addMeasurement` wywołane z photo, bez NaN. Run → PASS.

### Task D3: kadrowanie (react-easy-crop)

- [ ] `npm i react-easy-crop` (dokładnie ta paczka; czysty JS, bez cap sync).
- [ ] Nowy `src/components/PhotoCropDialog.tsx` wg Interfaces: `Dialog` + `Cropper` (aspect 3/4, zoom pinch/scroll), przycisk "Użyj zdjęcia" → canvas crop → `onCropped(blob)`. Obsłuż `getCroppedImg` przez własny mały util w tym samym pliku (canvas drawImage z pixelCrop).
- [ ] Wpięcie: `MeasurementsForm.tsx` — po wyborze pliku najpierw `PhotoCropDialog`, wynik (blob→File) idzie w dotychczasową ścieżkę `compressImage`→upload. Avatar w Profile.tsx NIE ruszany (poza zakresem).
- [ ] Test `src/test/photo-crop.test.tsx`: dialog otwiera się po wyborze pliku; anulowanie czyści wybór; potwierdzenie woła `onCropped` z blobem. (Canvas w jsdom: zamockuj `HTMLCanvasElement.prototype.getContext`/`toBlob` — wzorce mocków canvas są w testach image-compress, grep `toBlob`.)
- [ ] Run → PASS. `npm run check:bundle-budget` → zielone (react-easy-crop ~10 kB gz; jeśli budżet pęka, lazy-load dialogu przez `React.lazy`).

### Task D4: przypomnienie po miesiącu (backend, TDD wzorem reduced-mode-push)

- [ ] Nowy `functions/src/photo-reminder.ts`: DI-testowalny rdzeń `runPhotoReminder(deps, texts)` + `photoReminder = onSchedule("every day 10:00", ...)` (timeZone Europe/Warsaw, wzorem `reduced-mode-push.ts:124`). Logika: users z `firstWorkoutAt <= today-30d` — jeśli takie pole nie istnieje, wyznacz przez query pierwszego workoutu (orderBy date asc limit 1) per kandydat; kandydaci = users bez `photoReminderSentAt`, z `status=='active'`; sprawdź brak zdjęć: query `measurements` where userId==uid, photoUrl != null, limit 1 (jeśli Firestore wymaga indeksu dla nierówności — użyj prostszego: pobierz limit 20 pomiarów usera i sprawdź w pamięci; ZERO composite indeksów w scheduled fn — lekcja X12). Wysyłka: push (teksty PL/EN wg języka usera jak w reduced-mode-push) + `user_events` doc (admin SDK, kształt zgodny z `src/lib/user-events.ts` — typ `'announcement'`, key `photo-reminder`) + zapis `photoReminderSentAt`.
- [ ] Teksty: PL tytuł "Miesiąc treningów za Tobą" body "Dodaj zdjęcie sylwetki i zobacz swoje before/after w Pomiarach." / EN "One month of training done" / "Add a progress photo and see your before/after in Measurements.".
- [ ] Test (wzorem testu reduced-mode-push — znajdź plik po grep `runReducedModeEndingPush`): user kwalifikujący się dostaje push + event + znacznik; user ze zdjęciem — nie; user z znacznikiem — nie; user z pierwszym treningiem 20 dni temu — nie.
- [ ] Eksport w `functions/src/index.ts` (dopisz linię przy istniejących eksportach barrela, np. po `dailyTrainingReminder`).
- [ ] Build functions + testy functions → zielone.

### Task D5: before/after zachęty + niezależny przycisk "Dodaj zdjęcie"

- [ ] Na `Measurements.tsx`: osobny przycisk "Dodaj zdjęcie" (nie wymaga otwierania pełnego formularza pomiarów; może otwierać formularz w trybie photo-only lub bezpośrednio picker→crop→zapis wpisu photo-only z dzisiejszą datą — wybierz mniejszy diff, zalecane: bezpośrednia ścieżka).
- [ ] Stany porównania wg Edge case 7 (0/1/≥2 zdjęć) — komunikaty i18n `measurements.compareEmpty`, `measurements.compareOne`.
- [ ] Test: render Measurements z 1 zdjęciem → zachęta widoczna; z 2 → `BodyPhotoCompare` widoczny.
- [ ] Run → PASS.

### Task D6: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + build functions (+ `npm run test:rules` jeśli rules zmienione) → zielone.
- [ ] Raport wg protokołu; odnotuj do testu na urządzeniu: natywny sheet aparatu w WKWebView + crop gestami + HEIC.

## Pułapki

- `firestore.rules`: edytuj WYŁĄCZNIE blok measurements; WP-PLANS w tym samym batchu edytuje blok training_plans — trzymaj się unikalnych anchorów (`validMeasurementShape`).
- Nowe pole `photoReminderSentAt` na users pisane TYLKO przez admin SDK — nie dodawaj go do rules users (zamknięty schemat dotyczy zapisów klienta), ale sprawdź czy rules users nie walidują kształtu również przy odczycie mapperem (nie walidują — odczyt jest wolny).
- Dane usera są święte: żadnych testów na realnym koncie; wszystko przez mocki/emulator.
