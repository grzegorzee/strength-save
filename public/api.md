# Strength Save Export API

Prywatne API do eksportu danych użytkownika na komputer. Obecnie przeznaczone tylko dla konta admina.

## Jak to działa

- Klucze API generujesz z panelu admina w aplikacji.
- Klucz pokazuje się tylko raz po utworzeniu lub rotacji.
- API jest tylko do odczytu.
- Każdy klucz działa tylko dla danych właściciela klucza.
- Autoryzacja odbywa się przez nagłówek `Authorization: Bearer <API_KEY>`.

## Endpoint bazowy

Produkcja:

```text
https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi
```

## Zarządzanie kluczami

Sekcja `API eksportu` jest dostępna w panelu admina:

- `Generuj klucz`
- `Rotate`
- `Revoke`

Po utworzeniu klucza zobaczysz:

- pełny sekret
- gotowy przykład `curl`

Sekret należy zapisać od razu. Później nie da się go ponownie odczytać z aplikacji.

## Autoryzacja

Przykład:

```bash
curl -H "Authorization: Bearer ss_live_xxxxx_xxxxxxxxxxxxxxxxx" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=full"
```

## Dostępne zasoby

Parametr `resource`:

- `full`
- `profile`
- `workouts`
- `measurements`
- `training-plan`
- `plan-cycles`

## Parametry zapytań

Wspierane parametry:

- `resource`
- `format=json|ndjson`
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `limit`
- `cursor`
- `include=profile,workouts,measurements,training-plan,plan-cycles`

Uwagi:

- `format=ndjson` działa dla `workouts`, `measurements`, `plan-cycles`
- `resource=full` wspiera tylko `json`
- `include` ma sens tylko dla `resource=full`

## Przykłady

Pełny eksport:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=full"
```

Eksport treningów z zakresem dat:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=workouts&from=2026-01-01&to=2026-12-31"
```

Eksport treningów jako NDJSON:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=workouts&format=ndjson"
```

Eksport tylko pomiarów:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=measurements"
```

Eksport plan cycles:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=plan-cycles"
```

Zapis backupu do pliku:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=full" \
  -o strength-save-backup.json
```

## Odpowiedzi API

### JSON

Przykład:

```json
{
  "meta": {
    "apiVersion": "v1",
    "schemaVersion": 1,
    "resource": "workouts",
    "ownerUserId": "abc123",
    "generatedAt": "2026-04-03T12:00:00.000Z",
    "nextCursor": null
  },
  "data": []
}
```

### NDJSON

Pierwsza linia to metadane, kolejne linie to rekordy:

```text
{"type":"meta","apiVersion":"v1","resource":"workouts","ownerUserId":"abc123","generatedAt":"...","nextCursor":null}
{"id":"workout-...","userId":"abc123","dayId":"day-1","date":"2026-04-03", ...}
{"id":"workout-...","userId":"abc123","dayId":"day-3","date":"2026-04-01", ...}
```

## Paginacja

Dla listowych zasobów możesz używać:

- `limit`
- `cursor`

Jeśli odpowiedź zwraca `meta.nextCursor`, użyj go w kolejnym request:

```bash
curl -H "Authorization: Bearer $SS_API_KEY" \
  "https://us-central1-fittracker-workouts.cloudfunctions.net/exportUserDataApi?resource=workouts&limit=100&cursor=<NEXT_CURSOR>"
```

## Kody odpowiedzi

- `200` sukces
- `400` zły parametr lub niedozwolony format
- `401` brak lub nieprawidłowy klucz API
- `403` klucz bez wymaganego scope lub nieaktywny
- `405` zła metoda HTTP
- `429` przekroczony rate limit
- `500` błąd serwera

## Bezpieczeństwo

- Klucz działa tylko dla danych właściciela.
- Klucze są haszowane po stronie backendu.
- W bazie nie jest przechowywany pełny sekret.
- Każde użycie eksportu jest logowane.
- API ma rate limiting per key.
- Kolekcje `api_keys`, `api_audit_logs`, `api_rate_limits` są prywatne i niedostępne z klienta Firestore.

## Zakres eksportu w v1

`profile`
- profil użytkownika bez prywatnych sekretów

`workouts`
- sesje treningowe z ćwiczeniami, seriami, notatkami, skipami i statusem completion

`measurements`
- pomiary ciała

`training-plan`
- aktualny plan treningowy użytkownika

`plan-cycles`
- historia cykli planu

## Ograniczenia v1

- API jest read-only
- działa tylko dla admina
- nie eksportuje danych innych użytkowników
- `full` nie wspiera `ndjson`
- brak kompresji odpowiedzi

## Rekomendacje operacyjne

- trzymaj klucz w `.env`, menedżerze haseł albo systemowym keychain
- nie commituj klucza do repo
- używaj osobnych kluczy dla laptopa i osobnych skryptów
- po podejrzeniu wycieku od razu użyj `Revoke` albo `Rotate`
