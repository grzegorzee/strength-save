# App Privacy: odpowiedzi dla builda 148

Sprawdzone 2026-09-13. Audyt odczytu kodu klienta, backendu, konfiguracji SDK oraz lokalnego archiwum `build/ios/StrengthSave.xcarchive/Products/Applications/App.app`. `CFBundleVersion` archiwum: `148`. Nie zmieniano aplikacji ani nie opublikowano odpowiedzi w App Store Connect.

## API

Publiczne API nie udostępnia tej ankiety. Autoryzowany `GET /v1/appDataUsages?filter[app]=6777446137` zwrócił 404 `PATH_ERROR`: zasób nie istnieje. Pobrana oficjalna specyfikacja OpenAPI Apple w wersji 4.4.1 nie zawiera operacji `appDataUsages`, privacy ani data collection. Odwołanie `/v1/appDataUsages/` w błędzie walidacji zgłoszenia nie oznacza dostępności tego zasobu w publicznym API. Formularz trzeba zapisać w App Store Connect.

## Pola do zaznaczenia

Początkowa odpowiedź: **Yes, we collect data from this app**.

| Ekran | Pole | Uzasadnienie |
| --- | --- | --- |
| 1 | Name | Nazwa profilu, logowanie Google/Apple, odpowiedź z onboardingu. `src/lib/user-profile.ts`, `functions/src/registration.ts`. |
| 1 | Email Address | Konto Firebase, adresy do komunikacji i wysyłki treningów. |
| 1 | Phone Number | Deklaracja dostawcy aktywnego Google Sign-In SDK, znajdująca się także w archiwum 148. Własny profil Strength Save nie ma numeru telefonu; nie używamy Firebase Phone Auth ani scope People API do pobierania numerów. Rekomendacja uwzględnia zbieranie przez dostawcę logowania, nie twierdzi, że numer trafia do naszej bazy. |
| 1 | Health | Pomiary ciała, ból/RPE, dane zdrowotne z integracji. `src/pages/Measurements.tsx`, `functions/src/workout-health-boundary.ts`, `functions/src/strava-activity.ts`. |
| 2 | Fitness | Plany, sesje, serie, ciężary, powtórzenia, czas i dystans; Firestore i synchronizacja zegarka. |
| 2 | Precise Location | Wniosek z przepływu oryginalnych zdjęć profilowych: `src/pages/Profile.tsx:248` przekazuje wybrany `File` bez usunięcia EXIF do `uploadBytes`. Jeśli plik zawiera GPS, współrzędne pozostają w przechowywanym pliku. Potwierdzono identyczny przepływ w `public/assets/Profile-EOGHNvQc.js` archiwum 148. To nie jest aktywne śledzenie GPS. Nie odczytywano metadanych prywatnych zdjęć użytkowników, więc nie stwierdzamy, że konkretny istniejący avatar zawiera GPS. |
| 2 | Coarse Location | Google Sign-In może określać przybliżoną lokalizację z IP w celu przeciwdziałania nadużyciom. Oficjalna dokumentacja Google i manifest SDK w archiwum. RevenueCat nie jest podstawą tej deklaracji. |
| 3 | Emails or Text Messages | Użytkownik zleca wysyłkę treningu/historii do wskazanego odbiorcy. Serwer zachowuje odbiorcę, temat i HTML w `email_log` oraz `content/body`. `functions/src/email-workout.ts`, `functions/src/email-log.ts`. Nie oznacza dostępu do skrzynki ani SMS-ów telefonu. |
| 3 | Photos or Videos | Własny avatar, zdjęcia sylwetki, załączniki do zgłoszeń. Firebase Storage. |
| 3 | Customer Support | Treść i kategoria zgłoszenia, email zgłaszającego i kontekst błędu w `bug_reports`. `functions/src/bug-reports.ts`. |
| 4 | Other User Content | Nazwy własnych planów, ćwiczenia i notatki przechowywane w chmurze. |
| 4 | User ID | Firebase UID w dokumentach, telemetrii i `Purchases.logIn({ appUserID: uid })`. |
| 4 | Device ID | Tokeny APNs/FCM, rejestracja urządzeń przypisana do konta, identyfikatory integracji zegarków; także deklaracja Google Sign-In. |
| 4 | Purchases | RevenueCat i zapisy stanu subskrypcji w Firestore. Informacja o zakupie i uprawnieniu PRO, bez numerów kart. |
| 5 | Product Interaction | Liczniki ekranów i działań w `app_telemetry_daily`, m.in. trening, odhaczenie serii, paywall, zakup i synchronizacja. `src/lib/app-telemetry.ts`, `src/components/ProductTelemetry.tsx`. |
| 5 | Other Usage Data | Deklaracja aktywnego Google Sign-In SDK; dodatkowo historia interakcji z komunikacją SES (`functions/src/ses-events.ts`). |
| 5 | Crash Data | Globalne błędy JS i odrzucone obietnice zapisane w `client_errors` z UID. `src/lib/global-error-telemetry.ts`, `src/lib/error-telemetry.ts`. |
| 5 | Other Diagnostic Data | Kody błędów, platforma, wersja, kontekst zgłoszeń oraz diagnostyka Firebase i GoogleDataTransport. |
| 6 | Other Data | Deklaracje Google Sign-In/Firebase Messaging, pozostałe ustawienia i rejestr zgód z wersją, kanałem, czasem i IP. `functions/src/consents.ts`. |

Łącznie: **19 pól**. Pozostałe pola pozostawić niezaznaczone:

- Contact Info: Physical Address, Other User Contact Info.
- Financial Info: Payment Info, Credit Info, Other Financial Info.
- Sensitive Info i Contacts.
- User Content: Audio Data, Gameplay Content.
- Browsing History i Search History.
- Usage Data: Advertising Data.
- Diagnostics: Performance Data.
- Surroundings: Environment Scanning.
- Body: Hands, Head. Waga i obwody należą tutaj do Health, a nie śledzenia ruchów dłoni lub głowy.

## Odpowiedzi po Save

Poniższe cele dotyczą obecnych funkcji i deklaracji aktywnych SDK. Każdy wskazany typ występuje w przepływie powiązanym z kontem lub identyfikatorem użytkownika: dla pytania o powiązanie z tożsamością wybierz **Yes**. To nie twierdzi, że każda pojedyncza próbka diagnostyczna SDK ma UID.

| Typ | Cele |
| --- | --- |
| Name | App Functionality. Jeśli imię jest używane w dobrowolnych kampaniach marketingowych, również Developer’s Advertising or Marketing. |
| Email Address | App Functionality, Analytics (pomiar komunikacji). Developer’s Advertising or Marketing dla adresów zbieranych na dobrowolną komunikację marketingową zgodnie ze zgodą. |
| Phone Number | App Functionality według manifestu Google Sign-In. |
| Health | App Functionality. Nie używać do reklam. |
| Fitness | App Functionality; Product Personalization dla rekomendacji planu na podstawie celu/poziomu/częstotliwości; Analytics tam, gdzie podsumowania aktywności są używane do oceny korzystania z produktu. |
| Precise Location | App Functionality: przechowywanie oryginalnego zdjęcia profilowego, brak profilowania lokalizacyjnego. |
| Coarse Location | App Functionality: ochrona logowania Google. |
| Emails or Text Messages | App Functionality: wysłanie i przechowywanie podsumowania. |
| Photos or Videos | App Functionality. |
| Customer Support | App Functionality. |
| Other User Content | App Functionality. |
| User ID | App Functionality, Analytics. |
| Device ID | App Functionality, Analytics (Google Sign-In). |
| Purchases | App Functionality, Analytics, zgodnie z instrukcją RevenueCat. |
| Product Interaction | App Functionality, Analytics. |
| Other Usage Data | Analytics; App Functionality dla obsługi i diagnostyki komunikacji. |
| Crash Data | App Functionality. |
| Other Diagnostic Data | App Functionality, Analytics (deklaracje bibliotek Firebase/GoogleDataTransport). |
| Other Data | App Functionality, Analytics (deklaracje Google/Firebase). |

Dla pytania o tracking: na podstawie zbadanych aktywnych integracji **No**. Liczenie własnych zdarzeń lub otwarć maili nie jest samo w sobie trackingiem między aplikacjami innych firm według definicji Apple. Powyższa ocena nie obejmuje przyszłych integracji reklamowych uruchomionych poza repozytorium.

## Rozstrzygnięte rozbieżności

- **Performance Data** z manifestu aplikacji nie ma potwierdzonego przepływu wysyłki. `src/lib/startup-performance.ts` zapisuje pomiary wyłącznie do `sessionStorage` i konsoli. Nie znaleziono ich odbiorcy sieciowego. Aplikacja nie inicjalizuje Firebase Performance. Diagnostyka GoogleDataTransport jest w jego manifeście oznaczona jako Other Diagnostic Data. Sama obecność starej deklaracji nie jest podstawą zaznaczenia Performance Data.
- **Precise Location** nie wynika ze Stravy ani HealthKit. Mapper Stravy zapisuje jawnie wybrane metryki bez współrzędnych, tras i polilinii. Integracja Garmin zapisuje zdarzenia serii bez GPS; kod natywny nie pobiera CLLocation ani HKWorkoutRoute. Powód uwzględnienia tego pola w obecnym buildzie to zachowanie oryginalnego pliku avatara. Zdjęcia sylwetki przechodzą przez `compressImage`, natomiast avatar nie. Przed późniejszym usunięciem deklaracji trzeba usunąć metadane GPS w tym przepływie i ustalić postępowanie z już zachowanymi plikami.
- **Phone Number / Coarse Location / Other Usage Data / Other Data**: brak takich pól we własnej bazie nie wystarcza do wyłączenia deklaracji, ponieważ aktywny Google Sign-In ma własny zakres zbierania. Numer telefonu rekomendowano na podstawie manifestu dostawcy w buildzie, nie na podstawie przechwyconego ruchu sieciowego.
- **Facebook**: frameworki i ich manifesty są dołączone pośrednio przez paczkę uwierzytelniania, ale konfiguracja archiwum ma wyłącznie `google.com` i `apple.com`. Fabryka pluginu tworzy handler Facebooka wyłącznie dla włączonego providera. Brak Facebook App ID i inicjalizacji FBSDK w AppDelegate. Nie uznajemy samego niewykorzystywanego manifestu Facebooka za dowód włączenia trackingowych funkcji Facebooka w Strength Save. Nie przeprowadzano w tym audycie przechwytywania ruchu całej aplikacji.
- **Payment Info**: zakup obsługuje sklep, aplikacja i RevenueCat nie otrzymują danych karty. Trzeba zaznaczyć Purchases.
- **Emails or Text Messages**: powodem jest rzeczywista funkcja wysyłki i zachowywania podsumowania do trenera, a nie samo istnienie maili systemowych lub pola email konta.

To dokument ustaleń z audytu, nie potwierdzenie opublikowania etykiet. Nie wykonano zmian runtime, nowego buildu ani wysłania do review. Manifest własnej aplikacji wymaga późniejszego uporządkowania zgodnie z rzeczywistymi przepływami, niezależnie od ręcznie edytowanej strony App Privacy.

## Źródła pierwotne

- [Definicje Apple i zakres danych zbieranych przez partnerów](https://developer.apple.com/app-store/app-privacy-details/).
- [Zapisywanie i publikowanie App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).
- [Oficjalna specyfikacja App Store Connect API](https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip).
- [Google Sign-In: dane i przybliżona lokalizacja z IP](https://developers.google.com/identity/sign-in/ios/app-privacy).
- [Manifest Google Sign-In](https://github.com/google/GoogleSignIn-iOS/blob/main/GoogleSignIn/Sources/Resources/PrivacyInfo.xcprivacy), dodatkowo odczytano manifest bezpośrednio z archiwum 148.
- [Zbieranie danych przez Firebase SDK](https://firebase.google.com/docs/ios/app-store-data-collection).
- [Instrukcja RevenueCat dla App Privacy](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy).
- [Apple: obrazy mogą zawierać metadane GPS](https://developer.apple.com/documentation/technologyoverviews/images-camera-and-photos).
