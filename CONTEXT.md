# strength_save (FitTracker) — kontekst

> **Cel pliku:** Pełny kontekst projektu dla każdego AI assistanta. Czytany automatycznie gdy user wspomni projekt.
> **Ostatnia aktualizacja:** 2026-05-29 (v6.9.4)
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
2026-07-17: plany X12A (Z86-Z88), X12B (Z89-Z91) i X12C (Z92-Z93) wykonane i wdrożone. X12A: root cause wskrzeszonego planu (repeatPlanSource: dni zawsze z bieżącego planu, nie ze stale snapshotu cyklu; oferta przedłużenia czeka na isLoaded planu i cykli), local-wins konfliktu rewizji treningu (bez dialogu, limit 2 auto-resolve na sesję zapisu), "Kontynuuj trening" dla każdego nieukończonego dzisiejszego szkicu. Release: web index-D6h0uwMg + iOS build 52 na TestFlight (VALID, grupa Wewnętrzni). Po drodze: wygasła umowa Apple (REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED) zaakceptowana przez usera. X12B: Adaptive Coach usunięty (zostaje coach serii i metryki RPE), mobile bez hamburgera (dojścia: bottom nav + "Twoje dane" w Profilu), narzędzia naprawcze za isAdmin, wersja 1.0.0 zamrożona do launchu; release web index-OvoGHMd8 + iOS build 1.0.0 (53) TestFlight VALID. X12C: karta "Miesiące" w Analityce (treningi, czas z jawnym brakiem pomiaru sprzed M32, tonaż; agregacja monthly-stats.ts); release web index-C7jDc1gn + iOS build 1.0.0 (54) TestFlight. Backlog ustawiony: P0 walidacja onSnapshot, M19 offline, M20 PDF, web push, Android.

---

## 🧭 OSTATNIE DECYZJE (TOP 5)

1. **Plan X12C (Z92-Z93) WYKONANY i WDROŻONY** (2026-07-17): statystyki miesięczne dla każdego usera — czysta agregacja `monthly-stats.ts` (miesiąc z pola date w czasie lokalnym, tylko completed; czas durationSec + fallback ze znaczników, treningi sprzed M32 z jawnym dopiskiem "bez zmierzonego czasu", tonaż istniejącym calculateTonnage) + karta "Miesiące" na górze Podsumowania Analityki (12 miesięcy wstecz, bez gate'ów). Web index-C7jDc1gn + iOS build 1.0.0 (54) TestFlight.
2. **Plan X12B (Z89-Z91) WYKONANY i WDROŻONY** (2026-07-17): aplikacja w wersji **1.0.0** (zamrożona do launchu, bump tylko numeru buildu; Info.plist na $(MARKETING_VERSION)). Adaptive Coach usunięty (decyzja usera: belka nic nie dawała; zostaje coach następnej serii i metryki RPE/ból). Mobile bez hamburgera i drawera: bottom nav + sekcja "Twoje dane" w Profilu (Historia/Pomiary/Osiągnięcia) + Admin dla admina; e2e osiągalności tras PRZED wycinką. Narzędzia naprawcze w Ustawieniach tylko dla admina (Z90.4; przenosiny do panelu admina = X13). Web index-OvoGHMd8 + iOS build 1.0.0 (53) TestFlight (VALID, Wewnętrzni).
3. **Plan X12A (Z86-Z88) WYKONANY i WDROŻONY** (2026-07-17): zaufanie do danych po realnym incydencie z siłowni. Root cause wskrzeszonego starego planu: "Powtórz/Przedłuż plan" brał dni ze stale snapshotu aktywnego cyklu, a oferta przedłużenia nie czekała na załadowanie planu i cykli (fix: `repeatPlanSource`, dni ZAWSZE z bieżącego planu chronionego rewizją). Konflikt rewizji treningu: local-wins automatycznie, bez dialogu (limit 2 auto-resolve na sesję zapisu, telemetria revision_conflict_auto_resolved; cofa decyzję M18). "Kontynuuj trening" na Dashboardzie dla KAŻDEGO nieukończonego dzisiejszego szkicu (`isDraftContinuableToday`), auto-nawigacja zostaje ostra. Naprawa danych zbędna (user naprawił konto ręcznie przez UI). Web index-D6h0uwMg + iOS build 52 TestFlight (VALID, Wewnętrzni).
4. **Z85 HOTFIX białego ekranu** (2026-07-04): iOS build 50 i prod web (index-BOBq35aR) NIE startowały — cykliczny import między chunkami firebase-core i firebase-auth (split z Z54) dawał TDZ ReferenceError na starcie, React nie montował #root. Fix: firebase w JEDNYM chunku; budżet per chunk 800 KB, initial 1500 KB (liczony uczciwie — index importował auth+firestore statycznie już wcześniej). Nowa bramka `npm run check:dist-smoke` (bundle musi WYSTARTOWAĆ w headless Chromium; wpięta w ios-testflight.sh). Wdrożone: web index-BN5cnETa + iOS build 51 na TestFlight.
5. **Plan X11 (Z66-Z84) WYKONANY i WDROŻONY** (2026-07-03): nawigacja bez ślepych zaułków (hamburger ożywia drawer, linki krzyżowe trening→instrukcje/waga→pomiary/historia/cykle, martwe przyciski out), JEDEN system planów i ćwiczeń (wspólny ExercisePicker + PlanDaysEditor dla buildera/edytora/admina, WŁASNE ĆWICZENIA w kolekcji custom_exercises z zamkniętym schematem rules, szablon 6-dniowy PPL×2 + ostrzeżenie mismatch, onboarding z podglądem planu, builder startuje z szablonu), dane w akcji (notatki/ból/technika/czas trwania/pomijane/obwody ciała widoczne; Weekly liczone lokalnie zamiast zamrożonej kolekcji), historia jako archiwum (serie/metryki/PR/filtr), porządek Profil vs Ustawienia, empty states z CTA, haptyka serii, natywna prośba o ocenę (kamienie 5/15/30, max 1/60 dni). Web (index-BOBq35aR) + rules (110 testów) + iOS build 50 TestFlight (Beta App Review APPROVED). Fix pre-existing: swap "tylko dziś" utrwala się w drafcie od razu.

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
