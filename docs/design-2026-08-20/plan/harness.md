# Harness weryfikacji designu: scripts/design-screenshots.mjs

Pętla screenshotów do bramki wizualnej fali 2 (BRIEF: ekran testowany na min.
3 akcentach, viewport 390, e2e-mock). Przetestowany na żywo 2026-08-20
(12 zrzutów: 4 trasy × 3 akcenty, wynik w `docs/design-2026-08-20/screens/harness-test/`).

## Uruchomienie

```bash
node scripts/design-screenshots.mjs
```

Domyślnie: trasy `/,/plan,/history,/profile`, akcenty `lime,amber,sky`,
wyjście `docs/design-2026-08-20/screens/<timestamp>/`.

Parametry:

```bash
node scripts/design-screenshots.mjs \
  --routes=/,/plan,/history,/profile,/workout/day-1 \
  --accents=lime,amber,sky,indigo \
  --out=docs/design-2026-08-20/screens/moja-iteracja
```

- `--routes` — lista tras hash-routera po przecinku (`/workout/day-1` działa,
  day-1 istnieje w domyślnym planie mockowym trybu e2e).
- `--accents` — id z palety 11 (`src/lib/accent-theme.ts`) albo własny hex
  (`#1e90ff` też zadziała — mechanizm jak `ss-accent-color`).
- `--out` — katalog wyjściowy (relatywny do repo albo absolutny).

## Co robi

1. Jeśli `http://localhost:8080` nie odpowiada, startuje `npm run dev` z
   `VITE_E2E_MODE=true` (dokładnie jak `playwright.config.ts`); log serwera w
   `<out>/dev-server.log`. Działający serwer jest reużywany (uwaga: musi być
   e2e-mock i świeży).
2. Per akcent tworzy osobny kontekst Chromium (390×844, DPR 2, pl-PL), blokuje
   Firebase (wzorzec `blockFirebase` z `e2e/helpers.ts`) i PRZED startem apki
   seeduje localStorage:
   - `ss-accent-color` — akcent (czytany przy boot, zero FOUC),
   - `fittracker_lapse_dismissed_v1` — tray zaległości nie zasłania Dashboardu
     (ten sam seed co playwright.config.ts),
   - `fittracker_e2e_plan` — aktywny plan w TRAKCIE tygodnia (start 30 dni temu,
     12 tygodni, domyślne dni mocka),
   - `fittracker_e2e_workouts` — 5 ukończonych sesji (bieżący + 2 poprzednie
     tygodnie, progresja ciężarów => realne PR-y i czasy trwania),
   - `fittracker_e2e_cycles` — aktywny cykl spójny z planem.
3. Per trasa: goto, czekanie na `#root`, `document.fonts.ready`, 900 ms na
   animacje/lazy chunki, screenshot **fullPage**.
4. Na końcu ubija spawnowany serwer (kill grupy procesów) i wypisuje manifest.
   Exit 0 przy sukcesie, 1 przy błędzie.

## Znane właściwości / pułapki

- **fullPage a elementy fixed:** bottom nav / sticky paski renderują się na
  zrzucie w miejscu scrolla, nie na dole każdego "ekranu" — to artefakt fullPage,
  nie bug apki. Do oceny sekcji sticky rób dodatkowy zrzut bez fullPage
  (przytnij w przeglądzie) albo oceniaj z artboardem obok.
- **Zwietrzały vite** (lekcja CLAUDE.md #9): jak serwer nie wstaje w 90 s albo
  trasy się wieszają — `pkill -f vite && rm -rf node_modules/.vite` i ponów.
  Skrypt sam NIE zabija cudzych serwerów (żeby nie ubić drugiej sesji).
- Reużywany serwer bez `VITE_E2E_MODE=true` da ekran logowania — wtedy ubij go
  i pozwól harnessowi wystartować własny.
- Seedy to fixtures e2e (jak w specach) — dane są mockowe z założenia; do bramki
  wizualnej porównujemy STRUKTURĘ i kolory z artboardem, nie liczby.

## Bramka fali 2 (per ekran)

```bash
node scripts/design-screenshots.mjs --routes=/history --accents=lime,amber,sky,indigo
```

Porównaj z artboardem (`docs/design-2026-08-20/dc/*.dc.html`): zgodność
strukturalna + zero pozostałości innego akcentu (indigo wyłapuje hardcode
ciemnego tekstu na akcencie — tokens.md §8).
