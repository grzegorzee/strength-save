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
2026-07-03 (wieczór): plan X10 (Z47-Z65) wykonany i wdrożony w CAŁOŚCI — auto-resume aktywnego treningu, porządki Settings, bundle split, maszyna stanów sesji, Adaptive Coach (wyróżnik: RPE/ból + readiness siła+kardio, offline). Release train: git push + rules + functions (saveMaxHR skasowany) + web (index-C3ZFOS2E) + iOS build 49 na TestFlight (Beta App Review APPROVED) + sekrety VITE_ALLOWED_* usunięte z GitHub. Szczegóły per faza w DECYZJE.md.

---

## 🧭 OSTATNIE DECYZJE (TOP 5)

1. **Plan X11 (Z66-Z84) WYKONANY i WDROŻONY** (2026-07-03): nawigacja bez ślepych zaułków (hamburger ożywia drawer, linki krzyżowe trening→instrukcje/waga→pomiary/historia/cykle, martwe przyciski out), JEDEN system planów i ćwiczeń (wspólny ExercisePicker + PlanDaysEditor dla buildera/edytora/admina, WŁASNE ĆWICZENIA w kolekcji custom_exercises z zamkniętym schematem rules, szablon 6-dniowy PPL×2 + ostrzeżenie mismatch, onboarding z podglądem planu, builder startuje z szablonu), dane w akcji (notatki/ból/technika/czas trwania/pomijane/obwody ciała widoczne; Weekly liczone lokalnie zamiast zamrożonej kolekcji), historia jako archiwum (serie/metryki/PR/filtr), porządek Profil vs Ustawienia, empty states z CTA, haptyka serii, natywna prośba o ocenę (kamienie 5/15/30, max 1/60 dni). Web (index-BOBq35aR) + rules (110 testów) + iOS build 50 TestFlight (Beta App Review APPROVED). Fix pre-existing: swap "tylko dziś" utrwala się w drafcie od razu.
2. **Plan X10 (Z47-Z65) WYKONANY i WDROŻONY** (2026-07-03): auto-resume aktywnego treningu (zimny start + background→active przez @capacitor/app, scroll do ostatnio dotykanego ćwiczenia), Dashboard "Kontynuuj trening", Sync Center tylko przy zaległościach + narzędzia naprawcze w akordeonie, maszyna stanów sesji + hydracja jako czyste funkcje, bundle split (initial 919 KB), **Adaptive Coach** (RPE/ból → progress/hold/deload + readiness siła+kardio, offline, flaga adaptiveCoach). Web (index-C3ZFOS2E) + functions + rules + iOS build 49 TestFlight (Beta App Review APPROVED).
3. **Plan naprawy R2 (Z29-Z46) WYKONANY i WDROŻONY** (2026-07-03): kontrakty draftu (snapshot/tombstone/permanent), waitlista naprawiona; koszty Functions ~22-25 -> ~2-3 USD/mies. przy 1000 userów; TTL na 7 kolekcjach.
4. **Serverless jako zasada architektoniczna** (2026-07-03): klient -> Firestore + rules domyślnie (saveMaxHR przez rules od Z59, -1 kontener); Functions tylko dla sekretów/admin SDK/webhooków; scheduled O(aktywnych).
5. **Telemetria client_errors + jeden silnik syncu** (Z13-Z28, build 48; R2 domknął dziury; Z56 dodał crashe renderu przez ErrorBoundary + boundary per trasa).

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
