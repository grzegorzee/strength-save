# Procedura postępowania przy naruszeniu ochrony danych (art. 33-34 RODO)

Administrator: WEB3 POWER Grzegorz Jasionowicz. Kontakt: contact@strengthsave.app.
Ostatnia aktualizacja: 2026-08-11.

## 1. Co jest naruszeniem

Naruszenie bezpieczeństwa prowadzące do przypadkowego lub niezgodnego z prawem zniszczenia, utraty, modyfikacji, nieuprawnionego ujawnienia lub dostępu do danych osobowych. Przykłady w tym projekcie: błąd w Firestore Rules odsłaniający cudze dane, wyciek klucza serwisowego/API, przejęcie konta admina, omyłkowa wysyłka maila z danymi do złego odbiorcy, utrata niezaszyfrowanego backupu.

## 2. Kanały wykrycia

- kolekcja `client_errors` + telemetria (panel admina),
- alerty Firebase / Google Cloud (billing, nietypowy ruch),
- automatyczne testy rules w CI (`test:rules`) — regresja = potencjalna dziura,
- zgłoszenia użytkowników na contact@strengthsave.app,
- powiadomienia procesorów (Google, RevenueCat, Resend mają własne obowiązki notyfikacji).

## 3. Kroki (zegar 72h startuje od STWIERDZENIA naruszenia)

1. **Powstrzymaj**: zablokuj wektor (revoke kluczy, hotfix rules przez `firebase deploy --only firestore:rules`, zawieszenie konta, wyłączenie funkcji).
2. **Ustal fakty**: co, kiedy, czyje dane, ile osób, jakie kategorie (uwaga: dane treningowe/pomiary = art. 9, ryzyko z automatu wyższe). Zabezpiecz dowody (logi, eksporty).
3. **Oceń ryzyko** dla praw i wolności osób:
   - brak ryzyka (np. dane zaszyfrowane, klucz nieujawniony) → tylko wpis do rejestru naruszeń (pkt 5),
   - ryzyko → zgłoszenie do UODO w 72h (pkt 4),
   - wysokie ryzyko (dane zdrowotne szerzej ujawnione, dane logowania) → dodatkowo zawiadomienie osób (pkt 6).
4. **Zgłoszenie do UODO** (72h): formularz elektroniczny na uodo.gov.pl (albo pismo). Zakres z art. 33 ust. 3: charakter naruszenia, kategorie i przybliżona liczba osób i rekordów, kontakt, możliwe konsekwencje, podjęte środki. Nie masz kompletu danych → zgłoś częściowo i uzupełniaj sukcesywnie (art. 33 ust. 4).
5. **Rejestr naruszeń** (obowiązkowy dla WSZYSTKICH naruszeń, także niezgłaszanych): wpis w `docs/legal/rejestr-naruszen.md` (utworzyć przy pierwszym incydencie): data wykrycia, opis, ocena ryzyka, decyzja o zgłoszeniu, działania naprawcze.
6. **Zawiadomienie osób** (bez zbędnej zwłoki przy wysokim ryzyku): prostym językiem e-mailem (Resend), zakres z art. 34 ust. 2: co się stało, kontakt, możliwe konsekwencje, co robimy i co user może zrobić (np. zmiana hasła).
7. **Wnioski**: root cause do `DECYZJE.md`, poprawka + test regresyjny (wzorzec: testy rules), aktualizacja RCPD jeśli zmienił się zakres przetwarzania.

## 4. Szablon zgłoszenia wewnętrznego (do rejestru)

```
Data wykrycia / stwierdzenia:
Opis naruszenia (co, jak, wektor):
Kategorie danych (czy art. 9?):
Liczba osób / rekordów (szacunek):
Ocena ryzyka (brak / ryzyko / wysokie) + uzasadnienie:
Zgłoszone do UODO (tak/nie, data, nr):
Osoby zawiadomione (tak/nie, data, kanał):
Działania powstrzymujące:
Działania naprawcze + test regresyjny:
```
