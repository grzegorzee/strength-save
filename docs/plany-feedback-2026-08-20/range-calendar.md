# Plan obszaru: range-calendar

## Obszar
T20: Kalendarz zakresów od-do w stylu Booking (klik start + klik koniec, dni pomiędzy podświetlone akcentem apki)

## Stan istniejący
Apka NIE MA żadnego komponentu kalendarza ani date-pickera. Brak react-day-picker w package.json, brak src/components/ui/calendar.tsx (w ui/ jest popover.tsx, dialog.tsx, chip-button.tsx). date-fns@^3.6.0 jest w dependencies, ale wybory dat to wszędzie natywne <input type="date">. Miejsca wyboru ZAKRESU od-do (3, wszystkie zweryfikowane w kodzie): 1) src/components/VacationDialog.tsx (urlop/wyjazd "Zaplanuj", otwierany z src/pages/TrainingPlan.tsx ~l.822): inputy vac-start/vac-end (l.93-125) + presety 7/14/21 dni + walidacja vacationRangeDays MIN 3/MAX 21 z src/lib/vacation-mode.ts; test src/test/vacation-dialog.test.tsx. 2) src/components/ExportWorkoutsDialog.tsx (eksport CSV, wejścia: Historia + Ustawienia-Dane przez DataManagement.tsx): kind='custom' renderuje export-custom-from/export-custom-to (l.198-215); logika zakresu w src/lib/workout-export-range.ts (from pusty = 1970, to pusty = dziś, from>to = null/disabled); test src/test/workout-export-range.test.ts; e2e/export-csv-dialog.spec.ts NIE dotyka custom. 3) src/pages/WorkoutHistory.tsx l.240-244: filtr zakresu dat (fromDate/toDate w state, puste stringi = brak filtra, porównanie stringów ISO l.94-95). NIE są zakresami (poza T20): AddCardioDialog i PlanWizard (pojedyncza data), RescheduleSheet (wybór dnia), EmailWorkoutDialog "przegląd 30 dni" (tylko presety week/last30, bez od-do), Analytics (Week/Month toggle + PDF 12 mies. na sztywno, bez pickera). Akcent apki = CSS var --primary/--accent ustawiane przez applyAccent (src/lib/accent-theme.ts, paleta 11 + custom hex), więc Tailwindowe bg-primary/text-primary automatycznie przejmują wybrany kolor. Gotowe helpery: formatLocalDate/parseLocalDate/calendarDayDiff/addCalendarDays (src/lib/utils.ts), dateLocale(lang) 'pl-PL'/'en-US' (src/i18n/index.ts). Wzorce ręcznych siatek miesiąca już istnieją: TrainingHeatmap.tsx, strava/MonthlyActivities.tsx. Nic z T20 nie jest jeszcze zrobione, ale VacationDialog ma już poprawną semantykę zakresu Od-Do w stanie (startISO/endISO), co minimalizuje zmianę.

## Zadania

### T20.1: Nowy komponent ui/range-calendar.tsx + czysta logika wyboru zakresu (bez zależności) (effort: M)
**Pliki:** src/components/ui/range-calendar.tsx, src/lib/date-range-select.ts

**Podejście:**
1) src/lib/date-range-select.ts: czysta funkcja nextRangeSelection(current: {from: string|null, to: string|null}, clickedISO: string) z semantyką Booking: brak from albo pełny zakres -> nowy from (to=null); jest from bez to i klik >= from -> to=klik; klik < from -> nowy from. Zero DOM-u, testowalna osobno. 2) src/components/ui/range-calendar.tsx: props value {from, to}, onChange, minDate?, maxDate?, initialMonth?, testId?. Render: nagłówek miesiąca przez Intl.DateTimeFormat(dateLocale(lang), {month:'long', year:'numeric'}) (lang z useTranslation, NIE z systemu — pułapka T18), strzałki prev/next (ChevronLeft/Right z lucide, aria-label z i18n), wiersz skrótów dni tygodnia przez Intl weekday short, siatka grid grid-cols-7, tydzień od poniedziałku. Daty wyłącznie przez parseLocalDate/formatLocalDate/addCalendarDays z lib/utils (nigdy new Date(iso) na stringu). Style tokenami akcentu: from/to = bg-primary text-primary-foreground font-semibold rounded-full; dni pomiędzy = bg-primary/15 text-foreground (zasada 8: tło z przezroczystością); pasek ciągły (zaokrąglenia tylko na krańcach); disabled poza min/max = text-muted-foreground/40 + disabled; dziś = ring-1 ring-primary/50. Każdy dzień jako button z data-day='YYYY-MM-DD', data-in-range/data-selected atrybutami (pod testy), aria-label pełną datą, aria-pressed. Tap target min 40px (h-10). Auto-nawigacja: initialMonth = from albo dziś.

**Testy:**
src/test/date-range-select.test.ts (nowy): pierwszy klik ustawia from; drugi klik po from ustawia to; klik przed from restartuje from; klik przy pełnym zakresie restartuje. src/test/range-calendar.test.tsx (nowy, wzór setupu z LanguageProvider jak w src/test/vacation-dialog.test.tsx): render siatki, dwa kliki wywołują onChange z zakresem, dni pomiędzy mają data-in-range, dni przed minDate disabled, nawigacja miesiąca zmienia nagłówek, nagłówek po polsku przy app-language=pl i po angielsku przy en (asercje po atrybutach data-*, nie po klasach CSS).

**Ryzyka:**
Ręczna matematyka kalendarza (długości miesięcy, przełom roku) — mitigacja: wszystkie operacje przez istniejące parseLocalDate/addCalendarDays, testy na przełomie 2026-12/2027-01. Poniedziałkowy start tygodnia przy en-US to odstępstwo od konwencji US — świadoma decyzja, wpis do DECYZJE.md. Zasada 7: nie cofać baseline'u WebView (user-select/tap-highlight globalnie wyłączone, nic nie dodawać). Koordynacja z T24: zero hardcode kolorów, wyłącznie tokeny primary/muted/border.

### T20.2: Wrapper DateRangeField (trigger + Popover) dla miejsc bez miejsca na kalendarz inline (effort: S)
**Pliki:** src/components/DateRangeField.tsx

**Podejście:**
Mały wrapper: przycisk-trigger (wariant outline, ikona CalendarRange) pokazujący sformatowany zakres 'od – do' przez toLocaleDateString(dateLocale(lang), {day:'numeric', month:'short', year:'numeric'}) albo placeholder t('range.pick'); Popover (istniejący src/components/ui/popover.tsx) z RangeCalendar w środku + przycisk t('range.clear') zerujący zakres (zasada 6: stan filtra zawsze ma wyjście). Props przelotowe: value/onChange/minDate/maxDate/testId. Używany TYLKO w filtrze Historii (T20.5); w dialogach kalendarz idzie inline (Popover zagnieżdżony w Radix Dialog w WKWebView = ryzyko focus/scroll, unikać).

**Testy:**
Pokryty pośrednio testem range-calendar + krótki test w range-calendar.test.tsx albo osobny: klik triggera otwiera kalendarz, wybór zakresu aktualizuje label triggera, Wyczyść woła onChange z {from:null,to:null}.

**Ryzyka:**
Popover w WKWebView: trzymać się wzorca z ui/popover.tsx (Radix Portal), nie stackować z Dialogiem. Formatowanie labelki musi iść przez dateLocale(lang), nie locale systemu (bug T18).

### T20.3: VacationDialog: kalendarz zakresu inline zamiast dwóch inputów date (effort: M)
**Pliki:** src/components/VacationDialog.tsx, src/test/vacation-dialog.test.tsx

**Podejście:**
Chirurgicznie: wymienić TYLKO blok dwóch Input type=date (l.93-125) na inline RangeCalendar z minDate=todayISO, value={from: startISO, to: endISO}, onChange mapującym na istniejący stan (from -> setStartISO, to -> setEndISO; to=null podczas wyboru drugiego końca = endISO tymczasowo równy startISO albo osobny stan pending — najprościej: trzymać w dialogu value kalendarza 1:1 i wyliczać rangeDays tylko gdy oba końce są). NIE ruszać: presetów 7/14/21 (dalej ustawiają endISO=addDaysISO(startISO, n-1) i podświetlają się w kalendarzu przez value), walidacji vacationRangeDays MIN/MAX z komunikatami vac.errTooShort/vac.errTooLong, podsumowania vac-summary, wyboru aktywności, disabled vac-enable, gałęzi vacation!=null i reducedModeActive. Usunąć lokalne addDaysISO tylko jeśli zastąpione addCalendarDays z lib/utils (orphan po własnej zmianie — dozwolone). Wysokość: DialogContent może przekroczyć ekran iPhone SE — dodać lokalnie max-h-[85vh] overflow-y-auto na DialogContent tego dialogu, NIE zmieniać globalnego ui/dialog.tsx.

**Testy:**
Przerobić interakcje w src/test/vacation-dialog.test.tsx z fireEvent.change na kliki w [data-day='...']: (a) test presetu 14 dni od 2026-12-28 -> 2027-01-10 ZOSTAJE (preset działa na stanie), (b) test zakresu 23-31.08 = 9 dni klikami w kalendarz, (c) test 'koniec przed początkiem' ZAMIENIĆ na asercję nowego zachowania: klik dnia przed startem ustawia nowy start (zakres zrestartowany), (d) testy MIN 3/MAX 21 zostają (klik zbyt bliskiego/dalekiego dnia -> komunikat, vac-enable disabled), (e) testy gałęzi vacation aktywny + reducedMode bez zmian. Niezmiennik (zasada 5): wszystkie dotychczasowe asercje wyniku onEnable(startISO, dni, activity) przechodzą.

**Ryzyka:**
Radix Dialog: nie zmieniać cyklu życia open/unmount (pułapka builda 92) — kalendarz to zwykły children. Zakres przechodzący przez granicę miesiąca: highlight widoczny tylko w bieżącym miesiącu, podsumowanie vac-summary dalej pokazuje pełen zakres — zadbać, by preset 21 dni nawigował kalendarz do miesiąca startu, nie skakał. Semantyka null-to podczas wyboru: nie dopuścić, by rangeDays liczyło się z endISO sprzed restartu (stale summary).

### T20.4: ExportWorkoutsDialog: kalendarz zakresu inline dla kind='custom' (effort: S)
**Pliki:** src/components/ExportWorkoutsDialog.tsx

**Podejście:**
Wymienić TYLKO blok kind==='custom' (l.198-215, dwa Input) na inline RangeCalendar: value={from: customFrom||null, to: customTo||null}, onChange mapujący null->'' (stan i typy bez zmian), maxDate=today (eksport przyszłości bez sensu), bez minDate. NIE ruszać: chipów week/month/last10/last30/cycle, Selecta cyklu, exportRangeBounds (src/lib/workout-export-range.ts nietknięty — sam from bez to dalej znaczy from->dziś, przycisk disabled przy zakresie pustym logicznie), efektu preview (boundsKey przeżywa, bo bounds liczone z tych samych stringów), handleExport i Blob flow.

**Testy:**
src/test/workout-export-range.test.ts bez zmian (lib nietykany) — uruchomić jako regresję. E2e e2e/export-csv-dialog.spec.ts nie dotyka custom — bez zmian, uruchomić. Opcjonalnie krótki test komponentowy: wybór zakresu w kalendarzu przy kind=custom aktualizuje preview (mock fetchWorkoutHistoryPage) — tylko jeśli tanio, inaczej pokrycie zostaje na poziomie range-calendar.test.tsx.

**Ryzyka:**
Wysokość dialogu: chipy + kalendarz + preview + stopka mogą nie mieścić się na małych ekranach — ta sama lokalna mitigacja max-h/overflow co w T20.3. Zasada 5: niczego nie zabierać przepływom presetów — zmiana renderuje się wyłącznie w gałęzi kind==='custom'.

### T20.5: WorkoutHistory: filtr zakresu dat przez DateRangeField (popover) z Wyczyść (effort: S)
**Pliki:** src/pages/WorkoutHistory.tsx

**Podejście:**
Wymienić TYLKO blok 'Zakres dat' (l.240-244, grid z dwoma Input) na DateRangeField: value={from: fromDate||null, to: toDate||null}, onChange mapujący null->'' do istniejących setFromDate/setToDate. Filtrowanie (l.94-95, porównania stringów) i useMemo deps bez zmian. 'Wyczyść' w popoverze przywraca pusty filtr = wszystkie treningi (dziś user czyści natywny input — funkcja nie może zniknąć, zasada 6). Bez minDate/maxDate (filtr historii może patrzeć dowolnie wstecz).

**Testy:**
Brak dziś testu komponentowego strony Historii dla filtra dat — nie budować nowego dużego testu strony (surgical); pokrycie: range-calendar.test.tsx + test Wyczyść w DateRangeField (T20.2). Ręczny scenariusz: Historia -> otwórz zakres -> wybierz -> lista się zawęża -> Wyczyść -> pełna lista; na realnym iPhone (popover + scroll strony).

**Ryzyka:**
Popover w karcie ze scrollem strony w WKWebView: sprawdzić, że otwarty popover nie łapie scroll-locka na body (używamy czystego Radix Popover, nie Dialog — powinno być ok, ale to punkt ręcznego testu). Zasada 5: pozostałe filtry (szukajka, chipy statusu, chipy dnia, onlyPRs) nietknięte.

### T20.6: Klucze i18n dla kalendarza (OBA pliki locales) (effort: S)
**Pliki:** src/i18n/locales/pl.ts, src/i18n/locales/en.ts

**Podejście:**
Dodać symetrycznie do pl.ts i en.ts: range.pick ('Wybierz zakres dat' / 'Pick a date range'), range.clear ('Wyczyść' / 'Clear'), range.prevMonth ('Poprzedni miesiąc' / 'Previous month'), range.nextMonth ('Następny miesiąc' / 'Next month'). Nazwy miesięcy i dni tygodnia NIE idą do locales — generowane przez Intl.DateTimeFormat(dateLocale(lang)), zero duplikacji. Istniejące klucze vac.*, exportCsv.*, history.dateRange zostają (nagłówki/komunikaty dalej w użyciu).

**Testy:**
npm run typecheck (parność kluczy pl/en pilnowana typem — brak klucza w jednym pliku = fail). Asercja językowa w range-calendar.test.tsx (nagłówek miesiąca po pl i en).

**Ryzyka:**
Pominięcie klucza w jednym z plików = czerwony typecheck (znana pułapka z CLAUDE.md — dlatego oba pliki w jednym commicie).

### T20.7: Testy sekwencji + bramki przedwdrożeniowe (effort: M)
**Pliki:** src/test/date-range-select.test.ts, src/test/range-calendar.test.tsx, src/test/vacation-dialog.test.tsx

**Podejście:**
Domknięcie: 1) komplet testów z T20.1/T20.3 zielony, 2) npm run test + typecheck + lint + build, 3) e2e mock (export-csv-dialog.spec.ts, full-app) — przed biegiem pkill -f vite + wyczyść node_modules/.vite (zasada 9), 4) ręczny scenariusz sekwencji na realnym iPhone: Plan -> Zaplanuj urlop -> wybór zakresu klikami (w tym przełom miesiąca) -> preset 14 -> zapis -> anuluj urlop; Historia -> filtr zakresu -> Wyczyść; Historia -> Eksport CSV -> custom -> pobranie pliku w WKWebView; zmiana akcentu w Profilu -> kalendarz przejmuje nowy kolor (highlight dni pomiędzy). 5) Wpis do DECYZJE.md (decyzja: własny kalendarz zamiast react-day-picker, tydzień od poniedziałku, restart zakresu zamiast błędu od>do).

**Testy:**
Jak w approach; wzory istniejące: src/test/vacation-dialog.test.tsx (setup LanguageProvider + testId), src/test/workout-export-range.test.ts (regresja libu). Kryterium done = scenariusz użytkownika na urządzeniu, nie kompilacja (zasada 2).

**Ryzyka:**
Zwietrzały dev server = fałszywe faile e2e (zasada 9). Blob download w WKWebView dla eksportu — mechanizm nietykany, ale ręczny test potwierdza brak regresji. Dane usera święte: testy ręczne bez zapisywania serii na realnym koncie (urlop utworzyć i od razu anulować albo na koncie testowym).

## Notatki
Rekomendacja: WŁASNY lekki RangeCalendar (zero nowych zależności) zamiast react-day-picker + shadcn Calendar. Powody: (a) nowa zależność = pułapka zasady 9 (vite re-optimize po npm i, 118 failów e2e) i wpis do bundle-budget, (b) react-day-picker wymaga theming CSS + mapowania string-locale na obiekty date-fns/locale, (c) potrzebny zakres funkcji jest mały (1 miesiąc, tap-select, min/max), a repo już ręcznie renderuje siatki miesiąca (TrainingHeatmap, MonthlyActivities), (d) pełna kontrola nad tokenami akcentu (koordynacja z T24: żadnych hardcode kolorów, tylko primary). Jeśli właściciel woli bibliotekę, punkty integracji (T20.3-T20.5) pozostają identyczne, wymienia się tylko T20.1. Świadoma decyzja do DECYZJE.md: tydzień zawsze od poniedziałku (spójnie z logiką tygodni w apce), także przy en. Zmiana semantyki w VacationDialog: klik dnia przed startem = restart startu (Booking), a nie błąd "koniec przed początkiem" — komunikat vac.errRange przestaje być osiągalny z UI, ale walidacja w vacation-mode.ts ZOSTAJE jako bezpiecznik (surgical, lib nietknięty). "Przegląd 30 dni" (EmailWorkoutDialog) nie ma od-do, nic do zrobienia; jeśli T12 podepnie eksport z Analytics pod ExportWorkoutsDialog, kalendarz przyjdzie tam za darmo. Kolejność wdrożenia: T20.1+T20.6 → T20.7 (testy komponentu) → T20.3 → T20.4 → T20.5.
