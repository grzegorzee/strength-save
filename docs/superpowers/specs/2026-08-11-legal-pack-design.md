# Spec: Pakiet prawny v2 (dokumenty, consent engine, compliance)

Data: 2026-08-11. Status: zatwierdzony przez usera (rozmowa 2026-08-11).

Źródła merytoryczne:
- `~/Downloads/Analiza prawna aplikacji fitness.md` (raport 1, deep research)
- `~/Downloads/compass_artifact_wf-c4ac815e-...md` (raport 2, deep research z weryfikacją przepisów)
- Benchmarki konkurencji pobrane 2026-08-11: Hevy (terms/privacy iubenda/cookie policy), Strong (terms/privacy)

> To nie jest porada prawna. Dokumenty powstają jako kompletne wersje robocze do
> przeglądu przez radcę prawnego; miejsca wymagające decyzji prawnika oznaczone
> "do potwierdzenia z prawnikiem".

## Decyzje usera (2026-08-11)

1. **Maile:** marketing z opt-in. Osobny, domyślnie odznaczony checkbox zgody
   marketingowej (art. 398 PKE) przy rejestracji + przełącznik w ustawieniach.
   Bez syncu do MailerLite. Digest tygodniowy zostaje serwisowy; treści
   promocyjne tylko dla userów ze zgodą.
2. **Arbitraż US:** tak, sekcja "US residents only": wiążący arbitraż
   indywidualny + class action waiver + 30 dni opt-out mailem (wzór Fitbit).
3. **Zakres:** pełne wdrożenie (dokumenty + kod), rozbite na 3 plany.
4. **Stare /legal/*.html:** usunąć. Buildy iOS <=85 to wyłącznie testy
   TestFlight (user + Robert), brak realnych userów na starych buildach.
   Na landingu produkcyjnym już usunięte (redirecty 308 w vercel.json).
   Do usunięcia zostaje martwa kopia `landing/legal/*.html` w repo apki.
5. **Log zgód:** każda zgoda wyciągalna do CSV z datą, godziną i adresem IP.

## Stan zastany (fakty zweryfikowane w kodzie, 2026-08-11)

- Dokumenty produkcyjne żyją w repo `strength_save_landing` (Vercel):
  `src/data/legal-content.json` (klucze `privacy`/`terms` x `pl`/`en`, HTML),
  renderowane w `src/pages/Legal.tsx` na trasach `/privacy` i `/terms`.
  Wersje z 11.06.2026, sekcje AI już usunięte na landingu.
- Flow zgód w apce: JEDEN checkbox w `PlanWizard` (krok Welcome, prop
  `legalConsent`), treść "Akceptuję Regulamin i Politykę Prywatności".
  Odblokowuje tylko przycisk Dalej, NIE jest nigdzie zapisywany. Brak zgody
  zdrowotnej art. 9, brak logu, brak wersjonowania.
- Sprzedaż PRO: wyłącznie IAP (App Store / Google Play przez RevenueCat).
  Zero Stripe. Web nie sprzedaje.
- Trackery: zero (brak GA, pixeli, analityki 3rd party na landingu i w apce).
  Baner cookies NIEPOTRZEBNY (tylko storage ściśle niezbędny).
- Logowanie: Google, Apple, e-mail (Firebase Auth).
- AI: całkowicie usunięte z kodu (0 wystąpień OpenAI w src i functions).
  Sekcje AI wypadają z dokumentów (na landingu już wypadły).
- Digest: `functions/src/weekly-digest.ts` przez Resend. Istnieje.
- Procesorzy: Google (Firebase/GCP), RevenueCat, Resend, Strava (integracja),
  Apple (SIWA, HealthKit, IAP), Google (logowanie, Play billing).
- Usuwanie konta: in-app + 30 dni karencji (opisane w delete-account).

## Luki zamykane tym pakietem (z obu raportów)

P0: rozdzielenie zgód (checkbox regulaminu vs zapoznanie z polityką vs
WYRAŹNA zgoda zdrowotna art. 9 ust. 2 lit. a RODO; obecny model "zgoda przez
wprowadzenie danych" jest bezprawny), log zgód (rozliczalność art. 7 ust. 1),
MHMDA policy (stan Waszyngton, brak progów, private right of action).
P1: assumption of risk, tryb reklamacyjny + wymagania techniczne (art. 8
ust. 3 UŚUDE), klauzule API (Strava 48h/Usage Data/zakaz AI, HealthKit,
Health Connect, Garmin), zgoda marketingowa PKE, arbitraż US.
P2: RCPD (obowiązkowy mimo <250 osób, bo dane art. 9), procedura naruszeń,
rejestr wersji, checklist DPA.

## Plan 1: Dokumenty v2 + landing (repo strength_save_landing + porządki w repo apki)

### Dokumenty (PL + EN, chyba że wskazano inaczej)

1. **Regulamin v2.0.** Baza: obecny terms (jest dobry). Zmiany:
   - Wzmocniona sekcja zdrowotna: medical disclaimer + assumption of risk.
     EN wielkimi literami (konwencja common law), obejmuje "inherent risks of
     injury, illness or death". Wariant PL bez wyłączenia odpowiedzialności za
     szkodę na osobie i szkodę umyślną (art. 385(3) pkt 1, art. 473 par. 2 k.c.)
     z jawnym zdaniem, że tych odpowiedzialności nie wyłączamy wobec konsumenta.
   - Nowa sekcja: reklamacje (forma, adres, termin odpowiedzi 14 dni) +
     wymagania techniczne (iOS/Android/przeglądarka, internet) + zakaz
     dostarczania treści bezprawnych (komplet z art. 8 ust. 3 UŚUDE).
   - Nowa sekcja: "Dispute Resolution and Class Action Waiver (U.S. residents
     only)": arbitraż indywidualny (AAA Consumer Rules), zakaz pozwów
     zbiorowych i jury trial, opt-out 30 dni mailem na contact@, wyłączenie
     small claims. Tylko EN merytorycznie, konsumenci UE/EOG jawnie wyłączeni.
   - Zapis, że web nie prowadzi sprzedaży subskrypcji (zakupy tylko w sklepach).
   - Zapis o komunikacji: e-maile serwisowe (w tym digest) vs marketingowe za
     osobną zgodą, wycofywalną w ustawieniach.
   - Usunięcie sekcji "Treści generowane przez AI" (feature nie istnieje).
   - Zostają bez zmian koncepcyjnych: cap odpowiedzialności (12 mies. / 100 zł),
     cesja, age gate 16+, zmiany regulaminu (ważne przyczyny + 14 dni + prawo
     wypowiedzenia), klauzule Apple third-party beneficiary, ADR/rzecznicy.
2. **Polityka Prywatności v2.0.** Baza: obecna privacy. Zmiany:
   - Sekcja 3 (dane zdrowotne): zgoda przez ODRĘBNY checkbox w aplikacji
     (nie "przez wprowadzenie danych"); opis wycofania w ustawieniach i skutku
     (blokada funkcji zdrowotnych, konto zostaje).
   - Nowe przetwarzanie: log zgód (uid, wersja i treść oświadczenia, data,
     godzina, IP, kanał, język, wersja aplikacji) w celu rozliczalności;
     podstawa art. 6 ust. 1 lit. c w zw. z art. 7 ust. 1 RODO; retencja: czas
     konta + okres przedawnienia roszczeń.
   - Klauzule API dosłowne: Strava (Usage Data, usunięcie w 48h po
     odłączeniu/usunięciu, zakaz użycia w AI), HealthKit (tylko funkcje
     fitness, zakaz reklamy i sprzedaży, brak iCloud), Health Connect (zakres
     typów, zakaz reklamy), Garmin (tętno/FIT tylko do funkcji aplikacji).
   - Zgoda marketingowa: cel, podstawa (art. 6 ust. 1 lit. a + art. 398 PKE),
     wycofanie w każdej chwili, link wypisu w każdym mailu marketingowym.
   - Opis 30-dniowej karencji usuwania konta (wymóg Google Play: co usuwamy,
     co i jak długo zachowujemy).
   - Linki: polityka cookies, Consumer Health Data Privacy Policy (WA/NV).
   - Sekcja "zmiany": polityka jest dokumentem informacyjnym (nie "akceptuję").
3. **Polityka Cookies v1.0 (nowa).** Zakres: strona strengthsave.app +
   aplikacja webowa. Treść zgodna z prawdą: zero cookies śledzących i
   analitycznych, wyłącznie storage ściśle niezbędny (Firebase Auth w
   IndexedDB/localStorage, preferencje, draft treningu offline); brak banera,
   bo storage niezbędny jest zwolniony ze zgody (art. 173 ust. 3 pkt 2 PT /
   PKE); tabela technologii z celami i czasem życia; instrukcja czyszczenia.
4. **Consumer Health Data Privacy Policy v1.0 (nowa, tylko EN).** Pod
   Washington My Health My Data Act + Nevada SB 370. Wymogi twarde: osobny
   dokument TYLKO z treściami wymaganymi ustawą (kategorie consumer health
   data, cele, źródła, odbiorcy/procesorzy, brak sprzedaży i sharingu, prawa:
   access/withdraw/delete + sposób realizacji i appeal, kontakt). Osobny,
   wyraźny link w stopce landingu (wymóg MHMDA: link z homepage).

### Zmiany techniczne na landingu

- `src/data/legal/` jako źródło: pliki HTML per dokument per język +
  `scripts/build-legal.mjs` generujący `legal-content.json` (koniec ręcznej
  edycji HTML w JSON).
- Trasy `/cookies` i `/health-data-privacy` (Legal.tsx rozszerzone o nowe
  rodzaje), stopka: sekcja legal z 4 linkami (Privacy, Terms, Cookies,
  Consumer Health Data Privacy jako osobna pozycja).
- Wersja i data wejścia w życie w nagłówku każdego dokumentu + archiwum
  poprzednich wersji: `public/legal-archive/RRRR-MM-DD-<dok>-<lang>.html`
  (dowód, która wersja obowiązywała kiedy).
- Deploy: `vercel --prod`.

### Porządki w repo apki

- Usunąć `landing/legal/*.html` (martwa kopia; decyzja usera).
- `src/lib/legal-links.ts`: + `COOKIES_URL`, `HEALTH_DATA_URL`; aktualizacja
  komentarza (stare buildy = testy TF, statyczne /legal/*.html nie istnieją).

## Plan 2: Consent engine (repo apki + functions)

### Wersjonowanie dokumentów

- `src/lib/legal-versions.ts` + `functions/src/legal-versions.ts`:
  `LEGAL_VERSIONS = { terms: '2.0', privacy: '2.0', health: '1.0',
  marketing: '1.0' }` + daty wejścia w życie + kanoniczne treści oświadczeń
  (klucze i18n). Test parity vitest pilnuje zgodności obu plików.

### Onboarding: 4 rozdzielone checkboxy (krok Welcome w PlanWizard)

1. [obowiązkowy] "Mam ukończone 16 lat i akceptuję Regulamin" (link).
2. [obowiązkowy] "Zapoznałem/am się z Polityką prywatności" (link; celowo
   NIE "akceptuję", polityka to dokument informacyjny z art. 13 RODO).
3. [obowiązkowy do funkcji zdrowotnych] "Wyrażam wyraźną zgodę na
   przetwarzanie moich danych dotyczących zdrowia (pomiary ciała, oceny
   bólu/dyskomfortu, RPE, tętno z integracji) w celu świadczenia funkcji
   aplikacji. Zgodę mogę wycofać w każdej chwili w ustawieniach." W praktyce
   blokuje przejście dalej (apka jest dziennikiem treningowym), ale jest
   ODRĘBNY i wycofywalny bez utraty konta (do potwierdzenia z prawnikiem).
4. [opcjonalny, domyślnie pusty] zgoda marketingowa na e-maile o nowościach
   i promocjach (art. 398 PKE).

Wszystkie domyślnie odznaczone, bez preselekcji.

### Zapis zgód: Cloud Function `recordConsent` (callable v2)

- Klient NIE zapisuje zgód bezpośrednio (nie zna IP, brak zaufania do zegara).
- Funkcja: wymaga auth; waliduje typ i wersję przeciw LEGAL_VERSIONS;
  zapisuje do kolekcji `consents` dokument: `uid`, `type`
  (terms|privacy_ack|health|marketing), `action` (granted|withdrawn),
  `docVersion`, `statementKey` + `statementText` (pełna treść wyświetlonego
  oświadczenia), `lang`, `channel` (ios|android|web), `appVersion`,
  `ip` (z nagłówka żądania), `createdAt` (serverTimestamp).
- Mirror w `users/{uid}.consents`: `{ termsVersion, privacyVersion,
  healthGranted, healthVersion, marketingGranted, updatedAt }` do szybkiego
  gatingu bez czytania kolekcji.
- Firestore rules: `consents` zapis WYŁĄCZNIE Admin SDK (deny create/update/
  delete z klienta), odczyt tylko admin. Mirror w users: zapis tylko przez
  funkcję (deny zmiany pola consents z klienta).
- Log zgód przeżywa usunięcie konta (dowód rozliczalności, opisany w polityce).

### Re-consent istniejących userów

- Przy starcie apki: user zalogowany z brakującym/przestarzałym
  `users/{uid}.consents` (wersje niższe niż LEGAL_VERSIONS lub brak) dostaje
  blokujący modal z tymi samymi checkboxami (1-3 obowiązkowe, 4 opcjonalny).
- Bump wersji dokumentu w przyszłości = ten sam mechanizm.

### Ustawienia (Profil)

- Przełącznik "E-maile marketingowe" (on/off, każda zmiana logowana).
- "Zgoda na dane zdrowotne": wycofanie z dialogiem potwierdzającym; skutek:
  blokada zapisu nowych danych zdrowotnych (pomiary, oceny bólu/RPE,
  integracje zdrowotne odłączone) + baner z możliwością ponownego wyrażenia.
  Konto i dane treningowe zostają.

### Digest

- `weekly-digest.ts`: bez treści promocyjnych dla userów bez zgody
  marketingowej (digest serwisowy dla wszystkich z włączonym digestem;
  moduły promocyjne warunkowo na `marketingGranted`).

## Plan 3: Admin CSV + compliance wewnętrzny

### Panel admina

- Widok "Zgody": lista z kolekcji `consents` (filtr po userze, typie, dacie).
- Eksport CSV (client-side z zapytania admina), kolumny: `createdAt` (UTC
  ISO), `email` (join z users), `uid`, `type`, `action`, `docVersion`,
  `lang`, `channel`, `appVersion`, `ip`, `statementText`.

### Dokumenty wewnętrzne (repo apki, docs/legal/)

- `RCPD.md`: rejestr czynności przetwarzania (art. 30; obowiązkowy, bo art. 9).
- `PROCEDURA-NARUSZEN.md`: wykrycie, ocena ryzyka, 72h do UODO, zawiadomienie
  osób przy wysokim ryzyku, wzór zgłoszenia.
- `REJESTR-WERSJI.md`: tabela wersji dokumentów z datami i linkami do archiwum.
- `DPA-CHECKLIST.md`: lista DPA (Google/Firebase, RevenueCat, Resend, Apple,
  Strava) ze statusem "zweryfikować podpisanie" (do potwierdzenia z prawnikiem).

## Kryteria akceptacji

1. Landing: /terms, /privacy, /cookies, /health-data-privacy działają w PL/EN
   (health-data EN), stopka ma 4 linki, archiwum wersji dostępne, stare
   /legal/*.html poza redirectami nie istnieją nigdzie w źródłach.
2. Nowy user NIE przejdzie onboardingu bez checkboxów 1-3; checkbox 4
   opcjonalny; każde zaznaczenie/wycofanie tworzy dokument w `consents`
   z IP i timestampem serwerowym (test emulatorowy functions + e2e mock).
3. Istniejący user po aktualizacji dostaje modal re-consent; po akceptacji
   modal znika trwale (do następnego bumpa wersji).
4. Wycofanie zgody zdrowotnej blokuje zapis pomiarów/ocen bólu, nie usuwa
   konta; ponowne wyrażenie odblokowuje (test).
5. Admin eksportuje CSV z kompletem kolumn, data+godzina UTC + IP (test
   ręczny na emulatorze / prod).
6. Bramki repo zielone: test, typecheck, lint, build, dist-smoke; deploy web
   + functions + rules; iOS bump 86 + TestFlight po zakończeniu Planu 2/3.
7. Digest bez treści promocyjnych dla userów bez zgody (test jednostkowy).

## Poza zakresem

- Sync do MailerLite (user wybrał: bez).
- Geofencing WA/NV (przyjmujemy zgodność globalną, jak rekomenduje raport 2).
- DPIA/IOD (poniżej progu "dużej skali"; wraca przy wzroście bazy).
- Płatności web i flow odstąpienia (web nie sprzedaje; zapis w regulaminie).
