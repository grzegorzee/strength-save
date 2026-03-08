# Strength Save (FitTracker)

> Quick reference - wszystko w jednym miejscu

---

## PODSTAWOWE INFO

| Pole | Wartość |
|------|---------|
| **Nazwa** | Strength Save / FitTracker |
| **Cel** | Osobista aplikacja do śledzenia treningów siłowych |
| **Status** | AKTYWNY (v3.0.0) |
| **Data utworzenia** | Styczeń 2026 |
| **Data aktualizacji** | 2026-01-28 |

---

## KLUCZOWE PLIKI

| Plik | Opis |
|------|------|
| START.md | Ten plik - quick reference |
| PLAN.md | Plan i zadania |
| DECYZJE.md | Log decyzji |
| DOCUMENTATION.md | **Pełna dokumentacja techniczna systemu** |
| src/hooks/useFirebaseWorkouts.ts | Główny hook Firebase |
| src/pages/WorkoutDay.tsx | Główna strona treningu |
| src/components/ExerciseCard.tsx | Komponent ćwiczenia |
| src/data/trainingPlan.ts | Definicja planu treningowego |

---

## LINKI

- **Live:** https://grzegorzjasionowicz.github.io/strength-save/
- **Repo:** https://github.com/grzegorzjasionowicz/strength-save
- **Firebase Console:** https://console.firebase.google.com/project/fittracker-workouts

---

## SZYBKI START

### Rozpoczęcie pracy nad projektem

```bash
# 1. Przejdź do folderu projektu
cd "/Users/grzegorzjasionowicz/Documents/Baza Wiedzy/FIRMA/projekty/strength_save"

# 2. Zainstaluj zależności (jeśli potrzeba)
npm install

# 3. Uruchom lokalnie
npm run dev

# 4. Otwórz http://localhost:5173
```

### Deploy na GitHub Pages

```bash
npm run deploy
```

---

## TECHNOLOGIE

| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| React | 18.x | Frontend framework |
| TypeScript | 5.x | Typowanie |
| Vite | 5.x | Bundler |
| Firebase | 10.x | Backend (Firestore + Auth) |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | - | Komponenty UI |
| React Router | 6.x | Routing (HashRouter) |

---

## STRUKTURA DANYCH FIREBASE

```
fittracker-workouts (project)
├── workouts/          # Sesje treningowe
│   └── workout-{ts}/
│       ├── dayId      # day-1, day-2, day-3
│       ├── date       # YYYY-MM-DD
│       ├── completed  # boolean
│       └── exercises[]
└── measurements/      # Pomiary ciała
    └── measurement-{ts}/
```

---

## JAK ROZPOCZĄĆ KONWERSACJĘ Z CLAUDE

Gdy chcesz pracować nad tym projektem, użyj takiego promptu:

```
Pracuję nad projektem strength_save (FitTracker) - aplikacja do śledzenia treningów.

Przeczytaj:
1. projekty/strength_save/START.md (podstawowe info)
2. projekty/strength_save/DOCUMENTATION.md (pełna dokumentacja techniczna)
3. projekty/strength_save/DECYZJE.md (historia decyzji)

Projekt jest w: /Users/grzegorzjasionowicz/Documents/Baza Wiedzy/FIRMA/projekty/strength_save

[TUTAJ TWOJE ZADANIE]
```

---

## NOTATKI

- Whitelist auth: tylko g.jasionowicz@gmail.com
- HashRouter zamiast BrowserRouter (GitHub Pages)
- Firebase nie akceptuje `undefined` - dane muszą być sanityzowane
- Debounce 300ms przy auto-save w aktywnym treningu
