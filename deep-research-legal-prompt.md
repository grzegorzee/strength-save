# DEEP RESEARCH PROMPT — Polityka Prywatności + Regulamin (Terms of Service) dla aplikacji Strength Save

Jesteś zespołem doświadczonych prawników specjalizujących się jednocześnie w: (a) prawie ochrony danych osobowych w wielu jurysdykcjach (UE/EOG — RODO/GDPR, USA — federalne i stanowe, w tym CCPA/CPRA Kalifornia, oraz pozostałe stany: Virginia VCDPA, Colorado CPA, Connecticut, Utah, Texas, itd.), (b) prawie konsumenckim i e-commerce, (c) wymogach platform Apple App Store i Google Play, (d) prawie odpowiedzialności cywilnej (liability) ze szczególnym uwzględnieniem aplikacji fitness/zdrowotnych. Twoim nadrzędnym celem jest przygotowanie kompletnej analizy i rekomendacji do **Polityki Prywatności** oraz **Regulaminu / Terms of Service (Terms & Conditions + EULA)**, które MAKSYMALNIE chronią właściciela/wydawcę aplikacji przed jakimikolwiek roszczeniami użytkowników, organów nadzorczych i osób trzecich — przy jednoczesnym zachowaniu zgodności z prawem każdego rynku docelowego (żaden zapis nie może być nieważny/abuzywny w danej jurysdykcji).

---

## KONTEKST: czym jest aplikacja (przeanalizuj DOKŁADNIE, każda funkcja generuje konkretne obowiązki prawne)

**Nazwa:** Strength Save (FitTracker)
**Typ:** Darmowa aplikacja do śledzenia treningów siłowych i biegowych z funkcjami AI i analityką.
**Model biznesowy:** Bezpłatna. BRAK płatności, BRAK subskrypcji, BRAK zakupów in-app (na ten moment — w analizie uwzględnij też scenariusz przyszłej monetyzacji/subskrypcji, abym nie musiał przepisywać dokumentów).
**Platformy / dystrybucja:**
- Web PWA (Progressive Web App, hostowana na GitHub Pages, działa offline)
- iOS (natywna przez Capacitor, dystrybucja przez Apple App Store / TestFlight)
- Android (natywna przez Capacitor, dystrybucja przez Google Play — planowana)

**Rynki docelowe:** START w USA i Polsce, ale aplikacja będzie dostępna w App Store i Google Play prawdopodobnie GLOBALNIE. Wskaż jednoznacznie:
1. Które rynki/kraje generują nieproporcjonalne ryzyko prawne lub wymagają osobnych, kosztownych obowiązków (np. dane biometryczne/zdrowotne, lokalizacja danych, przedstawiciel lokalny) i które warto AKTYWNIE WYKLUCZYĆ z dystrybucji (geo-restriction w App Store/Play) na starcie.
2. Rekomendowaną listę krajów dozwolonych vs. wykluczonych, z uzasadnieniem (np. czy wykluczać Chiny, Rosję, kraje wymagające data localization; czy dzieci poniżej wieku zgody; czy stany USA z prawem o danych biometrycznych jak Illinois BIPA — i co to oznacza dla danych tętna/aktywności).

**Dane osobowe i wrażliwe ZBIERANE oraz PRZETWARZANE (stan faktyczny — oprzyj analizę dokładnie na tym):**
- Dane konta: adres email, hasło (hash w Firebase Auth), display name (opcjonalnie), zdjęcie profilowe/avatar (opcjonalnie, z Google/Apple lub upload).
- Dane fitness/zdrowotne wprowadzane przez użytkownika: **waga ciała (kg)**, **pomiary obwodów ciała** (klatka, talia, biodra, ramiona L/P, uda L/P, łydki — ok. 10 pól), cele treningowe (budowa masy / siła / redukcja tkanki / zdrowie), poziom zaawansowania, liczba dni treningowych/tydzień.
- Dane treningowe: sesje treningowe (ćwiczenia, serie, powtórzenia, ciężary, notatki, czas trwania), historia, plany treningowe, rekordy osobiste (PR/1RM liczone formułą Epleya), tonaż, "cykle treningowe" (UWAGA: "cycle" w tej aplikacji oznacza CYKL TRENINGOWY/okres planu, a NIE cykl menstruacyjny — aplikacja NIE zbiera danych o cyklu menstruacyjnym ani zdrowiu reprodukcyjnym).
- Dane z integracji Strava (jeśli użytkownik połączy konto): aktywności sportowe (nazwa, typ, dystans, czas, prędkość, przewyższenie), **tętno średnie i maksymalne (HR)** z każdej aktywności, link do aktywności. Zakres OAuth Strava obejmuje dostęp do wszystkich aktywności użytkownika; pierwsza synchronizacja pobiera do 365 dni wstecz; auto-sync codziennie.
- Dane AI: wiadomości czatu z asystentem AI (przechowywane per-użytkownik w bazie), licznik zużycia/kosztów AI.
- Dane administracyjne/techniczne: status konta, rola (user/admin), kody weryfikacji email (hashowane), kody zaproszeń / lista oczekujących (waitlist/invite), logi audytowe uwierzytelniania, logi wysłanych emaili, telemetria techniczna (liczniki zdarzeń synchronizacji per dzień).

**Czego aplikacja NIE zbiera (potwierdź, że dokumenty nie powinny tego deklarować):** wieku/daty urodzenia (NIE zbierane — brak weryfikacji wieku!), płci, cyklu menstruacyjnego, lokalizacji GPS na żywo, kontaktów, dostępu do kamery/mikrofonu, danych z Apple HealthKit / Google Fit (NIE zintegrowane), powiadomień push (NIE używane — komunikacja tylko mailowa).

**Integracje i podmioty trzecie, do których PRZEPŁYWAJĄ dane (procesorzy/subprocesorzy — wymień obowiązki względem każdego):**
1. **Google Firebase** (Firestore, Firebase Auth, Cloud Functions w regionie us-central1 = USA, Firebase Storage) — kręgosłup aplikacji, przechowuje wszystkie dane. Dane EU przepływają do USA.
2. **OpenAI** (model gpt-5-mini, wywoływany server-side przez Cloud Functions) — do OpenAI wysyłane są: odpowiedzi z onboardingu, dane treningowe z ostatnich ~8 tygodni, pomiary ciała, plan treningowy, historia czatu — w celu generowania analiz "AI Coach" i odpowiedzi czatu. Uwzględnij ryzyko: AI generuje treści, które użytkownik może odebrać jako poradę zdrowotną/treningową.
3. **Strava** (Strava API v3, OAuth) — pobieranie danych aktywności i tętna.
4. **Resend** (dostawca wysyłki email) — wysyłka: kodów weryfikacyjnych, maili powitalnych, zaproszeń, powiadomień o zmianie dostępu oraz cotygodniowego podsumowania ("Weekly Digest", w każdy poniedziałek), zawierającego dane treningowe i biegowe użytkownika. Nadawca: noreply@strengthsave.app.
5. **GitHub Pages** — hosting frontendu web.
6. **Apple** (Sign in with Apple) i **Google** (Sign-In) — dostawcy logowania OAuth.

**Uwierzytelnianie:** Sign in with Google, Sign in with Apple, oraz email+hasło (z weryfikacją kodem mailowym). Sesja trzymana w localStorage przeglądarki.

**Funkcje aplikacji (pełna lista — każda może rodzić obowiązki):** gotowe szablony planów treningowych, biblioteka 241 ćwiczeń, śledzenie sesji, pomiary ciała, historia, cykle treningowe, wykresy progresji ciężarów i pomiarów, rekordy osobiste, heatmapa aktywności, streak, tonaż, kreator onboardingu, **AI Coach** (automatyczne "insighty": plateau, postęp, sugestie), **AI Chat** (streaming), integracja Strava (w tym "Race Predictor" — przewidywanie czasów na 5K/10K/półmaraton/maraton wzorem Riegla, oraz "Training Load" — model TRIMP CTL/ATL/TSB), udostępnianie treningu jako obrazek PNG, cotygodniowy email z podsumowaniem, panel administratora.

**Istotne luki/ryzyka do zaadresowania w dokumentach (potraktuj jako priorytet):**
- **BRAK weryfikacji wieku** — aplikacja jest technicznie dostępna dla dzieci. Zaproponuj rozwiązanie (próg wieku w Regulaminie, np. 16+ dla EOG / 13+ lub 18+ dla USA, ewentualny age-gate), z analizą COPPA (USA), RODO art. 8 (zgoda dziecka), Age Appropriate Design Code (UK/Kalifornia).
- **BRAK zaimplementowanego mechanizmu pełnego usunięcia danych** (right to be forgotten / right to delete) — jest tylko eksport danych (JSON) i usuwanie pojedynczych treningów. Wskaż, jak opisać prawa podmiotu danych i procedurę realizacji żądań mimo tej luki (i co MUSZĘ dorobić technicznie, by dokumenty nie kłamały).
- Dane tętna i pomiary ciała mogą być kwalifikowane jako **dane dotyczące zdrowia** (RODO art. 9 — szczególna kategoria) — przeanalizuj, czy tak jest, jaka podstawa przetwarzania (zgoda?), i jakie to rodzi konsekwencje.
- Transfer danych do USA (Firebase, OpenAI) — mechanizmy transferu (SCC, Data Privacy Framework), wymóg ujawnienia w polityce.

---

## ZADANIE — co masz dostarczyć

Przeprowadź dogłębny research aktualnego stanu prawnego (cytuj konkretne przepisy, artykuły, wytyczne organów, wymogi Apple/Google — z datami, bo prawo się zmienia) i dostarcz:

### CZĘŚĆ A — Polityka Prywatności (Privacy Policy)
Kompletna lista obowiązkowych i rekomendowanych elementów, jakie MUSZĄ się znaleźć, z podziałem na sekcje i z konkretną treścią/wzorcami sformułowań (ready-to-adapt), pokrywająca łącznie:
1. Tożsamość i dane kontaktowe administratora (oraz czy potrzebny przedstawiciel w UE/UK).
2. Pełny katalog zbieranych danych (zmapuj 1:1 na stan faktyczny powyżej) + kategorie danych wrażliwych/zdrowotnych.
3. Cele i podstawy prawne przetwarzania (RODO art. 6 i 9; odpowiedniki w USA).
4. Lista wszystkich odbiorców/procesorów (Google/Firebase, OpenAI, Strava, Resend, Apple, Google, GitHub) + linki do ich polityk + cel udostępnienia.
5. Transfery międzynarodowe (USA) i ich podstawy.
6. Okresy retencji (zaproponuj konkretne polityki retencji dla każdej kategorii).
7. Prawa użytkowników: RODO (dostęp, sprostowanie, usunięcie, ograniczenie, przenoszalność, sprzeciw, cofnięcie zgody, skarga do organu) ORAZ CCPA/CPRA (right to know/delete/correct/opt-out of sale-share, non-discrimination, Global Privacy Control) ORAZ pozostałe stany USA. Konkretne, jak je realizować przy obecnych ograniczeniach technicznych.
8. Bezpieczeństwo danych (szyfrowanie w tranzycie/spoczynku, izolacja per-user, role).
9. Cookies / localStorage / Service Worker / IndexedDog — co aplikacja używa i czy potrzebny baner zgody.
10. Dzieci / wiek minimalny.
11. Zmiany polityki, data wejścia w życie.
12. **App Store Privacy "Nutrition Labels"** i **Google Play "Data Safety" form** — dokładnie wskaż, jak zadeklarować zbierane dane, by deklaracja zgadzała się z polityką (rozbieżność = ryzyko usunięcia z sklepu).

### CZĘŚĆ B — Regulamin / Terms of Service (z naciskiem na OCHRONĘ wydawcy)
Kompletna lista klauzul, jakie powinny się znaleźć, by maksymalnie ograniczyć moją odpowiedzialność, z gotowymi wzorcami i wskazaniem, gdzie dana klauzula jest nieważna/ograniczona w UE/PL (klauzule abuzywne wobec konsumenta) vs. egzekwowalna w USA:
1. **Medyczny/fitness disclaimer** — KRYTYCZNE: jasne oświadczenie, że aplikacja, plany treningowe, AI Coach i predyktory NIE stanowią porady medycznej ani profesjonalnej porady treningowej; zalecenie konsultacji z lekarzem przed rozpoczęciem ćwiczeń; ryzyko kontuzji/śmierci przy treningu siłowym i biegowym.
2. **Assumption of risk / przyjęcie ryzyka** i **waiver/zrzeczenie roszczeń** związanych z aktywnością fizyczną — i ich granice w PL/UE (gdzie zrzeczenie się odpowiedzialności za szkodę na osobie jest nieważne).
3. **Ograniczenie i wyłączenie odpowiedzialności** (limitation of liability, cap na kwotę, wyłączenie szkód pośrednich/następczych) — wersja USA vs. dopuszczalna wersja UE/PL.
4. **Disclaimer dot. AI** — treści generowane przez AI mogą być błędne/niedokładne; brak gwarancji; nie polegać bezkrytycznie.
5. **"AS IS" / brak gwarancji** (disclaimer of warranties).
6. **Indemnification** (zwolnienie z odpowiedzialności przez użytkownika).
7. **Dokładność danych** — użytkownik odpowiada za poprawność wprowadzanych danych; brak gwarancji dokładności analiz, predyktorów (Race Predictor, 1RM), danych ze Stravy.
8. **Własność intelektualna**, licencja na korzystanie, treści użytkownika.
9. **Zasady korzystania / zakazy** (acceptable use).
10. **Zawieszenie/zakończenie konta** (mamy już mechanizm suspend/delete po stronie admina — opisz to bezpiecznie).
11. **Rozwiązywanie sporów**: prawo właściwe i jurysdykcja; **klauzula arbitrażowa i class action waiver** dla USA (z analizą egzekwowalności i wymogów, np. masowy arbitraż); dla konsumentów UE/PL — obowiązkowe info o ODR/polubownym rozstrzyganiu, brak możliwości narzucenia obcej jurysdykcji konsumentowi.
12. **Prawo odstąpienia / zwroty** — n/d przy darmowej apce, ale przygotuj pod przyszłą subskrypcję (UE: 14 dni, wyjątki dla treści cyfrowych; Apple/Google obsługują zwroty wg własnych zasad).
13. **Wymogi Apple EULA** (Apple Standard EULA vs. własny; klauzule wymagane przez Apple — Apple jako third-party beneficiary, itp.) i **Google Play Developer Distribution Agreement**.
14. Siła wyższa, rozdzielność klauzul (severability), całość porozumienia, cesja, zmiany regulaminu.

### CZĘŚĆ C — Rekomendacje strategiczne
1. Lista krajów/rynków do WYKLUCZENIA z dystrybucji na starcie + uzasadnienie i jak to ustawić w App Store Connect / Google Play Console.
2. Lista zmian TECHNICZNYCH, które muszę wdrożyć w aplikacji, ZANIM opublikuję dokumenty, żeby nie były niezgodne ze stanem faktycznym (np. mechanizm usunięcia konta/danych, age-gate, baner zgody na cookies, link do polityki w aplikacji i w sklepie, DPA z procesorami, rejestr czynności przetwarzania).
3. Checklist zgodności pre-launch dla App Store i Google Play (konkretnie pod aplikację zdrowotno-fitnessową).
4. Ranking ryzyk (Top 10) od najwyższego, z konkretnym mitygowaniem.
5. Czy potrzebuję: DPO, przedstawiciela w UE/UK, rejestracji w jakimkolwiek organie, ubezpieczenia OC.

---

## WYMAGANIA CO DO ODPOWIEDZI
- Cytuj konkretne podstawy prawne (artykuły RODO, sekcje CCPA/CPRA, wytyczne EROD/EDPB, App Store Review Guidelines §5.1, Google Play Policy) z aktualnym stanem na datę researchu.
- Wszędzie, gdzie zapis chroniący wydawcę jest nieważny lub abuzywny wobec konsumenta w UE/PL, JEDNOZNACZNIE to zaznacz i podaj maksymalnie ochronną wersję, która jest jeszcze dopuszczalna.
- Rozróżniaj "obowiązkowe" od "rekomendowane".
- Podawaj gotowe do adaptacji sformułowania (po polsku i po angielsku tam, gdzie to istotne), nie tylko opis ogólny.
- Zaznacz wyraźnie, że to analiza, a nie porada prawna konkretnego radcy/adwokata, i wskaż, kiedy konieczna jest weryfikacja przez prawnika z licencją w danej jurysdykcji.
- Format: uporządkowane sekcje, tabele odbiorców/danych/retencji, checklisty.
