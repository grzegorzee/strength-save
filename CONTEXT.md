# strength_save (FitTracker) — kontekst

> **Cel pliku:** Pełny kontekst projektu dla każdego AI assistanta. Czytany automatycznie gdy user wspomni projekt.
> **Ostatnia aktualizacja:** 2026-05-17
> **Status pliku:** uzupełniony z `dane/projekty-status.md` + plików projektu

---

## 🎯 1-LINIJKOWE PODSUMOWANIE

Multi-user aplikacja PWA (React + Firebase + Strava) do śledzenia treningów siłowych z AI planami, live na GitHub Pages, v6.8.0+.

---

## 📋 PODSTAWY

| Pole | Wartość |
|------|---------|
| **Status** | aktywny (v6.8.0+, v5.1.0 wg `dane/projekty-status.md` — może być nieaktualne) |
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
2026-04-03: aktualizacja v6.8.0

---

## 🧭 OSTATNIE DECYZJE (TOP 5)

1. **[TO FILL]** v6.8.0 release (2026-04-03)
2. **[TO FILL]** Strava integration
3. **[TO FILL]** AI plany treningowe
4. **[TO FILL]** Multi-user (admin + user roles)
5. **[TO FILL]** [decyzja]

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
