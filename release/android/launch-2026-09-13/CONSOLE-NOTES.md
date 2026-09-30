# Google Play: pola do przygotowania premiery

Stan przygotowania: 13 września 2026. Poniższe instrukcje są materiałem do
formularzy. Nie stanowią potwierdzenia ich zapisania w Play Console.

## Strona sklepu

- Język domyślny: English (United States), `en-US`.
- Drugi język: Polish, `pl-PL`.
- Opisy: [metadata.json](metadata.json), aktualne funkcje Androida.
- Kategoria: Health & Fitness.
- Kontakt publiczny: `contact@strengthsave.app`.
- Pomoc: https://strengthsave.app/support
- Prywatność: https://strengthsave.app/privacy
- Usuwanie konta: https://strengthsave.app/delete-account
- Pobranie bezpłatne, subskrypcje w aplikacji. Uruchomienie treningu wymaga PRO.

Opisy mieszczą się w limitach Google: nazwa 30 znaków, krótki opis 80, pełny 4000.
PL: 29 / 79 / 2217; EN: 26 / 75 / 2193. Brak pola keywords odpowiadającego Apple.
Opis rozróżnia odczyt wagi od zapisu treningów w Health Connect. Nie obiecuje
aplikacji Wear OS ani sterowania Apple Watch z Androida.

**Zapisane o 18:36 CEST:** 8 natywnych screenshotów Androida po polsku i 8 po
angielsku oraz feature graphic 1024 × 500 dla obu języków. Pliki, kolejność i
SHA256 potwierdzone osobnym odczytem API. Źródło: Android WebView z fikcyjnymi
danymi, bez screenshotów Apple. [Gotowe materiały](assets/phone-final),
[pochodzenie zrzutów](ANDROID-CAPTURE.md).
Ikona [icon-512.png](assets/icon-512.png), 512 × 512, RGB8, 297272 B.

**Produkcja:** szkic 1.0.0 (54) zapisany. Ponowna próba przygotowania review
zwróciła `Only releases with status draft may be created on draft app.`
W panelu trzeba domknąć zadania pierwszej publikacji i dokończyć istniejący
szkic. Nie przesyłać nowego AAB, nie używać demonstracyjnego APK.

## Health apps

Ustalenia z `android/app/src/main/AndroidManifest.xml`, `HealthSyncPlugin.kt`
oraz `src/pages/Measurements.tsx`, sprawdzone 13.09.2026.

Funkcje do zadeklarowania: **Activity and fitness** oraz **Nutrition and weight
management** ze względu na pomiary i odczyt masy ciała. Ta druga kategoria nie
oznacza, że aplikacja tworzy diety. Pozostałych funkcji medycznych nie wywodzimy
z samego wykorzystania Health Connect.

`android.permission.health.WRITE_EXERCISE`, tekst uzasadnienia:

> Strength Save optionally saves a completed workout to Health Connect after the user enables this integration and grants permission. It writes the exercise type, start time and end time so the user can include their Strength Save workout in their activity history. The app does not request permission to read exercise sessions from Health Connect. Users can keep using the workout log without enabling this integration and can revoke access in Health Connect.

`android.permission.health.READ_WEIGHT`, tekst uzasadnienia:

> Strength Save optionally reads the user's most recent body weight from Health Connect. The app shows that value as a suggestion in Measurements, and the user confirms it before saving it to their Strength Save measurements. This avoids entering the same measurement twice. The app requests this permission when the user chooses the weight import feature, separately from workout export. It does not request permission to write body weight to Health Connect.

Polityka prywatności na stronie sklepu i w ekranie rationale musi pozostać
spójna. Zgoda systemowa, zgoda na dane zdrowotne w aplikacji i oświadczenie
wydawcy w Play Console to osobne elementy.

## App access

Aplikacja wymaga logowania. Właściciel wskazuje ograniczony dostęp i podaje
konto recenzenta z PRO. **13.09 o20:39 CEST potwierdzono logowanie Firebase,
zweryfikowany email, brak MFA oraz aktywny grant comp bez daty wygaśnięcia.**
Nie testowano ponownie logowania na fizycznym Androidzie ani zakupu.
Dane z prywatnego Apple App Review Information zapisano na prośbę właściciela
w lokalnym pęku kluczy macOS jako **Strength Save / Store Review**.
[Szybki dostęp i instrukcja](../../../docs/STORE-REVIEW-ACCESS.md).
Hasło przygotowano w schowku; formularz Google wkleja i zapisuje właściciel.

Proponowana instrukcja dla recenzenta:

> Sign in with the review email and password provided in the private access fields. This account has PRO access. Open the training plan, select a workout and start it. Enter a weight and repetitions, then check off a set. Complete the workout and review it in History. Health Connect is optional and requires a compatible Android device with Health Connect available. Workout export and body weight import request separate permissions. Declining these permissions does not prevent reviewing the workout log. Subscription purchases are managed by Google Play.

Przed zapisaniem upewnić się, że powyższy scenariusz odpowiada danym konta
recenzenta i nie wymaga kodu SMS, zaproszenia ani ręcznej aktywacji przez właściciela.

## Płatności i test ze sklepu

Plan zatwierdzony wcześniej w projekcie:

| Produkt | Polska | USA | Trial dla uprawnionego konta |
| --- | --- | --- | --- |
| `strengthsave_pro_monthly` | 14,99 PLN / miesiąc | 3,99 USD / miesiąc | 7 dni |
| `strengthsave_pro_yearly` | 119,99 PLN / rok | 31,99 USD / rok | 14 dni |

**Zapisane i potwierdzone przez API 13.09.2026:** oba produkty, plany i oferty
próbne są ACTIVE. RevenueCat ma oba produkty w `pro` i aktualnym `default`.
Właściciel utworzył profil płatności i potwierdził aktywny program opłaty 15%.
Nie trzeba ponownie tworzyć produktów ani profilu.

Pozostają RTDN oraz zakup testowy przez konto dodane jako License tester.
Sam Internal Testing nie zapewnia testowej metody płatności.
Sprawdzić zakup, odtworzenie dostępu, anulowanie, oczekiwanie na płatność i powrót
do aplikacji po jej potwierdzeniu. Nie wykonywać prawdziwego zakupu jako testu.

## Pozostałe formularze

- Data safety: osobny audyt Android SDK i backendu. Nie kopiować automatycznie
  etykiet Apple. Publiczne Android Publisher API udostępnia
  `applications.dataSafety` i przyjmuje CSV formularza. Aktualny szablon CSV
  pochodzi z Play Console. Formularz został przyjęty przez API o 18:16 CEST (HTTP204). Gotowy plik: `data-safety.csv`, uzasadnienia: `data-safety-audit.json`. Obejrzeć podgląd w konsoli, bo API nie udostępnia odczytu. E-mail/hasło i OAuth są zadeklarowane, oba linki usuwania prowadzą do https://strengthsave.app/delete-account.
- Content rating, grupa odbiorców, reklamy, deklaracje danych zdrowotnych:
  sprawdzić aktualne zadania App content w konsoli i odpowiedzieć na podstawie
  funkcji aplikacji. Obecnego stanu tych formularzy nie potwierdzono.
- Konto jest opisane w starszej dokumentacji jako firmowe. Wymóg 12 testerów
  przez 14 kolejnych dni dotyczy wskazanych przez Google nowych kont osobistych,
  więc nie stosujemy go automatycznie do tego projektu.
- Kraje, dostęp do produkcji i tryb publikacji: wymagają potwierdzenia w panelu.

## Źródła sprawdzone 13.09.2026

- [Pola strony sklepu i limity](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).
- [Publikacja aplikacji z Health Connect](https://developer.android.com/health-and-fitness/health-connect/publish).
- [Data safety i CSV](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- [Wymagania testów nowych kont osobistych](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
- [Przygotowanie do oceny](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
