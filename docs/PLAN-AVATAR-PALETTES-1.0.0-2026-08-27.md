# Palety onboardingu i opcjonalna personalizacja z avatara

Data audytu: 2026-08-27  
Zakres: Strength Save 1.0.0 i pierwsza fala po wydaniu  
Status dokumentu: plan oparty na aktualnym kodzie i źródłach pierwotnych; nie jest
potwierdzeniem gotowości pełnej palety `avatar-custom`.

## Aktualizacja X68 — hardening 1.0 i bezpieczne źródło przyszłej propozycji

Trzy presety są teraz walidowane jako wartości kanoniczne po stronie klienta i
Firestore Rules: samo `id: pulse/forge/glacier` nie pozwala podstawić innych HEX.
iOS Privacy Manifest jawnie deklaruje zbierane, powiązane z użytkownikiem zdjęcia
i wideo do funkcjonalności aplikacji, bez trackingu. Dotyczy to istniejących
avatarów, zdjęć sylwetki i screenshotów zgłoszeń, niezależnie od odłożonego
`avatar-custom`.

Lokalny cache avatara przechowuje wyłącznie miniaturę JPEG 256×256 per UID w
`LibraryNoCloud`; fallback bez `createImageBitmap` również wykonuje resize i nie
zapisuje pełnego źródła jako data URL. W przyszłej fali generator ma analizować
ten istniejący lokalny `avatarSrc`, bez ponownego pobierania Google URL. CTA tylko
generuje kandydata; nie zmienia motywu i niczego nie zapisuje. Preview wymaga
wyboru karty, a zapis następuje dopiero przez „Dalej”/„Zastosuj”.

Do 1.0.0 nadal wchodzą wyłącznie Pulse, Forge i Glacier. Fizyczne QA kontrastu,
VoiceOver/TalkBack, 100/150/200%, landscape i cold start offline pozostaje bramką.

## Aktualizacja X66 — trzy role presetów są widoczne bez dokładania chaosu

Od 2026-08-28 `primary`, `supportA` i `supportB` zasilają trzy pierwsze serie
wykresów. Presety są więc realnie trzykolorowe, ale zakres jest celowo mały:
success, warning i error nie zmieniają znaczenia wraz z motywem, a ekrany nie
dostają dekoracyjnych kolorów bez funkcji. Dowolny ciemny HEX zachowuje wybrane
wypełnienie, lecz jego focus ring jest korygowany do minimum 3:1 na dark surface.

Nie zmienia to decyzji o avatarze. W 1.0.0 onboarding zachowuje trzy szybkie,
równorzędne presety dla Google, Apple, e-mail i offline. `avatar-custom` pozostaje
falą po wydaniu, dopóki nie ma bezpiecznego generatora pełnych trzech ról, jawnego
CTA, trwałego preference outboxa, aktualnej privacy i fizycznego QA obu platform.

## Aktualizacja X52 — zakres 1.0.0 zamknięty na prostym wariancie

Na podstawie audytu kodu, testów i źródeł pierwotnych CTA analizy avatara zostało
usunięte z onboardingu 1.0.0. Avatar nadal personalizuje powitanie, lecz nie jest
analizowany. Każdy użytkownik dostaje te same trzy gotowe motywy i opcjonalne
starsze kolory pod jawnym rozwinięciem.

Powód nie jest kosmetyczny. Obecny pipeline proponował pojedyncze akcenty zamiast
pełnego motywu, nie anulował natywnego pobrania po unmount, nie walidował końcowego
URL po redirect, dekodował obraz przed kontrolą kosztu pikseli, a zapis finalny
zbyt mocno polegał na localStorage. `supportA/supportB` nie mają też jeszcze
produkcyjnych konsumentów poza podglądem. Pokazywanie CTA zwiększałoby liczbę
decyzji i stanów błędu, nie dostarczając obiecanego efektu.

Kontrakt 1.0.0:

- Pulse, Forge i Glacier są pełnowartościowymi, równymi opcjami dla Google,
  Apple, e-mail i offline;
- zdjęcie nie uruchamia dodatkowego fetch/decode/analizy;
- UI mówi o „motywie” albo „kolorze aplikacji”, nie o działającej wszędzie
  trzykolorowej palecie;
- generowanie `avatar-custom` wraca dopiero po wykonaniu całej listy P0 z tego
  dokumentu i fizycznych testach iOS/Android.

## Decyzja w skrócie

1. **Do 1.0.0 wchodzą trzy gotowe palety: Pulse, Forge i Glacier**, o ile przejdą
   fizyczne QA iOS/Android. Są dostępne dla każdego niezależnie od sposobu
   logowania, działają offline i mają istniejący kontrakt danych V2.
2. **Pełna paleta trzech ról wyprowadzana z avatara nie powinna blokować ani
   rozszerzać 1.0.0.** Jest dodatkiem kosmetycznym obciążonym przetwarzaniem danych
   osobowych i dodatkowymi stanami sieciowymi. Rekomendacja: fala 1.1 po stabilnym
   wydaniu 1.0.0.
3. Historyczna funkcja Google proponowała po jawnym CTA do trzech **pojedynczych
   akcentów** i nie budowała `PaletteThemeV2` o `id: avatar-custom`. CTA jest
   wyłączone w 1.0.0; biblioteka ekstrakcji pozostaje niepodłączonym fundamentem
   badawczym dla późniejszej, osobno testowanej fali.
4. Avatar jest tylko opcjonalnym źródłem propozycji. Brak zdjęcia, Apple, e-mail,
   offline, timeout albo obraz bez użytecznych kolorów zawsze kończą się tym samym,
   pełnowartościowym wyborem trzech presetów. Nie pokazujemy błędu blokującego.
5. Nie analizujemy twarzy, skóry, wieku, płci ani innych cech. Nie używamy AI/ML,
   nie wysyłamy obrazu do zewnętrznego analizatora i nie zapisujemy pikseli,
   histogramów ani klastrów.

Ta decyzja realizuje nadrzędną zasadę produktu: onboarding ma pomóc szybko wejść
do pierwszego treningu, a nie wymuszać konfigurację wyglądu.

## Stan faktyczny w repozytorium

### Co już istnieje

| Obszar | Dowód w kodzie | Stan |
|---|---|---|
| Trzy presety | `src/lib/accent-theme.ts`: `PALETTE_THEMES` | Pulse `#c6ff00/#22d3ee/#a78bfa`, Forge `#ff6b35/#fbbf24/#fb7185`, Glacier `#38bdf8/#818cf8/#2dd4bf` |
| Model danych | `PaletteThemeV2` w `src/lib/accent-theme.ts` | `version`, `id`, `source`, `primary`, `supportA`, `supportB`; przewiduje `avatar-custom` |
| UI presetów | `src/components/PaletteThemePicker.tsx` | onboarding: zapis jednym tapnięciem; Profil: preview, anuluj, zatwierdź; radiogroup i obsługa klawiatury |
| Runtime | `applyPaletteTheme` | ustawia primary i mapuje supportA/B na serie wykresów; nie zmienia statusów success/warning/error |
| Cold start | `applyStoredAccent` i klucz `ss-palette-theme-v2` | cache jest czytany przed Reactem; `accentColor=primary` pozostaje fallbackiem starego klienta |
| Cross-device online | `PreferenceSync.tsx`, `Profile.tsx`, `Onboarding.tsx` | chmura stosuje pełną paletę; wybór zapisuje `preferences.paletteTheme` i `accentColor` |
| Walidacja klienta i Firestore | `isPaletteThemeV2`, `isValidPaletteTheme` | presety wymagają dokładnych kanonicznych ról; obiekt jest zamknięty, pary id/source kontrolowane |
| Brak analizy zdjęcia w 1.0.0 | `PlanWizard.tsx`, `onboarding-accent.test.tsx`, `plan-wizard-welcome.test.tsx` | avatar służy wyłącznie do powitania; CTA i wywołanie ekstrakcji nie istnieją w UI |
| Ochrona pobrania | `avatar-accent.ts`, `native-photo-fetch.ts` | HTTPS i host `googleusercontent.com`, MIME `image/*`, limit 5 MB, timeout 5 s; native przez `CapacitorHttp` |
| Lokalna analiza | `avatar-accent.ts` | canvas 24×24, grupowanie 12 sektorów hue, bez uploadu kopii obrazu |
| Brak automatu poza onboardingiem | `PreferenceSync.tsx` i `preference-sync-avatar-accent.test.tsx` | avatar nie jest wtórnie analizowany ani nie nadpisuje wyboru |
| Apple/no-photo fallback | `PlanWizard.tsx` | inicjał imienia/e-maila albo neutralna ikona; presety pozostają takie same |
| Privacy disclosure | privacy PL/EN 2.1 oraz `ios/App/App/PrivacyInfo.xcprivacy` | publiczna polityka opisuje lokalne przetwarzanie; iOS deklaruje `PhotosorVideos`, linked=true, tracking=false |

### Czego jeszcze brakuje

1. `deriveAccentCandidatesFromAvatar` zwraca identyfikatory istniejących
   pojedynczych akcentów. Nie zwraca kompletnego, zwalidowanego
   `PaletteThemeV2 { id: 'avatar-custom', source: 'avatar', ... }`.
2. `supportA` i `supportB` są konsumowane przez serie wykresów. Celowo nie sterują
   statusami ani neutralnymi powierzchniami; dalsze zastosowania wymagają osobnego
   dowodu czytelności, a nie dekoracyjnego mnożenia koloru.
3. Walidator V2 sprawdza format i różność HEX, ale nie sprawdza kontrastu ani
   bezpiecznych par na rzeczywistych powierzchniach i gradientach.
4. Testy ekstrakcji pokrywają czyste funkcje i błędy, lecz nie mają pełnego happy
   path `blob -> createImageBitmap -> canvas -> PaletteThemeV2` w WKWebView i
   Android WebView.
5. Brakuje testu Rules, który jawnie dopuszcza poprawne
   `avatar-custom/source=avatar` i odrzuca błędne pary dla tego ID.
6. Zapis motywu w Profilu przy braku sieci jest best-effort: UI/cache się zmienia,
   `updateDoc` może upaść, a nie istnieje trwała kolejka ponownego zapisu. Wybór
   może więc nie dotrzeć na drugie urządzenie.
7. Brakuje wersjonowania/rewizji ustawienia, które bezpiecznie rozstrzyga konflikt
   dwóch urządzeń bez nadpisania nowszego wyboru starym retry.
8. Komentarze i nazwa `shouldAutoDeriveAccent` są historyczne. Runtime już nie
   uruchamia automatu, ale pozostawione API/testy mogą zasugerować przyszłemu
   autorowi powrót do zachowania sprzecznego z aktualną decyzją.
9. Polityka prywatności 2.1 opisuje wysłanie jednego „identyfikatora koloru”. Przed
   zapisem `avatar-custom` musi mówić wprost o synchronizacji trzech wybranych
   wartości koloru i źródła palety; wymaga to ustalonego procesu wersjonowania
   dokumentu oraz weryfikacji wdrożonej strony, nie tylko pliku źródłowego.
10. Brakuje fizycznych testów: Google avatar na iOS i Androidzie, wolna sieć,
    suspend/kill podczas obliczeń, wznowienie, VoiceOver/TalkBack, skala fontu i
    cold start offline.

## Wnioski z oficjalnych źródeł

| Źródło pierwotne | Fakt istotny dla Strength Save | Decyzja |
|---|---|---|
| [Google OpenID Connect — `picture`](https://developers.google.com/identity/openid-connect/reference) | `picture` jest URL-em zdjęcia profilu i może się zmienić; nie jest stabilnym identyfikatorem | URL służy tylko do jednorazowego pobrania po CTA; nie zapisujemy go jako pochodzenia palety i nie używamy do identyfikacji |
| [Firebase — profile dostawców](https://firebase.google.com/docs/auth/web/manage-users) | `photoURL` jest częścią profilu dostawcy; Firebase ostrzega, że wartości profilu są treścią zewnętrzną | Walidujemy URL, protokół, host, MIME i rozmiar; niczego z URL nie renderujemy jako HTML |
| [Sign in with Apple — zakresy](https://developer.apple.com/documentation/AuthenticationServices/ASAuthorization/Scope) | Udokumentowane zakresy kontaktowe to `fullName` i `email`; nie ma zakresu zdjęcia | Brak zdjęcia Apple jest normalnym wariantem produktu, nie błędem ani uboższym onboardingiem |
| [Apple — dane z autoryzacji](https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple) | Dane inne niż e-mail nie są ponownie zwracane przy kolejnych autoryzacjach | Fallback nie może zależeć od ponownego pobrania profilu; inicjał i presety muszą być trwałe |
| [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) | Dostęp ma być minimalny, w kontekście i bez niespodzianek dla użytkownika | Osobne CTA i krótki opis celu; bez dodatkowego OAuth scope, bez ukrytej analizy i bez wtórnego wykorzystania |
| [Apple App Review Guidelines 5.1](https://developer.apple.com/app-store/review/guidelines/) | Wymagane są przejrzystość, minimalizacja, zgoda na zbieranie oraz możliwość wycofania; dane nie mogą być użyte do innego celu | Avatar nie jest wymagany, nie odblokowuje PRO ani treningu; wynik można zastąpić presetem i usunąć zmianą motywu |
| [RODO, art. 5 i 13](https://eur-lex.europa.eu/eli/reg/2016/679/oj) | Minimalizacja, ograniczenie celu i przejrzysta informacja o przetwarzaniu | W pamięci zostają tylko piksele potrzebne do obliczenia; do chmury trafia wyłącznie jawnie wybrany motyw |
| [WCAG 2.2 — kontrast tekstu](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) | Zwykły tekst wymaga 4,5:1, duży 3:1; wartości granicznych nie wolno zaokrąglać | Testujemy finalną parę foreground/background i pełny gradient; 4,499 jest porażką |
| [WCAG 2.2 — kontrast nietekstowy](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) | Kontrolki, granice i focus wymagają 3:1 względem sąsiedniego koloru | Ring, obrys i marker wyboru mają osobny test na każdej palecie |
| [WCAG 2.2 — użycie koloru](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) | Kolor nie może być jedynym nośnikiem stanu lub informacji | Wybrana paleta ma check, obrys, nazwę, `aria-checked`; statusy zachowują tekst/ikonę |
| [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) i [oficjalny proces ekstrakcji](https://github.com/material-foundation/material-color-utilities/blob/main/dev_guide/extracting_colors.md) | Oficjalny pipeline oferuje kwantyzację Celebi, scoring kolorów do motywów, HCT i tonalne role | Nie utrzymujemy własnej rosnącej heurystyki HSL jako docelowego generatora trzech ról; korzystamy z małego, przetestowanego podzbioru MCU |
| [Material — dynamic color scheme](https://github.com/material-foundation/material-color-utilities/blob/main/concepts/dynamic_color_scheme.md) | Jeden source color może deterministycznie wygenerować primary/secondary/tertiary i role kontrastowe | Gdy zdjęcie nie daje trzech sensownych klastrów, role uzupełnia schemat tonalny, a nie analiza cech osoby |
| [Android Palette API](https://developer.android.com/develop/ui/views/graphics/palette-colors) | Ekstrakcja prominentnych barw jest właściwa dla tła roboczego i wymaga fallbacku, bo profile mogą nie istnieć | Obliczenia nie blokują głównego wątku; zawsze istnieje preset i retry/wyjście |

To jest plan techniczno-produktowy, nie opinia prawna. Zmianę publicznej polityki
przed `avatar-custom` należy przejrzeć w ramach procesu legal release.

## Decyzja native-first

Oficjalny katalog pluginów Capacitor 8 nie zawiera pluginu do ekstrakcji palety z
obrazu. Nie ma uzasadnienia dla własnego mostu Swift/Kotlin tylko dla tej funkcji:

- istniejący `CapacitorHttp` z `@capacitor/core` rozwiązuje pobranie poza CORS
  WKWebView i działa przez natywny stos URLSession/OkHttp;
- `@capacitor/preferences` jest już zainstalowany i może przechować mały rekord
  oczekującej synchronizacji, ale cache motywu potrzebny przed Reactem nadal musi
  pozostać synchronicznie dostępny w localStorage;
- `@capacitor/camera` nie jest potrzebny do avatara dostawcy logowania. Dodanie
  wyboru nowego zdjęcia tylko dla generowania palety rozszerzyłoby permissions i
  privacy bez korzyści dla podstawowego flow;
- `appRestoredResult` nie dotyczy obecnego pobrania HTTP, bo nie otwieramy
  zewnętrznej aktywności. Jeżeli w przyszłości dopuścimy lokalne zdjęcie przez
  Camera, recovery po process death musi wejść do osobnej specyfikacji.

Dokumentacja odniesienia: [Capacitor APIs](https://capacitorjs.com/docs/apis),
[Capacitor HTTP](https://capacitorjs.com/docs/apis/http),
[Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences).

## Kontrakt produktu

### Widok 1.0.0

- Na pierwszym ekranie użytkownik widzi trzy małe, nazwane opcje: Pulse, Forge,
  Glacier. Domyślnie wybrany jest Pulse.
- Jedno tapnięcie wybiera preset. Nie wymagamy konfiguracji i nie dokładamy
  karuzeli, quizu osobowości, tekstu marketingowego ani automatycznej animacji.
- „Własne kolory” pozostają pod progressive disclosure i pokazują wyłącznie
  istniejące, lokalne akcenty. Nie ma CTA avatara, pobrania do analizy, spinnera
  ani nowego błędu kosmetycznego w krytycznej ścieżce onboardingu.
- Apple, e-mail, brak zdjęcia i offline nie pokazują pustego miejsca ani komunikatu
  o braku funkcji. Widzą te same trzy presety i opcję własnego koloru w Profilu.

### Niezmienniki

1. Onboarding, plan i trening nie zależą od zdjęcia ani od sieci potrzebnej do
   pobrania zdjęcia.
2. Samo zalogowanie, render avatara, wejście na krok lub resume nie inicjują
   analizy.
3. Wcześniejszy wybór użytkownika nigdy nie jest automatycznie nadpisywany.
4. Podgląd w Profilu nie zapisuje. Anulowanie, Back, unmount i kill przywracają
   ostatni potwierdzony motyw.
5. Kolory success, warning, destructive, stan synchronizacji oraz informacje
   zdrowotne nie są generowane z avatara.
6. Obraz i dane pośrednie nie trafiają do Firestore, Storage, telemetry, logów,
   e-maila, crash reports ani narzędzia analitycznego.
7. Każdy błąd ma `ponów` oraz działające presety; nie istnieje spinner bez końca.
8. Stary klient czytający tylko `accentColor` zachowuje czytelny wygląd.
9. Wybór widoczny w UI musi być kanonicznym stanem finalnego zapisu. localStorage
   jest cache, a nie źródłem prawdy dla payloadu chmurowego.
10. Motyw jednego użytkownika nie może pojawić się nawet na pierwszym renderze
    onboardingu innego UID na współdzielonym urządzeniu.

## Docelowy algorytm `avatar-custom`

### Wejście i bezpieczeństwo

1. Przyjmij wyłącznie lokalny `avatarSrc` przypisany do bieżącego UID. Cache
   avatara już waliduje zaufane źródło i tworzy miniaturę 256×256; generator nie
   pobiera ponownie URL dostawcy.
2. Uruchom analizę dopiero po CTA. Limit czasu całego pipeline: 5 s. Dodaj limit
   wymiarów/pikseli przed kosztownym dekodowaniem, aby mały skompresowany plik nie
   powodował nieproporcjonalnej alokacji.
3. Dekoduj miniaturę w pamięci i downsampluj do 128×128 zgodnie z pipeline'em MCU;
   mniejszy bufor dopiero po benchmarku. Nie zapisuj materiału pośredniego do
   Filesystem, Photos ani Storage.
4. Po wyniku lub błędzie zamknij bitmapę, anuluj request i zwolnij referencje do
   blobu/canvasu. Wyjście z kroku anuluje pracę i ignoruje spóźnioną odpowiedź.

### Ekstrakcja bez biometrii

1. Usuń piksele z alpha < 0,5 oraz skrajnie ciemne/jasne i bardzo niskiej chromy.
   Nie wykrywaj twarzy ani obszarów skóry; analizowany jest cały pomniejszony obraz.
2. Przekaż ARGB do `QuantizerCelebi.quantize`, następnie `Score.score` z Material
   Color Utilities. Wynik jest deterministyczny dla tych samych pikseli i wersji
   algorytmu.
3. Pierwszy poprawny wynik jest source color. Z niego `DynamicScheme`/HCT tworzy
   tonalne rodziny primary, secondary i tertiary. Nie wybieramy trzech surowych
   dominant tylko dlatego, że występują na zdjęciu: często byłyby zbyt podobne,
   zawierały kolor skóry/tła albo nie miały bezpiecznego kontrastu.
4. Z tonalnych rodzin wybierz trzy seedy ról Strength Save:
   `primary`, `supportA`, `supportB`. Tone dobiera deterministyczna funkcja do
   aktualnego dark UI, a nie ręczne stałe rozproszone po komponentach.
5. Role muszą mieć różne wartości, wystarczającą separację percepcyjną i spełniać
   testy kontrastu. Jeśli roli nie da się bezpiecznie dobrać, użyj odpowiadającej
   roli z Pulse zharmonizowanej z primary. Jeżeli primary także nie przechodzi,
   nie twórz `avatar-custom` i pokaż presety.
6. Wersja generatora jest częścią testowego fixture. Aktualizacja MCU nie może
   po cichu zmienić zapisanej palety; zapisujemy wynik HEX, nie przeliczamy go przy
   każdym starcie.

### Walidacja kontrastu

Każdy wygenerowany motyw przechodzi jeden wspólny walidator przed preview i przy
odczycie z cache/chmury:

- tekst zwykły i ikona znacząca: co najmniej 4,5:1;
- tekst duży: co najmniej 3:1;
- obrys kontrolki, focus, check i istotny wykres: co najmniej 3:1 względem
  bezpośrednio sąsiadującej powierzchni;
- CTA sprawdzane na obu końcach rzeczywistego gradientu oraz w stanie pressed;
- tekst primary na `background`, `surface-low`, `surface-container`, tintach `/10`
  i `/15` sprawdzany po kompozycji alfa;
- foreground to czarny albo biały o większym rzeczywistym kontraście; nie wybiera
  go próg „jasności na oko”;
- 4,499:1 i 2,999:1 są wynikiem negatywnym;
- wybór, błąd, sukces i serie danych mają obok koloru nazwę, ikonę, obrys,
  dash/pattern albo kształt.

Nie zmieniamy neutralnych powierzchni na podstawie zdjęcia w pierwszej wersji.
Ogranicza to zasięg regresji i utrzymuje branding Strength Save.

## Dane, zapis i recovery

### Zapis kanoniczny

```ts
type PaletteThemeV2 = {
  version: 2;
  id: 'pulse' | 'forge' | 'glacier' | 'avatar-custom' | 'legacy';
  source: 'preset' | 'avatar' | 'legacy';
  primary: `#${string}`;
  supportA: `#${string}`;
  supportB: `#${string}`;
};
```

- `preferences.paletteTheme` jest kanonicznym wyborem nowego klienta.
- `preferences.accentColor = paletteTheme.primary` jest kompatybilnym fallbackiem.
- Do serwera nie trafiają: avatar URL, provider UID, obraz, klaster, histogram,
  liczba wykrytych kolorów ani pełna lista kandydatów.
- `source: avatar` mówi wyłącznie, że użytkownik świadomie wybrał lokalnie
  wygenerowany motyw. Nie wolno z tego wnioskować cech osoby.

### Lokalnie i offline

1. Po jawnym wyborze zapisz pełny motyw w `ss-palette-theme-v2`, aby kolejny cold
   start offline nie mignął Pulse.
2. Obok cache zapisz minimalny, trwały outbox preferencji w
   `@capacitor/preferences`: motyw, `clientMutationId`, bazową rewizję i czas
   lokalny wyłącznie diagnostycznie. Nie przechowuj zdjęcia.
3. Online zapisuj atomowo `paletteTheme`, `accentColor`, serwerowy `updatedAt` i
   zwiększoną rewizję. Retry używa tego samego `clientMutationId`.
4. Przy konflikcie rewizji nowszy zapis chmurowy wygrywa; nie replayuj starego
   outboxa w nieskończoność. Pokaż lekką informację z akcją „Użyj tego motywu”,
   jeżeli użytkownik chce świadomie ponowić lokalny wybór.
5. `PreferenceSync` najpierw czyta cache dla pierwszego paintu, potem uzgadnia
   chmurę i outbox. Nie wykonuje echo-write wartości właśnie pobranej z chmury.
6. Uszkodzony cache, nieznana wersja lub motyw niespełniający walidatora spada do
   bezpiecznego `accentColor`, a następnie Pulse. Nie nadpisuje chmury automatycznie.

## Plan realizacji test-first

### Etap A — zamknięcie 1.0.0 bez rozszerzania funkcji

Cel: trzy uczciwe, proste presety; avatar nie może zwiększać ryzyka release.

1. Test copy: UI nie nazywa obecnych pojedynczych propozycji „pełną paletą”.
2. Test wykorzystania tokenów: supportA/B zasilają serie wykresów, a statusy
   pozostają stałe; copy nadal mówi prosto o kolorze/motywie.
3. Potwierdzić źródło i wdrożenie privacy 2.1 oraz zgodność z aktualnym jednym
   identyfikatorem koloru.
4. Fizycznie przetestować aktualne CTA Google. Jeżeli którykolwiek scenariusz
   krytyczny nie przejdzie, ukryć CTA w 1.0.0 bez usuwania presetów.
5. Nie dodawać zależności MCU i nie zmieniać modelu danych przed release.

Kryteria akceptacji:

- Pulse/Forge/Glacier działają na Google, Apple, e-mail, web, iOS, Android i offline;
- brak avatara nie zmienia wysokości ani kolejności onboardingu;
- onboarding można ukończyć bez otwierania sekcji kolorów;
- istniejące akcenty i custom hex zachowują wygląd;
- iOS/Android 320–430 px, landscape, font scale 100/150/200%, VoiceOver/TalkBack;
- brak requestu do avatara przed CTA potwierdzony testem i proxy/logiem urządzenia.

### Etap B — czysty generator trzech ról po 1.0.0

1. Czerwone testy fixture obrazu i kontrastu.
2. Dodać przypiętą wersję Material Color Utilities albo wydzielić wyłącznie
   oficjalne moduły quantize/score/HCT zgodnie z licencją Apache-2.0.
3. Zaimplementować `paletteThemeFromImageData(data): PaletteThemeV2 | null` jako
   czystą funkcję bez sieci i DOM.
4. Rozszerzyć loader o limit wymiarów oraz pełny happy path dekodowania.
5. Nie usuwać legacy `deriveAccent*`, dopóki migracja testów i UI nie jest gotowa;
   potem usunąć historyczne `shouldAutoDeriveAccent`, żeby automat nie wrócił.

Kryteria akceptacji:

- te same piksele i wersja generatora dają ten sam wynik;
- trzy role są różne, kontrastowe i nie zmieniają statusów;
- obraz monochromatyczny, przezroczysty, bardzo ciemny/jasny daje `null`;
- brak kodu wykrywania twarzy/skóry i brak requestu sieciowego w czystym module;
- bundle budget pozostaje zielony.

### Etap C — UI, zapis i cross-device

1. Czerwony test: CTA generuje kartę preview, ale niczego nie zapisuje.
2. Tap karty zapisuje `avatar-custom`; Back/anuluj/unmount zachowują poprzedni motyw.
3. Dodać trwały preference outbox i rewizję konfliktu.
4. Dodać walidację `avatar-custom` do klienta oraz jawne przypadki Rules.
5. Zaktualizować privacy PL/EN przed włączeniem: trzy wartości palety, lokalna
   analiza, brak dodatkowej kopii, cel, retencja w pamięci i sposób wycofania.

Kryteria akceptacji:

- wybór offline przeżywa kill i po sieci synchronizuje się dokładnie raz;
- drugi klient dostaje pełną paletę przed pierwszym ekranem;
- konflikt dwóch urządzeń nie odtwarza starego wyboru;
- stary klient widzi `primary`, nowy klient trzy role;
- wycofanie = wybór presetu/legacy i usunięcie `paletteTheme` tam, gdzie wymagane;
- żadna reguła ani telemetria nie przyjmuje pikseli/URL/histogramu.

### Etap D — rollout kontrolowany

1. Najpierw konta wewnętrzne i TestFlight/Play Internal.
2. Następnie mała kohorta przez istniejący, serwerowy feature entitlement; nie
   wprowadzamy Remote Config tylko dla tej funkcji.
3. Telemetria wyłącznie licznikowa:
   `avatar_palette_requested`, `generated`, `no_result`, `failed`, `selected`,
   `sync_conflict`. Bez HEX, URL, czasu zdjęcia, provider UID i treści błędu sieci.
4. Obserwować: ukończenie onboardingu, czas kroku, retry, crash/client_errors i
   odsetek powrotu do presetu. Nie optymalizować pod liczbę wyborów avatara.
5. Rollback to wyłączenie CTA. Zapisane `avatar-custom` nadal renderują się z
   zapisanych HEX; nigdy nie wymagają ponownego pobrania zdjęcia.

## Macierz testów automatycznych

| Warstwa | Test czerwony przed fixem | Oczekiwany dowód |
|---|---|---|
| Presety | dokładnie 3 ID i 9 seedów | brak przypadkowej zmiany design systemu |
| Algorytm | kolorowe, neutralne, transparentne, skrajne i zbliżone fixture | deterministyczny `avatar-custom` albo `null` |
| Kontrast | wszystkie role × powierzchnie × gradient × focus | 4,5:1 tekst, 3:1 UI bez zaokrągleń |
| Loader web | host, redirect, MIME, content-length, realny rozmiar, limit pikseli, timeout, abort | brak SSRF, nadmiernej alokacji i wiszącego stanu |
| Loader native | base64, nagłówki z różną wielkością liter, statusy HTTP, limit | cichy i ograniczony fail przez CapacitorHttp |
| PlanWizard | brak requestu przed CTA, preview bez zapisu, select, retry, late result po unmount | jawna akcja i brak race |
| Fallback | Apple, e-mail, brak photoURL, broken img, offline | trzy presety, brak pustego CTA |
| Stary przepływ | onboarding bez otwierania kolorów oraz replan bez avatara | brak regresji ukończenia planu |
| PreferenceSync | cold start, uszkodzony cache, cloud V2, legacy mismatch, outbox, konflikt | brak flasha, echo-write i utraty wyboru |
| Rules | valid preset, valid avatar-custom, zły source/id, extra keys, short HEX, duplikat | zamknięty kontrakt V2 |
| Privacy | parity wersji PL/EN i obecność wymaganych informacji | UI odsyła do wdrożonego dokumentu zgodnego z runtime |
| A11y | radiogroup, roving tabindex, check/ring/name, reduced motion | wybór nie zależy wyłącznie od hue |
| E2E | 320×667, 390×844, landscape; PL/EN; Chromium/WebKit | brak overflow, CTA nad klawiaturą, działający fallback |

Każda zmiana onboardingu zachowuje także obowiązkową sekwencję regresyjną projektu:
plan → wyjście → szybki trening → powrót do planu → zakończenie → synchronizacja.
Motyw nie może dotknąć źródła ćwiczeń, draftu ani kolejki treningu.

## Macierz testów urządzeniowych

### iOS

- Google login na świeżym koncie, avatar widoczny, brak requestu przed CTA;
- CTA przez `CapacitorHttp`, rzeczywisty decode/canvas w WKWebView;
- słaby internet, airplane mode, timeout i retry;
- zgaś ekran podczas pobrania, wróć po 10 s: brak blackoutu i spinnera;
- kill podczas preview i cold start offline: ostatni potwierdzony motyw;
- VoiceOver: nazwa palety, stan wybrania, CTA i komunikat fallbacku;
- Dynamic Type 100/150/200%, mały iPhone, landscape, Increase Contrast;
- drugie urządzenie/symulator: cloud → cache przed pierwszym paintem.

### Android

- Google login i natywny HTTP na realnym urządzeniu;
- Back podczas pobrania/preview oraz recreation po zmianie orientacji;
- background/foreground, force-stop i cold start offline;
- TalkBack, font scale 100/150/200%, Display Size, High Contrast Text;
- 48 dp efektywnego targetu pomimo wizualnego swatcha 44 px;
- konflikt dwóch urządzeń oraz retry preference outbox po odzyskaniu sieci.

### Web/PWA

- CORS, redirect, brak `createImageBitmap`, prywatny tryb i zablokowany storage;
- offline reload bez flasha i bez ponownej analizy;
- klawiatura: Tab, strzałki, Home/End, Enter/Space;
- zoom/reflow 200% i preferencja reduced motion.

## Blockery i warunki wydania

### Blockery dla trzech presetów w 1.0.0

- fizyczne QA iOS/Android kontrastu, safe area, font scale i cold start;
- fizyczne potwierdzenie czytelności trzech serii wykresów dla każdego presetu;
- potwierdzenie, że wybór presetów nie regresuje starego onboardingu i legacy.

### Blockery, jeżeli obecne CTA Google ma pozostać w 1.0.0

- urządzeniowy happy path realnego zdjęcia na iOS i Androidzie;
- suspend/kill/retry bez blackoutu i bez spinnera bez końca;
- weryfikacja wdrożonej privacy 2.1 oraz spójności PL/EN;
- jawny, lekki komunikat po `[]`, bo obecny cichy fail nie mówi, czy można ponowić;
- copy jasno ograniczone do propozycji pojedynczego koloru.

### Blockery pełnego `avatar-custom` po 1.0.0

- generator trzech ról, walidator finalnych par i testy fixture;
- wykorzystanie supportA/B bez naruszenia statusów i prostoty UI;
- trwały preference outbox oraz konflikt cross-device;
- Rules dla `avatar-custom`, nowa privacy disclosure i legal versioning;
- pełna macierz automatyczna, fizyczna i staged rollout.

## Definicja ukończenia

Funkcja `avatar-custom` jest ukończona dopiero, gdy dowód pokazuje jednocześnie:

1. użytkownik może zignorować personalizację i ukończyć onboarding bez dodatkowej
   decyzji;
2. analiza zaczyna się wyłącznie po świadomym CTA i niczego sama nie wybiera;
3. wygenerowane trzy role spełniają kontrast na rzeczywistych komponentach;
4. żadne dane obrazu ani dane pośrednie nie opuszczają urządzenia;
5. wybór przeżywa offline, suspend, kill, restart i bezpiecznie synchronizuje się
   między urządzeniami;
6. Apple/no-photo ma pełnowartościowy, identycznie prosty fallback;
7. stary klient, stary onboarding, Profil i krytyczna sekwencja treningu pozostają
   zielone;
8. publiczna polityka opisuje dokładnie runtime, a wersje PL/EN są zgodne;
9. rollback nie wymaga migracji danych ani ponownego pobrania avatara;
10. wszystkie bramki release są zielone na aktualnym artefakcie 1.0.0.

Do tego momentu trzy presety są produktem gotowym do domknięcia, a pełna paleta z
avatara pozostaje zaplanowaną falą, nie obietnicą release.

## Aktualizacja historyczna X49 — supersedowana przez X52/X66

- Pulse jest rzeczywistym domyślnym presetem świeżego onboardingu i zapisuje pełny
  `PaletteThemeV2`; wcześniejszy legacy lime pozostaje bezstratnie obsługiwany.
- Lokalny cache motywu jest przypisany do UID. Zmiana konta na tym samym urządzeniu
  czyści poprzedni cache, więc użytkownik B nie dziedziczy kolorów użytkownika A.
- Historyczne CTA dla zaufanego hosta Google zostało usunięte z 1.0.0 w X52.
  Apple, Google, e-mail i offline korzystają z tych samych trzech presetów.
- Analiza avatara nie jest wywoływana przez UI. Jej powrót wymaga pełnych etapów
  B–D, aktualnej privacy i fizycznego QA, a nie tylko odblokowania starego CTA.
- `supportA/supportB` od X66 zasilają serie wykresów; statusy pozostają stałe.
