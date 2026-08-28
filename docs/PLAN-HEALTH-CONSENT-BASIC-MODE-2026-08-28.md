# Strength Save — tryb podstawowy i dobrowolne funkcje zdrowotne

Stan: 2026-08-28. Dokument wykonawczy; nie jest zgodą na deploy ani migrację
danych. Dane istniejących użytkowników nie będą automatycznie kasowane ani
nadpisywane.

## Granica produktu

**Tryb podstawowy:** plan, ćwiczenia, serie, powtórzenia, ciężar, czas, dystans,
notatki, timer, historia, rekordy, tonaż oraz eksport bazowych treningów.

**Funkcje zdrowotne:** pomiary i zdjęcia sylwetki, RPE/ból/jakość, tętno i max HR,
strefy/TRIMP/load, HealthKit/Health Connect, Watch HK/HR/energy oraz zdrowotne pola
Stravy i ręcznego cardio.

Predykaty są niezależne:

- wejście do aplikacji: aktualny Regulamin i potwierdzenie Polityki prywatności;
- health: wyłącznie `healthGranted === true`, aktualna wersja oświadczenia,
  dodatni `healthEpoch` i niepusty `healthGrantId`;
- brak, odmowa albo stara wersja health oznaczają działający tryb podstawowy.

`healthEpoch` jest monotoniczną granicą cofnięcia zgody. Stary zapis lub element
kolejki z poprzedniej epoki nie może odzyskać prawa do zapisu po ponownym
udzieleniu zgody. `healthGrantId` identyfikuje konkretny grant i rozdziela nowe
pliki od legacy bez usuwania danych właściciela.

## Fala A — ukończona lokalnie

- onboarding i ConsentGate wymagają tylko Terms + Privacy;
- health jest odznaczone domyślnie, opisane jako opcjonalne i zapisuje
  `withdrawn`, gdy użytkownik idzie dalej bez opt-inu;
- health statement ma wersję 1.1 po obu stronach klient/Functions;
- `useHealthConsent` jest fail-closed;
- natywny zapis treningu/cardio dostaje jawny bool zgody i bez niego nie woła
  pluginu nawet przy starym `localStorage`;
- wycofanie wyłącza lokalne opcje Health i usuwa wyłącznie kolejkę synchronizacji
  Health; draft i kolejka bazowego treningu pozostają nietknięte;
- stary przepływ z dobrowolnym health opt-in nadal działa.

Dowód: czerwone testy przed zmianą, potem 67/67 celowanych, pełny Vitest
3712/3712, Functions 454 PASS/12 SKIP, typecheck, lint i build. Chromium/WebKit:
4/4 dla basic mode oraz starego opt-inu.

## Fala B1 — lokalna granica consent epoch/grant

Status: **zaimplementowana i przetestowana lokalnie; bez deployu i bez mutacji
danych produkcyjnych**.

- `recordConsent` utrzymuje `healthEpoch` transakcyjnie, tworzy nowy
  `healthGrantId` przy nowym grancie i jest idempotentny dla powtórzenia tego
  samego stanu;
- duplikaty typu zgody w jednym żądaniu są odrzucane zamiast pozostawiać wynik
  zależny od kolejności elementów;
- pomiary wymagają aktualnej epoki przy create/update; odczyt i usunięcie przez
  właściciela pozostają dostępne po withdraw;
- nowe zdjęcia używają ścieżki
  `body-photos/{uid}/{healthGrantId}/{file}` i aktualnego grantu; legacy ma
  wyłącznie owner read/delete, więc migracja nie zabiera użytkownikowi dostępu;
- ręczne cardio działa bez health. Bez aktywnego grantu zapisuje dystans i
  notatkę, ale pomija tętno, kalorie i odczuwaną intensywność. Z aktywnym grantem
  pola zdrowotne dostają bieżący `healthEpoch`;
- import pomiarów zatrzymuje się przed pierwszym batchem, jeśli brak aktywnego
  grantu, zamiast wykonać częściowy zapis;
- synchronizacja Strava w Functions bez aktywnej zgody nadal zapisuje bazową
  aktywność, lecz pomija HR, max HR, kalorie i aktualizację `estimatedMaxHR`.
  Refresh nie modyfikuje istniejących pól zdrowotnych. Część serwerowa zachowuje
  stare zachowanie wyłącznie dla aktualnej wersji, epoki i grantu;
- ręczny zapis max HR po stronie klienta jest fail-closed: helper wymaga aktywnego
  grantu i zapisuje `estimatedMaxHREpoch`. Firestore Rules dopuszczają zmianę pól
  max HR wyłącznie dla aktualnej epoki, ale nadal pozwalają na bazową zmianę
  profilu oraz odczyt po withdraw;
- reminder zdjęć nie odczytuje pomiarów i nie wysyła komunikatu bez aktywnego
  grantu. E-maile nadal wysyłają bazowe serie/ciężary/notatki, ale pomijają RPE,
  ból i ocenę sesji. Digest pobiera ze Stravy wyłącznie projekcję pól bazowych;
- powstał serwerowy, niemutujący helper workout-health: bez grantu usuwa RPE,
  ból i jakość z payloadu, a z grantem przepuszcza wyłącznie poprawne zakresy.
  Helper jest gotowym elementem `syncWorkoutV2`, ale sam nie zabezpiecza obecnej
  bezpośredniej ścieżki Firestore;
- payload telefonu i Watch ma addytywne `healthFeaturesEnabled`, przy czym brak
  pola albo `false` oznacza fail-closed. Plan preview i aktywny trening zawsze
  wysyłają jawną wartość. Bazowe logowanie serii na Watch działa bez zgody, lecz
  Watch nie uruchamia, nie odzyskuje ani nie zapisuje wtedy sesji HealthKit;
  revoke blokuje kolejne użycie HealthKit bez kasowania bazowego treningu.

Dowody tej fali: celowane testy pomiarów 69/69, ręcznego cardio i jego formularza
28/28 oraz max HR/consents 13/13. Firestore Rules 296/296, Storage Rules 33/33 i
root typecheck są zielone. Po zmianie Strava jej testy celowane przechodzą 56/56,
a pełne Functions: 474 zaliczone, 12 pominiętych; Functions typecheck i `git diff
--check` są zielone. Pełna bramka repozytorium po połączeniu wszystkich
równoległych zmian pozostaje do ponowienia. Po domknięciu reminderów/maili/digestu
pełne Functions przechodzą 483/483 (12 pominiętych), a sanitizer workout-health
ma 4/4 testy celowane. Granica Watch i powiązane przepływy przechodzą 50/50,
root typecheck/lint oraz pełny build Watch z osadzeniem w aplikacji iOS są zielone;
fizyczny iPhone + Watch pozostaje testem urządzeniowym, nie brakującym guardem.

## Inwentaryzacja produkcji — tylko odczyt

Audyt nie zmieniał dokumentów ani plików. Wykrył dwa pseudonimizowane konta z
danymi należącymi do zakresu health oraz **372 dokumenty docelowe**:

- 8 pomiarów;
- 1 element metryk zdrowotnych z treningu;
- 361 aktywności z polami zdrowotnymi;
- 2 profile użytkowników z polami zdrowotnymi.

Oba odwołania do zdjęć mają istniejący obiekt w Storage: **2/2**. Żadne konto nie
zostało automatycznie podniesione ze zgody 1.0 do 1.1, nie wykonano backfillu,
usunięcia ani zapisu kontrolnego. Te liczby są manifestem do dry-runu, nie zgodą
na migrację.

## Fala B2 — bezpieczny fundament; produkcyjne wpięcie nadal zablokowane

Obecne `workouts.exercises[]` miesza bazowe serie z RPE/bólem/jakością. Firestore
Rules nie potrafią wiarygodnie iterować i walidować pól map wewnątrz listy. Sam
guard UI lub sanitizer nie jest pełnym fail-closed. Lokalnie istnieje już
callable `syncWorkoutV2` i adapter klienta, ale nie są podłączone do
`batchSaveWorkout` ani bieżącej kolejki synchronizacji. To celowo niewpięty
fundament, a nie aktywna ścieżka produkcyjna.

Zakres:

1. Fundament zapisuje zamknięty dokument `workout_health_v2/{workoutId}` z
   `userId`, wersją/epoką/grantem oraz `sourceWriteId`. Dokładne dopasowanie
   `healthEpoch` i `healthGrantId` jest sprawdzane serwerowo.
2. Bazowy workout zapisuje się i finalizuje bez health. Błąd niezależnego health
   side-write zwraca jawny stan pending, nie cofa bazowego zapisu. Ponowienie tego
   samego `writeId` obsługuje utracony ACK bez podbicia rewizji.
3. Przed wpięciem klient musi zapisać fence `healthEpoch`/`healthGrantId` w drafcie
   i elemencie kolejki **w chwili wpisania metryki**. Retry nie może pobierać
   bieżącego grantu, bo po withdraw/regrant nadałby starym danym nowe uprawnienie.
4. Health pending wymaga trwałej kolejki ponawianej z tym samym `writeId` oraz
   własnej ścieżki wyjścia; błąd health nie może blokować ani dublować final syncu.
5. Odczyt wymaga read-joinu v2 + legacy, aby metryki nie znikały po reloadzie lub
   w Historii. Eksport i jawne usunięcie danych właściciela muszą pozostać możliwe
   po cofnięciu zgody.
6. Dopiero po dual-read/write, migratorze/canary i weryfikacji danych można ustawić
   minimalną wersję klienta oraz zablokować stare legacy writes. Rollout musi mieć
   plan dla starych klientów, bez jednoczesnego odcięcia trybu podstawowego.
7. Centralny guard Functions obejmuje już Stravę, przypomnienia zdjęć, e-maile i
   digest. Granica Watch/native health jest zaimplementowana fail-closed; pozostał
   fizyczny test iPhone + Watch oraz przyszłe procesory używające tego samego helpera.

Dowód foundation: Functions `syncWorkoutV2` + workout-health 13/13, adapter
klienta 3/3 oraz typecheck klienta i Functions. Te testy nie dowodzą jeszcze
spójności bieżącego draftu/kolejki/read path, ponieważ foundation nie jest wpięty.

## Migracja bez utraty danych

1. Read-only dry-run i manifest liczby dokumentów; backup/eksport przed zapisem.
2. Dual-write nowych metryk; dual-read preferuje v2, legacy tylko przy aktywnej
   zgodzie.
3. Idempotentny backfill z checkpointem, revision precondition i hashem. Najpierw
   kopiowanie oraz weryfikacja; dopiero potem punktowe usunięcie trzech pól legacy.
4. Ponowny odczyt `healthEpoch` w transakcji chroni withdraw podczas migracji.
5. Zero automatycznego kasowania historycznych danych. Eksport i jawne usunięcie
   pozostają dostępne; retencja wymaga potwierdzenia prawnego.

Przed jakimkolwiek backfillem powstaje osobne narzędzie dry-run z hashem,
checkpointem i raportem różnic. Pierwszy jawny grant 1.1 rozpoczyna epokę 1;
administrator nie tworzy zgody w imieniu użytkownika. Canary i rollback muszą
działać na danych syntetycznych, a potem na jawnie wybranym, pseudonimizowanym
zakresie — bez nadpisywania legacy.

Read-only dry-run został wykonany: 10 pseudonimizowanych subjectów, 372
klasyfikacje, 0 kont z jawnym bieżącym grantem 1.1, 0 mutacji. Wszystkie 372
transformacje są celowo oznaczone jako zablokowane przez brak jawnej zgody 1.1
lub niezatwierdzony schemat docelowy. Manifest jest lokalny, tryb pliku 0600,
nie zawiera UID/e-maili/ścieżek ani wartości health i nie jest backupem ani zgodą
na zapis. Narzędzie nie ma trybu apply/write.

## Testy wymagane przed rolloutem

- missing/false/stale: base workout start/update/finalize/sync dozwolone; health
  doc, pomiar, zdjęcie i HR odrzucone;
- current grant+epoch: health write/read dozwolone; stara kolejka po withdraw i
  regrant odrzucona;
- delete/export istniejących danych dostępne po withdraw;
- Functions pomijają HR/maxHR, RPE/ból, photo reminder i health email content;
- migrator: retry po awarii, konflikt revision, withdraw w trakcie, brak duplikacji
  i identyczność bazowych serii/notatek;
- sekwencja plan → wyjście → szybki trening → powrót → zakończenie → sync w obu
  wariantach zgody;
- fizyczne iOS/Android: HealthKit/Health Connect prompt dopiero po opt-inie,
  Watch, offline drugiego urządzenia, force-kill oraz revoke w aktywnej sesji.

## Blockery rollout/release

1. Produkcyjne wpięcie `syncWorkoutV2`: fence epoki/grantu utrwalony w drafcie i
   kolejce w chwili wpisania danych, health pending queue z tym samym `writeId`,
   read-join v2/legacy oraz eksport/usunięcie ownera po withdraw.
2. Kontrolowany minimum-client rollout i old-client lockdown dopiero po dual-read/
   write, canary i dowodzie braku utraty metryk. Foundation callable/adapter,
   sanitizer oraz guardy reminderów/maili/digestu/Stravy/Watch są lokalnie gotowe.
3. Zatwierdzenie schematu docelowego, write migrator/canary i udokumentowany
   rollback. Read-only manifest/hash/checkpoint jest wykonany i potwierdza zero
   kwalifikujących grantów 1.1, więc zapis pozostaje zablokowany.
4. Ponowienie pełnych bramek po scaleniu wszystkich zmian; wyniki historyczne nie
   zastępują bieżącego przebiegu.
5. Fizyczny iOS oraz Android: opt-in/withdraw/regrant, offline, suspend,
   force-kill, restart i odzyskanie draftu/kolejki.
6. Ręczna sekwencja plan → wyjście → szybki trening → powrót → zakończenie →
   synchronizacja z health włączonym i wyłączonym.

Do produkcyjnego wpięcia syncu, migratora i bramek fizycznego iOS/Android/Watch
dokument opisuje stan lokalny, a nie zgodę na deploy, migrację lub publiczne
wydanie. Sam foundation ani lokalne domknięcie Watch/max HR nie odblokowują
wdrożenia.

Źródła: [EDPB Guidelines 05/2020](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en),
[Apple App Review Guidelines 5.1](https://developer.apple.com/app-store/review/guidelines/),
[Google Play Health Apps policy](https://support.google.com/googleplay/android-developer/answer/17190352),
[Health Connect UI guidelines](https://developer.android.com/health-and-fitness/health-connect/ui/guidelines).
