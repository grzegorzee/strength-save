# WP-IMG: Spójne zdjęcia grup mięśniowych (gpt-image-2)

> **For agentic workers:** ten pakiet NIE zmienia kodu w `src/` (poza odczytem). Produkt = pliki webp + manifest.

**Goal:** jeden spójny stylistycznie zestaw zdjęć grup mięśniowych (po jednym na kategorię biblioteki + kafel "Własne" pomijamy — ma fallback), używanych przez WP-E jako kafle (78 px) i hero (150 px).

**Tool:** `uv run ~/.claude/skills/gpt-image-2/generate.py --prompt "..." --size 1568x608 --quality high --format webp --compression 82 --output <plik>` (skrypt sam czyta klucz `OPENAI_API_KEY_IMAGE` z `~/FIRMA/.env`). Retry na 5xx wbudowany.

**Output:** `public/exercise-groups/<categoryId>.webp` + `public/exercise-groups/manifest.json`:
```json
{ "generatedAt": "2026-08-21", "style": "dark-gym-v1", "images": { "<categoryId>": "<categoryId>.webp" } }
```

## Tasks

### Task I1: lista kategorii

- [ ] Odczytaj `src/data/exerciseLibrary.ts` i wyciągnij DOKŁADNE id kategorii (8 wartości pola `category`). To są nazwy plików. Zapisz mapę kategoria→motyw zdjęcia (patrz I2).

### Task I2: generacja (1 obraz per kategoria, rozmiar 1568x608)

Wspólny szkielet promptu (spójność!):

```
Cinematic dark gym photography, moody low-key lighting, charcoal black background (#0e0e0e tones),
subtle cool rim light, professional fitness magazine style, shallow depth of field,
no text, no logos, no visible faces (framing crops heads out or subject from behind),
consistent color grade: desaturated with slightly warm highlights. Wide 2.5:1 crop.
Subject: <MOTYW>
```

Motywy per grupa (dopasuj do realnych id; przykładowe):
- klatka/chest: barbell bench press close-up, chest and arms of athlete pressing loaded barbell
- plecy/back: athlete from behind performing weighted pull-up, defined back muscles
- barki/shoulders: dumbbell overhead press from side, deltoid focus
- nogi/legs: loaded barbell back squat from behind, quad and barbell plates focus
- ramiona/arms: close-up biceps curl with dumbbell, forearm and biceps
- core/brzuch: hanging leg raise or ab wheel on dark floor, torso focus
- pośladki/glutes: hip thrust with barbell pad, side angle
- łydki/calves: standing calf raise on machine platform, lower leg close-up

- [ ] Generuj po jednym; po każdym obejrzyj plik (Read na obrazie) i oceń: ciemne tło, brak twarzy, brak tekstu, spójny grading. Odrzuty regeneruj (max 2 retry na grupę, potem bierz najlepszy).
- [ ] Waga: po `--format webp --compression 82` plik powinien mieć ~60-200 KB. Jeśli >300 KB, przegeneruj z `--compression 70`.

### Task I3: manifest + weryfikacja

- [ ] Zapisz `manifest.json` wg schematu wyżej (id MUSZĄ być identyczne z `category` z danych).
- [ ] Sanity: `ls -la public/exercise-groups/` — 8 webp + manifest; suma < 2 MB.
- [ ] Raport: lista plików z rozmiarami, które grupy wymagały retry, ocena spójności 1-10.

## Pułapki

- ŻADNYCH tekstów na obrazach (design ma podpisy w UI).
- Brak rozpoznawalnych twarzy (unikamy problemów wizerunkowych w sklepach).
- Nie commituj; pliki zostają w working tree dla release train.
- Koszt: 8-16 wywołań high ≈ 1,5-3,5 USD — akceptowane.
