# Health migration — read-only dry-run

Stan: 2026-08-28. Narzędzie jest wyłącznie audytem i **nie jest migratorem**.
Nie ma trybu `apply`, nie tworzy batcha i nie wywołuje żadnej operacji zapisu w
Firebase. Lokalnie zapisuje tylko pseudonimizowany manifest z uprawnieniami 0600.

## Uruchomienie

Z aktywnym Application Default Credentials dla projektu `fittracker-workouts`:

```bash
node scripts/health-migration-dry-run.mjs
```

Opcjonalnie można wskazać lokalny plik wyjściowy:

```bash
node scripts/health-migration-dry-run.mjs --output private-audits/health-manifest.json
```

Nie przekazuj pliku do publicznego repo. `private-audits/` jest lokalnym
artefaktem operacyjnym; manifest nie zawiera UID, e-maili, nazw, identyfikatorów
dokumentów, ścieżek zdjęć ani wartości pomiarów, ale pozostaje danymi
pseudonimizowanymi.

## Co jest odczytywane

Skrypt używa projekcji Firestore i pobiera wyłącznie pola potrzebne do
klasyfikacji:

- `users`: mirror zgody oraz obecność pól max HR;
- `measurements`: `userId` i obecność referencji zdjęcia;
- `workouts`: `userId` i `exercises` — Firestore nie potrafi wybrać pojedynczych
  pól z map wewnątrz tablicy, więc wartość jest od razu redukowana w pamięci do
  samej informacji o obecności RPE/bólu/jakości;
- `strava_activities` i `manual_activities`: `userId` i obecność pól health.

Skrypt nie pobiera obiektów zdjęć ze Storage i nie odczytuje ich zawartości.

## Granica zgody

Kandydatem do ewentualnej przyszłej migracji może być wyłącznie konto mające
jednocześnie `healthGranted === true`, wersję `1.1`, dodatni bezpieczny
`healthEpoch` i niepusty `healthGrantId`. Zgoda 1.0 jest raportowana jako
`legacy-version`; nie jest podnoszona ani interpretowana jako zgoda 1.1.

Nawet rekord aktywnej zgody 1.1 ma dziś status
`TARGET_SCHEMA_NOT_APPROVED`. Powód: docelowy kontrakt wydzielonych metryk
treningowych oraz semantyka historycznej epoki nie są jeszcze zatwierdzone.
Narzędzie nie wymyśla patcha i nie przypisuje historycznym danym bieżącej zgody.

## Integralność manifestu

- `subjectRef` i `sourceRef` są deterministycznymi skrótami z separacją domeny;
- `checkpoint.sha256` obejmuje uporządkowaną listę wszystkich sklasyfikowanych,
  zablokowanych transformacji;
- `manifestSha256` obejmuje stabilną część całego manifestu, z pominięciem czasu
  wykonania;
- `validateHealthMigrationManifest` odrzuca zmianę checkpointu, zmianę hasha,
  dodanie pola tożsamościowego oraz jakąkolwiek niepustą ścieżkę mutacji.

Ten checkpoint pozwala porównać dwa dry-runy. Nie jest zgodą na zapis, backupem
wartości ani dowodem, że schemat migracji jest gotowy.

## Blocker przed migratorem

Najpierw muszą powstać i przejść review: zamknięty schemat
`workout_health_metrics`, zasady przypisania historycznych rekordów do zgody,
precondition/revision, dual-read/dual-write, canary na danych syntetycznych,
rollback oraz test withdraw w trakcie migracji. Dopiero osobne narzędzie, z
odrębnym review i jawnym zatwierdzeniem właściciela, może uzyskać możliwość
zapisu.
