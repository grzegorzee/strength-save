# Strength Save 1.0.0 — typografia i większy tekst

Stan researchu i audytu: 2026-08-27. Dokument planistyczny; nie oznacza wdrożenia,
nie zezwala na deploy ani publikację. Źródłem prawdy dla stanu wdrożonego jest
aktualny kod repozytorium, a nie wcześniejsze opisy.

## Aktualizacja X68 — Text Zoom jest mostem, nie dowodem parity

Audyt oficjalnej implementacji `@capacitor/text-zoom` 8.0.1 wykazał, że Android
odczytuje `Configuration.fontScale` i liniowo przekazuje procent do
`WebSettings.setTextZoom`. Jest to poprawny native-first most dla WebView, ale nie
jest dowodem zachowania nieliniowej hierarchii Androida 14. Nie dokładamy własnego
równania ani nie deklarujemy parity na podstawie samego odczytu pluginu.

Automatyczny test 200% pozostaje użytecznym proxy regresji, lecz dziś obejmuje
tylko część ekranów i nie zastępuje wykonania zadań na urządzeniu. Bramka release
obejmuje więc aktywny trening, zgody, zgłoszenie błędu z klawiaturą, PL/EN,
320×568, 390×844, landscape oraz 100/150/200%. Dopiero wynik urządzeniowy
rozstrzygnie, czy wystarczy obecny most, czy potrzebne jest punktowe rozszerzenie
natywne i warianty reflow.

Docelową skalę upraszczamy do ośmiu ról (`display`, `screen-title`,
`section-title`, `body`, `body-compact`, `control`, `label`, `meta`) oraz dwóch
modyfikatorów (`numeric`, `timer`). `type-micro` nie jest rolą produktową, a mono
pozostaje wyłącznie dla danych technicznych administratora. Migracja ról jest
kontrolowanym P1 spójności; fizyczne 200% bez utraty zadania jest twardą bramką
dostępności 1.0.0.

## Aktualizacja X66 — kontrast małego tekstu

Audyt produkcyjnych klas znalazł 13 przypadków tekstu 11 px z dodatkowym
`text-muted-foreground/60` albo `/70`. Przy ciemnym tle dawało to wynik poniżej
4,5:1. Test globalny najpierw odtworzył wszystkie przypadki, a następnie UI
zachowało 11 px tylko z pełnym semantycznym `muted-foreground`. Kontrakt blokuje
powrót tego połączenia w całym `src`.

Nie zmieniamy fontów: Inter Variable dla treści i Space Grotesk Variable dla
krótkich nagłówków pozostają spójną, self-hosted parą PL/EN. Migracja setek
arbitralnych rozmiarów do małej skali semantycznej nadal jest kontrolowaną falą,
a nie powodem do szerokiego refaktoru tuż przed 1.0. Fizyczny test 100/150/200%,
VoiceOver i TalkBack pozostaje bramką właściciela.

## Decyzja produktowa

Strength Save powinien pozostać przy dwóch krojach: **Inter Variable** dla treści
i kontrolek oraz **Space Grotesk Variable** dla krótkich nagłówków i dużych liczb.
Nie dokładamy trzeciego kroju. Ograniczamy skalę do semantycznych ról, usuwamy
mikrotekst i rozbudowane wersaliki, a liczby treningowe otrzymują cyfry tabelaryczne.

Najważniejszy brak nie dotyczy estetyki. Aplikacja ma już oficjalny mechanizm
systemowej skali tekstu w shellu natywnym, a web po starcie usuwa z viewportu
`maximum-scale` i `user-scalable`. Nadal nie ma jednak fizycznego dowodu iOS/
Android dla maksymalnej skali, odtworzenia Activity i pełnego reflow. Do czasu
przejścia tych testów nie wolno deklarować w App Store obsługi Larger Text ani
uznawać typografii za zamkniętą bramkę release.

Nie instalujemy narzędzia, którego celem byłoby wymuszenie 100% rozmiaru tekstu.
To zachowałoby layout kosztem użytkownika. Docelowo ustawienie systemowe ma działać
automatycznie; prosta kontrolka w Profilu jest mechanizmem uzupełniającym lub
fallbackiem dla WebView, a nie elementem onboardingu.

## Co wynika z oficjalnych wymagań

- Apple zaleca ograniczać liczbę krojów, zachowywać hierarchię przy zmianie rozmiaru
  i implementować dla custom fontów zachowanie równoważne Dynamic Type. Dla iOS
  podaje 17 pt jako zalecany rozmiar domyślny i 11 pt jako minimum, nie jako
  docelowy rozmiar zwykłej treści. [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography),
  [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Apple pozwala zadeklarować Larger Text, jeżeli wspólne zadania działają przy
  co najmniej 200% lub maksymalnym rozmiarze systemowym. Wskazuje testy małych,
  średnich, dużych i accessibility sizes, ograniczenie truncation oraz zmianę
  układu z poziomego na pionowy. Dla aplikacji opartych o WebView Apple wprost
  rekomenduje kontroler rozmiaru tekstu albo przekazanie treści do Safari.
  [Apple — Larger Text evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/)
- Android 14 obsługuje nieliniowe skalowanie fontów do 200%. Oficjalna dokumentacja
  wymaga testu z maksymalnym font size, użycia `sp` dla natywnego tekstu i line
  height oraz zabrania odtwarzania skali własnym równaniem z `fontScale`. Strength
  Save renderuje tekst w WebView, więc samo użycie `rem` nie jest dowodem parity;
  mechanizm integracji trzeba potwierdzić zachowaniem na urządzeniu.
  [Android 14 — non-linear font scaling](https://developer.android.com/about/versions/14/features#non-linear-font-scaling),
  [Android — grids and units](https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units)
- WCAG 2.2 AA wymaga powiększenia tekstu do 200% bez utraty treści lub funkcji,
  reflow bez przewijania w dwóch kierunkach przy szerokości 320 CSS px oraz braku
  utraty po nadpisaniu odstępów tekstu. Normalny tekst wymaga kontrastu 4,5:1;
  4,499:1 nie przechodzi. Język strony musi być programowo określony.
  [WCAG 1.4.4 — Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html),
  [WCAG 1.4.10 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html),
  [WCAG 1.4.12 — Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing),
  [WCAG 1.4.3 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  [WCAG 3.1.1 — Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page)

Wniosek dla hybrydowej aplikacji jest celowo zachowawczy: zielony test CSS przy
100% nie wystarcza do deklaracji dostępności natywnej. Potrzebny jest systemowy
lub równoważny mechanizm 200% oraz dowód z fizycznego iOS i Androida.

## Audyt aktualnego stanu

### Wdrożone i potwierdzone w kodzie

| Obszar | Dowód | Ocena |
|---|---|---|
| Kroje | `src/fonts.css`, import przed `index.css` w `src/main.tsx` | Inter i Space Grotesk są self-hosted; cold start nie zależy od Google Fonts |
| Zakres znaków | Latin + Latin Extended w sześciu `@font-face` | polskie znaki i angielski są pokryte; nie pobieramy nieużywanych alfabetów |
| Wagi | Inter 100–900 normal/italic; Space Grotesk 300–700 normal | deklarowane zakresy odpowiadają plikom variable; Space nie udaje italic |
| Render awaryjny | `font-display: swap`; systemowe fallbacki body | tekst nie czeka bez końca na font; fallback jest dostępny |
| Offline bundle | aktualny `dist/assets`: 6 WOFF2, łącznie 318 284 B | fonty są częścią artefaktu; stan wymaga jeszcze cold-start testu urządzeniowego |
| Język | `LanguageProvider` aktualizuje `html.lang`; test w `typography-contract.test.tsx` | poprawny fundament dla PL/EN i czytników ekranu |
| Liczby serii | ważne pola używają `tabular-nums` | wartości nie przeskakują szerokością podczas treningu |
| Dolna granica JSX | `typography-global-contract.test.ts` skanuje produkcyjne TS/TSX | arbitralne klasy 8–10,5 px w TS/TSX są blokowane |

### Braki i ryzyka potwierdzone w kodzie

| Priorytet | Problem | Dowód | Ryzyko |
|---|---|---|---|
| P0 | Zoom web zależy od poprawnego bootu JS | statyczny `index.html` zachowuje natywny baseline, a `system-text-zoom.ts` usuwa restrykcje dopiero dla platformy web | awaria przed bootem pozostawia restrykcyjny viewport; wymaga świadomego testu fallbacku |
| P0 | Brak fizycznego dowodu reakcji WebView na ustawienie systemowe | `@capacitor/text-zoom` jest podłączony, lecz E2E 200% jest tylko proxy CSS | nie można jeszcze zadeklarować Larger Text ani poprawnego nieliniowego skalowania Android 14+ |
| P1 | Duży dług semantycznych ról tekstu | nadal około 280 arbitralnych `text-[Npx]`, liczne `text-xs`, `font-mono` i uppercase | spójność jest pilnowana dolną granicą, ale nie istnieje jeszcze mały, pełny system ról |
| P1 | Brak jednej semantycznej skali | 279 użyć arbitralnego `text-[…px]`; obok 413 `text-sm`, 400 `text-xs`, 223 `text-[11px]` | drobne rozjazdy metryk i trudna bezpieczna zmiana rozmiaru globalnie |
| P1 | Nadmiar stylizacji metadanych | 47 użyć `font-mono`, 333 linii z `uppercase`; wspólne klasy mają tracking 0,08–0,14 em | etykiety są głośniejsze i mniej czytelne niż ich znaczenie; PL wygląda ciaśniej |
| P1 | Dużo miejsc potencjalnej utraty treści | 103 linie z `truncate`, `line-clamp` lub `whitespace-nowrap` | przy 150–200% pełna treść może zniknąć albo stać się niejednoznaczna |
| P1 | Stałe wysokości w krytycznym flow | m.in. AppHeader, nav, WorkoutDay, ExerciseCard i Profile używają `h-*` razem z tekstem | większy tekst może się wyciąć; wymagane `min-height`, wrap albo układ pionowy |
| P2 | Koszt nieużywanego kroju | Inter italic to ok. 143,7 kB; w UI `italic` występuje tylko w jednej poradzie ćwiczenia | nie blokuje release, ale powiększa mobile bundle bez proporcjonalnej wartości |
| P2 | Tekst w eksportowanych obrazach | `CycleShareCard` zawiera 10 px w generowanym obrazie | nie jest tekstem interfejsu i nie skaluje się; wymaga osobnego testu czytelności eksportu |

Nie stwierdzono potrzeby wymiany Inter ani Space Grotesk. Root cause to brak ról,
brak pełnego guardu i brak sterowania skalą WebView, a nie jakość samych fontów.

## Docelowy minimalny system

Wszystkie rozmiary w tabeli są odpowiednikiem CSS px przy 100%; implementacja ma
użyć skalowalnych tokenów, nie rozsianych wartości `px`. Tokeny mają być jedynym
źródłem rozmiaru i line-height w UI. Używamy wag 400, 500, 600 i 700; 800/900 nie
są potrzebne do hierarchii produktu.

| Token / rola | Rodzina | Rozmiar / line-height | Waga | Zastosowanie |
|---|---|---:|---:|---|
| `type-display` | Space Grotesk | 32 / 38 | 700 | pojedyncza liczba lub rezultat hero, nie akapit |
| `type-screen-title` | Space Grotesk | 24 / 30 | 700 | tytuł ekranu, jeśli AppHeader nie wystarcza |
| `type-section-title` | Space Grotesk | 18 / 24 | 600 | główna sekcja, karta, nazwa ćwiczenia lub sesji |
| `type-body` | Inter | 17 / 24 | 400 | instrukcje, zgody, błędy i główna treść |
| `type-body-compact` | Inter | 15 / 22 | 400 | drugorzędny opis i zwarte listy |
| `type-control` | Inter | 16 / 22 | 600 | CTA, input, select i ważna akcja |
| `type-label` | Inter | 14 / 20 | 600 | etykiety pól, chipy operacyjne i taby |
| `type-meta` | Inter | 12 / 17 | 500 | data, jednostka i drugorzędne metadane |
| `type-timer` | Space Grotesk | 56 / 56 | 700 | timer przerwy; `tabular-nums`, jedna linia |

Reguły użycia:

1. Space Grotesk nie służy do akapitów, zgód, komunikatów błędu ani wszystkich
   przycisków. Inter nie potrzebuje osobnej rodziny mono do zwykłych liczb.
2. `tabular-nums` jest cechą wartości, nie pretekstem do `font-mono`. Monospace
   pozostaje wyłącznie dla kluczy technicznych w panelu admina.
3. Wersaliki są dozwolone tylko w krótkim eyebrow/micro, maksymalnie 20 znaków,
   z trackingiem do `0.08em`. Taby, CTA, instrukcje i błędy używają normalnej
   pisowni. Nazwy własne i ćwiczenia nie są automatycznie uppercased.
4. 11 px jest technicznym minimum wyjątków, nie rolą systemu. Tekst ważny dla
   wykonania treningu nie może używać 11/12 px, obniżonej opacity ani truncation
   bez dostępnej pełnej wersji.
5. Zwykła treść jest wyrównana do lewej. Centrowanie zostaje dla pojedynczego
   wyniku, timera i krótkiego pustego stanu.
6. Linie PL/EN mają się łamać naturalnie; nie stosujemy justowania. Separatory
   dziesiętne i jednostki nadal wynikają z locale oraz istniejącego `useUnit`.

## Kontrakt większego tekstu i reflow

Docelowy kontrakt ma trzy warstwy:

1. **Systemowy domyślny.** iOS i Android przekazują preferowany rozmiar do WebView
   przez mechanizm zgodny z platformą. Nie wyliczamy Androida prostym mnożnikiem
   `fontScale`, bo oficjalna dokumentacja opisuje skalę nieliniową.
2. **Prosty fallback w Profilu.** W zwiniętej sekcji Dostępność:
   `Systemowy`, `Większy`, `Największy`. Nie pokazujemy tego w onboardingu.
   Wybór zapisuje się lokalnie i działa offline; `Systemowy` pozostaje domyślny.
3. **Publiczny web.** Przeglądarka może powiększyć tekst co najmniej do 200%.
   Meta viewport nie blokuje zoomu. Natywne `zoomEnabled: false` może pozostać
   tylko wtedy, gdy warstwa 1/2 rzeczywiście zapewnia równoważne 200%.

Nie skalujemy całego `html` przez zmianę root `font-size`, ponieważ spacing i stałe
szerokości Tailwinda także używają `rem` i mogłyby podwoić szerokość kontrolek.
Każdy token typograficzny skaluje rozmiar oraz line-height, a layout zachowuje
niezależne jednostki. Aplikacja wystawia stan skali (`100`, `150`, `200`) również
dla reguł reflow.

Przy 150% i 200%:

- rzędy statystyk, zgód i przycisków przechodzą z układu obok siebie do pionowego;
- `height` tekstowych kontrolek staje się `min-height`, tytuły mogą mieć kilka linii;
- nazwa ćwiczenia, opis błędu, instrukcja i CTA nie są obcinane;
- powtarzalne ikony/tab bar mogą pozostać mniejsze, ale muszą mieć pełną etykietę
  dla czytnika i Large Content Viewer/równoważny sposób odczytu;
- tabela serii ma pozostać operacyjna jedną ręką. Preferowany wzorzec dla 200% to
  pionowa karta serii (kg, powtórzenia, RPE, wykonano), a nie ściskanie fontu;
- jedynym kierunkiem przewijania zwykłej treści jest pion. Wyjątek WCAG dla tabel
  dwuwymiarowych nie usprawiedliwia utraty podstawowej akcji treningowej.

## Etapowy plan wdrożenia

### Etap T0 — uczciwy kontrakt i pomiar (P0)

Zależności: brak. Najpierw test czerwony.

- rozszerzyć guard na CSS, standardowe klasy Tailwind, style inline i HTML
  generowany przez komponenty; rozdzielić UI od eksportów obrazowych;
- dodać test wykrywający blokadę zoomu w publicznym webie;
- dodać diagnostyczny test/manual probe: rzeczywisty computed font size przy
  ustawieniach iOS i Android 100/150/200;
- zinwentaryzować każde essential truncation i fixed-height w Dashboard, Plan,
  Historia, Postępy, Profil, onboarding i WorkoutDay.

Kryterium akceptacji: guard najpierw wykrywa obecne `.eyebrow-mono`/`.chip-mono`;
raport urządzeniowy mówi, czy ustawienie systemowe zmienia WebView, zamiast zakładać
wynik. Brak mechanizmu jest potwierdzonym blockerem, a nie pomijanym testem.

### Etap T1 — tokeny i dwa kroje (P0/P1)

Zależność: T0.

- zdefiniować tokeny z powyższej tabeli i test ich wartości/zakresów;
- migrować test-first: WorkoutDay/ExerciseCard/RestBar → onboarding i zgody →
  Dashboard/Plan → Historia/Postępy → Profil/Strava/admin;
- zastąpić 10–10,5 px minimum 11 px, ograniczyć mono i uppercase;
- zachować Inter normal/italic do czasu decyzji o jedynej poradzie italic;
  Space Grotesk nigdy nie przekracza 700 i nie dostaje sztucznego italic.

Kryterium akceptacji: produkcyjne ekrany nie mają arbitralnych rozmiarów poza
udokumentowanymi wyjątkami timera/eksportu; computed style każdej roli zgadza się
z tokenem w PL i EN; cold start offline pokazuje font lub czytelny fallback.

### Etap T2 — skala systemowa i fallback (P0)

Zależności: T1 oraz osobna, udokumentowana decyzja native-first o mechanizmie
Capacitor/WebView. Nie używać integracji do wymuszenia 100%.

- podłączyć preferencję systemową, a jeśli WebView nie daje parity, udostępnić
  trzy proste ustawienia w Profilu;
- zapisać wybór offline i zastosować go przed pierwszym renderem bez flasha;
- publicznemu webowi przywrócić zoom; natywny pinch pozostaje decyzją shellu;
- dla 150/200 wprowadzić jawne warianty reflow zamiast automatycznego zmniejszania.

Kryterium akceptacji: zmiana ustawienia systemowego lub fallbacku widocznie zmienia
body/CTA/etykiety; restart offline zachowuje wybór; 200% nie traci żadnej funkcji.

### Etap T3 — pełna regresja i podpis urządzeniowy (P0)

Zależności: T2.

- automatyczne screenshoty i testy DOM w PL/EN, 320×568, 390×844 i landscape,
  przy 100/150/200 oraz z regułami WCAG Text Spacing;
- fizyczny iOS i Android według macierzy poniżej;
- powtórzyć krytyczną sekwencję treningu przy 200% i offline;
- dopiero po pełnym podpisie rozważyć deklarację App Store Larger Text.

Kryterium akceptacji: zero overlap, clippingu, nieosiągalnych CTA, poziomego
scrolla zwykłej treści i niejednoznacznej truncation. Nie wystarczy screenshot
ekranu startowego; wspólne zadania muszą dać się ukończyć.

## Testy automatyczne

1. **Font contract:** tylko Inter/Space w produkcyjnym UI; poprawne zakresy wag,
   Latin/Latin Extended, `font-display: swap`, brak zewnętrznych hostów fontów.
2. **Token contract:** wszystkie role mają rozmiar, line-height, wagę i rodzinę;
   CSS/TSX nie zawiera żywego tekstu poniżej 11 px ani niedozwolonej wagi Space.
3. **Language contract:** `html.lang` przełącza się `pl`/`en`; mieszane fragmenty
   językowe dostają `lang`, jeżeli realnie wystąpią.
4. **Resize 200%:** Playwright ustawia skalę 100/150/200 i dla każdej kluczowej
   trasy sprawdza brak overflow X, niedostępnych przycisków i obciętych pól.
5. **WCAG text spacing:** wstrzyknięcie line-height `1.5`, paragraph spacing `2em`,
   letter spacing `0.12em`, word spacing `0.16em`; zero overlap i utraty akcji.
6. **Essential text:** błędy, nazwy ćwiczeń, CTA i wartości serii nie mają
   `truncate`/`line-clamp`, chyba że pełna treść jest osiągalna po focus/tap.
7. **Numeric stability:** kg/lb, `10–12`, `100,5`, timer `59:59`, RPE i tonaż
   mieszczą się przy 200%; computed style ma `tabular-nums`.
8. **PL/EN snapshots:** najdłuższe realne tłumaczenia i polskie diakrytyki; brak
   sztucznych skrótów tylko po to, aby przejść test.
9. **Fallback/offline:** zablokowane WOFF2 i osobno cold cache; tekst pojawia się
   bez FOIT, flow pozostaje wykonalny, po załadowaniu fontu nie znika CTA.
10. **Contrast:** każda rola tekstowa na realnym tle i dla wszystkich presetów
    palet ma minimum 4,5:1; próg nie jest zaokrąglany.
11. **Critical sequence:** plan → wyjście → szybki trening → powrót do planu →
    zakończenie → synchronizacja przy 200%; komplet ćwiczeń i draft bez zmian.

## Testy na fizycznych urządzeniach

### iOS

- mały iPhone oraz bieżący rozmiar Pro: domyślny, największy standardowy, AX3 i
  AX5; osobno Bold Text, Increase Contrast, dark/light;
- onboarding, zgody, login, pięć głównych zakładek, raport błędu z klawiaturą,
  sheet dodania ćwiczenia oraz pełny trening;
- ekran zgaszony w trakcie treningu, powrót po notyfikacji, obrót landscape,
  force-kill i odzyskanie draftu przy największym tekście;
- VoiceOver: kolejność tytuł → treść → akcja, wartości liczbowe z jednostką,
  brak odczytywania liter wersalików jako skrótów.

### Android

- mały telefon Android 14+ przy font scale 100%, 150% i 200%; display size testowany
  osobno, ponieważ to nie jest ten sam parametr;
- TalkBack, dark/light, landscape, klawiatura Gboard i system back;
- te same ścieżki treningu i recovery co na iOS, w tym offline i process restart;
- potwierdzić nieliniową hierarchię: duże hero nie wypiera body ani głównego CTA.

### Wspólne kryterium podpisu

Użytkownik może bez zgadywania: wybrać plan, rozpocząć sesję, wpisać kg i
powtórzenia, zakończyć odpoczynek, dodać ćwiczenie, wyjść z błędu, zakończyć i
zsynchronizować trening. Każda informacja potrzebna do tych czynności jest pełna,
czytelna i osiągalna przy największym testowanym tekście.

## Status release 1.0.0

Typografia bazowa i offline font bundle są wdrożone. Semantyczne tokeny, skuteczne
200%, reflow krytycznych ekranów i podpis fizycznych urządzeń są **planem, nie
stanem obecnym**. Do czasu ukończenia T0–T3 pozostają blockerem udokumentowanej
gotowości dostępności. Nie zmienia to numeru wersji `1.0.0`.

## Aktualizacja X49 — 2026-08-28

- Zainstalowano oficjalny `@capacitor/text-zoom` 8.0.1 zgodny z Capacitor 8.
  Android odczytuje preferencję systemową i ustawia `WebSettings.textZoom`; iOS,
  gdzie plugin nie udostępnia `set`, mapuje `getPreferred()` na
  `--app-text-scale`. Instalacja obejmuje cold start i foreground resume.
- Dodano testy platformowe dla iOS/Android/web, wartości błędnych i resume oraz
  Playwright 200% dla onboardingu, Profilu i startu treningu w Chromium/WebKit.
- Dolna nawigacja nie używa już `truncate`; etykiety zawijają się. Wspólne
  Button/Tabs i avatar nagłówka mają mobilny target minimum 44×44.
- Pełnoekranowe bramki zgód, weryfikacji, logowania i błędu mają `100dvh`,
  przewijanie i safe-area. To usuwa automatycznie wykrywalną klasę niedostępnych
  CTA, lecz nie zastępuje testu z realną klawiaturą i czytnikiem ekranu.
- Nadal istnieją arbitralne `text-[Npx]` poza krytyczną ścieżką. Migracja tokenów
  T1 pozostaje falowa; fizyczne 100/150/200% oraz VoiceOver/TalkBack są nadal
  otwartymi bramkami.

## Aktualizacja X52 — web zoom i granice dowodu

- `system-text-zoom.ts` usuwa `maximum-scale` i `user-scalable` tylko na webie;
  natywny shell zachowuje projectowy baseline pinch-zoom i używa Text Zoom.
- Test platformowy jest zielony 7/7. Produkcyjne zachowanie zoomu i reflow przy
  200% jest zielone 8/8 w Chromium i WebKit.
- E2E mnożący computed font-size pozostaje testem proxy. Nie dowodzi natywnego
  Dynamic Type ani nieliniowej skali Androida 14+.
- Nie dodajemy mechanicznie `fontScale` do `configChanges`: najpierw fizyczny test
  zmiany skali przy otwartej aplikacji, recreate/resume oraz zachowania draftu,
  kolejki synchronizacji i aktywnego modala.
- Macierz urządzeniowa 1.0 obejmuje dark mode, największy tekst, Bold Text/
  Increase Contrast, 320 dp, landscape i klawiaturę. Light mode nie jest osobną
  bramką, ponieważ runtime aplikacji wymusza dark mode.
