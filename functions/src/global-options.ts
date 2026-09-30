import { setGlobalOptions } from "firebase-functions/v2";
import { DEFAULT_MAX_INSTANCES } from "./function-limits";

// Cost guard (2026-09-30, docs/COST-GUARDS.md): sufit instancji dla KAŻDEJ
// funkcji. Bez niego o sufit decyduje platforma (odczyt 2026-09-30: maxScale 20
// na 70 usługach, brak limitu na 2 najnowszych), więc pętla klienta albo atak
// na publiczny endpoint mnoży rachunek bez kontroli z repo.
//
// firebase-functions 7.2.2 czyta opcje globalne w momencie DEFINICJI funkcji
// (lib/v2/providers/https.js:90, scheduler.js:59, firestore.js:234, pubsub.js:123),
// dlatego ten moduł musi być PIERWSZYM importem w index.ts.
//
// Concurrency zostaje domyślna dla v2 (80 żądań na instancję przy cpu=1),
// więc 10 instancji = do 800 równoległych żądań na funkcję. Ruch z ostatnich
// 30 dni: max 25 wywołań na godzinę na funkcję, max 5 instancji (nakładka
// rewizji przy deployu).

setGlobalOptions({ maxInstances: DEFAULT_MAX_INSTANCES });
