# Plan redesignu: Profil (design 1a, profile-tab.dc.html)

> Fala 2, 2026-08-20. Obowiązuje wariant 1a (sekcja t1). Sekcja t2 odrzucona.
> Mockup pomarańczowy (#FF8B3D = --acc) mapuje się na TOKEN akcentu apki
> (paleta 11 + custom hex). Zero nowych hexów w kodzie ekranu, przechodzi
> `src/test/accent-hardcode-scan.test.ts` (strażnik limonki T24d).

## 1. Inwentarz funkcji do zachowania (40 pozycji)

Źródło: `src/pages/Profile.tsx` (stan po fali T1-T24). Każda pozycja ma
przypisane miejsce w nowym designie. Nic nie znika.

| # | Funkcja (dziś) | Miejsce w nowym designie |
|---|---|---|
| 1 | Avatar z photoURL / inicjałami | Identity row: avatar 64px (h-16 w-16) po lewej |
| 2 | Zmiana avatara (upload Storage, spinner, aria `profile.aria.changeAvatar`) | Plakietka "+" na avatarze (bg-primary, ikona Plus/Pencil, ta sama logika fileInputRef) |
| 3 | Edycja imienia: tap w imię otwiera dialog (testid `profile-name-edit`) | Identity row: imię (font-heading, 22px) klikalne, ten sam testid i dialog |
| 4 | Email pod imieniem | Identity row: pod imieniem, `text-muted-foreground`, truncate |
| 5 | Chip PRO (`chip-pro`, tylko hasProPlan) | Identity row: badge PRO obok licznika (restyle: bg-primary/15 text-primary, testid zostaje) |
| 6 | Chip poziomu (`chip-tier`, zawsze) | Identity row: obok PRO w rzędzie badge'ów (mono, outline jak dziś) |
| 7 | Pasek postępu poziomu (`tier-progress`, elite bez paska, tekst "Następny poziom: X") | Pasek pełnej szerokości pod identity (h-1.5, bg-surface-highest, wypełnienie bg-primary); tekst zastąpiony licznikiem "N do: {poziom}" w identity (patrz new feature 3); elite = pasek pełny lub ukryty jak dziś |
| 8 | Sekcja dumy: 3 najwyższe odznaki (AchievementBadge; 0 odznak = sekcja się nie renderuje) | Sekcja YOUR PRIDE: rząd odznak POD kaflami statystyk (ta sama logika recentBadges); przy 0 odznak tylko kafle |
| 9 | Link "Wszystkie" → /achievements | Nagłówek YOUR PRIDE: "Wszystkie" po prawej (text-primary) |
| 10 | Toggle "Timer przerwy" (Switch, localStorage per-device, `setWorkoutTimersEnabled`) | Karta PODCZAS TRENINGU: wiersz 1 (Switch po prawej) |
| 11 | Select "Domyślny czas odpoczynku" (REST_OPTIONS; tylko gdy timer włączony) | Karta PODCZAS TRENINGU: wartość "90 s" obok toggla (Select w chipie bg-surface-highest, jak mockup) |
| 12 | Toggle "Dźwięk timera" (ZAWSZE widoczny, reguła Z177) | Karta PODCZAS TRENINGU: wiersz 2 |
| 13 | Przełącznik jednostek kg/lbs (aria-pressed) | Karta PODCZAS TRENINGU: segment KG/LB (aktywny bg-primary text-primary-foreground, tło segmentu bg-surface-highest) |
| 14 | "Nie na 100%" + ReducedModeDialog (+ blokada gdy urlop) | Karta PODCZAS TRENINGU: wiersz 4 (wartość = data końca gdy aktywny) |
| 15 | "Urlop" + VacationDialog (+ blokada gdy rmode) | Karta PODCZAS TRENINGU: wiersz 5 |
| 16 | "Historia" → /history (etykieta exact, e2e) | Grupa DANE: wiersz 1 |
| 17 | "Pomiary ciała" → /measurements (e2e) | Grupa DANE: wiersz 2 |
| 18 | "Postępy" → /achievements (e2e) | Grupa DANE: wiersz 3 |
| 19 | PR backfill: wiersz + wartość "Ustawione" + dialog (`backfill-dialog`, 3 inputy, soft warn, czyszczenie pustą mapą) | Grupa DANE: wiersz 4 (wartość mono) |
| 20 | Wiersz stanu subskrypcji (planKey + opis activeFrom/renews/expires/grace/trialEnds/detailKey) | Grupa SUBSKRYPCJA: wiersz 1 (wartość mono w akcencie gdy PRO) |
| 21 | "Zarządzaj subskrypcją" → apps.apple.com (paywall platform + hasStoreSubscription) | Grupa SUBSKRYPCJA: wiersz 2 (warunkowy jak dziś) |
| 22 | "Przejdź na PRO" → /paywall (paywall platform + !isPro) | Grupa SUBSKRYPCJA: wiersz 3 (warunkowy; odpowiednik "Compare plans" z mockupu) |
| 23 | "Edytuj profil" (wiersz → ten sam dialog imienia) | Grupa KONTO I POMOC: wiersz "Imię i avatar" (mockup: Name & avatar) |
| 24 | "Zmień hasło" (dialog potwierdzenia → mail resetu; wymaga emaila) | Grupa KONTO I POMOC: wiersz 2 |
| 25 | "Prywatność" → /settings?section=data | Grupa DANE: wiersz "Prywatność i zgody" (mockup: Privacy & consents) |
| 26 | Swatche akcentu: paleta 11 (radiogroup, `accent-swatches`, `accent-{id}`, ring aktywnego) | Karta KOLOR AKCENTU: grid swatchy (11 szt., nie 6 jak mockup; funkcja nie znika) |
| 27 | Custom picker koloru (`accent-custom`, `accent-custom-input`, conic-gradient) | Karta KOLOR AKCENTU: 12. swatch w gridzie |
| 28 | Pole hex + Zastosuj (`accent-hex-input`, `accent-hex-apply`, walidacja #RRGGBB, disabled) | Karta KOLOR AKCENTU: rząd pod swatchami (input bg-surface-highest + przycisk Zastosuj), 1:1 jak mockup |
| 29 | Mirror akcentu do users/{uid}.preferences.accentColor + przyjęcie z profilu (cross-device) | Bez zmian (logika handleAccent/useEffect zostaje) |
| 30 | "Powiadomienia" + stan Włączone/Wyłączone (getPushPermission) → /settings?section=notifications | Grupa APLIKACJA: wiersz 1 (stan jako wartość mono) |
| 31 | "Język" (Select LANGUAGES + toast langSaved) | Grupa APLIKACJA: wiersz 2 (Select po prawej jak dziś) |
| 32 | "Centrum pomocy" → strengthsave.app | Grupa KONTO I POMOC: wiersz 3 |
| 33 | "Kontakt" → mailto kontakt@gjasionowicz.pl | Grupa KONTO I POMOC: wiersz 4 |
| 34 | "O aplikacji" → dialog (opis, wersja __APP_VERSION__, linki Terms/Privacy) | Grupa KONTO I POMOC: wiersz 5 (wartość = wersja, jak mockup "v2.14.0") |
| 35 | "Ustawienia zaawansowane" → /settings (etykieta exact, e2e) | Grupa DANE: wiersz przedostatni (mockup: Advanced settings w DATA) |
| 36 | "Admin" → /admin (tylko isAdmin, e2e) | Grupa DANE: ostatni wiersz (mockup nie ma; dodany do pasującej grupy zgodnie z zasadą) |
| 37 | Wyloguj: przycisk + dialog potwierdzenia (`logout-confirm`, spinner, blokada zamknięcia w trakcie) | Stopka: przycisk pełnej szerokości h-12 (neutralny bg-surface-high wg mockupu; dialog bez zmian) |
| 38 | Usuń konto: link tekstowy + dialog z przepisaniem USUŃ/DELETE + spinner | Stopka: tekstowy pod Wyloguj (jak mockup), dialog bez zmian |
| 39 | Persist preferencji: localStorage + users/{uid}.preferences (restTimerSec, timerSound, accentColor) | Bez zmian (persist/persistPreference zostają) |
| 40 | Licznik treningów z agregatu all-time (useWorkoutAggregate) + fallback okno recent; tier liczony z niego | Identity row ("N treningów") + kafel TRENINGI |

feature_inventory_count = 40.

## 2. Struktura nowego ekranu (sekcja po sekcji) + mapowanie stylów

Nagłówek strony (back + PROFIL) daje globalny `Layout`/`AppHeader` (profile nie
jest rootPath, więc strzałka wstecz JUŻ jest). Chip EDIT z mockupu POMIJAMY
(patrz new features). Ekran to `mx-auto max-w-xl` jak dziś, gap między
sekcjami ~14px (space-y-4 zamiast space-y-8).

Mapowanie neutralnych hexów mockupu na tokeny (`src/index.css` dark):

| Hex mockupu | Token / klasa |
|---|---|
| #0e0e0e (tło ekranu) | `bg-background` (strona już je ma; ekran bez własnego tła) |
| #131313 (grupy wierszy) | `bg-surface-low` |
| #1c1c1c (karty, kafle, przycisk Log out) | `bg-surface-high` (12.5%; najbliższy) |
| #262626 (chipy wewnętrzne: wartość timera, input hex, segment Units) | `bg-surface-highest` |
| #3a3833 (toggle off) | komponent `Switch` (shadcn) bez zmian |
| #f2f1ee (tekst główny) | `text-foreground` |
| #dedcd6 (tekst wtórny jasny, ikony) | `text-foreground/80` |
| #9a9892 (muted, mono labele) | `text-muted-foreground` |
| #767469 / #5c5a55 / #8a8880 (chevrony, stopka) | `text-muted-foreground/60` |
| var(--acc) | `bg-primary` / `text-primary` |
| accent 13-20% tła | `bg-primary/15`, `bg-primary/20` (reguła #8: tło zawsze z przezroczystością) |
| #141005 (tekst na akcencie) | `text-primary-foreground` (foreground per luminancja z accent-theme) |

Fonty: mockup Space Grotesk (display) = istniejące `font-heading`; Inter =
`font-body` (default); mono = tailwindowe `font-mono` (default ui-monospace
stack, już używane przy hex input). Fonty już ładowane w index.html, NICZEGO
nie dodajemy. Mono-labele sekcji: `font-mono text-[10px] font-semibold
uppercase tracking-[0.14em] text-muted-foreground` (nowy wzorzec labelki grup,
zamiast `text-label-md text-primary` z SectionCard).

### 2.1 Identity (zamiast wycentrowanego hero)

- Layout poziomy: `flex items-center gap-3.5`.
- Avatar `h-16 w-16` (komponent Avatar; fallback: `bg-primary/20 text-primary
  font-heading`), plakietka edycji `absolute -bottom-0.5 -right-0.5 h-6 w-6
  rounded-full bg-primary text-primary-foreground` (ikona Plus; spinner przy
  uploadzie). Funkcje #1, #2.
- Kolumna: imię (button `profile-name-edit`, `font-heading text-[22px]
  font-bold`), email (`text-xs text-muted-foreground truncate`), rząd:
  `ProfileHeaderChips` (chip-pro restyle na `bg-primary/15 text-primary`,
  chip-tier bez zmian) + tekst mono `{{count}} treningów · {{n}} do: {{next}}`
  (new feature 3; przy tier elite tylko licznik). Funkcje #3-#6, #40.
- Pod spodem pasek `tier-progress` pełnej szerokości (`h-1.5 rounded-full
  bg-surface-highest` + wypełnienie `bg-primary`). Funkcja #7.

### 2.2 YOUR PRIDE (nagłówek + 4 kafle + odznaki)

- Nagłówek: mono label `TWOJA DUMA` + po prawej button "Wszystkie"
  (`text-primary text-xs font-semibold`) → /achievements. Funkcja #9.
- 4 kafle `flex gap-2`, każdy `flex-1 rounded-2xl bg-surface-high p-3 text-center`:
  wartość `font-heading text-lg font-bold`, label `font-mono text-[8px]
  uppercase tracking-wide text-muted-foreground`. Kafel wyróżniony (STREAK,
  odpowiednik "24 PRS" z mockupu): `bg-primary/15 text-primary`.
  Dane (new feature 1, wszystkie realne):
  - TRENINGI: `aggregate.totals.workoutCount` (fallback: okno recent),
  - SERIA: `calculateStreakDetails` z `aggregate.completedDates` (pełna
    historia; fallback: completed z okna) — format "14 tyg.",
  - TONAŻ: `aggregate.totals.totalTonnageKg` przez `toDisplay`, format "596 t",
  - SERIE: `aggregate.totals.totalSets` (fallback: suma z okna).
  Kafla "PRs" z mockupu NIE wdrażamy (brak all-time PR w agregacie; okno
  recent kłamałoby przy długiej historii).
- Pod kaflami istniejący rząd `recentBadges` (3 AchievementBadge) gdy
  `length > 0` (funkcja #8). Kafle renderują się zawsze (zera są prawdziwe).

### 2.3 Karta PODCZAS TRENINGU

`rounded-[22px] bg-surface-high p-4` z mono labelem. Wiersze (SettingRow,
wariant compact): Timer przerwy (Switch) + wartość-Select "90 s"
(SelectTrigger `bg-surface-highest font-mono`, widoczny przy włączonym
timerze), Dźwięk (Switch), Jednostki (segment), Nie na 100%, Urlop.
Funkcje #10-#15. Dialogi ReducedModeDialog/VacationDialog bez zmian.

### 2.4 Karta KOLOR AKCENTU

`rounded-[22px] bg-surface-high p-4`, mono label. Grid swatchy: 11 z palety +
custom (12 elementów, `grid grid-cols-6 gap-2`, `aspect-square rounded-xl`;
aktywny: ring jak dziś `ring-2 ring-white ring-offset-2 ring-offset-background`).
Rząd hex: Input (`bg-surface-highest font-mono`) + Button "Zastosuj".
Wszystkie testidy zachowane (`accent-swatches`, `accent-{id}`, `accent-custom`,
`accent-custom-input`, `accent-hex-input`, `accent-hex-apply`). Funkcje #26-#29.
Swatche mają style={{backgroundColor: a.hex}} z palety (dozwolone: hexy idą
z accent-theme, nie z kodu ekranu; strażnik limonki przechodzi).

### 2.5 Grupy wierszy (mono label + kontener bg-surface-low rounded-[18px])

Wiersze: ikona 16px `text-muted-foreground` + label 13.5px + wartość mono
(`font-mono text-[10.5px]`, akcentowa `text-primary` dla statusów pozytywnych)
+ chevron `text-muted-foreground/60`. `min-h-[46px] px-3.5`.

1. **SUBSKRYPCJA**: stan planu (#20; wartość np. "PRO · do 2027" w
   `text-primary`), Zarządzaj subskrypcją (#21), Przejdź na PRO (#22).
2. **POŁĄCZENIA** (new feature 2): Strava (gdy `canUseStrava`; wartość
   "Połączono"/"Nie połączono" z `profile.stravaConnected` — dana już w
   UserContext, zero nowych odczytów), Garmin, Apple Health / Health Connect.
   Wszystkie → `/settings?section=connections` (nowa kotwica). Garmin i Health
   BEZ wartości statusu (status wymaga async native; minimalizm). Gdy grupa
   pusta (web bez Stravy), pokazujemy wiersze Garmin/Health i tak (deep-link
   do sekcji, która natywnie się renderuje) LUB chowamy grupę na web —
   decyzja przy implementacji: bezpieczniej pokazać zawsze (Settings i tak
   obsłuży brak natywności).
3. **DANE**: Historia (#16), Pomiary ciała (#17), Postępy (#18), PR backfill
   (#19), Kopia i import (nowy skrót → /settings?section=data; new feature 4),
   Prywatność i zgody (#25), Ustawienia zaawansowane (#35), Admin (#36,
   isAdmin).
4. **APLIKACJA**: Powiadomienia (#30), Język (#31).
5. **KONTO I POMOC**: Imię i avatar (#23), Zmień hasło (#24), Centrum pomocy
   (#32), Kontakt (#33), O aplikacji (#34, wartość = wersja).

### 2.6 Stopka

- Wyloguj: `h-12 w-full rounded-[14px] bg-surface-high` z ikoną LogOut,
  neutralny wg mockupu (rezygnacja z czerwonego outline; dialog potwierdzenia
  Z237 zostaje, testid `logout-confirm` zostaje). Funkcja #37.
- Usuń konto: tekstowy `text-muted-foreground` (hover destructive jak dziś),
  dialog bez zmian. Funkcja #38.
- Wersja: `font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground/60`
  "STRENGTH SAVE {__APP_VERSION__}" (new feature 5).

Wszystkie dialogi (reset hasła, logout, delete, about, edit, backfill, rmode,
vacation) zostają BEZ zmian logiki.

## 3. Lista zmian w plikach

| Plik | Zmiana |
|---|---|
| `src/pages/Profile.tsx` | Przebudowa layoutu wg sekcji 2.1-2.6; logika (handlery, dialogi, persist) bez zmian; dochodzi wyliczenie kafli z agregatu (streak z completedDates przez calculateStreakDetails lub lekki helper akceptujący daty) i remaining poziomu |
| `src/lib/tier.ts` | `computeTier`: dodać pole `remaining` (next.min - score; null przy elite) — zmiana addytywna |
| `src/lib/summary-utils.ts` LUB nowy helper | Wariant `calculateStreakDetails` przyjmujący `string[]` dat (agregat nie ma WorkoutSession[]); jeśli już istnieje ścieżka z completedDates (sprawdzić użycia w Dashboard), reużyć ją zamiast dodawać |
| `src/components/kinetic/SettingRow.tsx` | Addytywny prop (np. `compact` / `mono` wartość) — komponent używany też w WorkoutSettingsSheet, więc bez zmiany domyślnego wyglądu |
| `src/components/kinetic/ProfileHeaderChips.tsx` | Restyle chip-pro na `bg-primary/15 text-primary` (reguła #8); testidy bez zmian |
| `src/components/kinetic/SectionCard.tsx` | Bez zmian albo addytywny wariant `mono` labelki (jeśli reużywamy zamiast własnych kontenerów grup) |
| `src/pages/Settings.tsx` | Nowa kotwica `id="settings-connections"` wokół bloku HealthSettings/GarminSettings/Strava (mechanizm ?section= już istnieje) |
| `src/i18n/locales/pl.ts` + `en.ts` | Nowe klucze (sekcja 4); OBA pliki, inaczej typecheck padnie |
| `src/test/profile-sections.test.tsx` | Aktualizacja oczekiwanej listy nagłówków/grup + niezmiennik wierszy rozszerzony o nowe wiersze |
| `src/test/profile-pride.test.tsx` | Aktualizacja: kafle + odznaki (odznaki nadal renderowane przy earned>0) |
| `src/test/profile-header-chips.test.tsx` | Sprawdzić po restyle chipa (asercje klas, jeśli są) |

BEZ zmian: e2e (`accent-color.spec.ts`, `mobile-nav-reachability.spec.ts`)
przechodzą, bo testidy i dokładne etykiety zostają (sekcja 5).

## 4. Nowe klucze i18n (pl + en)

Reużywane istniejące: `profile.pride.all` (Wszystkie), `settings.backup.title`?
(nie: brzmi "Backup i przywracanie", dla wiersza lepszy krótki klucz),
`settings.strava.connected` (Połączono), wszystkie dotychczasowe `profile.*`.

| Klucz | PL | EN |
|---|---|---|
| `profile.identity.workouts` | `{count} treningów` | `{count} workouts` |
| `profile.identity.toNext` | `{n} do: {next}` | `{n} to {next}` |
| `profile.pride.tile.workouts` | `Treningi` | `Workouts` |
| `profile.pride.tile.streak` | `Seria` | `Streak` |
| `profile.pride.tile.streakValue` | `{n} tyg.` | `{n}w` |
| `profile.pride.tile.tonnage` | `Tonaż` | `Lifetime` |
| `profile.pride.tile.sets` | `Serie` | `Sets` |
| `profile.section.connections` | `Połączenia` | `Connections` |
| `profile.connections.notConnected` | `Nie połączono` | `Not connected` |
| `profile.connections.health` | `Apple Health / Health Connect` | `Apple Health / Health Connect` |
| `profile.data.backup` | `Kopia i import` | `Backup & import` |
| `profile.section.accountSupport` | `Konto i pomoc` | `Account & support` |
| `profile.footer.version` | `Strength Save {version}` | `Strength Save {version}` |

Uwagi: "Strava"/"Garmin" to nazwy własne (bez i18n). Etykiety, których
dotykają e2e, NIE zmieniają brzmienia: `Historia`, `Pomiary ciała`, `Postępy`,
`Ustawienia zaawansowane`, `Admin`. Etykieta wiersza konta zostaje
`profile.account.edit` ("Edytuj profil") albo dostaje nowy klucz
`profile.account.nameAvatar` ("Imię i avatar" / "Name & avatar") — wtedy
aktualizacja asercji w profile-sections.test.tsx (e2e tego wiersza nie używa).

## 5. Testy

### E2E: selektory, które MUSZĄ przeżyć (bez aktualizacji speców)

- `e2e/accent-color.spec.ts`: `/profile` + `accent-swatches`, `accent-sky`,
  `accent-lime`, `accent-hex-input`, `accent-hex-apply` → zachowane w karcie
  KOLOR AKCENTU.
- `e2e/mobile-nav-reachability.spec.ts`: role button, name exact: `Historia`,
  `Pomiary ciała`, `Postępy`, `Ustawienia zaawansowane`, `Admin` → wiersze
  w grupie DANE renderowane jako `<button>` (SettingRow z onClick już to
  robi), etykiety niezmienione.
- `e2e/ui-improvements.spec.ts`: dotyka nawigacji, nie ekranu — bez zmian.

### Vitest: do aktualizacji

- `profile-sections.test.tsx`: nowa oczekiwana lista nagłówków grup
  (Subskrypcja, Połączenia, Dane, Aplikacja, Konto i pomoc + karty Podczas
  treningu / Kolor akcentu); test niezmiennika "wszystkie dotychczasowe
  wiersze i akcje obecne" ROZSZERZONY (nie okrojony): wszystkie 40 pozycji
  inwentarza w asercjach po etykietach/testidach. Testy accent/hex/push/reset
  przechodzą bez zmian (testidy i logika te same).
- `profile-pride.test.tsx`: dochodzi asercja kafli (agregat mock → wartości);
  odznaki nadal widoczne przy earned>0; przy 0 odznak brak rzędu odznak, ale
  kafle są.
- `profile-header-chips.test.tsx`: ewentualna asercja klas chipa PRO.

### Nowe testy

- `profile-pride` (rozszerzenie): kafle liczą z agregatu, fallback na okno
  recent gdy aggregate=null (dokładnie dzisiejsza semantyka completedCount).
- `tier.ts`: `remaining` (score na progu, tuż przed progiem, elite=null).
- Niezmiennik akcentu: ekran na 3 akcentach (limonka/amber/sky) bez
  pozostałości — pokrywa istniejący strażnik `accent-hardcode-scan.test.ts`
  (zero nowych hexów w Profile.tsx poza już dozwolonym wpisem allowlisty dla
  wartości color pickera) + wizualna pętla weryfikacji z briefu.
- Test kotwicy: `/settings?section=connections` przewija do bloku połączeń
  (wzorzec istniejących testów Settings, jeśli są; inaczej sprawdzenie id w
  renderze).

### Niezmienniki (zasada #5 CLAUDE.md)

1. Każda z 40 pozycji inwentarza obecna po redesignie (test listy etykiet).
2. Zmiana akcentu z Profilu nadal ustawia tokeny + mirror Firestore.
3. Wiersze nawigacyjne to nadal role=button z exact name (e2e).
4. Żadnych danych zmyślonych: kafle wyłącznie z agregatu/okna, licznik "do
   poziomu" z computeTier.

## 6. Ryzyka i edge-case'y

- **Brak agregatu (aggregate=null, m.in. CAŁE e2e: `VITE_E2E_MODE` wyłącza
  useWorkoutAggregate)**: kafle liczą z okna recent jak dzisiejszy
  completedCount; streak z completed okna (może być krótszy niż realny —
  akceptowalne, dzisiejsza semantyka fallbacku). Zero treningów = kafle z
  zerami (prawda), nie chowamy.
- **Długie teksty**: email (truncate już jest), opis subskrypcji (multi-line
  description w SettingRow — zostaje wrap, nie truncate, bo niesie daty),
  długie imię (truncate + tap nadal działa), niemiecki/EN dłuższe etykiety
  wierszy: `min-w-0` + ellipsis na labelu, wartości mono `shrink-0`.
- **Wartości mono vs i18n dat**: "PRO · do 2027" buduje się z istniejącego
  subDescription; w wierszu wartość skracamy do planKey, a opis z datami
  zostaje jako description (nic nie ginie).
- **Offline**: persistPreference już ignoruje błąd (localStorage wystarcza);
  upload avatara offline → istniejący toast błędu; deep-linki do /settings
  działają lokalnie.
- **Elite tier**: brak next → bez tekstu "N do", pasek jak dziś (ukryty);
  licznik treningów zostaje.
- **Web bez paywalla**: grupa SUBSKRYPCJA = tylko wiersz stanu (jak dziś);
  grupa POŁĄCZENIA na web: Strava tylko przy canUseStrava, Garmin/Health
  wiersze prowadzą do Settings, gdzie natywne karty się nie renderują —
  rozważyć ukrycie Garmin/Health na web (Capacitor.isNativePlatform), żeby
  nie prowadzić w pustkę; decyzja na implementacji, preferencja: ukryć na web
  (nie jest to utrata funkcji, bo funkcji na web nie ma).
- **Strażnik limonki**: Profile.tsx jest na HEX_ALLOWLIST tylko dla wartości
  color pickera — nie dodawać żadnych innych hexów; wartości swatchy idą z
  ACCENTS (accent-theme).
- **SettingRow współdzielony** z WorkoutSettingsSheet: każda zmiana wyłącznie
  addytywna (nowe propsy z defaultami zachowującymi obecny wygląd).
- **Radix Dialogi**: żadnych unmountów w stanie open (pułapka builda 92) —
  dialogi zostają zamontowane jak dziś, redesign nie zmienia ich cyklu życia.
- **Kolory statusów**: wartości akcentowane tekstem `text-primary`, tła tylko
  z przezroczystością (reguła #8).
- **3 akcenty (bramka briefu)**: limonka default zdejmuje inline tokeny
  (applyAccent usuwa property) — sprawdzić kafel wyróżniony i chip PRO na
  limonce, amber i sky + custom ciemny (indigo/slate: foreground jasny).

## 7. Kolejność kroków implementacji

1. `tier.ts`: pole `remaining` + test (czysta funkcja, zero UI).
2. Helper streak z dat (lub reuse istniejącej ścieżki z Dashboardu) + test.
3. i18n: wszystkie nowe klucze do pl.ts i en.ts (typecheck zielony od razu).
4. `Settings.tsx`: kotwica `settings-connections` + test.
5. `ProfileHeaderChips`: restyle chipa PRO + test.
6. `SettingRow`: wariant compact/mono (addytywny) + sanity WorkoutSettingsSheet.
7. `Profile.tsx`: przebudowa sekcjami w kolejności ekranu (identity → pride →
   karty → grupy → stopka), po każdej sekcji `npm run test` na profile-*.
8. Aktualizacja `profile-sections.test.tsx` (nagłówki + niezmiennik 40
   pozycji) i `profile-pride.test.tsx`.
9. Bramki: `npm run test`, `npm run typecheck`, `npm run lint`,
   `npm run build`; e2e: accent-color + mobile-nav-reachability (świeży dev
   server, pkill vite przed biegiem — lekcja #9).
10. Pętla wizualna z briefu: screenshot e2e-mock viewport 390 vs mockup, na
    3 akcentach (limonka/amber/sky); iteracja do zgodności strukturalnej.
11. Wpis do DECYZJE.md.

## Nowe funkcje (elementy designu niebędące restylingiem)

1. **Kafle YOUR PRIDE (4 statystyki all-time)** — WDROŻYĆ MINIMALNIE:
   treningi/seria/tonaż/serie z agregatu X25 + fallback okna; kafel "PRs" z
   mockupu POMINĄĆ (brak all-time PR count; okno recent = dane niepełne).
2. **Grupa POŁĄCZENIA ze statusami w Profilu** — WDROŻYĆ MINIMALNIE:
   deep-linki do /settings?section=connections; status tylko Strava
   (profile.stravaConnected, dana już zmapowana); Garmin/Apple Health bez
   wartości statusu (wymagałyby async native calls).
3. **Licznik "N do następnego progu" przy identity ("18 TO GOLD")** — WDROŻYĆ
   MINIMALNIE: remaining z istniejącego systemu poziomów (computeTier), tekst
   "N do: {poziom}"; NIE odwoływać się do "gold" (odznaki mają inne progi).
4. **Wiersz "Kopia i import" w Profilu** — WDROŻYĆ: skrót do istniejącego
   backupu w Ustawieniach (?section=data), zero nowej logiki.
5. **Wersja aplikacji w stopce ekranu** — WDROŻYĆ: `__APP_VERSION__` już jest
   (About dialog zostaje).
6. **Chip EDIT w headerze** — POMINĄĆ: header jest globalny (AppHeader);
   edycja dostępna przez tap w imię i wiersz "Imię i avatar" (funkcja
   istnieje, mockup tylko dubluje wejście).
