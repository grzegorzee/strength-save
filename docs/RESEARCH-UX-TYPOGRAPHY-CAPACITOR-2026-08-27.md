# Strength Save 1.0 — UX, typografia, personalizacja i fala Capacitor 6–13

Stan na 2026-08-27. Dokument planistyczny; nie jest zgodą na deploy ani publikację.
Wersje aplikacji pozostają `1.0.0`.

## Decyzja produktowa w skrócie

Do publicznego 1.0 nie dokładamy eksperymentów zależnych od działającego JavaScriptu
w tle. Najpierw chronimy draft, kolejkę synchronizacji, pełną listę planu i ścieżki
wyjścia z błędów. Z fali 6–13 sens mają:

1. `@capacitor/camera` — następna bezpieczna fala po blockerach release;
2. `@capacitor-firebase/crashlytics` — potrzebne przed skalowaniem, ale dopiero po
   zgodzie diagnostycznej, aktualizacji polityki prywatności i planie symbolikacji;
3. BLE oraz TTS — późniejsze, jawnie opt-in eksperymenty;
4. Motion rep-counting, wymuszony Text Zoom, Remote Config i wymiana własnego mostu
   Health — odrzucone w obecnym zakresie.

## Typografia i layout — stan po audycie

Root cause rozjazdu nie był jednym fontem, tylko kombinacją: fontów Google
ładowanych z sieci, innych metryk fallbacku offline, nieistniejących wag
`font-black`/`font-extrabold`, arbitralnych rozmiarów oraz breakpointu `md`, który
na telefonie 844×390 włączał desktopowy sidebar.

Wdrożone test-first:

- Inter Variable i Space Grotesk Variable są self-hosted przez Fontsource;
- bundle zawiera sześć potrzebnych WOFF2 (normal/italic oraz latin/latin-ext), bez
  zależności od Google Fonts;
- body/sans używa dokładnej osadzonej rodziny `Inter Variable`, heading używa
  `Space Grotesk Variable`; usunięto faux weights i faux italic z kluczowych ekranów;
- `html.lang` podąża za językiem aplikacji;
- desktop shell wymaga jednocześnie `min-width: 768px` i `min-height: 600px`, więc
  telefon w landscape zachowuje mobilną nawigację;
- pełny sweep wykazał 112 wystąpień 8–10,5 px w 53 plikach; wszystkie zostały
  podniesione test-first do minimum 11 px, a globalny kontrakt przeszedł z 74
  pozostałych naruszeń do zera;
- ekran Postępów nie tworzy drugiego `h1` pod globalnym nagłówkiem;
- test kontraktu: `src/test/typography-contract.test.tsx`; regresja komponentów:
  209 testów zielonych; build web i mobile zielony.

Pozostaje urządzeniowe QA: Dynamic Type / font scale 100%, 150%, 200%; iPhone SE,
iPhone 15, mały Android, tablet/foldable i landscape z klawiaturą. Układ ma się
przeformatować i scrollować, a nie ucinać tekst. Dlatego nie instalujemy Text Zoom
po to, żeby ignorować ustawienie dostępności użytkownika.

Migracja kodu została domknięta ekranowymi falami zamiast ryzykownej zmiany
globalnego tokenu. Pozostaje urządzeniowe QA reflow małego telefonu i font scale
200%; jego brak nie jest ukrywany wynikiem statycznego kontraktu.

Docelowa skala semantyczna:

- `display` / `title`: Space Grotesk Variable, wyłącznie nagłówki i wartości hero;
- `body` / `label`: Inter Variable, treść oraz tekst kontrolek;
- `micro`: minimum 11 px i tylko dla drugorzędnych metadanych, nigdy dla akcji,
  błędu, wartości serii ani instrukcji;
- `mono`: liczby, czas i krótkie identyfikatory; nie jako domyślna trzecia rodzina
  dla nazw sekcji.

Kolejność migracji: trening → Historia/Cykle → Plan → Profil → Analityka/Strava.
Każdy ekran dostaje najpierw czerwony test statyczny i screenshoty 320 px,
390×844, landscape oraz skale 100/150/200%. Dopiero po tej migracji pełny guard
ma skanować wszystkie pliki produkcyjne; obecny test pięciu plików nie jest
wystarczającym dowodem spójności.

## Kolory z avatara i palety

Funkcja była już częściowo obecna. Aktualny kontrakt realizuje personalizację
wyłącznie po jawnej decyzji użytkownika i nie nadpisuje wcześniejszego wyboru:

- Google: onboarding pokazuje osobne CTA „Dobierz kolory ze zdjęcia”; samo wejście
  na ekran ani samo wyświetlenie avatara nie uruchamia pobrania lub analizy;
- dopiero tap CTA pobiera obraz wyłącznie z zaufanego hosta
  `googleusercontent.com`, z limitem 5 MB i timeoutem, i pokazuje do trzech propozycji;
- analiza odbywa się lokalnie; zdjęcie nie jest zapisywane ani wysyłane do analizy;
- wynik avatara to maksymalnie trzy sugestie mapowane na istniejące, przetestowane
  **pojedyncze akcenty**; nie tworzy jeszcze palety `avatar-custom` trzech ról;
- propozycja nie staje się automatycznie akcentem i nie jest automatycznie zapisywana;
  kolor zmienia dopiero jawny tap swatcha, a wcześniejszy wybór nie jest nadpisywany;
- Apple/e-mail/brak zdjęcia: ten sam wybór wdrożonych presetów Pulse/Forge/Glacier;
  starsze 11 akcentów pozostaje za progresywnym ujawnieniem;
- wszystkie akcenty wybierają czarny albo biały foreground na podstawie wyższego
  kontrastu WCAG; swatche mają target 44×44.

Ryzyka przed release: polityka prywatności musi opisać lokalne przetwarzanie avatara
i źródło zdjęcia; potrzebne realne QA dla zdjęcia Google, braku zdjęcia, Apple,
offline, powolnej sieci, obrazu >5 MB i URL spoza allowlisty. Nie stosujemy
rozpoznawania skóry ani cech twarzy — kolor nie może kodować wrażliwych cech.

### Wdrożony model trzech presetów i osobna fala `avatar-custom`

1. Wdrożono wersjonowany `PaletteThemeV2` z rolami `primary`, `supportA`,
   `supportB` oraz osobnymi neutralami. Nie używać nazw `secondary/tertiary` jako
   zmiennych CSS, bo obecne `--secondary` jest neutralną powierzchnią. Statusy
   sukces/ostrzeżenie/błąd pozostają stałe semantycznie i nie są wyprowadzane ze
   zdjęcia.
2. Wdrożono trzy nazwane palety domyślne dostępne identycznie dla Google,
   Apple, e-mail i offline. Kolory poniżej są seedami, nie gotowymi kolorami każdej
   powierzchni; tonalne warianty dark/light generuje jedna deterministyczna funkcja:

   | ID / nazwa | `primary` | `supportA` | `supportB` | Charakter i zastosowanie |
   |---|---:|---:|---:|---|
   | `pulse` / Pulse | `#C6FF00` | `#22D3EE` | `#A78BFA` | domyślna, energetyczna Strength Save; główne CTA / dane treningu / personalizacja |
   | `forge` / Forge | `#FF6B35` | `#FBBF24` | `#FB7185` | ciepła i mocna; główne CTA / progres / personalizacja |
   | `glacier` / Glacier | `#38BDF8` | `#818CF8` | `#2DD4BF` | chłodna i spokojna; główne CTA / dane / personalizacja |

   Wszystkie dziewięć seedów ma dla czarnego tekstu kontrast co najmniej 7:1, a
   względem tła `#0A0A0A` co najmniej 6,6:1. To nie zwalnia z testowania finalnych
   par po wygenerowaniu tonów. `primary` steruje CTA, ringiem i zaznaczeniem;
   `supportA/B` mogą rozróżniać serie danych, ilustracje i dekoracyjne akcenty,
   ale nigdy same nie kodują błędu, sukcesu, wybranego stanu ani kolejności.
3. Dla Google po jawnym CTA można lokalnie wyznaczyć jedną czwartą propozycję:
   kwantyzacja całego obrazu bez wykrywania twarzy/skóry → odrzucenie pikseli
   niemal białych, niemal czarnych i o zbyt małej chromie → maksymalnie trzy różne
   seedy HCT → tonalne role `primary/supportA/supportB`. Jeżeli obraz daje jeden
   sensowny seed, pozostałe role generuje Material Color Utilities zamiast
   zgadywania z danych wrażliwych. Brak wyniku lub sieci pokazuje komunikat i
   pozostawia trzy gotowe palety.
4. Migracja jest addytywna: wszystkie 11 dotychczasowych akcentów i custom hex
   zachowują obecny wygląd, dopóki użytkownik sam nie wybierze nowej palety.
   Żaden onboarding ani cloud sync nie nadpisuje istniejącego wyboru.
5. Globalny cloud→local dla `preferences.accentColor` został naprawiony w X44:
   świeże urządzenie stosuje akcent przy hydratacji, bez wejścia w Profil i bez
   echo-write. Nowy obiekt palety musi użyć tego samego punktu synchronizacji.

### Kontrakt danych, migracji i prywatności palet

Docelowy zapis jest addytywny obok istniejącego `accentColor`:

```ts
type PaletteThemeV2 = {
  version: 2;
  id: 'pulse' | 'forge' | 'glacier' | 'avatar-custom' | 'legacy';
  source: 'preset' | 'avatar' | 'legacy';
  primary: string;
  supportA: string;
  supportB: string;
};
```

- `accentColor` pozostaje czytelny dla starego klienta i jest ustawiany na
  `palette.primary`; `paletteTheme` czyta dopiero klient obsługujący wersję 2.
- Brak `paletteTheme` oznacza `legacy`: aplikacja renderuje dokładnie dotychczasowy
  akcent, bez automatycznego dopasowania do najbliższej nowej palety.
- Zapis następuje dopiero po tapnięciu konkretnej palety i potwierdzeniu CTA.
  Podgląd nie mutuje Firestore; anulowanie przywraca poprzedni komplet tokenów.
- Do chmury trafiają wyłącznie trzy wartości sRGB, źródło i ID. Avatar, piksele,
  histogram, klastry i wynik pośredni pozostają w pamięci urządzenia i są usuwane
  po zamknięciu kroku.
- Google nie dostaje funkcji niedostępnej Apple/e-mail: każdy zawsze ma trzy presety;
  avatar jest tylko opcjonalną czwartą propozycją.

### Kryteria akceptacji fali palet

1. Test migracji każdego z 11 akcentów i custom hex dowodzi braku zmiany wyglądu
   po aktualizacji oraz poprawnego działania w starszym kliencie.
2. Testy każdej roli w dark/light/increased-contrast wymagają co najmniej 4,5:1
   dla zwykłego tekstu oraz 3:1 dla granicy, stanu i focusu. Nie zaokrąglać wyniku
   granicznego; 4,499 i 2,999 są porażką.
3. Stan kontrolki ma dodatkowo kształt, ikonę, obrys albo tekst; sam hue nie może
   oznaczać wyboru, progresu ani błędu.
4. Sekwencja: istniejący akcent → preview presetu → anuluj → restart offline
   zachowuje stary wygląd. Sekwencja: wybór → zapis → drugi klient → cold start
   stosuje kompletną paletę przed pierwszym ekranem.
5. Google: sukces, brak zdjęcia, timeout, offline, URL spoza allowlisty, MIME/limit
   oraz obraz bez użytecznych kolorów. Każda porażka ma komunikat i działające
   trzy presety; nie ma spinnera bez końca.
6. Apple/e-mail/offline: te same trzy presety, pełne PL/EN, VoiceOver/TalkBack,
   targety 44×44, 320 px, 390×844, landscape i font scale 100/150/200%.
7. Telemetria może rejestrować wyłącznie `palette_previewed/selected` z ID presetu
   lub `avatar-custom`; bez hexów, URL avatara, pikseli i identyfikacji cech zdjęcia.

Źródło modelu kolorów: [Material Color Utilities](https://github.com/material-foundation/material-color-utilities),
[Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color),
[WCAG — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum),
[WCAG — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
[WCAG — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Źródła: [Firebase User photoURL](https://firebase.google.com/docs/reference/js/auth.user),
[Google API User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
[WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[Apple Human Interface Guidelines — Color](https://developer.apple.com/design/human-interface-guidelines/color).

## Macierz pluginów 6–13

| Plugin | Obecne obejście / użycie | Zgodność i platformy | Zakres migracji i testy | Dane użytkownika | Decyzja / kolejność |
|---|---|---|---|---|---|
| `@capacitor/camera` 8.x | **wdrożony** adapter w zgłoszeniu błędu z `appRestoredResult`; zdjęcia sylwetki nadal używają file input + `PhotoCropDialog` | zgodny z Capacitor 8; native Camera/Photo Picker, web file input | utrzymać recovery/sanitizację w bug-report; osobno migrować źródło zdjęć sylwetki bez utraty własnego cropu | wysokie privacy zdjęć, bez zmiany Storage paths | bug-report gotowy automatycznie; sylwetka/awatar dopiero po device QA |
| `@capacitor/motion` 8.x | brak; timer działa na deadline + notyfikacji | foreground web/iOS/Android; wymaga permission na iOS | tylko opt-in PoC „telefon stabilnie leży”; kalibracja, bateria, fałszywe wykrycia; nigdy źródło prawdy treningu | surowe sensory tylko lokalnie | bench detector później; rep counting **odrzucone** |
| `@capacitor/text-zoom` 8.x | viewport blokuje pinch zoom, layout ma responsywne CSS | native steruje skalą tekstu w WebView | test reflow 100/150/200%, Dynamic Type i Android font scale | brak | **nie wymuszać 100%**; plugin zbędny do 1.0 |
| `@capacitor-community/text-to-speech` 8.0.2 | beep/haptyka/local notification; iOS ma sesję `.playback` | web SpeechSynthesis, iOS/Android TTS; `playback` może mówić w tle dopiero po wywołaniu | opt-in, język/voice/routing/Bluetooth/silent switch; cue z deadline po resume | tekst może ujawnić kg/reps otoczeniu | później; nie zastępuje systemowej notyfikacji, bo zawieszony JS nie wywoła `speak()` |
| `@capacitor-community/bluetooth-le` 8.x | HR z Garmin/Strava/Watch/Health; brak pasa BLE | zgodny z Capacitor 8, web ograniczony do Web Bluetooth | osobny foreground PoC: scan→consent→pair→reconnect→HR characteristic; Polar + Garmin HRM, permission denied, BT off | dane zdrowotne; explicit consent, zero domyślnego uploadu | duża funkcja po 1.0; bez background obietnic |
| `@capacitor-firebase/crashlytics` 8.x | własne `client_errors` widzą JS, nie crash natywny | 8.x wspiera Capacitor 8; tylko iOS/Android | collection domyślnie off, jawna zgoda, mapping anonimowego ID, dSYM i Android mapping upload, test crash w buildzie QA, delete/send unsent | diagnostyka może zawierać identyfikatory i stan aplikacji | **rekomendowane przed skalowaniem**, blocker: privacy/consent/symbolication; nie instalować pół-konfiguracji |
| `@capacitor-firebase/remote-config` 8.x | Firestore flags + build-time `VITE_FEATURE_*` | 8.x / native; Installation ID i sieć | wymaga ownership defaults, cache TTL, kill switch i testu stale/offline | nowy identyfikator/telemetria Firebase | odłożyć; obecny mechanizm wystarcza do 1.0 |
| Health Fitness / community health | własny `HealthSync` w Swift/Kotlin + Watch HealthKit | własny most ma zapis workoutów i odczyt wagi; oficjalny plugin nie daje dziś pełnego parity | migracja wymagałaby pełnych testów permissions, workout writes, dedupu i upgrade istniejących userów | najwyższe ryzyko zdrowotne | **zachować własny most Z118**; wrócić tylko przy udowodnionym koszcie utrzymania |

Oficjalne źródła: [Camera](https://capacitorjs.com/docs/apis/camera),
[Motion](https://capacitorjs.com/docs/apis/motion),
[Text Zoom](https://capacitorjs.com/docs/apis/text-zoom),
[TTS](https://github.com/capacitor-community/text-to-speech),
[Bluetooth LE](https://github.com/capacitor-community/bluetooth-le),
[Crashlytics](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/crashlytics),
[Remote Config](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/remote-config),
[Health Fitness](https://capacitorjs.com/docs/apis/health-fitness).

## Scenariusze urządzeniowe dla kolejnych fal

1. Camera: zdjęcie i galeria, cancel/denied/limited, obrót, low memory, process kill
   w pickerze, offline upload retry, restart i brak osieroconego pomiaru.
2. Motion: kieszeń/ławka/ruch między seriami, ekran zgaszony, false positive oraz
   60-minutowy wpływ na baterię — tylko jako sugestia UI.
3. TTS: PL/EN, brak voice packu, Bluetooth, muzyka/podcast, silent switch,
   foreground/background/resume i prywatny opt-out.
4. BLE: Polar/Garmin, revoke permission, BT off/on, rozłączenie w serii, force-kill,
   dwa urządzenia, brak zapisu surowego HR bez zgody.
5. Crashlytics: opt-out od pierwszego startu, opt-in zaczyna collection dopiero po
   restarcie, symbolikowany crash iOS/Android, usunięcie unsent reports.

## Copyright

W interfejsie „O aplikacji” należy pokazać lokalizowany zapis
`© 2026 Strength Save. Wszystkie prawa zastrzeżone.` / `All rights reserved.`.
To jest informacja produktowa, nie zastępuje prawidłowych danych właściciela praw
w regulaminie, polityce prywatności i metadanych sklepów. Przed publikacją dokumenty
muszą używać tej samej nazwy podmiotu; sama etykieta „Strength Save” nie rozstrzyga
własności prawnej.
