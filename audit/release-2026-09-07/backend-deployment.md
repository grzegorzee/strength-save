# Backend deployment — faza 1, 2026-09-07

Status: **faza 1 wdrożona i zweryfikowana**, 2026-09-07 14:55 UTC. Źródło: commit/push `3c9f975b40634e83472497b331b2d4ce53bafa0b`. Prowadzący potwierdził brak automatycznych deployów GitHub. Nie jest to wdrożenie odroczonej fazy 2 ani potwierdzenie testów użytkownika na urządzeniu.

Plan zaakceptowany przez prowadzącego: `backend-preflight.md`. Projekt `fittracker-workouts`, jawne konto `g.jasionowicz@gmail.com`. Zakres: indeksy → READY, Storage Rules, dokładnie 68 Functions bez `restoreWorkoutBackupV3`. Firestore Rules i strict restore pozostają odroczone.

- Utworzono `REVENUECAT_SERVER_API_KEY/versions/1`, stan **ENABLED**, 2026-09-07 14:33:43 UTC. Wykorzystano istniejący lokalny klucz; przekazanie wyłącznie stdin, bez ujawniania wartości.
- Przyznano `roles/secretmanager.secretAccessor` wyłącznie na tym sekrecie kontu `283539506094-compute@developer.gserviceaccount.com`. Nie zmieniano project-level IAM.
- Odczyt wersji był metadata-only; nie wykonywano `secrets versions access`.
- Nie uruchamiano purge, wysyłania email/push ani operacji na kontach użytkowników.

## Wykonana kolejność i dowody

1. Secret Manager + ograniczony binding: oba polecenia exit 0; końcowy odczyt nadal potwierdza version 1 ENABLED i wyłącznie wskazanego runtime accessor na sekrecie.
2. `firebase deploy --only firestore:indexes`: exit 0. Nowy indeks `deletion_operations/state ASC/purgeAfter ASC`, ID `CICAgJiUzYsK`, osiągnął **READY przed startem Functions**. Zachowano 10 istniejących field overrides; nie użyto `--force`. Końcowo **14/14 indeksów READY**.
3. `firebase deploy --only storage`: exit 0. Nowy ruleset `5e08c59a-f3dc-48d0-8e44-af1daafd90de`, release 14:47:19 UTC; pobrana treść zgadza się z zamrożonym `storage.rules`.
4. Dokładnie 68 zatwierdzonych Functions: exit 0. Wrapper przed startem sprawdził 68 unikalnych nazw, wyłączenie restore, SHA źródła i brak zmian w kodzie/config. Predeploy ponownie wykonał **typecheck PASS, 549 unit PASS / 15 emulator-only skipped, build PASS**. Nie uruchamiano ponownie emulatorów.
5. Kontrola po deployu: **69/69 Functions ACTIVE**, dokładnie 68 funkcji z nowym timestampem 2026-09-07. `restoreWorkoutBackupV3` zachowała `2026-09-04T08:57:50.173608534Z`.
6. `revenuecatWebhook` ma oba bindingi: dotychczasowy `REVENUECAT_WEBHOOK_AUTH:1` i nowy `REVENUECAT_SERVER_API_KEY:1`. Runtime SA zgodny z nadanym dostępem.
7. Firestore Rules pozostały niezmienione: ruleset `ae49dda7-1e3a-4276-b777-413def64df88`, release 2026-08-31. Pobraną treść porównano po SHA-256 z preflightem. Kompilacja Rules widoczna przy deployu indeksów nie opublikowała nowych reguł.
8. HTTP smoke **5/5 PASS**, bez tokenów użytkowników: `syncUserProfile`, `recordConsent`, `syncWorkoutV2`, `restoreWorkoutBackupV3` odrzuciły puste żądania przez 401 UNAUTHENTICATED; GET `revenuecatWebhook` odrzucił metodę przez 405. Nie tworzono danych testowych w produkcji. Katalogowe read-only próby RC opisuje preflight; nie wykonywano transferu prawdziwej subskrypcji.

Wynik maszynowy z nazwami wszystkich funkcji, datami, hashami Rules i odpowiedziami smoke, bez wartości sekretów: [backend-deployment-receipt.json](backend-deployment-receipt.json). Istniejące pełne testy emulatorów Rules/Functions/E2E pozostają w raporcie audytu; natywny zakup/restore i zachowanie telefonu sprawdzi użytkownik przez TestFlight.

## Świadomie odroczone

B10 (blokada raw exercises), B11 (delete/Undo brakującego sidecara), B12 (wymagany expectedOwnerUid serwera restore) i Firestore część B3 pozostają do fazy 2. Utrzymanie starych Rules i starego restore zachowuje importy klientów 142/48. Po fazie 1 nie należy deklarować naprawionego Undo/delete bez sidecara w produkcji.

## Rollback

Punkt źródłowy sprzed audytu: `33df6dbd13883ce2f1abfbf25bfa11213b7bc6f5`. W przypadku potwierdzonej regresji przygotować izolowany checkout tego SHA i wdrożyć z niego wyłącznie uszkodzony zakres fazy 1; nie cofać współdzielonego workspace ani nie deployować ogólnie wszystkich zasobów. Przy cofnięciu funkcji zachować nowy indeks i nie usuwać danych/operacji usuwania kont. Stary webhook może pozostać z własnym dotychczasowym bindingiem; nowego sekretu nie trzeba kasować ani rotować. Firestore Rules oraz restore nie są zmieniane w fazie 1, więc nie wymagają rollbacku. Rollback nie został wykonany.
