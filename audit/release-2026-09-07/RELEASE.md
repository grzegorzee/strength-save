# Wydanie testowe 2026-09-07

Źródło podpisanych paczek: `3c9f975b40634e83472497b331b2d4ce53bafa0b` na main.
Wersja produktu pozostaje 1.0.0. Historia dziewięciu commitów audytu:
[source-commits.json](source-commits.json). Późniejsze wpisy dokumentacyjne
nie zmieniają aplikacji w tych paczkach.

| Obszar | Potwierdzony wynik |
|---|---|
| iOS143 | Upload PASS, VALID, Beta Review APPROVED; obie grupy zawierają build, internal/external IN_BETA_TESTING |
| Android49 | Podpisany AAB gotowy; upload do Play nie wykonany, najwyższy versionCode w sklepie niezweryfikowany |
| Backend etap 1 | 68 Functions zaktualizowanych, 69 ACTIVE; 14 indeksów READY, sekret RC v1, nowe Storage Rules |
| Backend odroczony | restoreWorkoutBackupV3 oraz Firestore Rules zachowane w dotychczasowej wersji dla zgodności starszych klientów |
| Fizyczne QA | Właściciel przetestuje przez TestFlight; nie oznaczono jako wykonane |
| Publiczny launch / web | Nie opublikowano nowej publicznej wersji ani webu |

## Dowody paczek

- [TestFlight143](../../release/ios/testflight-143.json): trzy targety 1.0.0/143,
  podpis i profile App Store, aktywny HealthKit/Sign in with Apple/Push/App Attest.
  IPA SHA256: `9fbc5364a7c4157b0204fc56f3e2c751fcaef8b753441fe7ad7009489798dca5`.
- [Android49](../../release/android/internal-2026-09-07/artifact.json): 1.0.0/49,
  API36, istniejący klucz uploadu; wszystkie 1368 wpisów podpisane.
  AAB SHA256: `69ab3c28ca9ca45e4872af92d900106f2890cf591f73104ef2e172dfec4d7e7f`.
- W obu paczkach i projektach natywnych wszystkie 235 zasobów runtime są zgodne
  z mobilnym dist. Android: 6 bibliotek 64-bitowych i 87 splitów APK spełnia
  weryfikację 16 KB. Ostrzeżenia jarsigner i niezależny dowód pełnego podpisania
  są jawnie opisane w Android receipt.
- [Backend](backend-deployment-receipt.json): stan chmury po wdrożeniu,
  zachowane stare Rules/restore, pięć kontroli HTTP bez zapisów danych.

## Weryfikacja

Po finalnych poprawkach i bumpie: frontend 4084 PASS, 16 historycznych skipów;
Functions 549 PASS, 15 przypadków emulatorowych wykonywanych osobno; typecheck
PASS, lint 0 błędów i 15 zastanych ostrzeżeń. Release iOS wykonał świeży mobile
build i test uruchomienia dist przed podpisaniem. Android zbudowany z tego
samego dist. Pełne wcześniejsze Chromium330, WebKit330, Firebase e2e18,
Functions integration15 oraz Rules370 dotyczą tego samego kodu funkcjonalnego;
szczegółowe granice dowodów: [audit/latest.json](../latest.json).

[CI źródłowego commita](https://github.com/grzegorzee/strength-save/actions/runs/34133948626)
potwierdziło oba natywne joby. Stan całego quality jobu należy odczytać z runu;
nie utożsamiać samego pushu z wynikiem zielonym ani wdrożeniem webu.

## Pozostałe kroki

Scenariusze iPhone'a są w TestFlight „Co testować” oraz
[checkliście urządzeniowej](../../docs/LAUNCH-DEVICE-QA-2026-09-06.md).
Priorytet: nowy trening z propozycją rozgrzewki bez powtórek, odhaczenia po
zgaszeniu ekranu, plan → wyjście → szybki trening → powrót → zakończenie → sync,
timer przy zgaszonym ekranie i słabej sieci oraz onboarding na koncie testowym.

Google Play wymaga dostępu do konsoli: obecne ADC zwraca
ACCESS_TOKEN_SCOPE_INSUFFICIENT, a bieżąca sesja Chrome nie została udostępniona
do sterowania. Zapytano właściciela o ręczne udostępnienie albo samodzielny
upload gotowego AAB. Nie tworzono nowego logowania ani nie zmieniano ustawień
bez odpowiedzi.

Odroczone B10/B11/B12 oraz część B3 wymagają migracji klientów i wspólnego
wdrożenia strict restore/Firestore Rules. W szczególności poprawki Undo bez
sidecara nie należy uznawać za wdrożoną tylko dlatego, że nowy klient jest
w TestFlight. Zakupy, import, kasowanie danych i przełączanie kont testować
na koncie testowym. Przed publiczną premierą pozostają też sprawdzenie listingów,
deklaracji i zakupów testowych oraz rotacja wcześniej ujawnionych danych recenzenta.

Końcowy manifest powstaje po commicie dokumentacji jako lokalny artefakt audytu;
obejmuje bieżące IPA143/AAB49, bez starych diagnostycznych APK/symulatora.
