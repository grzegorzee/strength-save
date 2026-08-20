# PLAN: System tokenów redesignu 2026-08-20 (fundament fali 2)

> Zadanie specjalne. Źródła: 6 artboardów `docs/design-2026-08-20/dc/*.dc.html`,
> `BRIEF-REDESIGN.md`, `src/index.css`, `tailwind.config.ts`,
> `src/lib/accent-theme.ts`, `src/test/accent-hardcode-scan.test.ts` (strażnik limonki),
> `src/test/accent-theme.test.ts`, `docs/DESIGN.md` (Kinetic Precision), `index.html`.
>
> Werdykt główny: mockupy da się w ~95% wyrazić ISTNIEJĄCYMI tokenami.
> Do dodania: 5 małych klas pomocniczych w jednym miejscu (`src/index.css`)
> + 1 nowy plik strażnika. ZERO zmian w `tailwind.config.ts`. ZERO `color-mix` w kodzie.

---

## 1. Inwentarz istniejącego kontraktu tokenów (nic nie znika)

System tokenów nie jest ekranem, więc "funkcje do zachowania" = kontrakt, na którym
wiszą wszystkie ekrany, testy i strażniki. Każda pozycja MUSI działać po fali 2
dokładnie tak jak dziś.

| # | Funkcja / kontrakt | Miejsce w nowym systemie |
|---|---|---|
| 1 | `--background`/`--foreground` (dark: 0 0% 5.5% / 73 100% 96%) | bez zmian; `#0e0e0e` mockupu mapuje się na `--background` |
| 2 | `--card`/`--card-foreground` (dark 0 0% 9% = #171717) | bez zmian; karta ćwiczenia dalej na `--card` |
| 3 | `--popover`/`--popover-foreground` | bez zmian |
| 4 | `--primary`/`--primary-foreground` (sterowane akcentem usera) | bez zmian; `var(--acc)` mockupu = `--primary` |
| 5 | `--primary-light` (gradient "forged" CTA) | bez zmian; konsumowany przez `.kinetic-primary-button` |
| 6 | `--accent`/`--accent-foreground` (drugi zapis akcentu: chipy, badge) | bez zmian; applyAccent nadal nadpisuje |
| 7 | `--secondary`/`--secondary-foreground` | bez zmian |
| 8 | `--muted`/`--muted-foreground` | bez zmian; teksty #9a9892 mockupu = `--muted-foreground` |
| 9 | `--destructive`/`--destructive-foreground` | bez zmian (usuwanie, delete workout) |
| 10 | `--border`/`--input`/`--ring` | bez zmian; `--ring` dalej podąża za akcentem |
| 11 | `--radius` (0.75rem) + skala borderRadius (`xl` = 1.5rem override) | bez zmian; radii mockupu kwantyzowane do tej skali (§2.6) |
| 12 | `--fitness-cyan` (semantyka WYŁĄCZNIE cardio, audyt 2026-08-20) | bez zmian; żaden ekran fali 2 nie używa cyjanu ozdobnie |
| 13 | `--fitness-navy` | bez zmian |
| 14 | `--fitness-success` (T24b: celowo NIE limonka i NIE akcent) | bez zmian; statusy done/success tylko tam gdzie znaczą status |
| 15 | `--fitness-warning` + reguła "tło zawsze z /10" (CLAUDE.md #8) | bez zmian; niepełne serie w summary = `text-fitness-warning` |
| 16 | `--sidebar-*` (8 tokenów) | bez zmian (desktop) |
| 17 | `--ec-*` (ExerciseCard v3: set-number, delete, warmup-gold ×3) | bez zmian; kolumna W/× w tabeli serii dalej na `--ec-*` |
| 18 | `--surface` + 5 poziomów (lowest/low/container/high/highest) | RDZEŃ mapowania powierzchni mockupu (§2.1) |
| 19 | `--outline-variant` (ghost border #484847 @ ~15%) | bez zmian; dodatkowo mapuje #4a4844/#3a3833 mockupu |
| 20 | `.exercise-card` / `.dark .exercise-card` | bez zmian wizualnych; hex #171717 podmienić na `hsl(var(--card))` (identyczna wartość, §3) |
| 21 | `.exercise-card-header` (`--surface-highest`) | bez zmian |
| 22 | `.exercise-card-input` + `:focus` (sunken input, glow od `--primary`) | bez zmian wizualnych; hex #0e0e0e podmienić na `hsl(var(--surface))` (identyczna wartość, §3) |
| 23 | `.kinetic-primary-button` (gradient forged, cień i tekst z tokenów) | bez zmian; to jest mapowanie CTA mockupu (§2.7) |
| 24 | `.kinetic-glass` (blur nav/modali) | bez zmian |
| 25 | `font-heading`/`font-body` + skala `display-lg/md`, `headline-lg`, `label-md` | bez zmian; `.disp` mockupu = `font-heading` |
| 26 | `font-mono` (domyślny stack Tailwind: ui-monospace, Menlo...) | bez zmian; `.mono` mockupu = `font-mono` (identyczny stack) |
| 27 | Wariant `hover` tylko przy realnym kursorze (plugin Z199) | bez zmian; nowe klasy pomocnicze nie definiują własnych :hover |
| 28 | `accent-theme.ts`: paleta 11 + aliasy legacy + custom hex | NIETYKALNE (jedyne źródło prawdy hexów akcentu) |
| 29 | `applyAccent`: kontrakt `--primary/--ring/--accent/data-accent`, limonka = czyste tokeny | NIETYKALNE |
| 30 | Foreground per luminancja (próg 0.28 → `0 0% 98%` dla ciemnych akcentów) | NIETYKALNE; to jest odpowiedź na #141005 mockupu (§2.5) |
| 31 | Persistencja akcentu: localStorage `ss-accent-color` + mirror preferences | bez zmian |
| 32 | Strażnik limonki `accent-hardcode-scan.test.ts` (3 wzorce + allowlisty) | bez zmian + NOWY bliźniaczy strażnik (§5) |
| 33 | `accent-theme.test.ts` (kontrakt lib, 11 kolorów, aliasy, luminancja) | bez zmian, musi zostać zielony |
| 34 | e2e `accent-color.spec.ts` (+ `onboarding-accent.spec.ts`) | bez zmian; selektory nie dotykają nowych klas |
| 35 | Baseline dotyku WebView w `index.css` (user-select, overflow-x, touch-action) + fonty w `index.html` (Inter 400-700, SG 500-700) + `forcedTheme="dark"` | bez zmian; NIE dodajemy wag fontów ani nowych `<link>` |

**feature_inventory_count = 35**

---

## 2. Język designu mockupów → mapowanie na tokeny/klasy apki

### 2.1 Powierzchnie (neutralne hexy mockupu)

Hierarchia mockupu pokrywa się 1:1 z istniejącą hierarchią Kinetic ("The Void and The Pulse"):

| Hex mockupu | Rola w mockupie | Token apki (dark) | Klasa |
|---|---|---|---|
| `#0e0e0e` | tło ekranu | `--background`/`--surface` (0 0% 5.5% = #0e0e0e, exact) | `bg-background` |
| `#131313` | sekcje, tray, nav, przyciski drugorzędne, sunken pola | `--surface-low` (0 0% 7.5% = #131313, exact) | `bg-surface-low` |
| `#1c1c1c` | karty główne, pigułki headera | `--surface-container` (0 0% 10%, Δ1% — akceptowalne) | `bg-surface-container` |
| `#262626` | kontrolki wewnętrzne, tory pasków, chip SKIP, segmenty toggli | `--surface-highest` (0 0% 15% = #262626, exact) | `bg-surface-highest` |
| `#151515` | puste komórki heatmapy (History) | `--surface-low` | `bg-surface-low` |
| `#171717` | (nie w mockupie; istniejąca karta ćwiczenia) | `--card` (0 0% 9% = #171717, exact) | `bg-card` / `.exercise-card` |
| `#232323`/`#1b1b1b` | placeholder miniatury `.ph` (paski ukośne) | wzór z `hsl(var(--surface-highest))` i `hsl(var(--surface-container))` | inline gradient na tokenach w komponencie miniatury (plan ekranu sesji) |
| `#f0eee9` | tło canvasa narzędzia projektowego | IGNOROWAĆ (nie jest częścią designu apki) | - |

Reguła: ekran NIE wybiera hexu, wybiera POZIOM (background → low → container → highest).
Głębiej zagnieżdżony element = wyższy poziom. Zero borderów 1px do sekcjonowania (DESIGN.md "No-Line Rule").

### 2.2 Teksty (neutralne)

Mockup ma 10+ odcieni szarości tekstu; kwantyzujemy do 4 ról + 2 wyjątków:

| Hexy mockupu | Rola | Klasa |
|---|---|---|
| `#f2f1ee` | tekst główny | `text-foreground` |
| `#dedcd6`, `#c9c7c1` | drugorzędny podkreślony (wartości, labelki aktywne) | `text-foreground/80` |
| `#9a9892`, `#8d8b85`, `#b3b1aa`, `#b9b7b0`, `#8a8880` | meta / opisy / ikony neutralne | `text-muted-foreground` |
| `#767469` | placeholder, kolumna PREV, wartości nieaktywne | `text-muted-foreground/75` |
| `#5c5a55`, `#3f3d38` | najcichsze ikony (chevron, ⋯, × przy serii) | `text-muted-foreground/50`; × usuwania serii zostaje na istniejącym `--ec-delete` |
| `#3a3833`, `#4a4844` | neutralne wypełnienia pasków porównania, ikony done przygaszone, toggle off | `--outline-variant` (60 2% 28% ≈ #484847) → `bg-outline-variant` / `text-outline-variant` (ew. `/80`) |

Uwaga znana: `--foreground` w dark to `73 100% 96%` (limonkowy tint). Przy akcencie
innym niż limonka tekst główny ma lekki żółtawy odcień. NIE ruszamy w fali 2
(zmiana globalna, osobna decyzja właściciela) — odnotowane w ryzykach.

### 2.3 Tinty akcentu (color-mix 8-20% w mockupie)

Wszystkie `color-mix(in oklab, var(--acc) N%, X)` zastępujemy alfą na tokenie.
Kompozycja alfa nad tą samą powierzchnią daje wynik wizualnie tożsamy z color-mix
(różnica interpolacji oklab vs sRGB przy 8-20% jest niezauważalna):

| Wzorzec mockupu | Zamiennik | Klasa |
|---|---|---|
| `color-mix(acc 8%, #131313)` (wiersz wyróżniony w liście) | alfa nad `bg-surface-low` | `bg-primary/[0.08]` |
| `color-mix(acc 10-13%, transparent/#0e0e0e)` (target box, karty PR, karta NEXT) | alfa nad tłem strony | `bg-primary/10` |
| `color-mix(acc 14-16%, transparent)` (badge, chip TOTAL, Decide) | alfa | `bg-primary/15` |
| `color-mix(acc 20%, #131313)` (tło avatara) | alfa | `bg-primary/20` |
| `color-mix(acc 38-45%, #262626)` (przygaszone paski postępu) | alfa nad torem `bg-surface-highest` | `bg-primary/40` na wypełnieniu, tor `bg-surface-highest` |
| `color-mix(acc 65%, #262626)` (słupki session shape) | `bg-primary/60` | jw. |
| `color-mix(acc N%, #2b2b2b)` z N malejącym (legenda volume split) | skala `bg-primary` → `/75` → `/55` → `/35` → `/20` (odcienie JEDNEGO akcentu, zgodnie z briefem) | plan ekranu summary |

Standard fali 2: **tylko trzy poziomy tintu tła: /10, /15, /20** (+ /40 i /60 dla
wypełnień pasków). Ekrany nie wymyślają własnych wartości.

Gdy tint musi być KRYCIE (element przewija się nad inną treścią, np. sticky):
klasa pomocnicza `.accent-wash-solid` (gradient-stack, §4) zamiast alfy.

### 2.4 Obrysy akcentowe (inset ring 35-55%)

Mockup: `box-shadow: inset 0 0 0 1.5px color-mix(acc 45-55%, transparent)`
(banner decyzji, aktywna seria, komórka heatmapy >88%).

Zamiennik: klasa pomocnicza `.accent-ring` = `box-shadow: inset 0 0 0 1.5px hsl(var(--primary) / 0.45)`
(jedna wartość 45% dla wszystkich; mockupowe 35/55% kwantyzujemy do niej).
Nie używamy Tailwindowego `ring-*`, bo koliduje z focus ringami shadcn na tych samych elementach.

### 2.5 Kontrast tekstu na akcencie (#141005 / #171204 w mockupie)

Mockup zakłada pomarańcz i wpisuje ciemny tekst na sztywno. Apka MA już mechanizm:
`applyAccent` w `src/lib/accent-theme.ts` liczy relative luminance hexu akcentu
i przy < 0.28 ustawia `--primary-foreground`/`--accent-foreground` na `0 0% 98%`
(jasny tekst dla indigo/slate/ciemnych customów), w przeciwnym razie zostaje
domyślne `0 0% 6%` (ciemny tekst dla limonki/amber/sky).

Reguła fali 2: **każdy tekst/ikona na wypełnieniu `bg-primary` = `text-primary-foreground`**
(na `bg-accent` = `text-accent-foreground`). Zero `#141005` w kodzie. To obejmuje:
CTA, badge NEXT, aktywne chipy filtrów, kciuk toggla, przycisk ✓ odhaczonej serii.

### 2.6 Promienie (11-24px w mockupie)

Kwantyzacja do istniejącej skali (zero nowych wartości arbitrary):

| Mockup | Klasa apki | px |
|---|---|---|
| 20-24px (karty hero, karty ćwiczeń) | `rounded-xl` (override 1.5rem) | 24 |
| 14-18px (bannery, przyciski sekcji, target box, textarea) | `rounded-2xl` | 16 |
| 11-13px (pola serii, kwadratowe ikonki headera, chipy prostokątne) | `rounded-lg` (`var(--radius)`) | 12 |
| 999px (pigułki, badge, tory pasków) | `rounded-full` | - |
| 34px (ramka urządzenia w artboardzie) | IGNOROWAĆ | - |

### 2.7 Typografia

| Mockup | Apka |
|---|---|
| `.disp` = Space Grotesk, ls -0.02em, 700 | `font-heading font-bold` (+ `tracking-tight`); duże liczby: `text-display-lg/md`, tytuły sekcji: `text-headline-lg` (istniejąca skala) |
| `.disp` italic (powitanie "GOOD EVENING") | Space Grotesk NIE MA italica — patrz ryzyka; rekomendacja: bez italic |
| `.mono` = ui-monospace, Menlo | `font-mono` (domyślny stack Tailwind — identyczny) |
| mono eyebrow/label 8.5-11px, ls .08-.16em, uppercase | NOWA klasa `.eyebrow-mono` (§4); dla 12px istnieje `text-label-md` |
| Inter 400-700 body | `font-body` / dziedziczone z `body` |
| SG waga 400 (mockup linkuje 400) | NIE dodawać — `index.html` ładuje SG 500/600/700, kwantyzujemy 400→500 |

Fonty zostają ładowane przez ISTNIEJĄCY `<link>` Google Fonts w `index.html`
(Inter 400-700 + Space Grotesk 500-700). Żadnych nowych `<link>`, żadnych nowych wag.
Offline: fallback systemowy z istniejących stacków (sans-serif / ui-monospace).

### 2.8 Wysokości kontrolek (40-62px w mockupie)

Kwantyzacja do skali h-*:

| Mockup | Klasa | px | Zastosowanie |
|---|---|---|---|
| 40px | `h-10` | 40 | Add set, Plates, Metrics, przyciski rzędu |
| 42-46px | `h-11` | 44 | pola serii, ✓, Decide, Not at 100%?, Vacation (touch target ≥44) |
| 48px | `h-12` | 48 | Add exercise, Share, Send to coach, Log out |
| 52-62px | `h-14` | 56 | CTA hero: Open session, FINISH WORKOUT, BACK TO DASHBOARD |

Wymóg właściciela "BACK TO DASHBOARD tej samej wielkości co FINISH WORKOUT"
spełniony przez wspólne `h-14` + `.kinetic-primary-button` (mockupowe 54 vs 62 ujednolicone).
CTA hero = istniejący `.kinetic-primary-button` (token-driven gradient forged,
cień `hsl(var(--primary)/0.12)`), NIE płaski `background:var(--acc)` z mockupu.
To świadome odstępstwo: klasa jest podpisem marki, przetestowana na 11 akcentach.

---

## 3. color-mix w oklab a WKWebView (target iOS 15.0)

- `IPHONEOS_DEPLOYMENT_TARGET = 15.0` (`ios/App/App.xcodeproj/project.pbxproj`).
- `color-mix()` wymaga Safari/WebKit 16.2+ (grudzień 2022). Na iOS 15.x oraz
  16.0-16.1 WKWebView deklaracja z `color-mix` jest w całości ODRZUCANA:
  element zostaje bez tła / bez obrysu. To nie degradacja, to dziura.
- Zamiennik `hsl(var(--primary) / 0.12)` (space-separated + slash alpha, CSS Color 4)
  działa od Safari 12.1 i jest DOKŁADNIE tym, co Tailwind emituje dla `bg-primary/10`.
  Apka już z tego korzysta wszędzie.

**Decyzja: bezwzględny zakaz `color-mix(` w kodzie apki** (src/**). Pilnuje strażnik (§5).
Obecnie `grep color-mix src/` = 0 trafień, więc zakaz wchodzi bez migracji.

Przy okazji wdrożenia klas pomocniczych: podmienić w `src/index.css` dwa istniejące
hexy na tożsame tokeny (wizualnie 1:1, umożliwia pustą allowlistę strażnika):
- `.dark .exercise-card { background: #171717 }` → `hsl(var(--card))` (0 0% 9% = #171717),
- `.dark .exercise-card-input { background: #0e0e0e !important }` → `hsl(var(--surface))` (0 0% 5.5% = #0e0e0e).

---

## 4. Minimalny zestaw nowych klas pomocniczych (JEDNO miejsce: `src/index.css`, `@layer components`)

Zasada: klasa powstaje tylko, gdy wzorzec powtarza się na ≥3 ekranach i nie da się
go zapisać krótką kombinacją utilities. Powierzchnie kart NIE dostają klas
(`bg-surface-container rounded-xl p-4` wystarcza i jest czytelne w JSX).

```css
/* Fala 2 (2026-08-20): wspólne wzorce mockupów. Wartości TYLKO z tokenów. */

/* Eyebrow / etykieta sekcji: NEXT SESSION, WHERE THE VOLUME WENT, DURING A WORKOUT.
   Kolor nadaje ekran: text-primary (akcentowa) albo text-muted-foreground (neutralna). */
.eyebrow-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.65rem;            /* ~10.5px */
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Pigułka mono: 82 TOTAL, WK 12/12, SKIP, EDIT, COMPARE, badge statusu dnia.
   Wariant neutralny; akcentowy przez dołożenie bg-primary/15 text-primary,
   wypełniony przez bg-primary text-primary-foreground. */
.chip-mono {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  background: hsl(var(--surface-highest));
  color: hsl(var(--muted-foreground));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Obrys akcentowy (banner decyzji, aktywna seria, hot-cell heatmapy).
   Inset box-shadow, nie border (No-Line Rule) i nie ring-* (kolizja z focus). */
.accent-ring {
  box-shadow: inset 0 0 0 1.5px hsl(var(--primary) / 0.45);
}

/* Tint akcentu jako TŁO PRZEPUSZCZALNE (target box, karta PR, karta NEXT). */
.accent-wash {
  background: hsl(var(--primary) / 0.12);
}

/* Tint akcentu KRYJĄCY (sticky/floating nad przewijaną treścią):
   gradient-stack = alfa skomponowana nad surface-low, bez color-mix. */
.accent-wash-solid {
  background:
    linear-gradient(hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.12)),
    hsl(var(--surface-low));
}
```

Braki, które świadomie NIE dostają nowych tokenów:
- `#dedcd6` (tekst 80%) → `text-foreground/80` (alfa zamiast tokenu),
- neutralne wypełnienia pasków → `--outline-variant` już istnieje,
- wysokości/promienie → kwantyzacja do istniejących skal,
- kolory wykresów podsumowania → odcienie `--primary` przez alfę (§2.3), hex dla
  SVG `stop-color` z `getCurrentAccent().hex` (istniejący wzorzec, Recharts nie łyka var()).

---

## 5. Rozszerzenie strażnika (wzorzec: `accent-hardcode-scan.test.ts`)

Nowy plik `src/test/design-token-guard.test.ts` (bliźniak strażnika limonki:
walk po `src/`, stripComments, offendersIn, allowlisty z testem na martwe wpisy):

1. **Zakaz `color-mix(`** w `src/**/*.{ts,tsx,css}`. Allowlista: pusta.
2. **Zakaz hexów mockupu** (pomarańcz + tekst-na-akcencie + neutralne):
   `/#(?:ff8b3d|141005|171204|0e0e0e|131313|1c1c1c|262626|f2f1ee|dedcd6|9a9892|8d8b85|767469|b9b7b0|b3b1aa|c9c7c1|8a8880|5c5a55|4a4844|3f3d38|3a3833|171717|151515)/i`.
   Allowlista: pusta (po podmianie dwóch hexów z §3; komentarze są stripowane,
   więc opisy tokenów w index.css typu "#0e0e0e The Void" nie łapią się).
3. **Zakaz arbitrary-value utilities z hexem**:
   `/\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|accent|caret|decoration)-\[#/`.
   Allowlista: pusta. (Domyka lukę: dowolny NOWY hex przemycony przez Tailwind
   arbitrary, nie tylko limonka i nie tylko hexy mockupu.)
4. **Kontrakt klas pomocniczych**: `src/index.css` definiuje `.eyebrow-mono`,
   `.chip-mono`, `.accent-ring`, `.accent-wash`, `.accent-wash-solid`, a ich
   bloki nie zawierają hexów ani `color-mix` (regex na wycinku pliku).

Istniejący `accent-hardcode-scan.test.ts` zostaje BEZ ZMIAN (inna odpowiedzialność:
limonka jako akcent). Nowy plik pilnuje reguł fali 2. Rozdzielenie = czytelne
komunikaty faili i zero ryzyka regresji w allowlistach limonki.

---

## 6. Lista zmian w plikach (implementacja)

| Plik | Zmiana |
|---|---|
| `src/index.css` | (a) 5 klas pomocniczych w `@layer components` (§4); (b) podmiana `#171717` → `hsl(var(--card))` i `#0e0e0e` → `hsl(var(--surface))` w `.dark .exercise-card` / `.dark .exercise-card-input` (tożsame wartości, §3) |
| `src/test/design-token-guard.test.ts` | NOWY strażnik (§5) |
| `docs/DESIGN.md` | (opcjonalnie, na końcu fali) dopisek "Fala 2: tinty tylko /10 /15 /20, zakaz color-mix, klasy .eyebrow-mono/.chip-mono/.accent-ring" |
| `tailwind.config.ts` | ZERO zmian (świadomie) |
| `src/lib/accent-theme.ts` | ZERO zmian (kontrakt nietykalny) |
| `index.html` | ZERO zmian (fonty już są) |

Ekrany fali 2 (plany pozostałych agentów) konsumują wyłącznie: tokeny z §2,
klasy z §4, komponenty kinetic/shadcn. Żaden ekran nie dodaje własnych hexów ani klas kolorów.

---

## 7. Nowe klucze i18n

**Brak.** Fundament tokenów nie wprowadza tekstów UI. Teksty z mockupów
(REST, SKIP, FINISH WORKOUT, itd.) należą do planów poszczególnych ekranów
i tam dostają klucze pl.ts + en.ts.

---

## 8. Testy

Istniejące, muszą pozostać zielone (niezmienniki):
- `src/test/accent-theme.test.ts` — kontrakt palety 11, aliasów, luminancji (0.28), persistencji,
- `src/test/accent-hardcode-scan.test.ts` — strażnik limonki (3 wzorce + allowlisty),
- `src/test/onboarding-accent.test.tsx`, `src/test/profile-sections.test.tsx`,
- e2e `e2e/accent-color.spec.ts`, `e2e/onboarding-accent.spec.ts` (localStorage `ss-accent-color`) — zmiany tokenów nie dotykają ich selektorów; brak aktualizacji speców.

Nowe:
- `src/test/design-token-guard.test.ts` (§5, 4 testy),
- test wizualnej niezmienności podmiany hexów z §3: snapshot wartości computed
  nie jest potrzebny — wystarczy asercja w design-token-guard, że `.dark .exercise-card`
  nie zawiera już hexu, plus istniejące testy komponentu karty.

Niezmienniki (zapisać w opisach testów):
1. `applyAccent('lime')` = czyste tokeny (zero nadpisań) — już testowane,
2. `--fitness-success/--fitness-warning/--destructive` nie zmieniają się z akcentem — już testowane,
3. zero `color-mix` i zero hexów mockupu w `src/` — nowy strażnik,
4. tekst na `bg-primary` zawsze przez `text-primary-foreground` — pilnowane review + bramka 3 akcentów.

Bramka manualna briefu (per ekran, ale fundament ją definiuje): screenshot e2e-mock
viewport 390 na akcentach **lime, amber, sky** + dodatkowo **indigo** (jedyny ciemny
akcent z jasnym foregroundem — wyłapuje hardcode ciemnego tekstu na akcencie).

---

## 9. Ryzyka i edge-case'y

1. **iOS 15 / 16.0-16.1: brak color-mix** → rozwiązane zakazem (§3). Bez tego zakazu
   ekrany wyglądałyby poprawnie na symulatorze iOS 17, a u usera na iOS 15 traciły tła.
2. **Ciemne akcenty (indigo, slate, custom ciemny):** `bg-primary/10` na ciemnym tle
   jest ledwo widoczny. Ratunek: te powierzchnie zawsze idą w parze z `.accent-ring`
   (banner) albo treścią w `text-primary`. Bramka 4 akcentów (z indigo) to wychwyci.
3. **Akcent gray (#8e8e93):** badge NEXT/aktywne chipy zlewają się z neutralnymi.
   Akceptowalne (świadomy wybór usera), nie obchodzić specjalnie.
4. **Space Grotesk nie ma italica** — powitanie z mockupu (`italic`) dałoby faux
   oblique syntezowany przez silnik (brzydki na iOS). Rekomendacja: bez italic,
   emfaza przez kolor akcentu na imieniu (jak w mockupie) + wagę 700.
5. **`--foreground` dark = limonkowy tint (73 100% 96%):** przy akcencie rose/sky tekst
   główny ma delikatny żółtawy odcień. Poza zakresem fali 2 (zmiana globalna wszystkich
   ekranów); kandydat na osobną decyzję: `0 0% 95%`. NIE zmieniać przy okazji.
6. **Offline PWA:** fonty z Google CDN → fallback systemowy (sans-serif, ui-monospace).
   Stan istniejący, akceptowany. Mono stack jest lokalny (ui-monospace), więc
   `.eyebrow-mono`/`.chip-mono` wyglądają identycznie offline.
7. **Długie teksty PL w chipach mono:** uppercase PL bywa dłuższy niż EN
   ("PODSUMOWANIE" vs "SUMMARY"). `.chip-mono` ma `white-space: nowrap` — ekrany
   muszą dawać chipom `min-width: 0` + `truncate` w ciasnych rzędach flex.
8. **Light mode:** `forcedTheme="dark"`, ale wszystkie klasy pomocnicze są na tokenach,
   które mają definicje light — gdy właściciel kiedyś odblokuje light, nic nie pęknie.
9. **Kolizja `.accent-ring` z focus ringiem shadcn:** oba używają box-shadow.
   Elementy interaktywne z `.accent-ring` muszą być testowane z klawiaturą/focus-visible;
   w razie kolizji `.accent-ring` przechodzi na element-wrapper, nie na focusowalny.
10. **Stany puste / brak danych:** tokeny nie zależą od danych. Elementy mockupów
    wymagające danych, których nie ma, są wypisane niżej (new_features) i należą
    do planów ekranów — fundament ich nie blokuje.

---

## 10. Kolejność kroków implementacji

1. `src/index.css`: podmiana 2 hexów na tożsame tokeny (§3) → weryfikacja:
   `npm run test` (testy karty ćwiczenia zielone), wizualny diff karty w e2e-mock.
2. `src/test/design-token-guard.test.ts`: strażnik (§5) → weryfikacja: zielony na
   czystym src; czerwienieje po wstrzyknięciu próbnego `color-mix`/hexu (sprawdzić ręcznie i cofnąć).
3. `src/index.css`: 5 klas pomocniczych (§4) → weryfikacja: test kontraktu klas
   (§5 pkt 4) zielony, `npm run build` przechodzi.
4. Smoke na akcentach: e2e-mock, viewport 390, akcenty lime/amber/sky/indigo —
   strona referencyjna (np. Dashboard sprzed redesignu) wygląda bez zmian
   (fundament niczego nie przemalowuje sam z siebie).
5. Bramki: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
6. Dopiero potem startują plany ekranów (Dashboard, Plan, Sesja, Summary, History, Profile),
   każdy konsumuje §2 + §4 i przechodzi bramkę 4 akcentów.
7. Po zamknięciu fali: opcjonalny dopisek do `docs/DESIGN.md` + wpis do `DECYZJE.md`.

---

## Aneks: elementy artboardów będące NOWĄ funkcją (nie restylingiem)

Z przeglądu 6 artboardów, do decyzji w planach ekranów (fundament ich nie dotyczy,
ale spisuję, żeby żaden agent nie pokazał zmyślonych danych):

| Element | Ekran | Rekomendacja |
|---|---|---|
| Badge "82 TOTAL" w headerze | Dashboard | wdrożyć minimalnie (licznik all-time istnieje w agregatach) |
| Chip "14 WEEKS" (streak tygodni) | Dashboard | wdrożyć minimalnie jeśli streak liczony w achievements; inaczej fallback: ukryć chip |
| Dzwonek notyfikacji w headerze | Dashboard | pominąć (brak centrum powiadomień w apce); nie renderować martwej ikony |
| Pasek TIME / TONNAGE / SETS live w sesji | Sesja | wdrożyć minimalnie (dane są w draftcie sesji) |
| Ustawienia timera z paska REST | Sesja | wdrożyć (wymóg briefu; reuse WorkoutSettingsSheet) |
| "WHERE THE VOLUME WENT" (split mięśniowy) | Summary | wdrożyć minimalnie jeśli mapowanie ćwiczenie→grupa istnieje; inaczej pominąć sekcję (nie zmyślać grup) |
| "SESSION SHAPE" (histogram praca/przerwa) | Summary | pominąć z fallbackiem (brak per-secondowej osi czasu serii w danych) chyba że znaczniki czasu serii wystarczą na przybliżenie |
| "% PLANNED" w hero | Summary | wdrożyć minimalnie (planned vs done sets jest w danych) |
| "18 TO GOLD" (progres do osiągnięcia) | Profil | wdrożyć tylko jeśli achievements mają progi; inaczej ukryć |
| Sparkline tonażu w karcie cyklu | History | wdrożyć minimalnie (tonaż per tydzień policzalny z sesji) |
| "96% attendance" w bannerze decyzji | Plan/History | wdrożyć minimalnie (obecność policzalna z planu vs sesje) |
| Pole custom hex + Apply w Profilu | Profil | już istnieje (isCustomAccentHex) — restyling, nie nowa funkcja |
