# Sekcja "Subskrypcja" w Profilu + startedAt z webhooka RevenueCat

Data: 2026-08-11 · Status: zatwierdzony przez usera (czat) · Zakres: functions + web + iOS build 87

## Cel

User widzi w aplikacji, jaki ma plan premium i od kiedy do kiedy obowiązuje.
Dziś dane są w `users/{uid}.subscription` i w RevenueCat, ale żaden ekran ich nie pokazuje,
a data początku okresu w ogóle nie jest zapisywana.

## Zakres

1. **Webhook RC (`functions/src/revenuecat.ts`):** event RC niesie `purchased_at_ms`
   (początek bieżącego okresu). Nowe pole `startedAt: string | null` w `SubscriptionWrite`,
   mapowane w `mapEventToSubscription` dla wszystkich typów eventów zmieniających stan.
   Zapis przez Admin SDK, bez zmian w rules.
2. **Model klienta:** `AppUserProfile.subscription.startedAt?` (registration-api),
   `SubscriptionState.startedAt` (user-profile, `mapSubscription`).
3. **`useSubscription`:** RcState + `latestPurchaseDate` z CustomerInfo; hook zwraca
   `startedAt` scalone: Firestore → fallback RC (native). Pokrywa istniejące subskrypcje,
   które dostaną `startedAt` w bazie dopiero przy następnym evencie webhooka.
4. **Formatter (`src/lib/subscription-summary.ts`):** czysta funkcja stan → struktura
   `{ planKey, fromIso, untilIso, untilKind, hasStoreSubscription }`;
   `untilKind`: renews | expires | grace | trialEnds | null. UI tłumaczy i skleja.
   Stany: admin (pełny dostęp), comp (bezterminowo), trial, monthly/yearly
   (odnawia się / wygasa wg `willRenew`), billing_issue (grace do `expiresAt`), brak.
5. **UI (`Profile.tsx`):** `SectionCard` "Subskrypcja" między "Konto" a "Preferencje".
   Wiersz stanu (plan + "aktywna od X · odnawia się Y"). Na natywnym iOS dodatkowo:
   "Zarządzaj subskrypcją" (link `https://apps.apple.com/account/subscriptions`,
   tylko gdy aktywna subskrypcja sklepowa) albo "Przejdź na PRO" → `/paywall`
   (gdy brak PRO). Web: tylko wiersz stanu (web nie sprzedaje).
6. **i18n:** komplet kluczy `subscription.*` w `pl.ts` i `en.ts`.
   Daty formatowane idiomem projektu: `toLocaleDateString(dateLocale(lang), ...)`.

## Poza zakresem

- Data pierwszego zakupu w historii (original purchase) — pokazujemy początek
  bieżącego okresu rozliczeniowego.
- Ekran szczegółów/historii subskrypcji, zmiany w panelu admina.
- Backfill `startedAt` dla istniejących dokumentów (załatwia fallback RC na urządzeniu).

## Testy

- `functions/src/revenuecat.test.ts`: `startedAt` mapowany z `purchased_at_ms`
  (obecny, brakujący, EXPIRATION).
- Unit test formattera: wszystkie stany z tabeli powyżej.
- Niezmiennik (zasada #5): sekcja jest tylko odczytem, istniejące przepływy Profilu
  bez zmian; test formattera obejmuje stan "brak subskrypcji" (nic nie znika userom bez PRO).

## Wdrożenie

Bramki (test/typecheck/lint/build) → deploy functions (`revenuecatWebhook`) →
web `npm run deploy` → iOS bump 87 → `release-ios.sh` + dystrybucja obu grup.
