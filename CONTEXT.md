# strength_save (FitTracker) — kontekst

> **Cel pliku:** Pełny kontekst projektu dla każdego AI assistanta. Czytany automatycznie gdy user wspomni projekt.
> **Ostatnia aktualizacja:** 2026-07-19 (X14A wdrożone, trwa autonomiczne X14-X16)
> **Status pliku:** uzupełniony z `dane/projekty-status.md` + plików projektu

---

## 🎯 1-LINIJKOWE PODSUMOWANIE

Multi-user aplikacja PWA (React + Firebase + Strava) do śledzenia treningów siłowych z planami (gotowe szablony + własne), Strava i analityką, live na GitHub Pages, v6.9.4.

---

## 📋 PODSTAWY

| Pole | Wartość |
|------|---------|
| **Status** | aktywny (v6.9.4) |
| **Owner** | Grzegorz |
| **Klient** | brak (własny projekt) |
| **Data startu** | Styczeń 2026 |
| **Deadline** | brak |
| **Priorytet** | średni |
| **Faza** | maintain / launch (kolejne wersje) |

---

## 🛠️ STACK & NARZĘDZIA

- **Stack technologiczny:** React + Firebase + Strava API + TypeScript + Vite + Tailwind + shadcn/ui (`components.json`)
- **Hosting:** GitHub Pages + Firebase (fittracker-workouts)
- **Domena:** https://grzegorzee.github.io/strength-save/
- **Repo:** https://github.com/grzegorzee/strength-save
- **Główne narzędzia AI:** Claude Code (rozwój), Claude API (AI plany)
- **Skille FIRMA używane:** [TO FILL — uzupełnij ręcznie]
- **MCP servery:** [TO FILL — uzupełnij ręcznie]

---

## 💰 BIZNES

- **Model przychodu:** [TO FILL — uzupełnij ręcznie — prawdopodobnie freemium/subscription]
- **Cena:** [TO FILL — uzupełnij ręcznie]
- **Liczba klientów / leadów / userów:** [TO FILL — uzupełnij ręcznie — minimum admin: g.jasionowicz@gmail.com]
- **MRR / wartość:** [TO FILL — uzupełnij ręcznie]
- **KPI:** retention, liczba zalogowanych treningów / user / tydzień

---

## 🎬 CO ROBIMY TERAZ

**Current task:**
- [ ] Backlog z `PLAN.md`
- [ ] Plan na rok 2026 (`plan-2026_-wersja-polska-detaliczna.html`)

**Hot files (najczęściej edytowane):**
- `PLAN.md`
- `DECYZJE.md`
- `DOCUMENTATION.md`
- `api.md`
- `firestore.rules`
- `src/`

**Ostatnia sesja (kiedy/co zrobione):**
2026-07-17: plany X12 (Z86-Z93), backlog P0/M19/M20/web-push/Android oraz plany X13 (Z94-Z102) wykonane i wdrożone. X12A: root cause wskrzeszonego planu (repeatPlanSource: dni zawsze z bieżącego planu, nie ze stale snapshotu cyklu; oferta przedłużenia czeka na isLoaded planu i cykli), local-wins konfliktu rewizji treningu (bez dialogu, limit 2 auto-resolve na sesję zapisu), "Kontynuuj trening" dla każdego nieukończonego dzisiejszego szkicu. Release: web index-D6h0uwMg + iOS build 52 na TestFlight (VALID, grupa Wewnętrzni). Po drodze: wygasła umowa Apple (REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED) zaakceptowana przez usera. X12B: Adaptive Coach usunięty (zostaje coach serii i metryki RPE), mobile bez hamburgera (dojścia: bottom nav + "Twoje dane" w Profilu), narzędzia naprawcze za isAdmin, wersja 1.0.0 zamrożona do launchu; release web index-OvoGHMd8 + iOS build 1.0.0 (53) TestFlight VALID. X12C: karta "Miesiące" w Analityce (treningi, czas z jawnym brakiem pomiaru sprzed M32, tonaż; agregacja monthly-stats.ts); release web index-C7jDc1gn + iOS build 1.0.0 (54) TestFlight. Backlog ustawiony: P0 walidacja onSnapshot, M19 offline, M20 PDF, web push, Android.

---

## 🧭 OSTATNIE DECYZJE (TOP 5)

1. **X17B WDROŻONY — kalkulator talerzy v2 (Z132-Z134)** (2026-07-20): odpowiedź na zarzut usera, że w kalkulatorze nie da się zmienić wagi (miał na sztywno 60 kg z serii). Waga jest teraz STANEM arkusza (pole + steppery 1,25/2,5/5), a przycisk Ustaw w serii przepisuje wynik z powrotem do treningu — wcześniej kalkulator był ślepą uliczką. suggestAchievable zamiast samego exact:false: wariant w DÓŁ i w GÓRĘ, oba klikalne, plus wskazanie brakującego nominału. Tryb bez gryfu (maszyna/hantle: cała waga na jedną stronę, sztuki nieparowane). Preset imperialny trzymany w KG kanonicznie (45 lb przez lbsToKg). loadPlateInventory przestaje odrzucać gryf spoza presetów (0-100 kg, w tym 0). Ustawienia sprzętu z toggli mam/nie mam na liczbę sztuk per rozmiar + własne talerze + własny gryf + preset jednostki. Generator rozgrzewki zaokrągla do REALNIE składalnych ciężarów (na siłowni z samymi dwudziestkami proponował 84 kg) z deduplikacją. Chip Talerze widoczny zanim user wpisze ciężar. Web na gh-pages + iOS build 70 VALID/APPROVED. **LEKCJA:** pierwsza wersja testów zaokrąglania przeszła BEZ zmiany kodu (asercje za słabe) — dopiero sprawdzenie składalności przez computePlates dało czerwień; test regresji trzeba weryfikować w obie strony.
2. **X17A WDROŻONY — karta ćwiczenia v2 (Z128-Z131)** (2026-07-20): odpowiedź na zgłoszenie usera z treningu, że ekran treningu jest nieczytelny. Rozgrzewka wciągnięta do wspólnej tabeli serii (nagłówki kolumn PIERWSZE, zamiast osobnej sekcji spychającej serie pod zgięcie), ukończona seria z wypełnionym tłem, miniatura tylko przy realnej animacji (mapa ANIMATION_FILES jest pusta, więc pusty kwadrat 92×72 pokazywał się przy KAŻDYM ćwiczeniu), instrukcje i rzadkie akcje zebrane w menu `⋯` (instrukcje/zamień/pomiń/notatka/przypnij), „Dodaj serię" pełną szerokością pod ostatnią serią z podanym powodem przy limicie 10, kolumna POPRZ. z realnej historii w formacie „60×6" + „pierwszy raz" zamiast myślnika, potwierdzenie usunięcia serii z danymi, zwarty nagłówek sesji Czas/Objętość/Serie (sessionStats jako czysta funkcja). Efekt na iPhone 17: nad zgięciem mieści się cała karta zamiast 2 serii roboczych. Web na gh-pages + iOS build 69 VALID/APPROVED. Kontrakt memo() nienaruszony (handleRequestSwap jako useCallback z exerciseId). **ODŁOŻONE:** powrót do treningu z planu po szybkim treningu pokazuje sesję jako niewznowioną — dane w szkicu są całe (7 ćwiczeń + seria 62,5×7), bisekt na a605a081 potwierdza zachowanie sprzed X17A; priorytet wysoki w backlogu v2.
3. **X16 DOMKNIĘTY w zakresie wykonalnym (Z119-Z127) — koniec maratonu X14-X16** (2026-07-20): X16A progresja programowa v1 (silnik celów tygodniowych + deload z decyzją usera + raport target vs actual; web index-BP5paMV1, iOS 65 APPROVED). X16B Apple Watch v1 (cel+notatka na zegarku, i18n PL/EN, wskaźnik sync, dedup Health przez hkSession; iOS 66 APPROVED; web index-CtB1XlVp). X16C: backend Garmin NA PRODZIE (parowanie kodem — w Firestore tylko hashe; garminDay kompakt <8KB; garminIngest idempotentny z guardem jednoczesności; sekcja Ustawień; iOS 67) + kompletne źródła apki Connect IQ w `garmin/` NIEZBUDOWANE (SDK wymaga logowania kontem Garmin = KROK USERA, garmin/README.md). Po drodze FIX SYSTEMOWY signingu iOS (patrz punkt 2). Raport całości maratonu: DECYZJE.md 2026-07-20.
4. **X15 KOMPLETNY (Z116-Z118) + X16A w toku (Z119-Z120 wdrożone w buildzie 64)** (2026-07-20): X15C: Apple Health przez WŁASNY plugin Swift (HKWorkoutBuilder; ekosystemowe pluginy nie zapisują workoutów) + Health Connect na Androidzie (Kotlin, minSdk 24->26), ustawienia "Zdrowie" tylko natywnie, propozycja wagi z Health w Pomiarach; web index-Y_2d8C3i, iOS build 64 (VALID, obie grupy, Beta App Review APPROVED), AAB release-ready. INCYDENT->FIX SYSTEMOWY: pipeline iOS podpisywał archive dopiero przy eksporcie -> binarki 47-63 z minimalnymi entitlements (martwe Sign in with Apple, push); teraz manual signing w Release configach 3 targetów + profile watch/widgets (scripts/watch_signing.py). X16A: konfiguracja progresji w planie (Z119, sekcja w PlanEditorze, DEFAULT_PROGRESSION dla nowych planów z kreatora) + silnik celów tygodniowych (Z120, computeWeeklyTargets: double progression / plateau / ból / deload-week; badge "Cel tygodnia" + pre-fill z celu w treningu; wspólna decyzja decideNextSet z coachem serii). KROKI USERA: test Sign in with Apple + push + pętli Health na fizycznym iPhone (build 64), App Privacy kategoria Health w ASC.
5. **X14 KOMPLETNY + X15A+B WDROŻONE (Z103-Z115)** (2026-07-19): X15B: obciążenie hybrydowe (sTRIMP siły + TRIMP cardio na jednej osi, karta w Analytics, pasek tygodnia na Dashboardzie, wskazówki interferencji nogi/cardio; web index-E0HlxZjB + iOS build 63). X15A: ręczne cardio bez Stravy (manual_activities, AddCardioDialog na Dashboardzie i w kalendarzu, unified useActivities, TRIMP z intensywnością odczuwaną; web index-CyMOYXXe + iOS build 62). X14C: import CSV Strong/Hevy (parser kliencki, wizard z podglądem i cofaniem po importBatchId, idempotencja po hashu pliku; web index-OskchBvM + iOS build 61). X14B: typy śledzenia serii (czas/dystans/asysta) z poprawnym PR dla asysty (obciążenie efektywne = masa ciała minus odciążenie, wyróżnik vs cała kategoria), tonaż per typ, kalkulator talerzy (localStorage inwentarz) i generator rozgrzewki %1RM; web index-DwKIaJCS + rules (custom_exercises.tracking) + iOS build 60. X14A: przypięte notatki per ćwiczenie (kolekcja `exercise_notes`, klucz = kanoniczna nazwa przez slugifyExercise, zamknięty schemat rules, hook useExerciseNotes, sekcja PinnedNoteSection w karcie ćwiczenia i ExerciseDetail) + szybki trening bez planu (przycisk na Dashboardzie, syntetyczny dzień `adhoc-<data>-<ts>`, dodawanie ćwiczeń w locie wspólnym ExercisePickerem, fix hydracji: pusty żywy draft ad-hoc nie resetuje sesji). Web index-CNXBdODL + rules na prod + iOS build 1.0.0 (59). Start autonomicznego wykonania X14-X16 wg docs/PROMPT-WDROZENIE-X14-X16.md.
6. **Plany X13 (Z94-Z102) WYKONANE i WDROŻONE** (2026-07-17): telemetria produktowa (liczniki sesji/ekranów/akcji w app_telemetry_daily, rollup nocny do users.activitySummary, TTL 180 dni), panel admina 2.0 (lista userów z aktywnością 7/30, szczegół usera z wykresem 30 dni i top ekranami/akcjami), zdalne naprawy kont przez callable adminUserRepair (dry-run -> backup admin_repair_backups TTL 90 dni -> apply -> audyt) + dziennik admin_audit_log (create-only, TTL 365 dni, wpięty we wszystkie akcje admina). Weryfikacja napraw na emulatorze (merge cykli + dedupe + backup + audyt). Web index-CA0PCweX + iOS buildy 1.0.0 (56-58). Wcześniej tego dnia: P0 walidacja hydracji Firestore, M19 offline (bramka check:dist-offline), M20 raport PDF, web push w kodzie (czeka na klucz VAPID), Android release-ready (podpisany AAB).
7. **Plan X12C (Z92-Z93) WYKONANY i WDROŻONY** (2026-07-17): statystyki miesięczne dla każdego usera — czysta agregacja `monthly-stats.ts` (miesiąc z pola date w czasie lokalnym, tylko completed; czas durationSec + fallback ze znaczników, treningi sprzed M32 z jawnym dopiskiem "bez zmierzonego czasu", tonaż istniejącym calculateTonnage) + karta "Miesiące" na górze Podsumowania Analityki (12 miesięcy wstecz, bez gate'ów). Web index-C7jDc1gn + iOS build 1.0.0 (54) TestFlight.

**Pełna historia:** `DECYZJE.md` (25.2K — bogata historia)

---

## 📝 TODO (TOP 10)

### Pilne
- [ ] Realizacja backlog v6.x → v7.0
- [ ] [TO FILL — uzupełnij ręcznie]

### Backlog
- [ ] Plan 2026 (`plan-2026_-wersja-polska-detaliczna.html`)
- [ ] E2E testy (`e2e/` + `test-results/`)
- [ ] Coverage poprawa

**Pełny backlog:** `PLAN.md`

---

## 🚧 BLOKERY / RYZYKA

- **Ryzyko:** Strava API rate limits — mitygacja: caching
- **Ryzyko:** koszty Firebase przy wzroście userów — monitorować
- **Ryzyko:** PWA install rate (UX) — mitygacja: onboarding

---

## 📊 LESSONS LEARNED

- ✅ **Co działa:** multi-user z role-based access (admin + user)
- ✅ **Co działa:** PWA + Firebase + GitHub Pages (low cost stack)
- ❌ **Co nie zadziałało:** [TO FILL — uzupełnij ręcznie]
- ❌ **Co nie zadziałało:** [TO FILL — uzupełnij ręcznie]

---

## 🔗 LINKI / ZASOBY

- **Strona produktu:** https://grzegorzee.github.io/strength-save/
- **Admin / dashboard:** https://console.firebase.google.com/project/fittracker-workouts
- **Repo:** https://github.com/grzegorzee/strength-save
- **Analytics:** [TO FILL — uzupełnij ręcznie]
- **Dokumentacja zewnętrzna:** Strava API docs, Firebase docs
- **Pliki w FIRMA:**
  - `dane/projekty-status.md#strength_save` — status update
  - `projekty/strength_save/DOCUMENTATION.md` — pełna dokumentacja (86.7K)
  - `projekty/strength_save/DECYZJE.md` — log decyzji (25.2K)
  - `projekty/strength_save/api.md` — API spec
  - `projekty/strength_save/plan-2026_-wersja-polska-detaliczna.html` — plan roczny
  - `projekty/run_tracker/` — bratni projekt (multi-user pattern)

---

## 👤 KONTAKT (klienta lub kluczowych osób)

Projekt własny — brak klienta zewnętrznego.

- **Imię i nazwisko:** Grzegorz Jasionowicz (owner)
- **Email:** g.jasionowicz@gmail.com (admin) / grzegorzee@gmail.com
- **Telefon:** [—]
- **Komunikator:** [—]
- **Strefa czasowa:** Europe/Warsaw

---

## 🎯 ROADMAP (kwartał / pół roku)

### Q2 2026
- [ ] v7.0 release
- [ ] Plan 2026 zrealizowany w 50%+
- [ ] Wzrost liczby aktywnych userów

### Następne kwartały
- Monetyzacja (freemium)
- AI plany treningowe — pełna jakość
- E2E coverage > 80%

---

## 📌 NOTES

- Bardzo duży folder z `DOCUMENTATION.md` 86.7K i `DECYZJE.md` 25.2K — bogata historia projektu.
- Stack: React + TS + Vite + Firebase + Tailwind + shadcn/ui + Bun (bun.lockb).
- E2E testy w `e2e/` + `test-results/` + `coverage/` — projekt ma porządną infrastrukturę testową.
- W `scripts/` są pomocnicze skrypty.

---

## 🤖 INSTRUKCJE DLA AI

Gdy pracujesz na tym projekcie:

1. **Najpierw przeczytaj:** ten plik (CONTEXT.md) + `PLAN.md` + `DECYZJE.md` (historia decyzji jest bogata!)
2. **Stack-specific:** React + Vite + Bun. Sprawdź `package.json`, `firestore.rules`, `api.md`
3. **Konwencje pisania:** kod EN, UI prawdopodobnie PL — sprawdź `DECYZJE.md`
4. **Zanim coś zmienisz:** OBOWIĄZKOWO przeczytaj `DECYZJE.md` — to projekt z długą historią
5. **Po zmianach:** zaktualizuj `DECYZJE.md` i podbij wersję w `PLAN.md` jeśli to release
