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
