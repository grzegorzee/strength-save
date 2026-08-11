# Research: co Strength Save moze zaadoptowac z Runny

Data: 2026-08-11 · Metoda: workflow 10 agentow (9 soczewek web-research + synteza), 69 znalezisk z evidence

# Raport: co Strength Save powinien adoptować z Runny

Filtr: wpływ na progres siłowy i regularność. Odrzucone duplikaty (silnik progresji z deloadem, timer przerw, historia, osiągnięcia, heatmapa, weekly digest, builder planów, animacje) oraz rzeczy już zaplanowane (scheduleOverrides, krok zgody marketingowej).

---

## 1. TOP 10 do adopcji

### 1. Tryb "Nie czuję się na 100%" (choroba, ból, przeciążenie) z rampą powrotu

**Co to:** User deklaruje okres 3-14 dni obniżonej dyspozycji i poziom redukcji (lżejsze ciężary, tylko główne boje, pełna przerwa). Po upływie okresu automatyczna rampa powrotna w tempie wybranym przez usera (wolno / zbalansowanie / szybko), plus push przed wygaśnięciem trybu.

**Przełożenie na siłownię:** Rozszerzenie istniejącego silnika deloadu o wejście NA ŻĄDANIE: redukcja % ciężaru roboczego i liczby serii w oknie czasu, potem stopniowy powrót do wartości sprzed przerwy (np. 85% → 92% → 100% w kolejnych sesjach). Osobna opcja "boli mnie X" zdejmująca ćwiczenia na daną partię.

**Dlaczego pomoże:** Choroba to najczęstszy moment porzucenia planu. User nie wie, czy trenować lżej czy wcale, a po powrocie wchodzi w za ciężki tydzień i się zniechęca albo kontuzjuje. U Runny to była odpowiedź na skargę nr 1 z recenzji. Silnik deloadu już jest, brakuje tylko user-triggered wejścia i wyjścia.

**Nakład:** M. **Platformy:** web + iOS (logika w silniku progresji), functions (push przed końcem trybu).

### 2. Plan Realignment: proaktywny winback po serii pominiętych treningów

**Co to:** Po ponad 3 pominiętych treningach albo pustym tygodniu apka SAMA pokazuje dialog (zwykle w poniedziałek) z opcjami skalowanymi długością przerwy: przełóż zaległe / kontynuuj od dziś / przebuduj cykl / restart, przy długiej przerwie z ostrzeżeniem i obniżonymi ciężarami.

**Przełożenie na siłownię:** Detekcja N dni planu bez sesji → dialog "wróćmy do planu": (a) kontynuuj od dziś z obniżonym ciężarem (silnik deloadu), (b) przesuń cykl, (c) kontynuuj bez zmian. Przy 3+ tygodniach dodatkowo "przelicz ciężary robocze w dół".

**Dlaczego pomoże:** To apka wychodzi do usera, który wypadł z rytmu, zamiast czekać aż pogrzebie w ustawieniach (nie pogrzebie, odinstaluje). User po przerwie nie wraca do zawstydzającej ściany zaległości, tylko do czystego restartu w 1 tap. Bezpośrednie uderzenie w regularność i churn.

**Nakład:** M. **Platformy:** web + iOS (dialog i logika), functions (opcjonalny push "twój plan czeka").

### 3. Jawny stan "Pomiń trening" (skip) obok przekładania

**Co to:** Rozróżnienie dwóch intencji: "tego nie zrobię" (skip) vs "zrobię kiedy indziej" (rearrange, czyli zaplanowane scheduleOverrides). Skip jest odnotowany, plan adaptuje się wokół wykonanych sesji, a świadome pominięcie NIE triggeruje alarmu o porzuconym planie.

**Przełożenie na siłownię:** Akcja "Pomiń trening" na dniu planu, z komunikatem "silnik progresji to uwzględni" (nie podbija ciężaru po pominiętej sesji, nie liczy jej jako porażki). Skip wyłącza dzień z detekcji realignmentu z punktu 2.

**Dlaczego pomoże:** Usuwa wieczne "zaległe" wiszące jako czerwony dług, które demotywuje. Daje silnikowi czysty sygnał: świadomy skip ≠ spadek zaangażowania, cichy brak aktywności = tak. Fundament pod punkt 2 (niski false-positive rate).

**Nakład:** S. **Platformy:** web + iOS.

### 4. Feedback 1-tap po sesji + AI podsumowanie za oceną (rating-gate)

**Co to:** Po treningu kciuk góra/dół, kciuk w dół otwiera strukturalne powody ("ciężary za duże", "za długo", "nie czuję się na 100%"). Ocena odblokowuje krótkie AI podsumowanie: plan vs wykonanie, co poszło dobrze, PR-y, progres do celu. Insight NIE zmienia planu (odseparowany od silnika).

**Przełożenie na siłownię:** Po ukończeniu sesji: 1 tap oceny → podsumowanie "zrobiłeś 90% zaplanowanych serii, wolumen +4% vs poprzedni tydzień, nowy PR w martwym". Strukturalne powody zasilają adaptive coach (flaga już istnieje). Uwaga z recenzji Runny: pochwała musi być skalibrowana do realnego wykonania, feedback "way too nice" jest wyczuwalny i irytuje.

**Dlaczego pomoże:** Podwójna wygrana: apka dostaje telemetrię RPE/trudności z każdej sesji (paliwo dla adaptive coach), user dostaje moment nagrody i nauki po KAŻDYM treningu, nie raz w tygodniu jak digest. Najczęściej chwalony mechanizm w recenzjach Runny.

**Nakład:** M. **Platformy:** web + iOS, functions (generowanie podsumowania).

### 5. Wzorzec adaptacji za zgodą: status → propozycja → akceptacja, plus ręczny override

**Co to:** Dwie lekcje naraz. Runna: rekomendacje NIGDY nie zmieniają planu same, user akceptuje / odrzuca / cofa, a korekty są małe (u nich 15-30 s na raz). Skargi na Runnę: brak ręcznej edycji pojedynczego treningu i sztywny deload co 5. tydzień to główny powód 1-gwiazdkowych recenzji i kontuzji.

**Przełożenie na siłownię:** Adaptive coach po wykryciu TRENDU z wielu sesji (nie po jednej słabej) proponuje: "podbijamy przysiad o 2,5 kg?" albo "obniżamy o 5%?", user zatwierdza, zmiana odwracalna. Do tego twardy wymóg: ręczny override ciężaru/serii per ćwiczenie per trening oraz możliwość przesunięcia tygodnia deloadu (przykład ze skarg: kobiety chcące deload w tygodniu okresu, a apka wymusza co 5. tydzień).

**Dlaczego pomoże:** Zaufanie do silnika progresji to fundament retencji. Automat, który sam grzebie w planie, niszczy zaufanie; brak wyjścia z błędnej kalibracji kończy się churnem albo kontuzją ("no injuries until I started using this app"). To projektowy kontrakt dla całego adaptive coach zanim wyjdzie zza flagi.

**Nakład:** M. **Platformy:** web + iOS.

### 6. Tryb urlopu: planowana przerwa z przetasowaniem deloadu

**Co to:** User deklaruje Z GÓRY przerwę 3-21 dni i co chce w tym czasie robić (nic / wersja bodyweight / tylko główne boje). Silnik automatycznie przesuwa deload na tydzień wyjazdu (przerwa przejmuje rolę deloadu zamiast się z nim dublować), łagodzi rampę po powrocie i wysyła push w dniu końca urlopu.

**Przełożenie na siłownię:** Wprost przenośne: "dodaj wyjazd" w planie 2-5x/tydz. Kluczowy trik to właśnie przetasowanie deloadów, nie sama pauza. Opcjonalny wariant bodyweight na wyjazd to naturalne rozszerzenie (builder planów już jest).

**Dlaczego pomoże:** Przerwa zaplanowana to inny problem niż wykryta post factum: user chce wiedzieć wcześniej, że plan to przetrwa. Bez tego urlop zamienia się w niekontrolowany dryf i złą passę, czyli punkt 2 w wersji trudniejszej.

**Nakład:** M. **Platformy:** web + iOS (silnik), functions (push powrotny).

### 7. Trening ad-hoc i aktywność zewnętrzna zasilają silnik progresji

**Co to:** Skarga-request nr 2 na Runnę: aktywności spoza planu nie liczą się do planu, "it acts like they don't exist and it really bothers me". User chce, żeby plan traktował CAŁĄ jego aktywność jako trening.

**Przełożenie na siłownię:** Szybki trening (ad-hoc) już istnieje; upewnić się, że jego serie zasilają: tygodniowy wolumen, historię ciężarów per ćwiczenie i decyzje silnika progresji (jeśli user zrobił ad-hoc przysiad 5x5 100 kg, plan nie proponuje mu potem 90 kg "według rozpiski"). Aktywności ze Stravy (cardio) mogą wpływać na sugestie regeneracji, bez automatycznych zmian planu (punkt 5).

**Dlaczego pomoże:** Plan, który ignoruje realny wysiłek usera, traci wiarygodność i proponuje absurdalne ciężary. To bezpośrednio progres siłowy: silnik pracuje na pełnym obrazie, nie na wycinku.

**Nakład:** M (audyt istniejących przepływów danych + domknięcie luk). **Platformy:** web + iOS, functions.

### 8. Plan pomostowy po osiągnięciu celu + kolejka celów

**Co to:** W momencie startu planu z celem Runna z góry przygotowuje plan regeneracyjny na "po", a po zakończeniu sama proponuje następny krok (recovery → maintenance na 50-70% objętości → kolejny cel). Ustawienia (harmonogram, poziom, rekordy) przenoszą się bez przebudowy. Cytat z recenzji: "useful every month of the year", wprost uzasadnienie subskrypcji rocznej.

**Przełożenie na siłownię:** Po domknięciu cyklu progresji: automatyczna propozycja "tydzień deload + blok maintenance" albo "nowy cykl z nowymi ciężarami startowymi wyliczonymi z wyników". Kolejka celów: "po tym cyklu siły chcę cykl hipertrofii". Zero pustego ekranu "i co teraz".

**Dlaczego pomoże:** Największa dziura retencji apek celowych to moment PO osiągnięciu celu: motywacja i plan znikają jednocześnie, user anuluje PRO. Dla subskrypcji rocznej to argument sprzedażowy numer 1.

**Nakład:** M. **Platformy:** web + iOS.

### 9. Skwantyfikowana obietnica przed paywallem + podgląd pierwszego treningu

**Co to:** Runna przed paywallem pokazuje policzoną z odpowiedzi usera deltę: "Without Runna 1:59, With Runna 8 minut szybciej". Obok podsumowanie wyborów usera i podgląd pierwszej sesji z uzasadnieniem.

**Przełożenie na siłownię:** Silnik progresji potrafi to policzyć: "przy 3 treningach w tygodniu twój przysiad z 80 kg może dojść do ok. 95 kg w 12 tygodni". Plus podgląd pierwszego dnia planu (ćwiczenia, serie, ciężary startowe) przed ekranem PRO. Wniosek z Runny to nie "hard paywall", tylko: paywall dopiero PO spersonalizowanej obietnicy, a trial skalibrowany tak, by kończył się po 2-3 wykonanych treningach.

**Dlaczego pomoże:** Konwersja na PRO to warunek istnienia produktu, a konkretna, osobista liczba sprzedaje lepiej niż "plan dla Ciebie". Podgląd pierwszego treningu obniża postrzegane ryzyko.

**Nakład:** S/M. **Platformy:** web + iOS (onboarding/paywall).

### 10. Publikacja wykonanych sesji do Stravy z brandowanym tytułem

**Co to:** U Runny każdy trening ląduje w Stravie jako "with Runna", widoczny dla znajomych: organiczny kanał wzrostu i social proof bez wysiłku usera.

**Przełożenie na siłownię:** Integracja Strava już jest, ale w drugą stronę (odczyt pod race predictor). Dodać upload: wykonana sesja jako "Weight Training with Strength Save" ze strukturalnym opisem (ćwiczenia, serie, tonaż, PR-y). Opt-in, per sesja lub globalnie.

**Dlaczego pomoże:** Publiczny zapis treningu to accountability (regularność) i darmowa dystrybucja: każdy trening w feedzie znajomych to reklama. Runna pokazała, że to działa na tyle dobrze, że Strava ją kupiła.

**Nakład:** S/M (OAuth i tokeny już są, dochodzi upload API + formatter opisu). **Platformy:** functions + web/iOS (toggle i podgląd).

---

## 2. Szybkie wygrane (nakład S, efekt szybki)

1. **Jawny "Pomiń trening"** (TOP 3): mały stan + komunikat, duży efekt psychologiczny i czysty sygnał dla silnika.
2. **Prompt o notyfikacje po wyborze dni treningowych, nie na pierwszym uruchomieniu:** framing "przypomnienia o TWOICH dniach" w momencie najwyższej motywacji maksymalizuje opt-in. Czysta zmiana kolejności ekranów.
3. **Read-only feed iCalendar:** subskrybowany URL z dniami planu (weekday-based dni już są). Trening w prywatnym kalendarzu usera ma rangę spotkania i działa nawet przy wyłączonych pushach. Functions generuje feed, apka pokazuje link.
4. **Celebracja PR z tierem na grafice share:** moment PR (silnik już go zna) → toast + gotowa grafika do Stories z tierem Veteran/Elite z planowanego redesignu Profilu. Status podróżuje z treścią = organiczna reklama.
5. **Obietnica liczbowa przed paywallem** (TOP 9, wariant minimalny): sama predykcja progresji z istniejącego silnika + podgląd pierwszego dnia, bez przebudowy onboardingu.
6. **"Notatki trenera" przy ćwiczeniu:** krótkie tekstowe cues techniczne (najczęstsze błędy, na co uważać) doklejone do istniejących animacji w karcie ćwiczenia. Content statyczny, zero nowej mechaniki.
7. **Backfill rekordów sprzed instalacji:** ręczne wpisanie starych PR-ów w bojach głównych, żeby apka nie gratulowała nowemu userowi ciężarów, które dawno dźwigał, i żeby progresja startowała z prawdziwego baseline'u.

Pogranicze S/M, ale tanie i częste w skargach: **edycja dni tygodnia W TRAKCIE planu** z automatycznym przepisaniem przyszłych tygodni, bez tworzenia planu od nowa (scheduleOverrides pokrywa przypadki punktowe, to pokrywa "mój grafik na stałe się zmienił").

---

## 3. Duże zakłady (nakład L, przewaga strategiczna)

1. **Push planu do Garmin Training Calendar (FIT structured strength workout).** Najbliższe 2 tygodnie treningów lądują w natywnym kalendarzu zegarka, wykonany/pominięty trening ZNIKA z zegarka, zmiana planu aktualizuje sync. Gating "sync na zegarek tylko PRO" to u Runny argument sprzedażowy subskrypcji. Apka CIQ już istnieje, to jej naturalna ewolucja z gadżetu w kanał dystrybucji planu. Ważne z lekcji Runny: od razu zdefiniować kontrakt matchowania wykonania do dnia planu i jasną regułę "sync tylko od momentu połączenia", bez obietnicy backfillu. Platformy: functions + Garmin + iOS.

2. **Workout Mirroring: telefon + Watch sterują jedną sesją, Live Activity na lock screenie.** Na siłowni telefon leży przy ławce, zegarek jest na nadgarstku: odhaczenie serii na zegarku widoczne live na telefonie i odwrotnie, timer przerwy jako Live Activity. Rozwiązuje "zacząłem na złym urządzeniu" i podnosi StrengthWatch z dodatku do rdzenia doświadczenia. Bonus z wzorca Runny: różne pola na ekranie zegarka przy serii roboczej (ciężar, powtórzenia) vs przerwie (odliczanie, następne ćwiczenie). Platformy: iOS + Watch.

3. **Cykliczny wirtualny test siły ("parkrun dla siłowni").** Ustalony tydzień w miesiącu, wspólny protokół (np. AMRAP albo test ciężaru na 3 powtórzenia w wybranym boju), ranking/porównanie do własnych poprzednich wyników, badge, opcjonalnie co-brandowany challenge na Stravie z kodem na PRO za ukończenie. Deadline, którego nie da się zignorować jak notyfikacji, plus pętla akwizycji. Platformy: functions + web + iOS.

4. **Wydarzenie w planie: zawody siłowe / test 1RM jako event z podglądem wpływu.** Wzorzec B-Race: user dodaje datę i intensywność ("na luzie" / "pełen peak"), silnik obudowuje ją deloadem przed i lżejszym tygodniem po, a PRZED zatwierdzeniem pokazuje ekran "co się zmieni w planie" (poziom zaburzenia + konkretna lista zmian). Preview wpływu przed potwierdzeniem to mechanizm budowy zaufania do automatu, wart skopiowania 1:1. Platformy: web + iOS.

5. **Asynchroniczne pytanie do trenera w PRO.** U Runny człowiek po drugiej stronie to najmocniejsze uzasadnienie ceny ("that alone makes the app worth it") i fosa, której algorytm nie skopiuje. Nawet limit "1 pytanie na tydzień" zmienia percepcję z apki-narzędzia na coaching. Ryzyko z recenzji: odpowiedzi pachnące AI są wyczuwalne i karane 1 gwiazdką. To zakład operacyjny (czas człowieka), nie kodowy. Platformy: web + iOS + zaplecze.

---

## 4. Czego NIE kopiować i dlaczego

1. **Hard paywall bez darmowego tieru.** Runna może sobie na to pozwolić przy ogromnym top-of-funnel i marce. Strength Save z soft paywallem i małą bazą potrzebuje darmowej pętli wartości, która karmi wzrost organiczny. Kopiować timing paywalla (po obietnicy), nie jego twardość.

2. **Quiz onboardingowy na 30-36 ekranów.** Sunk cost działa przy silnej marce, która user "już postanowił kupić". Przy nieznanej apce 12 minut quizu to porzucenie przed pierwszym ekranem wartości. Wersja dla Strength Save: 6-8 pytań, które realnie kalibrują silnik (cel, staż, sprzęt, dni, aktualne wyniki w bojach z walidacją nierealnych ciężarów), nic ponad to.

3. **Pełna ekonomia punktów Runna Levels (Bronze→Champion, partner rewards).** Osiągnięcia już są. Osobna waluta punktowa z tierami, capami anty-farmingowymi i nagrodami partnerskimi to duży system do utrzymania przy wątpliwym wpływie na progres siłowy. Jedyny element wart wyjęcia: największa nagroda za DOMKNIĘCIE cyklu (nie za pojedynczą aktywność) oraz tier na grafice share (już w szybkich wygranych).

4. **Wbudowana społeczność na zewnętrznej platformie (Bettermode).** Koszt licencji + moderacja + cold start przy obecnej bazie userów = pusta grupa, która odstrasza bardziej niż jej brak. Jeśli kiedyś, to zaczynając od miesięcznego testu siły (duży zakład 3), który tworzy wspólne doświadczenie bez budowy feedu.

5. **Live zajęcia i wydarzenia offline (Runna Club).** Model operacyjny firmy z dużym zespołem, nie feature apki. Zerowy zwrot przy obecnej skali.

6. **Produkcja serii wideo follow-along z twarzą trenera (26 odcinków, weekly unlock).** Ogromny koszt produkcji contentu, a przewaga Strength Save to silnik progresji i dane, nie wideo. Animacje ćwiczeń już pokrywają warstwę instruktażu; sensowny wyciąg z tego wzorca to tylko cross-plan persistence (postęp w seriach dodatkowych przypięty do konta, nie do cyklu), gdyby kiedyś powstał content dodatkowy. Sam pomysł "content za darmo publicznie, orkiestracja w apce" jest natomiast trafny dla istniejących animacji (YouTube/blog jako akwizycja).

7. **Audio coaching real-time w trakcie sesji.** Kluczowy dla biegacza (telefon w kieszeni, tempo do pilnowania co sekundę), marginalny na siłowni: momenty decyzyjne to koniec przerwy (już obsłużony notyfikacją systemową z dźwiękiem) i następne ćwiczenie. iOS i tak wstrzymuje JS przy zgaszonym ekranie, więc realna implementacja byłaby walką z platformą o niską stawkę.

8. **Bundle subskrypcyjny w stylu Strava+Runna.** Nie do wykonania bez partnera po drugiej stronie; obserwować jako sygnał rynkowy, nie budować.

9. **Sztywne reguły Runny jako takie: deload co 5. tydzień bez wyboru, brak edycji pojedynczego treningu, limit przesunięcia +/- 1 tydzień bez wyjątków.** To są ich najgłośniejsze skargi, nie ich przewaga. Kopiować ideę guardrails (ostrzeżenie przy dwóch ciężkich dniach obok siebie, blokada kolizji), ale zawsze z ręcznym override, zgodnie z zasadą "każdy stan błędu ma wyjście".

---

**Nić przewodnia:** największa wartość z researchu to nie pojedyncze feature'y, tylko wzorzec obsługi ODSTĘPSTW od planu (choroba, urlop, pominięcia, powrót po przerwie) plus zasada "silnik proponuje, user zatwierdza". Strength Save ma już mocny silnik progresji; Runna pokazuje, jak sprawić, żeby user w nim ZOSTAŁ, gdy życie rozjeżdża się z rozpiską.

---

# Część 2: ekrany i flow

Raport adaptacyjny wzorców Runny na konkretne ekrany Strength Save. Każda rekomendacja: layout, uzasadnienie, nakład (S/M/L). Filtr nadrzędny: siłownia to nie bieżnia. Telefon leży na ławce, ekran gaśnie co 30 sekund, user jest w połowie serii ze spoconymi rękami. Wszystko, co wymaga patrzenia w ekran w trakcie wysiłku albo utrzymania JS przy życiu w tle, odpada na starcie.

---

## 1. Dashboard / Today: hierarchia i karty

Runna odpowiada na trzy pytania trzema warstwami jednego ekranu: co dziś, jak idzie tydzień, co z planem. Dashboard Strength Save ma karty dnia i tygodnia, ale bez tej dyscypliny kolejności i bez obsługi stanów brzegowych.

### 1.1. Sztywna kolejność sekcji: dziś > po co > tydzień > ad-hoc

**Layout:** od góry: (1) karta dzisiejszej sesji z pełnym detalem (typ dnia, partie, liczba ćwiczeń, szacowany czas), (2) jedno zdanie "po co ten trening" pod nagłówkiem karty, (3) karta tygodnia z progress barem, (4) przycisk "Szybki trening" na samym dole scrolla.

**Dlaczego:** Runna trzyma ad-hoc (Instant Workout) na końcu Today: dostępny, ale niekonkurujący z planem. To wprost ochrona niezmiennika z reguły #5 (ad-hoc DOKŁADA, nie podmienia). Wizualne zepchnięcie szybkiego treningu na dół zmniejsza też ryzyko, że user odruchowo ominie plan.

**Nakład:** S (przestawienie sekcji), zdanie "po co" z silnika progresji: M.

### 1.2. Dzień wolny to karta, nie pusty ekran

**Layout:** w dzień nietreningowy karta dnia istnieje nadal: nagłówek "Dzień regeneracji", 1-2 tipy (sen, białko, rozciąganie partii z wczoraj), opcjonalnie mini-podsumowanie wczorajszej sesji. Ten sam komponent karty, wyciszony wariant (obwódka bez limonki).

**Dlaczego:** u Runny rest day ma treść, więc apka ma powód otwarcia codziennie. Dla apki siłowej z 3-4 sesjami w tygodniu to różnica między 3 a 7 otwarciami tygodniowo.

**Nakład:** S-M (komponent jest, treść tipów: statyczna pula per partia).

### 1.3. Karta tygodnia: checkboxy dni + progress bar + tonaż

**Layout:** nagłówek karty tygodnia: "Tydzień 6 z 12", pod nim rząd dni z checkmarkami (ukończone w limonce, zaplanowane w kolorze typu sesji, wolne wygaszone), pasek postępu "2 z 4 sesji", jedna liczba zbiorcza: tonaż tygodnia (odpowiednik weekly mileage).

**Dlaczego:** checkbox + progress bar to u Runny główna pętla dopaminowa ("each completed run checked a box and nudged the progress bar forward"). Strength Save ma odhaczanie na poziomie serii; brakuje warstwy wyżej: dzień i tydzień jako domykane jednostki. Tonaż to naturalny siłowy odpowiednik kilometrażu.

**Nakład:** M (tonaż tygodnia liczony z sesji, agregat all-time już istnieje).

### 1.4. Tray "zaległy trening" zamiast wiecznego banera

**Layout:** bottom sheet wysuwany na Dashboardzie, trigger: nieodhaczona sesja starsza niż X dni albo cały pusty tydzień. Opcje skalowane do zaległości: 1-2 sesje > "Pomiń" / "Przenieś na ten tydzień"; tydzień+ > "Wydłuż plan" / "Kontynuuj od dziś" / "Wstaw deload". Po wyborze toast potwierdzenia, tray znika.

**Dlaczego:** to dosłownie Plan Adjustment Tray Runny i dosłownie reguła #6 z CLAUDE.md: każdy stan ma wyjście jednym tapem. Obecnie zaległa sesja w Strength Save po prostu się starzeje. Ważny detal z krytyki Runny: zero tonu pretensji, opcje neutralne ("przenieś", nie "zawaliłeś").

**Nakład:** L (logika realignu planu + przeliczenie progresji). Wersja minimalna (tylko pomiń/przenieś, bez przebudowy planu): M.

---

## 2. Ekran treningu (WorkoutDay): przed / w trakcie / po

### 2.1. PRZED: pełna struktura sesji bez niespodzianek

**Layout:** nad kartami ćwiczeń nagłówek-briefing (2-3 linie): cel sesji + odniesienie do poprzedniego wykonania ("tydzień temu 80 kg x 8, dziś celuj 82,5"). Karta ćwiczenia rozłożona już przed startem: wszystkie serie widoczne jako lista z targetami zapisanymi jako ZAKRES ("80-85 kg x 6-8"), nie pojedyncza liczba. Superserie/dropsety jako powtarzalny blok "3x (A + B + przerwa)" zamiast płaskiej listy.

**Dlaczego:** Runna pokazuje cały przebieg przed startem (warm-up / set / cooldown), a targety jako granice ("no faster than") zdejmują presję perfekcji. Na siłowni to praktyczne: user planuje talerze na sztandze zanim wejdzie w serię. Notacja "N x (blok)" to naturalny mentalny model superserii.

**Nakład:** zakresy targetów: S-M (silnik progresji już liczy cele), briefing z historii: M, bloki superserii: M.

### 2.2. PRZED: wariant sesji jako toggle

**Layout:** przełącznik u góry ekranu (odpowiednik outdoor/treadmill): "Siłownia / Dom / Gumy" albo per ćwiczenie "sztanga / hantle / maszyna" na karcie. Zmiana wariantu podmienia ćwiczenia zamienne, nie strukturę dnia.

**Dlaczego:** rozwiązuje realny kontekst (zajęty sprzęt, trening w podróży) bez łamania planu i bez wchodzenia w osobny flow edycji. Uwaga na regułę #5: toggle podmienia WYKONANIE, plan pozostaje nienaruszony.

**Nakład:** L (mapowanie zamienników). Wersja per ćwiczenie przez istniejący swap "tylko dziś": S (to już prawie jest, brakuje ekspozycji jako toggle).

### 2.3. W TRAKCIE: dwa stany ekranu, jedna informacja krytyczna

**Layout:** stan "seria": karta aktywnego ćwiczenia z ciężarem i powtórzeniami jako typograficzny hero (największe cyfry na ekranie), checkbox odhaczenia. Stan "przerwa": pasek przerwy inline rośnie do dominującego elementu: wielki countdown + jedna linia "następne: 82,5 kg x 8". Nic więcej. Po końcu przerwy pasek wraca do zwykłego rozmiaru.

**Dlaczego:** Runna rozdziela wysiłek (target + feedback) od odpoczynku (countdown + co następne) na dwa różne widoki i przybija informację krytyczną na stałe (ekran targetu nieusuwalny). Na siłowni user zerka na telefon w 2 sekundy między seriami: ekran musi być czytelny z ławki, z odległości ramienia. NIE kopiować: live promptów i audio cues w trakcie wysiłku. W połowie serii nikt nie patrzy w ekran, a JS w tle nie żyje: koniec przerwy sygnalizuje local notification (już wdrożone, nie ruszać).

**Nakład:** M (powiększony stan przerwy + hierarchia typograficzna na karcie).

### 2.4. W TRAKCIE: press-and-hold na akcjach destrukcyjnych

**Layout:** "Zakończ trening" przez przytrzymanie (z rosnącym ringiem w limonce jako feedback postępu), tap pokazuje hint "przytrzymaj, aby zakończyć". Skip przerwy i skip serii jawnym, zwykłym tapem z poziomu paska przerwy.

**Dlaczego:** press-and-hold chroni przed przypadkowym tapnięciem spoconym palcem (Runna używa tego na end workout i next lap). Odwrotna zasada dla skipów: te muszą być tanie, żeby user nigdy nie utknął w kroku (reguła #6).

**Nakład:** S.

### 2.5. W TRAKCIE: Live Activity na lock screenie

**Layout:** Live Activity (iOS): aktualne ćwiczenie, numer serii, countdown przerwy liczony natywnie przez system (timer z deadline, nie tick z JS). Kontrolki minimalne albo żadne.

**Dlaczego:** rozwiązuje główny problem środowiska: ekran zgaszony, telefon leży na ławce, a user i tak widzi ile przerwy zostało bez odblokowywania. To jedyny wzorzec "w trakcie" Runny, który adresuje suspend JS zamiast z nim walczyć, w pełnej zgodzie z regułą #1 i #3 (sygnały systemowe).

**Nakład:** L (natywny widget ActivityKit + most Capacitor). Kandydat na osobny build, ale najwyższy stosunek wartości do środowiska ze wszystkich rekomendacji tej sekcji.

### 2.6. PO: przegląd i korekta przed syncem

**Layout:** po "Zakończ trening" (a przed ekranem celebracji) opcjonalny krok "Sprawdź serie": lista wykonanych serii z możliwością poprawy ciężaru/powtórzeń inline, dopiero potem zapis finalny. Dla usera, który nic nie zmienia: jeden tap "Zapisz".

**Dlaczego:** Runna po treadmillu pozwala edytować lapy przed Save, bo wie, że dane bywają błędne. Na siłowni błędy wpisów (odhaczone 8 powtórzeń, zrobione 6) są częstsze niż w biegu. Korekta przed syncem do Firestore > wieczne złe dane w historii i w silniku progresji.

**Nakład:** M (edycja serii istnieje, brakuje kroku w flow zakończenia).

---

## 3. Flow po ukończeniu sesji: completion, celebracja, share card

Kolejność Runny jest nienegocjowalna: najpierw celebracja, potem dane, na końcu następny krok. Nagroda za UKOŃCZENIE, niezależnie od wyniku.

### 3.1. Sekwencja completion

**Layout:** (1) po ostatniej odhaczonej serii / press-and-hold: pełnoekranowy moment konfetti w limonce + "Trening zaliczony" + haptyka, karta dnia na Dashboardzie wypełnia się w tle; (2) ocena jednym tapem: kciuk góra / kciuk dół; kciuk dół otwiera chipsy "Za ciężko / Za długo / Słabszy dzień", zero pól tekstowych; (3) dopiero po ocenie podsumowanie: 3 liczby hero (tonaż, czas, serie), pod spodem blok PR per ĆWICZENIE (nie per sesja), sekcja "co poszło dobrze / na co uważać" z porównania plan vs wykonanie; (4) przycisk "Udostępnij" + powrót na Dashboard z podświetloną kartą następnego dnia treningowego.

**Dlaczego:** micro-commitment (1 tap oceny) przed nagrodą (insight) daje wysoki response rate i karmi silnik progresji realnym RPE-sygnałem ("za ciężko" = nie podbijaj ciężaru w przyszłym tygodniu). PR per ćwiczenie zamiast per trening = prawie zawsze jest co świętować (u Runny PB z pojedynczego segmentu km pełni tę samą rolę). Powrót na Dashboard z podświetlonym następnym dniem zamyka pętlę "co dalej" bez martwego punktu.

**Nakład:** konfetti + wypełnienie karty: S. Ocena kciukiem z chipsami: S-M (zapis + konsumpcja przez silnik: M). Porównanie plan vs wykonanie: M. Podpięcie oceny do progresji: M.

### 3.2. Share card (layout do wygenerowania w HTML/CSS)

**Layout karty (format 1080x1920 pod IG Stories, render HTML/CSS do canvas/PNG):**

- Tło: ciemny gradient Glassmorphism Pro (prawie-czerń, delikatny glow limonki w rogu), panel glass z zaokrągleniem 24 px i subtelnym borderem na środku, marginesy bezpieczne pod UI Stories (góra/dół po ok. 250 px).
- Góra panelu: logo Strength Save (małe, wyciszone) + data i typ sesji ("Push, wtorek 11.08").
- Hero (środek): JEDNA statystyka wybrana przez usera, cyfry ogromne (ok. 120-140 pt, font wagi 800), w limonce: tonaż ("4 250 kg") albo PR ("Wyciskanie 100 kg x 5, nowy rekord") z badge "PR" w limonkowym pill.
- Pod hero: rząd 3 mniejszych statystyk w kolumnach (czas / serie / ćwiczenia), cyfry białe, etykiety wygaszone, separatory pionowe 1 px.
- Dół: pasek postępu planu ("Tydzień 6 z 12" + fill w limonce) i dyskretny brand "strengthsave.app".
- Kreator przed publikacją: user wybiera statystykę hero (tonaż / PR / czas / streak) i jeden z 2-3 szablonów tła; systemowy share sheet.

**Dlaczego:** "Spotify Wrapped for runners" to organiczny growth loop zero-cost, a PR-y siłowe są naturalniejszym materiałem do chwalenia się niż tempo biegu. Kontrola usera nad tym, co jest na karcie (u Runny "you can pick your stats"), decyduje o tym, czy w ogóle ją opublikuje. Render z HTML/CSS trzyma spójność z design systemem apki bez osobnego pipeline'u graficznego.

**Nakład:** M (szablon HTML/CSS + render do obrazu + share sheet; dane wszystkie już są).

### 3.3. Makro-celebracja: recap końca cyklu

**Layout:** po ukończeniu ostatniej sesji cyklu sekwencja 4-5 pełnoekranowych kart w stylu stories (tap = następna): łączny tonaż cyklu, progres ciężarów w bojach głównych (było > jest, delta w limonce), liczba PR-ów, najbardziej konsekwentna partia, karta finałowa z share.

**Dlaczego:** Plan Replay Runny trafia w moment największego ryzyka churnu: user osiągnął cel i nie ma powodu zostać. Recap + od razu propozycja następnego cyklu domyka przejście. Materiał do share'a przy okazji.

**Nakład:** L. Do backlogu, ale z wysokim priorytetem retencyjnym.

---

## 4. Kalendarz / plan: tygodnie i typy dni

### 4.1. Widok planu: lista tygodni jako mapa periodyzacji

**Layout:** ekran planu od góry: (1) nagłówek z celem i postępem bloku ("Tydzień 6 z 12, 48 z 96 sesji... "), (2) karta silnika progresji w roli karty "Runna AI": stan ("progresja na torze" / "obserwuję ostatnie oceny" / "sugeruję deload") + ewentualne CTA, (3) przewijana lista WSZYSTKICH tygodni, wiersz = numer tygodnia + zbiorczy wolumen (liczba sesji + planowany tonaż), tygodnie deload oznaczone wyciszonym kolorem i etykietą.

**Dlaczego:** u Runny lista tygodni z samym kilometrażem czyta się jako mapa periodyzacji (widać cutback i taper bez wchodzenia w szczegóły). Siłowy odpowiednik: user widzi falowanie objętości i wie, kiedy przyjdzie deload. Karta stanu silnika daje powód wracania do zakładki planu.

**Nakład:** M (agregaty per tydzień z istniejącego planu).

### 4.2. Widok tygodnia: karty dni kolorowane po typie

**Layout:** tap w tydzień: pionowa lista kart dni, każdy typ sesji z własnym kolorem wg reguły #8 (pasek koloru na lewej krawędzi karty + tło koloru /10, tekst pełny): np. push / pull / legs albo siła / hipertrofia / deload, osobny wyciszony wariant dla dnia wolnego. Ukończone dni z checkmarkiem w limonce. Nawigacja: przełącznik tygodni w nagłówku (dropdown z listą) + strzałki lewo/prawo, zamiast długiego scrolla.

**Dlaczego:** kolor jako pierwszy nośnik typu sesji daje odczyt struktury tygodnia w pół sekundy (kofuzi: "one color for all your easy runs..."). Limonka pozostaje zarezerwowana dla akcji i sukcesu, typy dostają własne stłumione kolory: to dokładnie podział ról z języka wizualnego Runny.

**Nakład:** M.

### 4.3. Przestawianie dni: drag and drop z guardrailami

**Layout:** tryb "Przestaw tydzień": long-press na karcie dnia + przeciągnięcie na inny dzień, ograniczenia twarde: w obrębie tygodnia lub +/- 1 tydzień, max 1 sesja z planu dziennie, nie można upuścić na dzień z inną sesją planową. Walidacje miękkie jako ostrzeżenie (nie blokada): "dwa ciężkie dni pod rząd" oraz siłowo-specyficzna "ta sama partia dzień po dniu". Zatwierdzenie przyciskiem "Zapisz", dopiero wtedy przeliczenie.

**Dlaczego:** przełożenie treningu to najczęstsza edycja planu w realnym życiu; gest zamiast formularza. Limity chronią strukturę periodyzacji przed rozjechaniem, a ostrzeżenie zamiast blokady to trener, nie policjant. Save jako jawny commit chroni przed przypadkową zmianą (istotne przy dotyku).

**Nakład:** L (interakcja + przeliczenia). Wersja minimalna bez dnd: menu "Przenieś na..." na karcie dnia: M.

### 4.4. Godzina treningu + eksport do kalendarza

**Layout:** na karcie dnia arkusz z toggle "Ustaw godzinę": picker + szacowany czas trwania (suma serii i przerw już policzalna z planu) + checkbox "domyślna godzina dla przyszłych treningów". Zapis tworzy event w kalendarzu systemowym.

**Dlaczego:** trening z godziną i czasem trwania staje się zobowiązaniem kalendarzowym między spotkaniami, a nie dobrą intencją. Szacowany czas sesji to informacja, którą apka siłowa ma za darmo, a Runna musi estymować.

**Nakład:** M (Capacitor calendar plugin + estymata czasu).

---

## 5. Onboarding: kolejność ekranów

Docelowa sekwencja (szkielet Runny z trzema poprawkami): intro carousel > quiz 1 pytanie na ekran > przerywnik social proof > recap wyborów > ekran obietnicy > paywall > pierwszy trening celowo łatwy.

### 5.1. Intro carousel przed pierwszym pytaniem

**Layout:** 3-4 pełnoekranowe slajdy auto-przewijane (stories-style, bez tapania): (1) plan siłowy dopasowany do Ciebie, (2) odhaczanie serii + timer przerwy (zrzut realnego WorkoutDay), (3) progresja ciężarów tydzień po tygodniu (wykres w limonce), (4) slajd zbijający lęk: "Twoje treningi są bezpieczne, offline i sync" (adres realnego bólu: utrata danych). Nagłówki max 9 słów, obraz robi robotę.

**Dlaczego:** zbija niepewność zanim padnie pierwsze pytanie; auto-advance usuwa decyzję "czy tapnąć". Slajd o bezpieczeństwie danych to siłowy odpowiednik slajdu kontuzyjnego Runny (adresowanie lęku, nie feature'a).

**Nakład:** S-M.

### 5.2. Kreator planu: jedno pytanie na ekran + progress bar

**Layout:** sekwencja: cel (siła / sylwetka / oba) > staż > dni w tygodniu (day picker) > dostępny sprzęt > ostatnie ciężary lub szacunek 1RM w bojach głównych (input z walidacją inline: nierealna wartość daje życzliwy komunikat, nie błąd) > kg/lbs. Krótkie, proste kontrolki single-select. Na górze CIENKI progress bar w limonce (przewaga nad Runną: screensdesign wytyka jej brak wskaźnika postępu jako punkt tarcia).

**Dlaczego:** każda odpowiedź buduje poczucie personalizacji i sunk cost przed paywallem; 1 temat na ekran = zero przeciążenia; walidacja nierealnych ciężarów buduje zaufanie do algorytmu ("apka wie, co jest realne na wyciskaniu"). Nie kopiować długości 1:1: 30+ ekranów Runny to 12 minut; dla siłowni celuj w 10-14 ekranów.

**Nakład:** M (kreator istnieje, do przebudowy struktura + walidacje + progress bar).

### 5.3. Przerywniki social proof

**Layout:** 1-2 ekrany bez pytań między blokami quizu: zdjęcie/render treningowy + licznik ("dziś odhaczono X tys. serii w Strength Save" albo "X osób trenuje push/pull/legs w tym tygodniu"). Najgęstszy przerywnik tuż przed paywallem.

**Dlaczego:** rozbija monotonię quizu i dowozi dowód dokładnie tam, gdzie spada motywacja. Uwaga: liczniki tylko z REALNYCH danych (telemetria już jest); zmyślony social proof łamie zasadę zero ściemy.

**Nakład:** S (przy realnych agregatach z backendu: M).

### 5.4. Recap + ekran obietnicy

**Layout:** (1) ekran podsumowania wyborów: "Twój plan: 4 dni, sztanga i hantle, cel: siła" jako karty-potwierdzenia; (2) ekran predykcji: dwie kolumny "Bez planu" vs "Z planem", delta w limonce, w jednostce, którą user sam podał: np. "Wyciskanie dziś: 80 kg. Za 12 tygodni: ok. 87,5 kg" z uczciwym zakresem. Bez animowanego fake-loadera "buduję plan" (Runna go nie ma i nie potrzebuje: wartość komunikuje recap + predykcja).

**Dlaczego:** kwantyfikacja obietnicy w liczbie osobistej dla usera (jego własny ciężar) sekundę przed ceną to najskuteczniejszy ekran całego flow Runny. Predykcja musi być zachowawcza i oparta o realne dane silnika progresji, inaczej podważa zaufanie przy pierwszym niedowiezieniu.

**Nakład:** recap: S. Predykcja z silnika: M.

### 5.5. Paywall

**Layout:** dwie karty: Roczny (domyślnie zaznaczony, badge "OSZCZĘDZASZ X%") i Miesięczny; cena roczna przeliczona na tydzień ("to ok. 2,30 zł tygodniowo"); pod kartami ocena App Store + 2-3 krótkie cytaty userów; CTA w limonce; trial jasno opisany (kiedy pierwsza płatność).

**Dlaczego:** dwa warianty bez paraliżującej siatki planów, kotwica cena/tydzień obniża percepcję kosztu, social proof łapie moment wahania. Ten sam wzorzec (przeliczenie na tydzień + jeden badge) do powtórzenia w sekcji SUBSKRYPCJA świeżo przeprojektowanego Profilu.

**Nakład:** S-M (paywall i eligibility już istnieją, to zmiana layoutu i copy).

### 5.6. Po zakupie: typy sesji + pierwszy trening easy win

**Layout:** (1) ekran "typy sesji w Twoim planie" (siła / hipertrofia / deload) jako karty z krótkim opisem i kolorem typu (spójnym z widokiem tygodnia z 4.2); (2) pierwsza sesja planu celowo lekka, z jawnym copy na karcie dnia: "Pierwszy trening jest lżejszy. Celem jest technika i punkt startowy, nie rekord".

**Dlaczego:** pierwsza sesja ustawiona tak, żeby user NIE mógł polec = aktywacja. W siłowym kontekście lekki start to dodatkowo poprawna metodyka (kalibracja ciężarów), więc easy win i uczciwość trenerska idą razem.

**Nakład:** ekran typów: S. Logika lżejszego pierwszego tygodnia w silniku: M.

---

## 6. Język wizualny: co przenieść, czego nie

### Przenieść

| Wzorzec Runny | Adaptacja w Glassmorphism Pro | Nakład |
|---|---|---|
| Neutralne ciemne tło + wąska paleta akcentów o jasnym znaczeniu | Limonka gra rolę koralu/tealu Runny: WYŁĄCZNIE akcja, sukces, progres (CTA, checkmark, PR, fill progress bara). Nie do dekoracji nagłówków i ikon | S (audyt użyć limonki) |
| Kolor jako nośnik TYPU treningu i statusu | Osobna, stłumiona paleta typów sesji, zawsze wg reguły #8: tło /10 + tekst pełny + pasek na krawędzi karty | M |
| "Big confident type": liczby jako typograficzny hero | Kg, serie, powtórzenia, tonaż: największe i najgrubsze elementy kart; etykiety małe i wygaszone; hierarchię robi wielkość cyfr, nie kolejna ramka glass | M (przegląd WorkoutDay, Dashboard, Historia) |
| Twarda hierarchia list: 3 liczby na karcie, głębia po tapie | Historia: karta = tonaż / czas / liczba serii; serie, ciężary i RPE dopiero w szczególe; PR per ćwiczenie w osobnym bloku | M |
| Checkmark + wypełnianie się siatki jako pętla nagrody | Checkmark w limonce na karcie dnia i wierszu tygodnia, animacja wypełnienia po ukończeniu | S |
| Sekcjonowanie ustawień (chunking) | Już wdrożone w redesignie Profilu (TRENING / TWOJE DANE / SUBSKRYPCJA / KONTO / APLIKACJA / POMOC / SYSTEM); wzorzec Runny potwierdza kierunek | zrobione |

### Nie przenosić

- **Zdjęcia lifestyle wewnątrz apki.** U Runny robią robotę w onboardingu i marketingu; w ciemnym glassmorphism fotografia stockowa gryzie się z estetyką. W apce zostają animacje ćwiczeń i typografia; zdjęcia najwyżej w intro carousel onboardingu.
- **Pełne, jaskrawe tła statusowe.** Prosto z reguły #8: żadnych pełnych kolorów pod tekstem, zawsze /10 + pełny kolor tekstu.
- **Identyczna pusta karta ominiętego dnia niezależnie od powodu.** To wprost krytyka Runny (karta działa jak mała pretensja). Ominięty dzień w Strength Save: wyciszona karta, neutralne copy, jeden tap "przenieś / pomiń" (patrz 1.4). Historia ma raportować, nie oskarżać.
- **Mnożenie blisko-znacznych sekcji ustawień.** Antywzorzec "Workout Settings vs Phone Recording Settings": pilnować, żeby APLIKACJA i SYSTEM w Profilu nie zaczęły dublować zakresów.
- **Audio cues i live prompty w trakcie wysiłku.** Fundament Runny, bez sensu na siłowni: w połowie serii nikt nie słucha telefonu, a JS w tle nie żyje. Sygnały pozostają systemowe: local notification + haptyka + Live Activity (2.5).
- **Auto-odhaczanie z urządzenia jako jedyna ścieżka.** U Runny checkmark przychodzi z zegarka; na siłowni ręczne odhaczenie serii JEST rytuałem i nagrodą. Sync z watchOS może dokładać, ale tap pozostaje pierwszą klasą.

---

## Priorytety wdrożeniowe (top 5 wg stosunku wartości do nakładu)

1. **Sekwencja completion: konfetti > kciuk > podsumowanie > następny krok** (S-M, sekcja 3.1): domyka pętlę nawyku, karmi silnik progresji, zero konfliktu ze środowiskiem siłowni.
2. **Karta tygodnia z checkboxami, progress barem i tonażem** (M, 1.3): najtańsza warstwa nagrody nad już istniejącym odhaczaniem serii.
3. **Dwa stany ekranu treningu: seria vs przerwa-hero** (M, 2.3): największa poprawa czytelności tam, gdzie user faktycznie patrzy w ekran.
4. **Tray zaległego treningu** (M w wersji minimalnej, 1.4): realizacja reguły #6 na poziomie planu, ochrona retencji po słabym tygodniu.
5. **Share card HTML/CSS** (M, 3.2): jedyny kanał organicznego wzrostu w tej liście, dane już są.

Osobno, jako inwestycja natywna: **Live Activity** (L, 2.5): najlepsza odpowiedź całego researchu na naturę siłowni (zgaszony ekran, telefon na ławce).
