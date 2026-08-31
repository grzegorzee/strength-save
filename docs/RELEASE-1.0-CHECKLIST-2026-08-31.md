# Strength Save 1.0 — finalna checklista wydania

Stan: kandydat iOS 1.0.0 build 136 w przygotowaniu. Samo utworzenie TestFlight
nie jest zgodą na wysłanie do publicznego App Review.

## Zielone bramki

- [x] Vitest 3876/3876, typecheck, lint bez błędów, build i bundle budget
- [x] Functions 513 PASS/12 SKIP; registration emulator 12/12
- [x] Firestore Rules 317/317 i Storage Rules 42/42 na JDK 21
- [x] Dist smoke, pełny offline contract i no-emoji
- [x] Chromium 314/314 i WebKit 314/314 po restarcie Vite/cache
- [x] npm audit aplikacji i Functions: 0 podatności
- [x] Firestore: delete protection, PITR i daily backup
- [x] Monitoring: budżet 50 PLN, runtime errors, Firestore reads
- [x] App Store: copy, Privacy URL, age rating 4+, 10 screenshotów EN
- [x] Strava usunięta z publicznych obietnic, scheduler wstrzymany

## Wymagane przed „Submit for Review”

- [ ] Build 136 ma stan VALID i jest przypięty do obu grup TestFlight
- [ ] Fizyczny iPhone: login, plan, quick workout, background/resume, timer,
  powiadomienie, Share Sheet, HealthKit, zakup i restore
- [ ] Sekwencja danych: plan → wyjście → quick workout → powrót do planu →
  wszystkie ćwiczenia obecne → zakończenie → sync
- [ ] App Review Details mają telefon właściciela w formacie międzynarodowym
- [ ] Privacy labels zweryfikowane ręcznie w App Store Connect
- [ ] Build 136, miesięczna i roczna subskrypcja dołączone do wersji 1.0
- [ ] Jawna końcowa zgoda właściciela na wysłanie do App Review

## Android przed publikacją

- [ ] Nowy signed AAB z bieżącego commita i zwiększonym versionCode
- [ ] Fizyczny smoke Android: login, trening, offline/reconnect, share, Health
  Connect, zakup i restore
- [ ] Listing i Data Safety zweryfikowane w Play Console

## Rollback / stop conditions

Zatrzymaj wydanie przy utracie ćwiczeń/serii, nieskończonym „czeka na sync”,
niezgodnym entitlement, braku dźwięku/haptyki timera, crashu po resume, błędnych
promptach uprawnień lub rosnących błędach runtime. Nie rozwiązuj konfliktu danych
automatycznym nadpisaniem; zachowaj obie wersje i użyj eksportu.
