# Checklist umów powierzenia (DPA, art. 28 RODO)

Stan na 2026-08-27. Status "DO WERYFIKACJI" = user/prawnik musi potwierdzić,
że warunki powierzenia są zaakceptowane na koncie danego dostawcy (zwykle
akceptacja ToS obejmuje DPA, ale trzeba to potwierdzić i zarchiwizować PDF).

| Dostawca | Rola | Co przetwarza | Dokument DPA | Status |
|----------|------|---------------|--------------|--------|
| Google (Firebase / Google Cloud) | procesor | całość danych aplikacji (Firestore, Auth, Functions, FCM) | Google Cloud Data Processing Addendum + Firebase Data Processing and Security Terms (akceptowane z ToS projektu) | DO WERYFIKACJI (pobrać PDF z konsoli, zarchiwizować) |
| RevenueCat, Inc. | procesor | identyfikatory subskrypcji, status entitlement | RevenueCat DPA (w Terms; dashboard → Legal) | DO WERYFIKACJI |
| Amazon Web Services EMEA SARL (Amazon SES) | procesor | adresy e-mail, imiona, treść e-maili serwisowych i marketingowych, digest ze statystykami oraz tekst/kontekst powiadomienia o zgłoszeniu błędu; screenshot pozostaje w Google Cloud Storage i nie jest załącznikiem SES | AWS GDPR Data Processing Addendum + lista podprocesorów AWS | DO WERYFIKACJI (zaakceptować obowiązujące warunki konta, wybrać region, zarchiwizować DPA i listę podprocesorów) |
| Apple Inc. | odrębny administrator | logowanie Apple, HealthKit (na urządzeniu), płatności App Store | nie wymaga DPA (odrębny administrator; Developer Program License Agreement) | OK |
| Google (Play, logowanie) | odrębny administrator | płatności Play, logowanie Google | nie wymaga DPA (odrębny administrator) | OK |
| Strava, Inc. | odrębny administrator | aktywności importowane na życzenie usera | API Agreement (obowiązki dewelopera: usuwanie <=48h, zakaz AI — wdrożone w polityce i kodzie) | OK (przestrzegać API Agreement) |
| Garmin Ltd. | odrębny administrator | dane sesji z urządzeń | Garmin Developer Agreement | DO WERYFIKACJI (sprawdzić aktualne wymogi programu deweloperskiego) |

## Zasady

- Nowy dostawca dotykający danych osobowych → wiersz w tej tabeli + wpis w RCPD + sekcja 8 Polityki Prywatności PRZED wdrożeniem.
- Transfery poza EOG: preferuj dostawców z certyfikacją EU-U.S. DPF; w innym razie SCC (odnotować moduł).
- Raz w roku: przejrzeć tabelę, zaktualizować statusy, zarchiwizować aktualne PDF-y DPA w `_secrets`/dokumentach firmy (poza repo publicznym).

## Amazon SES — przed pierwszym kontrolowanym deployem

- Potwierdzić AWS DPA, region przetwarzania, mechanizm transferu poza EOG i aktualną
  listę podprocesorów; dowody zarchiwizować poza publicznym repo.
- Potwierdzić, że polityka prywatności wymienia Amazon SES, kategorie danych,
  odbiorców, retencję logów i to, że screenshot zgłoszenia nie jest załącznikiem.
- Operacyjna konfiguracja (cztery sekrety transportu, identity/config set/events,
  production access/quota, least-privilege IAM i syntetyczny smoke po zgodzie) jest
  obowiązkową bramką z `PLAN.md` oraz `docs/RELEASE-READINESS-2026-08-27.md`.
