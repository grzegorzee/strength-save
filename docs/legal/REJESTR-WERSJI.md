# Rejestr wersji dokumentów prawnych

Kanoniczne wersje w kodzie: `src/lib/legal-versions.ts` + `functions/src/legal-versions.ts`
(test parity pilnuje zgodności). Bump wersji = re-consent wszystkich userów
(ConsentGate). Źródła treści: repo `strength_save_landing`, `src/data/legal/*.html`
(JSON generowany przez `scripts/build-legal.mjs`). Archiwum na produkcji:
`https://strengthsave.app/legal-archive/…`.

| Dokument | Wersja | Obowiązuje od | URL | Archiwum poprzedniej |
|----------|--------|---------------|-----|----------------------|
| Regulamin (PL/EN) | 2.0 | 2026-08-11 | /terms | /legal-archive/2026-06-11-terms-pl.html, -en |
| Polityka Prywatności (PL/EN) | 2.0 | 2026-08-11 | /privacy | /legal-archive/2026-06-11-privacy-pl.html, -en |
| Polityka Cookies (PL/EN) | 1.0 | 2026-08-11 | /cookies | — (pierwsza wersja) |
| Consumer Health Data Privacy Policy (EN) | 1.0 | 2026-08-11 | /health-data-privacy | — (pierwsza wersja) |
| Oświadczenie zgody zdrowotnej (i18n `consent.health`) | 1.0 | 2026-08-11 | w aplikacji | treść w logu zgód per wpis |
| Oświadczenie zgody marketingowej (i18n `consent.marketing`) | 1.0 | 2026-08-11 | w aplikacji | treść w logu zgód per wpis |

## Procedura zmiany dokumentu

1. Edytuj `strength_save_landing/src/data/legal/<dok>.html` (PL i EN!), zaktualizuj nagłówek `meta` (wersja + data).
2. Skopiuj POPRZEDNIĄ wersję do `public/legal-archive/RRRR-MM-DD-<dok>-<lang>.html` i podlinkuj w nagłówku nowej.
3. `npm run build` + `vercel --prod` w repo landingu.
4. Bump wersji w OBU plikach `legal-versions.ts` (src + functions) w repo apki; jeśli zmienia się treść oświadczenia zgody, zaktualizuj klucze `consent.*` w `pl.ts` i `en.ts`.
5. Deploy functions (`firebase deploy --only functions:recordConsent`) PRZED deployem weba (stary klient z nową wersją padłby na walidacji).
6. Dopisz wiersz do tabeli wyżej + wpis w `DECYZJE.md`.
7. Zmiana istotna (regulamin): powiadom userów z 14-dniowym wyprzedzeniem (e-mail/w aplikacji) zgodnie z §20 Regulaminu.
