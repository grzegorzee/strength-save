# Strength Save — plan Product / UX / UI 10/10

Stan bazowy: 2026-08-27. Dokument żywy; każda fala aktualizuje status, dowody i
bramki. Nie jest zgodą na deploy ani publikację. Wersje marketingowe pozostają
`1.0.0`; zmienia się wyłącznie numer builda po osobnej decyzji release.

Stały kontrakt prostoty, progresywnego ujawniania, rzetelności treści i bramki
review opisuje `docs/PRODUCT-PRINCIPLES.md`. Każda fala i kryterium akceptacji w
tym planie muszą przejść tę bramkę.

## Definicja 10/10

„10/10” nie oznacza maksymalnej liczby efektów. Strength Save ma wyglądać jak
precyzyjne narzędzie treningowe, które działa na zatłoczonej siłowni, jedną ręką,
przy słabym internecie i po zgaszeniu ekranu. Ocena 10/10 wymaga jednocześnie:

1. **Produkt:** nowy użytkownik rozumie obietnicę, dostaje sensowny plan, wie co
   zrobić dzisiaj i kończy pierwszy trening bez instrukcji od człowieka.
2. **UX:** każda główna akcja jest oczywista, odwracalna albo odzyskiwalna; nie ma
   ślepych zaułków, utraty draftu ani modalnego blackoutu.
3. **UI:** jeden system typografii, odstępów, powierzchni, obrysów, ikon, motion i
   trzech ról koloru; kompletne PL/EN; czytelność przy font scale 200%.
4. **Mobile:** bezpieczne insety, klawiatura nie zakrywa CTA, cele dotyku min.
   44 pt i 48 dp, poprawny back/swipe, VoiceOver/TalkBack, reduced motion,
   portrait/landscape i Android edge-to-edge.
5. **Zaufanie:** draft, kolejka synchronizacji i komplet ćwiczeń planu przeżywają
   offline, suspend, force-kill i konflikt; błąd zawsze mówi co dalej.

Nadrzędny filtr produktu: **prostota, skuteczność i rzetelność**. Na ekranie
pokazujemy tylko informację potrzebną do bieżącej decyzji; reszta jest dostępna
przez progresywne ujawnianie. Jedna główna akcja ma być rozpoznawalna bez
instrukcji. Nie publikujemy estymacji bez opisanej metodologii, nie udajemy AI,
nie dodajemy dekoracyjnych emoji ani tekstu generującego wrażenie funkcji, której
produkt faktycznie nie wykonuje. Efekt „wow” ma wynikać z płynności, precyzji i
odzyskiwalności, a nie z liczby kart, metryk i animacji.

Każdy nowy element przechodzi pięć pytań przed implementacją:

1. Jaką jedną decyzję lub czynność użytkownika ułatwia właśnie teraz?
2. Czy istniejąca informacja, etykieta albo ekran już realizuje ten cel?
3. Czy można pokazać szczegół dopiero po tapnięciu, bez utraty odkrywalności?
4. Czy treść jest wynikiem zweryfikowanych danych i opisanej metody, a nie
   domysłem, marketingiem lub antropomorfizacją algorytmu?
5. Czy po błędzie, offline, zgaszeniu ekranu i powrocie użytkownik nadal widzi
   jednoznaczny następny krok?

Brak konkretnej odpowiedzi oznacza, że element nie wchodzi do głównego flow.

Świeży baseline X55 z `audit/latest.json`: **9,2/10** dla wspólnej warstwy web/UI
i lokalnych buildów. Wynik jest celowo niższy od 10/10: automat potwierdza brak
blank screenów, wyjątków, NaN i poziomego overflow. Tryb podstawowy nie wymaga
już health, ale backendowa granica RPE/bólu nadal nie jest szczelna, a krytyczne lifecycle,
dostępność, klawiatura i eksport nie mają jeszcze podpisu z fizycznego iOS oraz
Androida. Poprzednie 10,0/10 opisywało wyłącznie render sweep i nie może być
używane jako ocena gotowości produktu do publicznego wydania.

X55 upraszcza pierwszy kontakt z produktem bez odejmowania funkcji: onboarding
pokazuje jedną decyzję i jedno główne CTA, usuwa sztuczny timer „dopasowywania”,
utrzymuje krok nazwy planu nad klawiaturą, Plan przenosi rzadkie akcje dnia do
jednego menu 44×44, Profil grupuje ustawienia w osiem sekcji, a Historia pokazuje
najpierw pięć ostatnich sesji. Analiza avatara pozostaje wyłączona w 1.0.0;
użytkownik wybiera jedną z trzech pełnych palet bez automatycznego przetwarzania
zdjęcia. Picker Pulse/Forge/Glacier i wejście „Własny kolor” świadomie pozostają
w onboardingu jako krótki moment personalizacji i efekt „wow”; Pulse jest
ustawieniem domyślnym, więc wygląd nie staje się blokującą decyzją.

## Kierunek wizualny: „instrument treningowy”

Strength Save ma przypominać dobrze zaprojektowany przyrząd treningowy: ciemna,
spokojna baza; wyraźna hierarchia liczb; precyzyjne obrysy; jedna dominująca akcja;
kolor jako informacja, nie dekoracja. Nie kopiujemy generycznego „neon fitness”.

- **Typ:** `Space Grotesk Variable` dla tytułów i kluczowych liczb, `Inter
  Variable` dla treści i kontrolek. Mono tylko dla czasu, ciężaru, serii i krótkich
  metadanych.
- **Layout:** rytm 4/8 px, czytelna jedna kolumna na telefonie, maksymalnie jeden
  dominujący CTA na viewport. Na średnich/dużych oknach układ adaptuje strukturę,
  a nie tylko rozciąga karty.
- **Forma:** obrys 1 px dla pól i stanów interaktywnych, 2 px dla focus/selection;
  powierzchnie budują głębię tonalnie. Stan nie może polegać wyłącznie na kolorze.
- **Sygnatura:** „training rail” — cienka, segmentowa linia postępu łącząca plan,
  dzień, serie i synchronizację. Ma pokazywać pozycję i ciągłość, nie być ozdobnym
  paskiem na każdym ekranie.
- **Motion:** krótkie przejścia wyłącznie dla zmiany stanu, ukończenia serii i
  postępu; każda animacja przerywalna i wyłączona przez `prefers-reduced-motion`.
- **Palety:** Pulse, Forge, Glacier; role `primary`, `supportA`, `supportB`.
  Kolory błędu/sukcesu/ostrzeżenia pozostają semantycznie stałe.
- **Gęstość:** jedna decyzja na ekran/sekcję; zaawansowane dane na żądanie;
  puste, niepewne lub nieweryfikowalne metryki nie zajmują miejsca w hierarchii.

Celowy eksperyment estetyczny: segmentowy training rail może stać się
rozpoznawalnym motywem produktu. Warunek pozostawienia: w testach nie może
konkurować z CTA, pogarszać kontrastu ani zwiększać wysokości krytycznego ekranu
treningu. W przeciwnym razie zostaje tylko w onboarding/plan summary.

## North-star flow

```text
login
  → szybkie powitanie i wartość
  → regulamin + informacja o prywatności
  → tryb podstawowy albo dobrowolne odblokowanie funkcji zdrowotnych
  → cel + doświadczenie + dostępność dni
  → rekomendacja z krótkim „dlaczego”
  → podgląd i edycja planu
  → plan zapisany lokalnie i zdalnie
  → ekran „Twój pierwszy krok”
      → Dzisiaj: następny trening
      → Plan: harmonogram i zmiany
      → trening: wpisz → odhacz → przerwa → zakończ
  → synchronizacja z jawnym stanem
```

Onboarding ma być szybki i możliwy do opuszczenia tam, gdzie prawo i integralność
danych na to pozwalają. Instrukcje po utworzeniu planu są kontekstowe, krótkie,
mają `Pomiń`, zapis stanu i możliwość ponownego uruchomienia z Profilu. Nie
tworzymy wieloekranowego touru, który zasłania produkt.

## Kolejność upraszczania produktu

Kolejne iteracje przechodzą przez ekrany w kolejności wynikającej z kosztu
błędnej decyzji użytkownika, a nie z atrakcyjności wizualnej:

1. **Onboarding** — na każdym kroku jedna decyzja i jedno główne CTA. Trzy gotowe
   palety i „Własny kolor” pozostają w pierwszym flow jako celowy efekt jakości,
   ale nie tworzą osobnego kroku ani obowiązkowego wyboru: Pulse jest ustawieniem
   domyślnym, a pełny edytor pozostaje na żądanie. Regulamin i Polityka są wejściem,
   health jest pytany kontekstowo.
2. **Postępy** — pierwszy widok odpowiada krótko „czy idę do przodu?”: jedno
   tygodniowe podsumowanie i najwyżej trzy rzetelne liczby. Wykresy, rekordy,
   pomiary i metodologia pozostają w drill-down; lista ukończonych treningów
   należy do Historii.
3. **Plan** — pierwszy widok odpowiada „co i kiedy ćwiczę?”. Zarządzanie,
   wakacje, wyjątki i zmiana cyklu są wtórne; obciążenie i analiza nie konkurują
   z harmonogramem.
4. **Profil** — tożsamość, konto, wygląd, połączenia i dane. Bez ponownego
   prezentowania metryk Postępów i bez tierów/odznak, które nie prowadzą do
   jednoznacznej korzyści lub szczegółu.
5. **Dzisiaj** — zachować mocny hero treningu, jedno rozpocznij/wznów i najwyżej
   dwa kontekstowe skróty. Dodajemy element wyłącznie wtedy, gdy jest pilny dla
   bieżącego treningu.

Wspólna bramka każdego ekranu:

- pierwsza hierarchia nie przekracza jednej decyzji i jednego dominującego CTA;
- żadna karta ani liczba nie jest widoczna bez zweryfikowanego źródła,
  metodologii oraz zachowania dla braku/błędu danych;
- status mówi konkretnie `zapisano na urządzeniu`, `zapisano w chmurze` albo
  `synchronizacja po odzyskaniu sieci`; nie używa absolutów typu „wszystko
  bezpieczne”;
- funkcja wtórna jest nadal odkrywalna, ale nie konkuruje w pierwszym widoku;
- brak dekoracyjnych emoji, sztucznego oczekiwania, pseudointeligentnego copy i
  antropomorfizacji algorytmu.

Stan 2026-08-28: nagłówek Profilu został uproszczony zgodnie z punktem 4. Usunięto
nierzetelny tier, odliczanie do kolejnego poziomu i pasek; pozostały imię, PRO i
liczba treningów. Celowana regresja Profilu: 62/62.

## Fale wdrożenia

### Fala 0 — wiarygodny baseline i kontrakty

Zależności: brak. Status: **automat i punktowy audit wspólnego web/UI ukończone;
fizyczny podpis natywny oraz skala tekstu 200% pozostają otwarte**.

- odświeżyć audyt po usunięciu zduplikowanych tytułów;
- zinwentaryzować onboarding, shell mobilny, dialogi, pola, CTA i telemetrykę;
- ustalić testowe viewporty: 320×568, 375×667, 390×844, 430×932,
  844×390 oraz Android compact/medium/expanded;
- zapisać kontrakty: 44 pt/48 dp, brak CTA pod klawiaturą, jeden `h1`, jeden
  dominujący CTA, pełne PL/EN, reduced motion i odzyskiwalny stan.

Akceptacja:

- świeży route render sweep Chromium/WebKit bez blank/error/overflow;
- testy kontraktów typografii, headingów, selection outline i overlay lifecycle;
- lista luk ma dowód `plik:linia`, ryzyko i test, nie tylko opinię wizualną.

### Fala 1 — onboarding do pierwszej wartości

Zależności: fala 0. Priorytet: **P0**.

Status 2026-08-28: **implementacja recovery/handoff/tour i rozdzielenie
personalizacji od zgód są ukończone; fala A trybu podstawowego i dobrowolnego
health 1.1 jest ukończona lokalnie, backendowa fala B i fizyczne QA są w toku**. Zrealizowano
Preferences draft per UID z TTL,
idempotentny retry częściowego zapisu, nieblokujący przewodnik po planie,
replay w Profilu, natychmiastową rekomendację oraz mobile-safe First Workout
Tour. Bieżący zapis zgód ma dostępny stan oczekiwania i jawny alert błędu, ale
nie może docelowo blokować całej aplikacji tylko dlatego, że użytkownik nie chce
funkcji zdrowotnych. Szkic własnego planu nie jest już kasowany
na kroku 6/6; pełne ćwiczenia
znikają dopiero po potwierdzonym zapisie planu. Otwarta pozostaje macierz
fizycznych urządzeń.

Trzy palety oraz „Własny kolor” pozostają w tym flow świadomie: dają natychmiastowy
podgląd własnej aplikacji bez dodawania nowego ekranu, opóźnienia lub konieczności
konfiguracji. Pulse pozwala przejść dalej bez podjęcia decyzji o wyglądzie.

Otwarta redukcja poznawcza: początkowy flow nadal wymaga punktowego przeglądu
liczby wyborów przed rekomendacją. Docelowo użytkownik najpierw podaje realną
liczbę dni, dostaje sugerowany harmonogram i jedną rekomendację z krótkim
„dlaczego”. Dokładne dni, inne plany i wygląd są akcjami wtórnymi. Nie wolno
usuwać tych możliwości — należy je ujawnić dopiero na żądanie.

1. Rozdzielić pierwszy ekran na jasną obietnicę/personalizację i czytelny krok
   zgód, nie zmieniając treści prawnej ani backendowego dowodu zgody.
2. Skrócić teksty do jednego zadania na ekran; rekomendacja planu pokazuje
   „dlaczego ten plan” na podstawie odpowiedzi, bez udawania AI.
3. Po zapisaniu planu pokazać nieblokujący „Twój pierwszy krok”: karta na ekranie
   Dzisiaj wyjaśnia trzy miejsca przy realnych elementach: Dzisiaj, Plan i Start.
4. Istniejący tour pierwszego treningu zachować i dopracować jako naukę przez
   działanie: wpisz serię → odhacz → zakończ. Tour ma skip, Escape/back, replay,
   focus management i nie może konkurować z rozgrzewką/dialogiem.
5. Pomiary, marketing, Health, notifications i rating prosić dopiero w kontekście
   korzyści; nie piętrzyć kilku modali zaraz po planie.
6. Główny wizard zapisuje wersjonowany szkic per UID po jawnej zmianie. Szkic ma
   TTL 7 dni, walidację i nie przechowuje checkboxów ani dowodu zgody. Native używa
   oficjalnego `@capacitor/preferences`; web korzysta z fallbacku pluginu.
7. Najpierw testujemy sekwencję częściowego zapisu: cykl utworzony → plan nie
   zapisany → restart → inny wybór → retry. Wynik musi mieć dokładnie jeden aktywny
   cykl zgodny z planem; pamięć komponentu nie może być granicą transakcji.
8. Rozdzielić podstawę prawną i UX: akceptacja Regulaminu osobno, Polityka jako
   obowiązek informacyjny, a dane zdrowotne jako granularne i dobrowolne
   odblokowanie funkcji. Odmowa lub błąd zapisu nie może wylogować ani blokować
   trybu podstawowego. Backend ma odrzucać nowe zapisy zdrowotne po `withdrawn`.

Akceptacja:

- użytkownik dojdzie od loginu do widocznego pierwszego treningu bez martwego
  ekranu i bez cofnięcia wyborów po resume/reload;
- krok zgód: szybki sukces, wolna sieć, offline/retry i podwójny tap są
  idempotentne; przycisk nie wygląda jak zawieszony, a „Kontynuuj bez funkcji
  zdrowotnych” prowadzi do działającego trybu podstawowego;
- guide ma `Pomiń`, `Dalej`, `Gotowe`, replay w Profilu i zapis wersji, a brak celu
  DOM kończy się bez overlayu;
- E2E PL/EN, 320 px, 390×844, landscape, keyboard, reduced motion, VoiceOver
  labels i Android back;
- stary onboarding, replan i paywall działają bez zmiany kontraktu danych.

Metryki bez danych wrażliwych: `onboarding_step_viewed/completed`, czas kroku,
retry, skip, plan_confirmed, first_workout_started/completed. Bez tekstów pól,
URL avatara i kolorów surowych.

### Fala 2 — trzy palety i personalizacja prywatna

Zależności: stabilny flow fali 1. Priorytet: **P1**.

Status 2026-08-28: **foundation presetów i progressive disclosure ukończone;
avatar-custom odłożony poza 1.0.0, device QA w toku**. Pulse/Forge/Glacier mają trzy role runtime, preview/cancel/confirm,
cold-start cache, cloud sync, kompatybilność legacy oraz walidację Firestore.
Kompaktowy picker trzech presetów i wejście „Własny kolor” pozostają w onboardingu;
Profil pokazuje zwinięty podgląd kolorów, a pełny edytor dopiero po wejściu.
Radiogroup obsługuje strzałki, Home/End i jeden przystanek Tab. Wyścig
preview → zewnętrzna zmiana → anulowanie/unmount ma test i nie przywraca starej
palety.
Nie twierdzimy jeszcze, że istnieje gotowe `avatar-custom` ani że supportA/B
są już wykorzystane na wszystkich ekranach danych.

- wdrożyć wersjonowany `PaletteThemeV2` opisany w
  `RESEARCH-UX-TYPOGRAPHY-CAPACITOR-2026-08-27.md`;
- Pulse, Forge i Glacier dostępne identycznie dla Google, Apple, e-mail i offline;
- Google: w 1.0 avatar służy wyłącznie do powitania. Lokalna propozycja pełnego
  motywu wraca w osobnej fali dopiero po zabezpieczeniu fetch/decode/recovery,
  bez wysyłki zdjęcia i rozpoznawania twarzy/skóry;
- podgląd nie zapisuje; anulowanie przywraca poprzedni zestaw tokenów;
- dotychczasowe 11 akcentów i custom hex zachowują wygląd do jawnej decyzji usera.

Akceptacja:

- migracja wszystkich legacy akcentów bez zmiany wyglądu;
- cold start/offline/cross-device stosuje pełną paletę bez flasha starego motywu;
- kontrast tekstu ≥4,5:1, granic/focusu ≥3:1, stan ma też ikonę/kształt/tekst;
- dla przyszłego avatar-custom: sukces, brak, redirect, timeout z rzeczywistym
  anulowaniem, limit transferu/pikseli, zły MIME/host, offline i anuluj;
- testy snapshot/token + E2E obu silników + urządzenia iOS/Android.

### Fala 3 — mobile component quality

Zależności: kontrakty fali 0; może iść równolegle z falą 2 w rozłącznych plikach.
Priorytet: **P0/P1 według ryzyka**.

- jeden kontrakt Button/field/select/switch/checkbox/radio/chip/tab;
- wszystkie interaktywne elementy mają 44 pt i 48 dp efektywnego targetu;
- dialogi i sheets: bez blackoutu, z widocznym close/cancel, scrollowalnym body i
  CTA nad klawiaturą/safe area;
- iOS: swipe-back, VoiceOver, Dynamic Type, safe area, standardowe gesty;
- Android: system back, TalkBack, font scale 200%, edge-to-edge/insets,
  orientation/multi-window i stan po recreation;
- `AppNavigation`: stabilne pięć top-level destinations; licznik treningów i
  dzwonek mają jeden kontrakt na każdym ekranie;
- bannery/toasty: każdy długotrwały stan ma natychmiastowe zamknięcie albo akcję.

Status 2026-08-27: wspólny wizard i pod-ekrany onboardingu respektują safe area,
inset klawiatury, stabilny scroll oraz targety 44/48 px. Zmiana kroku przenosi
fokus na nagłówek, a Android Back najpierw cofa lokalny krok, bibliotekę lub
builder. Watchdog overlayów nie mutuje już treści portalu należącej do Reacta,
a szybkie zamknij→otwórz oraz wyjście z treningu mają regresję w obu silnikach.
Pełny Vitest, Chromium/WebKit, iOS Simulator build+launch i Android debug build są
zielone; fizyczne urządzenia pozostają bramką.

Akceptacja:

- automatyczny sweep targetów i dostępnych nazw, keyboard/visual viewport oraz
  overlay/body-lock;
- screenshot diff na macierzy viewportów i obu językach;
- fizyczny iPhone SE/standard/Max oraz mały Android/Pixel/tablet lub foldable;
- szybki rotate, app switch, sleep/lock/resume, przychodzące powiadomienie i
  utrata/odzyskanie sieci bez utraty stanu.

### Fala 4 — trening jako najlepszy ekran produktu

Zależności: fala 3. Priorytet: **P0**.

- ponad zgięciem: nazwa ćwiczenia, poprzedni wynik, aktywna seria i jednoznaczny
  check; narzędzia drugorzędne nie konkurują z logowaniem;
- deadline timera i systemowa notyfikacja pozostają źródłem prawdy przy zgaszonym
  ekranie; żadna obietnica oparta o `setTimeout` w tle;
- jawny offline/saved/pending/synced, ale bez ciągłego alarmowania;
- koniec treningu: podsumowanie, następny krok, recoverable failure i brak
  osieroconego overlayu.

Akceptacja:

- sekwencja obowiązkowa: plan → wyjście → szybki trening → powrót do planu →
  zakończenie → synchronizacja;
- screen off ≥2 min, WKWebView suspend, force-kill, IDB reconnect i fallback;
- pełna lista planu nigdy nie traci ćwiczeń, a kolejka nie synchronizuje dwa razy;
- timer, haptics/audio/notification ocenione na realnych urządzeniach.

`@capacitor/background-runner` pozostaje warunkowy. Wdrażamy wyłącznie po
telemetrii dowodzącej, że foreground resume + systemowe notification nie
wystarczają. Brak dowodu oznacza instrumentację i runbook, nie proces w tle.

### Fala 5 — powierzchnie danych i premium polish

Zależności: fale 2–4.

- Dzisiaj, Plan, Historia, Postępy i Profil używają tych samych nazw, liczników,
  hierarchii nagłówków i wzorca drill-down;
- kafle osiągnięć/statystyk są klikalne, gdy obiecują szczegół; dekoracyjne odznaki
  nie zabierają miejsca decyzjom;
- empty/loading/error/success mają jeden język wizualny i wyjście;
- eksport JSON/CSV/PDF/PNG i Share/FileSystem zachowują parity web/iOS/Android.

Akceptacja:

- route×state×viewport×language sweep bez niespójnych nazw i martwych elementów;
- każda karta sygnalizuje interaktywność albo jest jawnie statyczna;
- dostępność wykresów: tekstowe podsumowanie, nie tylko kolor/kształt;
- ręczny eksport/share/open/cancel i odzyskanie po restarcie.

Docelowy kontrakt informacji na telefonie:

1. **Dzisiaj** — rozpoczęcie lub wznowienie treningu oraz wyłącznie pilne statusy.
2. **Plan** — aktywny harmonogram i zarządzanie planem.
3. **Historia** — ostatnie sesje; archiwalne cykle jako widok wtórny.
4. **Postępy** — przegląd, rekordy i pomiary bez zagnieżdżonych tabbarów.
5. **Profil** — tożsamość, ustawienia, połączenia oraz kontrola danych.

Biblioteka Ćwiczeń pozostaje dostępna z Planu przez „Zarządzaj planem” oraz z
kontekstowych pickerów. Zachowuje trasę `/exercises`, ale nie konkuruje o miejsce
z pięcioma najczęściej rozpoznawanymi obszarami produktu. Stare adresy zachowują
kompatybilne redirecty; migracja IA nie zmienia źródeł danych ani aktywnej sesji.

Status 2026-08-28: **pierwsza fala uproszczenia ukończona w kodzie**. Dzisiaj ma
jedno główne CTA i dwa operacyjne skróty. Plan grupuje Cykle, Edycję i Ćwiczenia
w jednym menu. Profil nie dubluje już metryk z Postępów. Domyślne `Wyniki`
odpowiadają jednym insightem tygodniowym i trzema sprawdzalnymi liczbami: tonażem,
serią tygodni oraz nowymi rekordami. Miesiąc i obciążenie hybrydowe są pod
`Więcej → Szczegóły`, rekordy w osobnym widoku, a komplet sesji wyłącznie w
Historii. Tygodnie, Strava i Odznaki są w menu „Więcej”, a PDF/CSV/Kopiuj w
„Udostępnij”. Ekran po zapisaniu planu pokazuje
jedno CTA i „Później”, bez mapy aplikacji, gradientu i ikony Sparkles. Funkcje i
deep linki pozostały dostępne; zmiany nie dotykają draftu, kolejki ani danych.

Następny punktowy audit fali 5 przechodzi w kolejności: Postępy → Plan → Profil
→ Dzisiaj. Sprawdza nie liczbę usuniętych elementów, lecz czas do odnalezienia
głównej akcji, zrozumienie źródła liczby oraz odkrywalność przeniesionych funkcji.
Każda korekta zaczyna się od testu starego przepływu i testu nowej hierarchii;
sam screenshot ani subiektywne „czyściej” nie są dowodem akceptacji.

Końcowa bramka po X55: Vitest 3707/3707, Chromium 295/295 i WebKit 295/295.
Oba pełne E2E uruchomiono osobno po świeżym Vite i wyczyszczeniu jego cache.
Agent odpowiedzialny tylko za cztery kontrakty E2E przekroczył zakres i wykonał
commit/push oraz deploy webu przed zakończeniem bramki. Produkcja po incydencie
odpowiada 200, ma te same hashe bundla co lokalny kandydat i przechodzi smoke
WebKit bez `pageerror`. Nie zmienia to wymogu zamrożenia audytowalnego snapshotu.

### Fala 6 — obserwowalność i release proof

Zależności: zakończone fale funkcjonalne.

- telemetryka aktywacji, rezygnacji, retry, overlay cleanup, resume i sync latency;
- Crashlytics dopiero z consentem, privacy, symbolikacją dSYM/mapping i opt-out;
- podpisany build iOS/Android; screenshoty sklepowe dopiero z finalnego UI;
- raport 10/10 musi rozdzielać automat, symulator i fizyczne PASS/FAIL.

Akceptacja końcowa:

- `npm run test`, `typecheck`, `lint`, `build`, dist-smoke;
- Functions/rules; E2E Chromium/WebKit po świeżym Vite;
- świeży build mobilny oraz fizyczne iOS/Android: onboarding, keyboard, back,
  background/resume, przerwanie treningu, export/share i restart recovery;
- zero P0/P1, znane P2 mają ownera i termin; `audit/latest.json` bez czerwonych i
  pomarańczowych problemów;
- dopiero wtedy osobny raport release readiness i decyzja właściciela o publikacji.

## Automatyczna macierz testów

| Warstwa | Testy |
|---|---|
| Logika | rekomendacja planu, zapis kroków, idempotencja zgód, migracja palet, recovery |
| Komponent | targety, obrysy, focus, aria, error/retry, keyboard-safe CTA, reduced motion |
| E2E | onboarding PL/EN, skip/replay, replan, paywall, pierwszy trening, obowiązkowa sekwencja |
| Visual | 320/375/390/430 portrait, 844×390 landscape, light/dark jeśli wspierane, 100/150/200% |
| Lifecycle | sleep/lock/app switch/rotate/offline/reconnect/force-kill/process recreation |
| Backend | consent/event idempotency, rules, Functions, kolejka i konflikt rewizji |

## Testy urządzeniowe

1. iPhone SE: onboarding PL przy 100% i 200%, klawiatura, wszystkie CTA i linki.
2. iPhone standard/Max: safe area, swipe-back, VoiceOver, reduced motion, screen off.
3. Mały Android + Pixel: 48 dp, system back, TalkBack, font 200%, edge-to-edge.
4. Tablet/foldable: portrait/landscape/multi-window, dialogi nie rozciągają się do
   pełnej szerokości, nawigacja odpowiada klasie okna.
5. Każde urządzenie: słaby internet, airplane mode, app switch, lock 2 min,
   force-kill, restart i odzyskanie draftu/syncu.

## Blockery publicznego wydania

1. Brak pełnego fizycznego PASS iOS/Android dla background/resume, przerwania
   treningu, keyboard/font scale i recovery.
2. Brak fizycznego PASS eksportu/share JSON/CSV/PDF/PNG na obu platformach.
3. Brak potwierdzenia subskrypcji alarmów SNS oraz aktualnego podpisanego kandydata
   zawierającego całą falę X47; szczegóły w `RELEASE-READINESS-2026-08-27.md`.
4. Każdy nowy P0/P1 znaleziony przez audit/E2E lub real device blokuje wydanie.
5. Fizyczny PASS personalizacji i zgód na małym i dużym iOS/Android, z klawiaturą,
   VoiceOver/TalkBack oraz przerwaniem aplikacji podczas zapisu zgód. Automat
   potwierdza 320×667, brak poziomego scrolla i widoczne CTA, ale nie zastępuje
   realnego IME, gestów i czytnika ekranu.
6. Zewnętrzna rotacja ujawnionego wcześniej sekretu Stravy u dostawcy; runtime
   korzysta już wyłącznie z bindingów Secret Managera, ale stary sekret musi zostać
   unieważniony poza repozytorium.

## Zasady wykonywania

- pętla: audyt → czerwony test → minimalny fix → zielony test → regresja → wpis
  do `DECYZJE.md` i aktualizacja tego dokumentu;
- zmiana wizualna nie jest „done” bez screenshotu na telefonie;
- nowy plugin: najpierw oficjalny plugin Capacitor i analiza parity/platform/privacy,
  potem decyzja; nie instalujemy zależności bez konkretnego problemu;
- brak reset/checkout/stash i brak testów zapisujących serie na realnym koncie;
- deploy, push, TestFlight i Play pozostają osobną, kontrolowaną decyzją po
  zielonych bramkach.

## Źródła decyzji

- Apple HIG: Onboarding, Launching, Accessibility, Motion, Privacy, Tab bars,
  Sheets i Design principles;
- Android Developers: Core app quality, Adaptive app quality, edge-to-edge,
  accessibility 48 dp, state preservation i standard back navigation;
- WCAG 2.2: contrast, non-text contrast, focus appearance, target size i reflow;
- projektowe `AGENTS.md`, `START.md`, `DOCUMENTATION.md`, `DECYZJE.md`, `PLAN.md`
  oraz `docs/PRODUCT-PRINCIPLES.md` i
  `docs/RELEASE-READINESS-2026-08-27.md`.
