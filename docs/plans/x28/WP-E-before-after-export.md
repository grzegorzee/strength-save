# WP-E (X28): Eksport before/after — szablony 1:1 i 9:16, logo, daty, waga, pobierz + udostępnij

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md` + global constraints x27.

**Goal:** z porównania sylwetki (BodyPhotoCompare) można wygenerować obraz do pobrania/udostępnienia: dwa zdjęcia obok siebie, logo Strength Save u góry, data + waga pod każdym zdjęciem, delta wagi, ramka w kolorze akcentu usera; wybór formatu 1:1 (1080x1080) i 9:16 (1080x1920) oraz 2-3 wariantów szablonu.

**Spec / kontekst (rozpoznanie 2026-08-21):**
- `BodyPhotoCompare.tsx`: ma before/after (:64-65), `weightDelta` (:66), datę+wagę per zdjęcie (:102-107, format `useUnit().fmt`), Select dat (:86-95). Montowany w `Measurements.tsx:209`.
- **Wzorzec do sklonowania: `CycleShareCard.tsx` (X27)** — samowystarczalny moduł: build HTML string → offscreen div → lazy `html2canvas-pro` (scale 2) → `toBlob(jpeg 0.85)`; dialog z podglądem, Pobierz/Udostępnij, "Zapisano ✓" + haptyka (:194-198); share przez `navigator.canShare({files})` + `navigator.share`, `AbortError` ignorowany; na natywnym iOS "Pobierz" też idzie przez share sheet (WKWebView ignoruje `<a download>`) — :200-213. Rozmiary: 540x675→1080x1350; wzorzec 9:16 w `share-utils.ts:237-306` (540x960→1080x1920).
- **Logo:** `src/assets/app-icon.png` importowany jako URL (wzorzec `CycleShareCard.tsx:20 + :90`) + tekst "Strength Save"; brak wordmarku SVG.
- **CORS/tainted canvas (KRYTYCZNE):** zdjęcia Storage NIE mogą iść do html2canvas przez photoUrl. Ścieżka bezpieczna: `fetch(photoUrl)` → Blob → `downscalePhoto(blob)` z `share-utils.ts:36` (zwraca `data:image/jpeg`, chroni pamięć WKWebView — lekcja Z179) → dataURL do HTML. Fallback gdy fetch padnie na CORS: `getBlob(ref(storage, measurement.photoPath))` przez SDK (photoPath jest w modelu :106). Bucket nie ma jawnej konfiguracji CORS — fallback SDK jest obowiązkowy w implementacji, nie opcjonalny.
- Kolor przewodni: `getCurrentAccent().hex` (wzorzec CycleShareCard:122). Tło szablonu "foto": `media-staging/pro-look/share/bg.webp` (1088x1360, 75% czerni pod treść).
- `escapeHtml` zduplikowany w share-utils i CycleShareCard — przy trzecim module WYCIĄGNIJ do wspólnego `src/lib/share-html.ts` i podepnij wszystkie trzy (mały, bezpieczny refaktor, zaznaczony przez rozpoznanie).

**Files:**
- Create: `src/components/BodyCompareShareDialog.tsx` (build HTML + generate + dialog, wzorem CycleShareCard), `src/lib/share-html.ts` (escapeHtml wspólny), `src/test/body-compare-share.test.tsx`
- Modify: `src/components/BodyPhotoCompare.tsx` (przycisk "Pobierz / udostępnij" pod porównaniem), `src/lib/share-utils.ts` + `src/components/CycleShareCard.tsx` (import escapeHtml ze wspólnego modułu), `public/share/bg.webp` (kopia z media-staging)
- i18n: anchor `measurements.*` (np. `measurements.sharePhoto`, `measurements.shareFormat11`, `measurements.shareFormat916`, `measurements.shareTemplate.*`)

**Interfaces:**
- `BodyCompareShareDialog` props: `{ open; onOpenChange; before: { dataUrl: string; date: string; weightKg?: number }; after: { ... }; }` — dialog SAM robi fetch→downscale? NIE: przygotowanie dataURL robi rodzic (BodyPhotoCompare) PRZED otwarciem (spinner na przycisku), dialog dostaje gotowe dataURL-e (prostszy stan, dialog bez async fetchy).

## Szablony (3)

1. **classic** (domyślny): czarne tło #0e0e0e, logo+napis "STRENGTH SAVE" (mono, wzorem eyebrow) u góry, dwa zdjęcia obok siebie (1:1) lub jedno nad drugim (9:16), pod każdym: eyebrow "PRZED {data}" / "PO {data}" + waga; na dole delta wagi w kolorze akcentu; cienka ramka `2px` w kolorze akcentu wokół każdego zdjęcia.
2. **accent**: jak classic, ale całe tło = delikatny gradient czerni z poświatą akcentu u góry, gruba ramka akcentu wokół CAŁEJ karty.
3. **photo**: tło = `share/bg.webp` (beton), treść jak classic.
Etykiety i daty przez i18n + `formatLocalDateLabel`/`dateLocale`; waga przez `useUnit` (kg/lb usera). ZERO pauz w tekstach. Waga może być undefined → wiersz wagi pomijany.

## Edge cases

1. Wpis bez wagi (photo-only) → brak wiersza wagi i brak delty (delta tylko gdy obie wagi).
2. Zdjęcia pionowe/poziome: kontener zdjęcia ma stały aspect (3/4) z object-cover — spójna kompozycja niezależnie od proporcji źródła.
3. Fetch zdjęcia padł (offline/CORS): toast błędu, dialog się nie otwiera; fallback SDK getBlob próbowany PRZED toastem.
4. `navigator.share` niedostępny (desktop web) → pobranie przez `<a download>`; natywny iOS → share sheet (wzorzec 1:1 z CycleShareCard :200-213).
5. Duże zdjęcia: downscalePhoto ogranicza wymiar — generacja 9:16 przy dwóch zdjęciach nie może przekroczyć pamięci WKWebView (scale 2 na kontenerze 540x960 jak w istniejącym wzorcu).

## Tasks

- [ ] **E1 (TDD, wspólny escapeHtml):** test w body-compare-share.test.tsx dla `share-html.ts` (escapeHtml: `<>&"'`), podmiana importów w share-utils i CycleShareCard, `npx vitest run` (testy share istniejące) → zielone.
- [ ] **E2 (TDD, build HTML):** testy: buildBodyCompareHtml (eksportowana funkcja czysta) dla 3 szablonów x 2 formaty zawiera: logo, obie daty, wagi (i pomija wagę przy undefined), deltę, kolor akcentu; zero znaków em/en-dash. Run → FAIL → implementacja → PASS.
- [ ] **E3 (TDD, dialog):** testy: przycisk w BodyPhotoCompare widoczny tylko przy obu zdjęciach; klik → (mock fetch+downscale) → dialog z podglądem; przełączanie formatu i szablonu zmienia render; Pobierz/Udostępnij wołają odpowiednie API (mock navigator.share). Implementacja: przygotowanie dataURL w BodyPhotoCompare (fetch → fallback getBlob → downscalePhoto), dialog wzorem CycleShareDialog (:149-271). Run → PASS.
- [ ] **E4:** kopia `media-staging/pro-look/share/bg.webp` → `public/share/bg.webp`; szablon photo używa `import.meta.env.BASE_URL + 'share/bg.webp'`; html2canvas z tłem lokalnym (same-origin, bez CORS).
- [ ] **E5:** `npx vitest run` + typecheck + lint → zielone; raport; do testu na urządzeniu: realny fetch zdjęcia Storage na iOS (weryfikacja CORS — jeśli padnie, fallback SDK MUSI zadziałać), share sheet, jakość 9:16.

## Pułapki

- Tainted canvas = pusty/czarny obraz bez wyjątku w niektórych ścieżkach — dlatego wyłącznie dataURL-e wchodzą do HTML.
- `useExclusiveOverlayState`: otwarcie dialogu eksportu zamknie inne overlaye — OK, ale nie otwieraj go z poziomu innego dialogu.
- NIE zmieniaj logiki wyboru zdjęć w BodyPhotoCompare (Selecty zostają); tylko dokładasz przycisk + przygotowanie danych.
