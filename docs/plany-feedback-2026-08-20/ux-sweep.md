# Plan obszaru: ux-sweep

## Obszar
T23: drobne poprawki UI/UX na głównych ekranach (Dashboard, Historia, Progress, Ćwiczenia, Profil)

## Stan istniejący
Ekrany są w dobrym stanie po audytach D-T1/D-T2 i PRO-D/E: spójne EmptyState (Z82), bottom nav z pigułką, tytuły stron centralnie w Layout.tsx (pageTitleKeys), chipy design systemu w src/components/kinetic/Chip.tsx (DESIGN.md par. 5), statystyki all-time z agregatu Z216/Z217. Znalezione luki: (1) Dashboard.tsx:723 renderuje AllTimeStatsSheet BEZ prop uid, więc "Twoje liczby" otwarte z Dashboardu liczą tylko okno 'recent' listenera zamiast dociągać pełną historię (AppHeader.tsx:122 przekazuje uid poprawnie); (2) ExerciseDetail.tsx:93 przycisk wstecz to goły navigate(-1) bez guarda idx, którego Layout.tsx:39-48 używa; (3) WorkoutHistory.tsx:521 dialog usuwania pokazuje dayName bez localizeDayName (reszta pliku lokalizuje); (4) WorkoutHistory.tsx:241-244 dwa pola date z identycznym aria-label i bez widocznych etykiet Od/Do; (5) ExerciseLibrary.tsx:185 hardcoded polskie cudzysłowy przy pustych wynikach, także w EN i przy pustym query; (6) /history i /achievements mają zdublowany tytuł (AppHeader "Historia treningów" + identyczny h1 w treści; analogicznie "Postępy" w ProgressHeader, Achievements.tsx:88-92); (7) WorkoutHistory.tsx:33-44 lokalny FilterChip duplikuje kinetic Chip z innym aktywnym kolorem (bg-primary text-background vs bg-accent text-accent-foreground). Celowo POMINIĘTE jako obszar innych zadań: surowe daty ISO w wierszach/porównaniu Historii i toaście pomiarów (T18 audytuje wszystkie miejsca formatowania dat), text-background na bg-primary w chipach/tabach (T24 audyt akcentu), cała zakładka Plan (T16/T9/T17), ikona ArrowRightLeft w wierszu biblioteki (mockup wdrożony 1:1, decyzja właściciela "nie upraszczaj mockupów").

## Zadania

### T23-1: Dashboard: przekaż uid do AllTimeStatsSheet (zaniżone 'Twoje liczby') (effort: S)
**Pliki:** src/pages/Dashboard.tsx, src/test/all-time-stats-sheet.test.tsx

**Podejście:**
Jednoliniowa zmiana w Dashboard.tsx:723: <AllTimeStatsSheet open={statsOpen} onOpenChange={setStatsOpen} workouts={workouts} uid={uid} />. Bez uid sheet nigdy nie odpala fetchWorkoutRange (AllTimeStatsSheet.tsx:41-50, efekt Z216), więc statystyki liczą się z okna 'recent' listenera i zaniżają liczby userom z długą historią. AppHeader robi to już poprawnie (AppHeader.tsx:122), Dashboard został pominięty przy Z216.

**Testy:**
Rozszerzyć src/test/all-time-stats-sheet.test.tsx (fetchWorkoutRange już zmockowane na górze pliku): przypadek z uid → expect(fetchWorkoutRange).toHaveBeenCalledWith('u1', ...); przypadek bez uid → not.toHaveBeenCalled. Potem npm run test, typecheck. Ręcznie: otwarcie 'Twoich liczb' z Dashboardu na koncie z historią.

**Ryzyka:**
Minimalne. Fallback na okno listenera zostaje przy błędzie sieci (catch w sheecie), więc offline nic się nie psuje. Zasada 5: nic nie zabieramy, tylko dokładamy źródło danych, sheet renderuje bazę natychmiast i podmienia po fetchu.

### T23-2: ExerciseDetail: martwy przycisk wstecz przy zimnym starcie z deep linka (effort: S)
**Pliki:** src/pages/ExerciseDetail.tsx

**Podejście:**
ExerciseDetail.tsx:93: onClick={() => navigate(-1)} nie ma dokąd cofnąć, gdy user wszedł z deep linka / odświeżył PWA na /exercise/:slug (idx historii = 0), a to ekran focused flow BEZ AppHeadera (Layout.tsx:32), więc to jedyne wyjście. Skopiować wzorzec z Layout.tsx:39-48: const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0; idx > 0 ? navigate(-1) : navigate('/exercises').

**Testy:**
Ręczny scenariusz (nawigacja historii nie do sensownego unit testu): 1) wejście z biblioteki → wstecz wraca do listy; 2) odświeżenie strony na /exercise/martwy-ciag (symulacja cold start) → wstecz prowadzi do /exercises zamiast nic nie robić. Vitest: bez nowego testu, npm run test + typecheck jako regresja.

**Ryzyka:**
Zasada 6 z CLAUDE.md (każdy stan ma wyjście) wprost. Nie ruszać IosSwipeBack ani guarda w Layout (osobne mechanizmy). Zmiana tylko w handlerze jednego przycisku.

### T23-3: Historia: dialog usuwania pokazuje niezlokalizowaną nazwę dnia (effort: S)
**Pliki:** src/pages/WorkoutHistory.tsx

**Podejście:**
WorkoutHistory.tsx:521: day: pendingDelete ? resolver.resolveDayLabel(pendingDelete).dayName : '' → owinąć localizeDayName(resolver.resolveDayLabel(pendingDelete).dayName, lang). Import localizeDayName już jest (linia 20), wszystkie inne miejsca w pliku (357-377, 234) lokalizują konsekwentnie, tylko dialog usuwania wypadł. Surową datę ISO w tym samym opisie zostawić: to obszar audytu T18.

**Testy:**
Wzór: src/test/exercise-name-localization.test.tsx (asercje lokalizacji nazw per język). Pełny render strony WorkoutHistory jest ciężki (dużo hooków), więc wystarczy ręczny scenariusz: język EN → Historia → Usuń → nazwa dnia po angielsku. npm run test + typecheck.

**Ryzyka:**
Zero ryzyka funkcjonalnego (czysty wrap call-site). Nie dotykać klucza history.deleteDesc (placeholdery {day}/{date} zostają).

### T23-4: Historia: pola zakresu dat bez etykiet Od/Do (effort: S)
**Pliki:** src/pages/WorkoutHistory.tsx, src/i18n/locales/pl.ts, src/i18n/locales/en.ts

**Podejście:**
WorkoutHistory.tsx:241-244: dwa gołe <Input type=date> w grid-cols-2 dzielą ten sam aria-label ('history.dateRange'), a puste pole date na iOS nie pokazuje żadnej podpowiedzi, więc user nie wie które jest od, a które do. Owinąć każdy w div z małą etykietą (<span className="text-xs text-muted-foreground">) i dać rozdzielne aria-label. Nowe klucze history.dateFrom ('Od'/'From') i history.dateTo ('Do'/'To') do OBU plików locales, obok istniejącego history.dateRange (pl.ts:524 okolice).

**Testy:**
Typecheck wymusza parytet kluczy pl/en (pułapka i18n z CLAUDE.md). Ręcznie: mobile viewport, filtr zakresu dat czytelny, filtrowanie działa jak dotąd. Bramka: npm run test (filtrowanie po fromDate/toDate ma logikę w useMemo, nietkniętą).

**Ryzyka:**
Czysto addytywne (zasada 5: filtr działa identycznie). Trzymać istniejący grid grid-cols-2, żeby nie rozjechać layoutu karty filtrów na wąskich ekranach.

### T23-5: Biblioteka ćwiczeń: 'brak wyników' z twardo wpisanymi polskimi cudzysłowami (effort: S)
**Pliki:** src/pages/ExerciseLibrary.tsx, src/i18n/locales/pl.ts, src/i18n/locales/en.ts

**Podejście:**
ExerciseLibrary.tsx:185: {t('exercises.noResults')} „{searchQuery}” renderuje polskie cudzysłowy w UI angielskim, a przy pustym query (filtr kategorii) pokazuje puste „”. Fix: nowy klucz exercises.noResultsFor (PL: 'Brak wyników dla „{query}”', EN: 'No results for "{query}"') i warunek: searchQuery ? t('exercises.noResultsFor', { query: searchQuery }) : t('exercises.noResults'). Klucze do OBU locales.

**Testy:**
Typecheck (parytet kluczy). Ręcznie: EN + wyszukanie 'xyz' → angielski komunikat z prostymi cudzysłowami; PL bez zmian wizualnych dla usera. npm run test jako regresja filtrowania.

**Ryzyka:**
Brak. Jedyny detal: interpolacja t() musi dostać string (searchQuery już nim jest).

### T23-6: Zdublowany tytuł strony na /history i /achievements (wymaga OK właściciela) (effort: M)
**Pliki:** src/pages/WorkoutHistory.tsx, src/pages/Achievements.tsx, e2e/full-app.spec.ts, e2e/critical.spec.ts

**Podejście:**
Na mobile AppHeader pokazuje 'HISTORIA TRENINGÓW' (layout.title.history), a bezpośrednio pod nim strona renderuje identyczny h1 (WorkoutHistory.tsx:196-202); to samo 'POSTĘPY' w ProgressHeader (Achievements.tsx:88-92). Usunąć wewnętrzny h1 (podtytuł muted zostaje jako opis), co odzyskuje ok. 50-60 px scrolla nad filtrami. Zaktualizować asercje e2e, które celują w heading wewnątrz main: full-app.spec.ts:34 i critical.spec.ts:104 ('Historia treningów') oraz full-app.spec.ts:331 ('Postępy') → przenieść asercję na nagłówek AppHeadera (page.getByRole('banner')...) albo na podtytuł.

**Testy:**
Playwright: e2e/critical.spec.ts i e2e/full-app.spec.ts po korekcie selektorów (przed biegiem pkill -f vite + czyszczenie node_modules/.vite, zasada 9 z CLAUDE.md). Vitest bez zmian. Ręcznie: oba ekrany na wąskim viewportcie.

**Ryzyka:**
To decyzja designowa, więc NAJPIERW potwierdzenie właściciela (wzorzec 'wdrażaj 1:1' z pamięci projektu). Ryzyko a11y: aria-label tablistu w ProgressHeader używa t('progress.title') i ma zostać. Nie ruszać Dashboardu (greeting to nie duplikat) ani /exercises (h2 to nagłówek listy z licznikiem, nie duplikat tytułu).

### T23-7: Historia: lokalny FilterChip duplikuje kinetic Chip (inny kolor aktywny) (effort: S)
**Pliki:** src/pages/WorkoutHistory.tsx

**Podejście:**
WorkoutHistory.tsx:33-44 definiuje własny FilterChip (aktywny: bg-primary text-background), podczas gdy design system ma Chip w src/components/kinetic/Chip.tsx (aktywny: bg-accent text-accent-foreground, DESIGN.md par. 5) używany w bibliotece ćwiczeń. Zastąpić FilterChip importem Chip (Chip przyjmuje className, więc ewentualna korekta paddingu px-3.5/py-1.5 przez className). Usunąć martwą lokalną definicję (orphan własnej zmiany, Karpathy 3).

**Testy:**
npm run test + typecheck; ręcznie: chipy statusu i dni planu w Historii wyglądają jak chipy kategorii w Ćwiczeniach, stany active/inactive przełączają się. Screenshot przed/po dla właściciela (zmiana koloru aktywnego z limonki na cyan).

**Ryzyka:**
KOORDYNACJA Z T24: agent audytu akcentu będzie dotykał tych samych klas (text-background na bg-primary); wdrożyć PO decyzjach T24 albo w jednym commicie z nim, żeby nie robić konfliktu. Zmiana wizualna (primary → accent na aktywnym chipie), więc pokazać właścicielowi. Funkcjonalnie zero zmian: onClick i stany 1:1.

## Notatki
Posortowane wg wartości: T23-1 (realny błąd danych w UI) i T23-2 (user uwięziony na ekranie) na czele; T23-6 i T23-7 na końcu, bo wymagają decyzji właściciela lub koordynacji. Świadomie NIE zgłaszam (obszary innych zadań): surowe daty ISO w nagłówku wiersza Historii (WorkoutHistory.tsx:358), w opisie porównania (:256), w opisie dialogu usuwania i w toaście pomiarów (Measurements.tsx:49, klucz measurements.saveSuccessDesc) → wszystko dla agenta T18 (audyt formatowania dat); text-background zamiast text-primary-foreground na bg-primary (FilterChip, taby ProgressHeader, ikona powitania text-fitness-warning na Dashboardzie) → T24; cała zakładka Plan → T16/T9/T17. Wspólne niezmienniki dla wszystkich zadań: żadne nie dotyka draftu, timerów, listy ćwiczeń sesji ani cyklu życia apki, więc checklist background/resume nie jest wyzwalany; każdy fix to osobny commit (Karpathy 4); klucze i18n zawsze do pl.ts I en.ts (typecheck to egzekwuje); przed e2e restart dev servera (zasada 9). Wszystkie ścieżki plików zweryfikowane w repo.
