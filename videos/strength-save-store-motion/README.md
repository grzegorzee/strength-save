# Strength Save: animacja strony

Ośmiosekundowa pętla z rzeczywistymi ekranami Strength Save. Dostępne teksty:

- PL: Zapisz serię. Zobacz postęp.
- EN: Log your sets. See your progress.

Materiały służą do strony internetowej i krótkich publikacji społecznościowych. Ten plik nie jest filmem App Preview do App Store.

## Źródła

`shot-plan.json` opisuje układ i ruch. `generate-variants.mjs` generuje obie wersje językowe z jednego szablonu. `compositions/index.html` zawiera wersję PL, `compositions/index-en.html` wersję EN. Domyślny `index.html` jest po polsku.

Grafiki muszą pochodzić z zatwierdzonych, nowych zrzutów natywnej aplikacji. Lista plików i sumy kontrolne są w `assets/source-manifest.json`. Wszystkie cztery źródła pochodzą z zatwierdzonych zrzutów natywnego renderera builda 148, wykonanych 13 września 2026 z danymi demonstracyjnymi.

## Render

Przed renderem trzeba obejrzeć źródła i klatki kontrolne obu wersji, a następnie uruchomić pełny `npm run check` po skopiowaniu wybranej kompozycji do `index.html`. Render jest lokalny, z lokalnymi fontami i GSAP. Potrzebne narzędzia: Node 22+, FFmpeg i `cwebp`.

```sh
node generate-variants.mjs
cp compositions/index.html index.html
npm run check
npx hyperframes@0.8.36 render --quality high --workers 1 --strict --no-best-effort --output renders/strength-save-pl-1080.mp4
cp compositions/index-en.html index.html
npm run check
npx hyperframes@0.8.36 render --quality high --workers 1 --strict --no-best-effort --output renders/strength-save-en-1080.mp4
cp compositions/index.html index.html
./encode-web.sh
node verify-outputs.mjs
```

## Osadzenie na stronie

Wersja web ma 720 × 1280 px i kodowanie H.264. Użyj `muted`, `loop` i `playsinline`, z odpowiednim posterem WebP. Ustaw `preload="none"` lub `preload="metadata"`. Przy `prefers-reduced-motion: reduce` pokaż poster bez automatycznego ruchu. Widoczny przycisk pauzy pozwala zatrzymać pętlę. Tekst obok filmu powinien przekazywać tę samą informację.

## Weryfikacja

Obie wersje przeszły pełny Hyperframes check bez błędów i ostrzeżeń: 17 próbek układu, 161 próbek ruchu i 15 kontroli kontrastu na język. Obejrzałem źródła natywne, klatki kompozycji, zestawienia klatek z obu gotowych filmów i postery web. Nagłówki mieszczą się w całości, a screenshoty zachowują proporcje i widoczne dane.

FFprobe potwierdził 8 sekund, 30 fps, H.264, yuv420p i brak audio we wszystkich filmach. Pierwsza i ostatnia klatka są zgodne w ocenie SSIM: PL 0,997851, EN 0,998014. Powrót pozycji jest zapisany w deterministycznej osi czasu.

| Plik | Wymiary | Rozmiar |
|---|---|---:|
| `renders/strength-save-pl-1080.mp4` | 1080 × 1920 | 8,00 MB |
| `renders/strength-save-en-1080.mp4` | 1080 × 1920 | 7,60 MB |
| `renders/strength-save-pl-web.mp4` | 720 × 1280 | 669 kB |
| `renders/strength-save-en-web.mp4` | 720 × 1280 | 623 kB |
| `renders/strength-save-pl-poster.webp` | 720 × 1280 | 49 kB |
| `renders/strength-save-en-poster.webp` | 720 × 1280 | 46 kB |

Pełne postery PNG mają 1080 × 1920 px. Parametry filmów są w `renders/manifest.json`, raporty i zestawienia klatek w `qa/`.
