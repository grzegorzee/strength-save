# StrengthSave

Aplikacja do śledzenia treningów siłowych i postępów.

## Funkcje

- Plan treningowy z podziałem na dni
- Śledzenie serii, powtórzeń i ciężarów
- Pomiary ciała (waga, obwody)
- Osiągnięcia i rekordy osobiste
- Synchronizacja z Firebase
- Autoryzacja Google (whitelist)

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Firebase (Auth + Firestore)
- React Router

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

Aplikacja dostępna pod: https://grzegorzee.github.io/strength-save/


---

## Superpowers (skille kodowe)

Ten projekt korzysta z **Superpowers** (github.com/obra/superpowers) — framework skilli dla agentow kodowych.

### Dostepne skille (uruchamiaja sie automatycznie):

| Skill | Kiedy | Co robi |
|-------|-------|---------|
| **brainstorming** | Przed pisaniem kodu | Doprecyzowuje spec, pyta o wymagania, zapisuje design doc |
| **writing-plans** | Po zatwierdzeniu designu | Rozbija prace na taski 2-5 min, z dokladnymi sciezkami plikow |
| **subagent-driven-development** | Podczas implementacji | Osobny agent na kazdy task, 2-fazowe review (spec + jakosc) |
| **test-driven-development** | Podczas kodowania | RED-GREEN-REFACTOR: test -> fail -> kod -> pass -> commit |
| **systematic-debugging** | Przy bugach | 4-fazowy proces root cause analysis |
| **using-git-worktrees** | Nowe feature/fix | Izolowany workspace na osobnym branchu |
| **requesting-code-review** | Miedzy taskami | Review vs plan, raporty wg severity |

### Jak uzywac:

- Skille uruchamiaja sie **automatycznie** gdy agent rozpozna kontekst
- Mozesz tez poprosic wprost: "uzyj brainstorming" / "zrob plan" / "uruchom TDD"
- Plan implementacji zapisywany w pliku — agent moze pracowac autonomicznie godzinami
- Kazdy task konczy sie weryfikacja (testy musza przechodzic)

### Filozofia:

- Test-Driven Development — testy PRZED kodem
- YAGNI — nie buduj czegos co nie jest potrzebne teraz
- Systematic over ad-hoc — proces zamiast zgadywania

