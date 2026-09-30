# Data safety dla Androida 54

Formularz przyjęty przez publiczne API 13.09.2026 o 18:16 CEST, HTTP204.
Nie jest to potwierdzenie rozpoczęcia oceny aplikacji. API nie udostępnia
odczytu odpowiedzi, więc podgląd formularza należy sprawdzić w Play Console.

Źródła: kod klienta i backendu, raport zależności Android release54, oficjalne
instrukcje Google, Firebase, Play Integrity i RevenueCat. Nie kopiowano formularza iOS.

Wszystkie poniższe typy: **Collected**, bez deklarowanego Shared,
**not processed ephemerally**. Przekazanie procesorom i jawne eksporty zlecone
przez użytkownika korzystają z wyjątków Google od deklaracji Shared.

| Typ Google | Obowiązkowy | Cele |
| --- | --- | --- |
| Name | Nie | App functionality, Account management, Personalization, Advertising or marketing |
| Email address | Tak | App functionality, Account management, Developer communications, Advertising or marketing, Fraud prevention, security and compliance |
| User IDs | Tak | App functionality, Account management, Analytics, Fraud prevention, security and compliance, Advertising or marketing |
| Purchase history | Tak | App functionality, Analytics |
| Health info | Nie | App functionality, Personalization |
| Fitness info | Tak | App functionality, Personalization |
| Photos | Nie | App functionality, Account management |
| Precise location, patrz zastrzeżenie niżej | Nie | App functionality |
| Emails | Nie | App functionality, Developer communications |
| Other user-generated content | Nie | App functionality |
| App interactions | Tak | Analytics, Advertising or marketing |
| Crash logs | Tak | Analytics |
| Diagnostics | Tak | Analytics, App functionality, Fraud prevention, security and compliance |
| Device or other IDs | Tak | App functionality, Developer communications, Fraud prevention, security and compliance |

Dane są szyfrowane podczas przesyłania. Metody konta: email i hasło oraz OAuth.
Usuwanie konta i danych: https://strengthsave.app/delete-account.
Nie zadeklarowano audytu MASA ani programu Families, bo nie mamy takiej podstawy.

## Awatar i dane lokalizacji

Pole Precise location jest konserwatywnym wnioskiem z `src/pages/Profile.tsx:257`:
plik awatara trafia do Storage jako oryginalny File, bez usuwania metadanych.
Plik dostarczony przez użytkownika może zawierać EXIF GPS. Nie stwierdzono GPS
w rzeczywistych zdjęciach użytkowników i nie przeglądano ich. Android nie żąda
uprawnień do geolokalizacji i aplikacja nie śledzi położenia telefonu. Niektóre
źródła Android Photo Picker mogą usuwać GPS, ale kod nie gwarantuje tego dla
każdego pliku. Po wdrożeniu sanitizacji awatara można ponownie ocenić tę kategorię.
Nie zmieniano uploadu awatara w tej sesji, ponieważ wymagałoby to osobnej poprawki
i nowego przetestowanego builda.

Approximate location nie zostało zadeklarowane automatycznie na podstawie IP:
w znalezionym kodzie IP służy bezpieczeństwu i rejestrowi zdarzeń, nie wyznaczaniu
lokalizacji. RevenueCat deklaruje tylko locale/currency. Telefon nie jest zbierany
przez logowanie, brak SMS MFA. Nie włączono zbierania identyfikatora reklamowego.

Health oznacza opcjonalne pomiary ciała. Fitness obejmuje podstawowy dziennik
treningowy. Google Diagnostics obejmuje również dane techniczne, dlatego nie
przenoszono osobnego pola Apple Performance Data wprost do formularza Google.

## Dowody

- [CSV do importu](data-safety.csv).
- [Przyjęcie przez API](data-safety-delivery.json).
- [Szczegółowy audyt i źródła](data-safety-audit.json).
- [Google: zasady deklaracji](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- [Firebase Android](https://firebase.google.com/docs/android/play-data-disclosure).
- [RevenueCat](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety).
- [Play Integrity](https://developer.android.com/google/play/integrity/terms).
