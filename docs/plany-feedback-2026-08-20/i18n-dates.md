# Plan obszaru: i18n-dates

## Obszar
T18: i18n dat, daty po polsku przy angielskim języku apki (Workout History)

## Stan istniejący
Sweep WSZYSTKICH miejsc formatowania dat w src/ wykonany. Kluczowe ustalenie: centralny helper JUŻ ISTNIEJE i jest niemal wszędzie stosowany. To `dateLocale(lang)` w src/i18n/index.ts (linia 38-41, audyt Z168: DATE_LOCALES {pl:'pl-PL', en:'en-US'}), a `lang` płynie z useTranslation() (src/contexts/LanguageContext.tsx). date-fns występuje tylko w src/lib/strava-utils.ts i tam też locale jest per język (DF_LOCALES, Z164), a wszyscy realni callerzy (src/components/strava/*.tsx) przekazują lang. Ok. 40 plików używa dateLocale(lang) poprawnie, w tym cały src/pages/WorkoutHistory.tsx (nagłówki grup linia 175, tonaż 336/383; wiersz pokazuje surowe ISO w linii 358).

ŹRÓDŁO ZGŁOSZONEGO BUGA: to NIE jest toLocaleDateString. "20 sie 2026" to dokładnie format, w jakim natywny `<input type="date">` renderuje wartość na iOS/WKWebView z polskim SYSTEMEM, niezależnie od języka apki. Na ekranie Workout History to filtry zakresu dat: src/pages/WorkoutHistory.tsx:242-243 (`<Input type="date">` from/to). Ten sam wzorzec: src/components/ExportWorkoutsDialog.tsx:201,208 (zakres własny CSV), src/components/VacationDialog.tsx:101,119, src/components/AddCardioDialog.tsx:161, src/components/PlanWizard.tsx:407 (onboarding). Atrybut lang na inpucie NIE działa w iOS Safari/WKWebView, format zawsze systemowy, więc potrzebny wrapper z własną etykietą.

Pozostałe odstępstwa od helpera znalezione w sweep: (1) src/pages/admin/AdminConsentsLog.tsx:87 inline `lang === 'pl' ? 'pl-PL' : 'en-GB'` (omija dateLocale, niespójne en-GB); (2) src/pages/Paywall.tsx:161 inline `lang === 'pl' ? 'pl-PL' : 'en-US'` (duplikacja logiki helpera, wynik poprawny); (3) src/components/ui/chart.tsx:213 `toLocaleString('en-US')` CELOWE (komentarz Z178: stały format tooltipa), zostawić; (4) src/lib/strava-utils.ts i src/lib/exercise-name-resolver.ts mają defaulty `lang: LanguageCode = 'pl'`, foot-gun bez skutku dla usera (wszyscy callerzy UI przekazują lang, testy src/test/strava-utils.test.ts polegają na defaultach), zostawić bez zmian. Nie ma potrzeby budowania nowego useLocale/formatDate od zera, architektura i18n już to ma; brakuje wyłącznie warstwy na natywne inputy daty + guardu regresyjnego.

## Zadania

### T18-1: LocalizedDateInput: natywny input daty z etykietą w języku apki + swap w Historii i dialogach (effort: M)
**Pliki:** src/components/LocalizedDateInput.tsx, src/pages/WorkoutHistory.tsx, src/components/ExportWorkoutsDialog.tsx, src/components/VacationDialog.tsx, src/components/AddCardioDialog.tsx, src/i18n/locales/pl.ts, src/i18n/locales/en.ts

**Podejście:**
1) Nowy komponent src/components/LocalizedDateInput.tsx (poza ui/, bo zależy od LanguageContext): props = React.ComponentProps<'input'> bez type (value ISO YYYY-MM-DD, onChange, min, max, aria-label, data-testid, id przechodzą 1:1 na natywny input). Render: div.relative zawierający (a) natywny <input type="date"> z klasą 'peer absolute inset-0 h-full w-full opacity-0 focus:opacity-100' plus klasy bazowe Input (przez cn), (b) span aria-hidden stylizowany identycznie jak Input (flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ...) z klasą 'peer-focus:invisible', pokazujący: value ? parseLocalDate(value).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' }) : t('dateInput.pick') w text-muted-foreground. lang z useTranslation(), parseLocalDate z @/lib/utils, dateLocale z @/i18n. Dzięki temu na iOS tap otwiera systemowy picker (bez zmian UX), a wyświetlana wartość podąża za językiem apki (EN: 'Aug 20, 2026', PL: '20 sie 2026'); na desktopie focus pokazuje natywny input, więc wpisywanie z klawiatury pozostaje widoczne. 2) Klucz i18n 'dateInput.pick' do OBU plików: pl.ts 'Wybierz datę', en.ts 'Pick a date'. 3) Swap 1:1 (bez zmiany propsów): WorkoutHistory.tsx:242-243, ExportWorkoutsDialog.tsx:199-214 (zachować data-testid export-custom-from/to na natywnym inpucie), VacationDialog.tsx:98-124 (zachować id vac-start/vac-end, data-testid, min, logikę onChange), AddCardioDialog.tsx:161 (zachować data-testid cardio-date). 4) CELOWO POZA zakresem: src/components/PlanWizard.tsx:407 (goły <input type="date"> z własnym stylowaniem w onboardingu; krok przerabia T2 z tego samego feedbacku, dodać tam TODO-komentarz i wpis do allowlisty guardu z T18-3, żeby nie robić konfliktu dwóch zadań na jednym pliku).

**Testy:**
Nowy src/test/localized-date-input.test.tsx (wzorzec renderu z LanguageProvider + localStorage 'app-language' jak w src/test/strava-i18n.test.tsx, interakcje fireEvent.change jak w src/test/vacation-dialog.test.tsx): (a) EN + value '2026-08-20' -> widoczny tekst pasuje do /Aug 20, 2026/ i queryByText(/sie/) === null; (b) PL -> '20 sie 2026'; (c) fireEvent.change po data-testid emituje ISO '2026-08-21' przez onChange (kontrakt wartości bez zmian); (d) puste value -> placeholder z t('dateInput.pick'); (e) min/max/data-testid obecne na natywnym inpucie. Test niezmiennika starego przepływu: istniejący src/test/vacation-dialog.test.tsx MUSI przejść BEZ modyfikacji (fill po getByTestId('vac-start'/'vac-end') na natywny input). Pełny bieg: npm run test, npm run typecheck, npm run lint, npm run build. Ręcznie na realnym iPhone (system PL, apka EN): Historia -> filtr dat pokazuje 'Aug 20, 2026'; tap otwiera systemowy picker; wybór daty filtruje listę; scenariusz przerwania z checklisty (start z planu -> wyjście -> powrót) nietknięty, bo zmiana nie dotyka draftu/sesji.

**Ryzyka:**
Niezmiennik (zasada 5): wartość inputa i onChange muszą zostać ISO YYYY-MM-DD, bo filtry porównują stringi leksykograficznie (WorkoutHistory.tsx:94-95 'workout.date < fromDate', VacationDialog liczy vacationRangeDays na ISO). Wrapper wyłącznie opakowuje wyświetlanie, nigdy nie zmienia value/onChange/min/max. data-testid i id MUSZĄ przejść na natywny input, inaczej padnie vacation-dialog.test.tsx i e2e (sprawdzone: e2e nie fill'uje selektorem type=date, więc swap bezpieczny). Pułapka iOS: podczas otwartego systemowego pickera input w focusie pokaże na moment format systemowy, akceptowalne (to UI systemu). Zasada 7 (apka natywna): span z aria-hidden, aria-label zostaje na inpucie, brak zaznaczania tekstu (globalny user-select już wyłączony). Zasada 9: przed oceną e2e zrestartować dev server vite. NIE dotykać Radix Sheet/Dialog (VacationDialog/ExportWorkoutsDialog tylko podmiana inputa w środku, bez zmian open/unmount).

### T18-2: Ujednolicenie dwóch inline locale do dateLocale(lang) (effort: S)
**Pliki:** src/pages/admin/AdminConsentsLog.tsx, src/pages/Paywall.tsx

**Podejście:**
Chirurgicznie, 2 linie: (1) AdminConsentsLog.tsx:87 zamienić `row.createdAt.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB')` na `row.createdAt.toLocaleString(dateLocale(lang))` + import dateLocale z '@/i18n' (uwaga: świadoma zmiana en-GB -> en-US dla spójności, ekran tylko dla admina). (2) Paywall.tsx:161 zamienić `lang === 'pl' ? 'pl-PL' : 'en-US'` na `dateLocale(lang)` (wynik identyczny, znika duplikacja logiki helpera). NIC więcej w tych plikach nie ruszać.

**Testy:**
npm run test (istniejący src/test/paywall-pricing.test.ts woła yearlyValueSummary bezpośrednio z 'pl-PL', bez zmian, zostaje zielony), npm run typecheck, npm run lint. Weryfikacja wizualna admina niekonieczna (format en-US vs en-GB to kolejność M/D).

**Ryzyka:**
Minimalne. Paywall to ścieżka zakupowa: zmiana jest czysto refaktoryzacyjna (ten sam string wynikowy), ale po zmianie przejść ręcznie ekran Paywall w trybie E2E/web, że ceny per month renderują się. Nie dotykać chart.tsx:213: 'en-US' jest tam CELOWE (komentarz Z178, stały format tooltipa niezależny od urządzenia).

### T18-3: Guard regresyjny: skan toLocale* bez dateLocale i gołych input type=date (effort: S)
**Pliki:** src/test/date-locale-scan.test.ts

**Podejście:**
Nowy test statyczny wzorowany 1:1 na src/test/i18n-hardcoded-scan.test.ts (walk po src/, stripComments, allowlista z uzasadnieniami). Dwie reguły: (A) każde wywołanie `.toLocaleDateString(` / `.toLocaleTimeString(` / `.toLocaleString(` w src/ (poza src/test) musi mieć pierwszy argument `dateLocale(` albo identyfikator `locale` (helpery przyjmujące locale parametrem: StravaActivityCard/StravaActivityDetail/ApiKeysCard); regex celowany w (Date|Time)?String, żeby NIE łapać toLocaleLowerCase w src/lib/plan-cycle-utils.ts:98; allowlista: src/components/ui/chart.tsx (Z178, celowy 'en-US'). (B) literał `type="date"` dozwolony wyłącznie w src/components/LocalizedDateInput.tsx (allowlista + tymczasowo src/components/PlanWizard.tsx z komentarzem 'do zdjęcia przy T2'), żeby każdy przyszły ekran szedł przez wrapper zamiast gołego natywnego inputa. Test allowlisty na martwe wpisy jak w pierwowzorze.

**Testy:**
Sam plik jest testem (vitest). Po napisaniu: uruchomić PRZED wdrożeniem T18-1, żeby potwierdzić, że łapie dzisiejsze gołe inputy (czerwony), i po swapie (zielony poza allowlistą). npm run test całość.

**Ryzyka:**
Ryzyko fałszywych trafień regexa: kalibrować na realnym kodzie (np. `Math.round(x).toLocaleString(dateLocale(lang))` dla liczb MUSI przechodzić, wzorzec z WorkoutHistory.tsx:336). Guard to twin dla stanu błędnego (zasada 6): zamiast wiecznego 'przejrzeć wszystkie miejsca' każda nowa data bez locale = czerwony test z konkretną ścieżką i linią.

## Notatki
Kolejność wdrożenia: T18-3 (guard, najpierw czerwony na dzisiejszych inputach), potem T18-1 (fix, guard robi się zielony), na końcu T18-2 (kosmetyka). Koordynacja z innymi zadaniami feedbacku: T20 (kalendarze zakresów w stylu Booking) obejmie VacationDialog i ExportWorkoutsDialog nowym range-pickerem; LocalizedDateInput z T18-1 to warstwa minimalna, a range-picker T20 powinien formatować etykiety tym samym dateLocale(lang) i zastąpi wrapper w tych dwóch miejscach. PlanWizard.tsx:407 zostawiony dla T2 (chipy dat startu z dniem tygodnia). Świadomie NIE ruszam: defaultów lang='pl' w strava-utils.ts/exercise-name-resolver.ts (wszyscy callerzy UI przekazują lang, testy polegają na defaultach, zmiana API bez buga usera = wbrew surgical changes) oraz chart.tsx:213 (celowa decyzja Z178). Wiersz Historii pokazuje datę jako surowe ISO 2026-08-20 (WorkoutHistory.tsx:358), to format neutralny językowo, nie obejmuje go zgłoszenie; ewentualna zmiana na format słowny to osobna decyzja produktowa.
