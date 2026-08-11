# Prompt do deep research: audyt Terms i Privacy pod maksymalną ochronę solo developera

> Wklej do narzędzia deep research (ChatGPT Deep Research / Gemini / Claude). Skopiowany też do schowka 2026-08-11.

---

Jestem solo developerem (jednoosobowa działalność gospodarcza w Polsce: WEB3 POWER Grzegorz Jasionowicz) i wydaję aplikację fitness **Strength Save** w App Store i Google Play (globalnie, głównie Polska, UE i USA) oraz jako aplikację webową. Zrób głęboki, wyczerpujący research prawny i konkurencyjny, którego wynikiem będzie: (1) analiza luk w moim obecnym Regulaminie i Polityce Prywatności, (2) lista klauzul, które MUSZĘ lub POWINIENEM dodać, żeby być maksymalnie chronionym jako solo developer, (3) dokładna lista zgód, które użytkownik powinien wyrazić, i w jakiej formie (checkbox osobny, akceptacja regulaminu, zgoda w systemie operacyjnego itd.), (4) porównanie z tym, co robią konkurencyjne aplikacje. Nie jesteś moim prawnikiem i wiem, że wynik nie jest poradą prawną; ma być podkładką do rozmowy z prawnikiem i do samodzielnego wdrożenia poprawek.

## Stan obecny (przeczytaj moje dokumenty na żywo)

- Polityka prywatności: https://strengthsave.app/privacy (PL i EN, przełącznik języka na stronie)
- Regulamin: https://strengthsave.app/terms
- Strona usuwania konta: https://strengthsave.app/delete-account

Obecne sekcje Polityki: kim jesteśmy; jakie dane zbieramy; dane dotyczące zdrowia (przetwarzane na podstawie wyraźnej zgody, art. 9 RODO); cele i podstawy prawne; odbiorcy danych; transfery poza EOG (DPF/SCC); retencja; bezpieczeństwo; prawa użytkownika; mieszkańcy USA; dzieci; wybory użytkownika; zmiany; kontakt.

Obecne sekcje Regulaminu: umowa; warunki korzystania i dostępność terytorialna; konto; licencja i IP; subskrypcje, trial i płatności; zastrzeżenie zdrowotne i treningowe (nie jest wyrobem medycznym, nie udziela porad medycznych); usługi podmiotów trzecich; treści użytkownika; działania zabronione; dostępność, zmiany i dane; rozwiązanie umowy; wyłączenie gwarancji; ograniczenie odpowiedzialności; zwolnienie z odpowiedzialności (indemnification); postanowienia dot. Apple App Store; prawo właściwe i spory; zmiany regulaminu; postanowienia końcowe; kontakt.

## Co dokładnie robi aplikacja (stan faktyczny, dokumenty muszą być z nim zgodne)

- Śledzenie treningów siłowych: plany treningowe (gotowe szablony i własne), serie, powtórzenia, ciężary, notatki, RPE, oceny bólu/dyskomfortu, pomiary ciała (masa, obwody).
- Konta: Firebase Auth (e-mail+hasło z weryfikacją kodem, Sign in with Google, Sign in with Apple). Web jest invite-only, aplikacje mobilne z publiczną rejestracją. Dane w Firebase/Google Cloud (Firestore, Functions, Storage na avatary).
- Subskrypcja PRO przez RevenueCat + App Store / Google Play Billing: miesięczna 14,99 zł i roczna 99,99 zł, z darmowym trialem (14 dni miesięczna, 30 dni roczna). Twardy paywall dla nowych userów bez treningów. Bez zakupów przez web.
- Integracje opcjonalne: Strava (import aktywności cardio), Apple Health/HealthKit + aplikacja na Apple Watch (odczyt tętna, zapis treningów), Health Connect na Androidzie (READ_WEIGHT, WRITE_EXERCISE), aplikacja na zegarki Garmin (Connect IQ, FIT, tętno).
- Powiadomienia push (FCM) i e-maile transakcyjne przez Resend (weryfikacja, powitanie, zaproszenia, tygodniowy digest treningowy, powiadomienie o usunięciu konta).
- Telemetria produktowa własna (zdarzenia użycia) i logi błędów. Bez reklam, bez SDK reklamowych, bez lokalizacji GPS, bez śledzenia między aplikacjami (ATT nie dotyczy).
- Usuwanie konta: self-service w aplikacji (konto zamykane od razu, dane trwale wymazywane po 30 dniach karencji, w karencji można cofnąć mailem) + publiczna strona /delete-account.
- BRAK funkcji AI (usunięte z aplikacji i z dokumentów; nie obiecujemy AI).
- Onboarding wymaga zaznaczenia checkboxa "Akceptuję regulamin i politykę prywatności" przed przejściem dalej; timestamp zgody zapisywany w profilu.
- Aplikacja nie jest kierowana do dzieci. Języki: PL i EN.

## Zakres researchu

1. **Konkurencja (minimum 6-8 aplikacji):** przeanalizuj publiczne Terms i Privacy Policy czołowych aplikacji do treningu siłowego i fitness, w tym co najmniej: Strong, Hevy, StrongLifts, Fitbod, Boostcamp, Alpha Progression, a pomocniczo Strava i MyFitnessPal (dojrzałe prawnie). Wyciągnij: jakie klauzule ochronne mają, których ja nie mam; jak formułują zastrzeżenie zdrowotne i przejęcie ryzyka (assumption of risk); jak ograniczają odpowiedzialność kwotowo; jak rozwiązują spory (arbitraż, class action waiver, jurysdykcja); jak obsługują zgody na dane zdrowotne; jak opisują trial/odnowienia/zwroty; czy mają osobne EULA vs Terms of Service; jak obsługują konta dzieci i minimalny wiek. Zrób tabelę porównawczą: klauzula × aplikacja × czy ja to mam.

2. **Wymogi platform:** aktualne wymagania Apple App Store Review Guidelines (m.in. 3.1.2 subskrypcje, 5.1.1 dane i usuwanie konta, minimalne warunki EULA Apple i kiedy standardowa Apple EULA wystarcza), Google Play (User Data policy, Health apps/Health Connect policy, account deletion, subscriptions), oraz wymogi HealthKit/Health Connect/Strava API/Garmin Connect IQ co do zapisów w polityce prywatności (każde z tych API ma własne obowiązkowe klauzule; sprawdź agreementy deweloperskie Strava API i Garmin oraz wymogi Apple co do danych HealthKit w polityce).

3. **Prawo, pod które podlegam jako polski solo dev sprzedający B2C globalnie:**
   - RODO: dane zdrowotne art. 9 (czy zgoda przez wprowadzenie danych wystarcza, czy potrzebny osobny checkbox zgody na dane zdrowotne ODDZIELNY od akceptacji regulaminu; granularność i wycofanie zgody), minimalny wiek zgody dziecka (w Polsce 16 lat) i co muszę zrobić z limitem wieku.
   - Polskie/unijne prawo konsumenckie: ustawa o świadczeniu usług drogą elektroniczną (obowiązkowe elementy regulaminu!), prawo odstąpienia od umowy o treści cyfrowe w 14 dni i jak legalnie je wyłączyć przy natychmiastowym świadczeniu (zgoda na natychmiastowe rozpoczęcie + potwierdzenie utraty prawa odstąpienia — czy Apple/Google to załatwiają za mnie, a co muszę mieć na web), dyrektywa Omnibus, dyrektywa o treściach cyfrowych 2019/770 (rękojmia za zgodność treści cyfrowej z umową — czego NIE mogę wyłączyć wobec konsumenta UE), rejestr klauzul niedozwolonych UOKiK (które typowe klauzule anglosaskie, np. szerokie limitation of liability, indemnification, jednostronne zmiany regulaminu, wybór prawa/sądu, są NIEWAŻNE lub ryzykowne wobec polskiego/unijnego konsumenta i jak je napisać, żeby się broniły: klauzule salwatoryjne, rozdzielenie konsument UE vs reszta świata).
   - USA: CCPA/CPRA i pozostałe stanowe ustawy prywatności (progi stosowania — czy jako mały solo dev w ogóle podlegam; co wpisać "na zapas"), Washington My Health My Data Act (dane zdrowotne! niski próg stosowania, głośne ryzyko private right of action — czy mnie dotyczy i co dodać), COPPA, sensowność klauzuli arbitrażowej i class action waiver dla usera z USA u polskiego developera.
   - DSA (czy jako mała apka bez treści userów widocznych publicznie mam jakiekolwiek obowiązki), Data Act 2025/2026 (dane generowane przez urządzenia connected — zegarki!), EAA/European Accessibility Act (od czerwca 2025 — czy mnie obejmuje jako mikroprzedsiębiorcę), P2B nie dotyczy.
   - E-mail/digest: zgody marketingowe vs e-maile transakcyjne (PL: prawo komunikacji elektronicznej 2024, art. 398; kiedy tygodniowy digest wymaga osobnej zgody opt-in).

4. **Maksymalna ochrona solo developera — konkrety:** zaproponuj brzmienie (PL i EN) brakujących lub wzmocnionych klauzul, w tym co najmniej: assumption of risk / oświadczenie o stanie zdrowia i konsultacji z lekarzem przed treningiem; cap odpowiedzialności (do wysokości zapłaconych opłat z 12 miesięcy — czy to się broni w UE); wyłączenie odpowiedzialności za kontuzje i skutki decyzji treningowych; siła wyższa; brak gwarancji dostępności i SLA; prawo do zamknięcia usługi z notice; przenoszalność praw (przekształcenie JDG w spółkę, sprzedaż aplikacji — zgoda na cesję); zakaz automatycznego scrapingu; beta features "as is"; user content licencja; feedback assignment; zasady zwrotów poza sklepami; kontakt do zgłoszeń naruszeń; oraz to, czego nie przewidziałem, a konkurencja ma.

5. **Lista zgód i flow:** finalna checklista: co user akceptuje checkboxem przy rejestracji/onboardingu (regulamin + polityka), co wymaga OSOBNEJ wyraźnej zgody (dane zdrowotne art. 9? digest e-mail? zgoda na natychmiastowe świadczenie przy trialu na web?), co załatwia system operacyjny (HealthKit/Health Connect permission dialogs, push permission), a co ma być tylko opisane informacyjnie. Wskaż, czy mój obecny pojedynczy checkbox "Akceptuję regulamin i politykę prywatności" jest wystarczający i zgodny (uwaga: zgody na przetwarzanie danych NIE powinno się zszywać z akceptacją regulaminu — zweryfikuj i zaproponuj poprawny wzorzec).

## Format wyniku

1. Executive summary: 10 najważniejszych luk uporządkowanych po ryzyku (co mnie realnie może zaboleć jako solo dev).
2. Tabela gap analysis: wymóg/klauzula → źródło (prawo/platforma/konkurencja) → czy mam → co dodać/zmienić → priorytet (P0 przed launchem / P1 szybko po / P2 nice to have).
3. Tabela porównawcza konkurencji.
4. Gotowe propozycje brzmienia nowych klauzul (PL + EN), z zaznaczeniem wariantów "konsument UE" vs "reszta świata".
5. Checklista zgód w aplikacji (co, gdzie, jakim mechanizmem, co logować).
6. Lista źródeł z linkami (przepisy, wytyczne platform, dokumenty konkurencji).

Pisz po polsku, cytuj przepisy po numerach artykułów, nie wymyślaj przepisów ani progów — jak czegoś nie możesz zweryfikować, oznacz to wprost jako "do potwierdzenia z prawnikiem".
