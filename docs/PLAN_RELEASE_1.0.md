# PLAN RELEASE 1.0 - Strength Save w App Store (wersja płatna)

> Utworzony: 2026-06-11, na bazie pełnego przeglądu projektu (4 audyty: stan, wymogi Apple, infrastruktura płatności, ceny konkurencji).
> Cel: pierwsza oficjalna, PŁATNA wersja w App Store. Subskrypcja miesięczna + roczna, 30-dniowy trial.
> Status decyzji usera: ceny i model do potwierdzenia (sekcja "Decyzje").

---

## 1. GDZIE JESTEŚMY (stan na 2026-06-11)

- Produkt funkcjonalnie kompletny: ~35 działających funkcji (plany + builder, śledzenie treningów, AI coach z limitem $5/user/mies, Strava, analityka, achievements, Apple Watch, kg/lbs, i18n PL/EN).
- Ostatni audyt natywny (iPhone, 2026-06-10): 10/10, zero czerwonych i pomarańczowych flag.
- iOS: TestFlight build 32 (v0.0.1), Beta App Review APPROVED. Web: live na GitHub Pages (invite-only).
- Zrobione wymogi Apple, na których wykładają się pierwsze submity: Sign in with Apple (UI + hook + entitlement w pbxproj), usuwanie konta w apce (5.1.1), eksport danych usera (JSON).
- Brakuje: warstwy komercyjnej (IAP) i części formalnej.

## 2. BLOKERY PUBLIKACJI (twarde wymogi Apple)

| # | Brak | Dlaczego blokuje | Szacunek |
|---|------|------------------|----------|
| 1 | In-App Purchase nie istnieje (zero kodu subskrypcji) | subskrypcja cyfrowa w iOS MUSI iść przez Apple IAP, nie Stripe (wytyczna 3.1.1) | 3-5 sesji |
| 2 | PrivacyInfo.xcprivacy (privacy manifest) | wymagany od 2024, App Review odrzuca | 1-2 h |
| 3 | Polityka prywatności + regulamin (URL) | wymagane pole w ASC + link w apce; obecny link w Profilu to strona apki, nie polityka | 2-4 h (landing/) |
| 4 | Wersja 0.0.1 → 1.0.0 (MARKETING_VERSION, 4 wystąpienia w pbxproj) | konwencja pierwszego publicznego submitu | 5 min |
| 5 | Konto demo dla App Review + notatki dla recenzenta | rejestracja invite-only, recenzent musi wejść do środka | 1 h |
| 6 | Materiały ASC: screenshoty (6.7" + 5.5"), opis PL/EN, keywords, kategoria, age rating | bez tego nie ma submitu | 0,5-1 dzień |
| 7 | APNs key w Firebase + domena strengthsave.app w Resend (SPF/DKIM) | bez Resend kody weryfikacyjne nie dochodzą nowym userom | 1-2 h (DNS) |

## 3. MONETYZACJA - ARCHITEKTURA

**RevenueCat** (oficjalny plugin Capacitora) zamiast ręcznego StoreKit:
- paywall, walidacja paragonów, statusy subskrypcji, webhook → Cloud Function → entitlement w Firestore,
- nowe pole `subscription` w profilu usera (tier: trial/monthly/annual, status, daty),
- gating funkcji na entitlement (dziś gating jest per feature-flag: `features.ai`, `features.strava` — do spięcia z subskrypcją).

**Trial 30 dni = Apple introductory offer** (preset "1 miesiąc za darmo") konfigurowany w App Store Connect:
- Apple sam pilnuje rozliczenia, anulowania i jednorazowości trialu per konto,
- zero własnego kodu billingowego, mniejsze ryzyko odrzucenia,
- płatność pobierana automatycznie w dniu końca trialu, user może anulować do ostatniego dnia.

**Koszty zmienne:** AI coach ma już cost tracking i limit $5/user/mies (`functions/src/ai-usage.ts`); realny koszt typowego usera ~$0,10-0,30/mies. Przy ~40 zł/mies marża po prowizji 15% i kosztach Firebase: 70%+.

**Apple Small Business Program:** prowizja 15% zamiast 30% do 1 mln USD. Nowy developer kwalifikuje się automatycznie, ale trzeba się ZAPISAĆ (procedura: sekcja 8).

## 4. CENNIK - KONKURENCJA I REKOMENDACJA

| Apka | /mies | /rok | Trial | Model |
|------|-------|------|-------|-------|
| Hevy Pro | $2,99 (niepewne, źródła podają też $9,99) | $23,99 | brak (hojny free) | freemium |
| Strong | $4,99 | $29,99 | brak | freemium (free = 3 rutyny) |
| Setgraph | $4,99 | ? | ~12 dni | freemium + trial |
| Gymaholic | $9,99 | $59,99 | ? | freemium |
| Fitbod | $12,99-15,99 | $79,99-95,99 | 7 dni | hard paywall (AI plany) |

Kategoria: tanie czyste trackery ($3-5/mies) vs apki z AI ($10-16/mies). Strength Save (AI + Watch + Strava) należy do drugiej grupy, ale jako nowa marka nie powinna celować w cenę Fitboda.

**Rekomendacja na start:**
- Miesięcznie: **39,99 zł** (tier ~$7.99)
- Rocznie: **199,99 zł** (tier ~$39.99 = ~16,7 zł/mies, "rok = 5 miesięcy gratis" na paywallu)
- Trial: **30 dni** (nikt w kategorii tego nie daje, wyróżnik; plany 8-16 tyg. = user widzi progres w miesiąc). Po 3 mies. weryfikacja konwersji, ewentualne skrócenie do 14 dni (jedna zmiana w ASC).
- Lifetime ~349-399 zł: opcja na później, nie w 1.0.

## 5. JAKOŚĆ PRZED LAUNCHEM (z docs/AUDIT_REMEDIATION_PLAN.md)

**MUST (płacący user + publiczna rejestracja):** [aktualizacja 2026-06-11, commit afd1909, build 36]
1. ✅ Security: ZWERYFIKOWANE jako już naprawione (deleteQueryInBatches paginuje, purgeUserData obsługuje błąd auth, reguły wymagają `status == 'active'`; testy rules na emulatorze: wszystkie PASS).
2. ✅ Resend: `sendEmail` rzucał już HttpsError; NAPRAWIONO weekly-digest (SDK nie rzuca, błąd był połykany w `response.error`). Domena strengthsave.app w Resend: VERIFIED (API, 2026-06-11).
3. ⏳ Otwarcie rejestracji w iOS (paywall/trial jako bramka zamiast invite). CZEKA na decyzje (sekcja 7) i RevenueCat z tygodnia 1. Web: zostaje invite-only (do potwierdzenia).
4. ✅ Closeout: zweryfikowany wizualnie (E2E + screenshot) i NAPRAWIONY znaleziony bug: statystyki liczone na żywo pokazywały zera zamiast snapshotu `cycle.stats`; teraz snapshot ?? przeliczenie, asercje w replan.spec.ts.

**SHOULD (pierwszy miesiąc po launchu):** [aktualizacja 2026-06-11]
- ✅ stabilne ID ćwiczeń w PlanBuilder (nextId = monotoniczny licznik), ✅ PlanWizard egzekwuje dni == daysPerWeek (hasExactWeekdaySelection), ✅ a11y drawer (Radix Sheet), ✅ PWA update guard (pwa-update-guard.ts + blokada w WorkoutDay), ✅ E2E locale (pl-PL w configu, 111/111 green)
- ⏳ konflikt draftów multi-device (etap 3 audytu) — jedyny otwarty SHOULD.

**LATER:** Android/Google Play (keystore, konsola $25, Google Play Billing), web push (VAPID), scalenie logiki PR między Analytics i Achievements.

## 6. PLAN WYKONAWCZY (3 tygodnie do submitu)

### Tydzień 1: monetyzacja
- [ ] ASC: Paid Applications Agreement + dane bankowe + formularze podatkowe (WYMAGANE zanim IAP zadziała, sekcja 8)
- [ ] ASC: subscription group + 2 produkty (monthly, annual) + introductory offer 1 mies. free
- [ ] RevenueCat: konto, projekt, podpięcie produktów, instalacja pluginu Capacitora
- [ ] Firestore: pole `subscription` w UserProfileDoc + Cloud Function webhook RevenueCat → entitlement
- [ ] Paywall UI (po onboardingu + w Profilu): porównanie planów, CTA trial, restore purchases
- [ ] Gating funkcji na entitlement (spięcie z istniejącymi feature-flagami)
- [ ] Zapis do Small Business Program (sekcja 8)

### Tydzień 2: formalności + hardening
- [ ] PrivacyInfo.xcprivacy (deklaracje: Firebase, UserDefaults, required reason APIs)
- [ ] Polityka prywatności + regulamin na landingu, linki w Login/Profil
- [ ] MARKETING_VERSION 1.0.0
- [ ] MUST-y z sekcji 5 (security + Resend + rejestracja + closeout)
- [ ] Konto demo dla App Review
- [ ] APNs key w Firebase Console

### Tydzień 3: pakiet ASC i submit
- [ ] Screenshoty (6.7" wymagane, 5.5" opcjonalne od 2024; iPad jeśli wspieramy)
- [ ] Opis PL/EN, keywords, subtitle, promotional text, kategoria (Health & Fitness), age rating
- [ ] Notatki dla recenzenta: konto demo, info o trialu, jak przetestować trening
- [ ] Submit 1.0 do App Review
- [ ] Bufor na 1-2 rundy odrzuceń (normalne przy pierwszym submicie z subskrypcją)

## 7. DECYZJE USERA (do potwierdzenia)

| Decyzja | Rekomendacja | Status |
|---------|--------------|--------|
| Cena 39,99 zł/mies + 199,99 zł/rok | tak | ❓ |
| Hard paywall (wszystko za subskrypcją po trialu) vs freemium | hard paywall z 30-dn. trialem; freemium można dodać później, odwrotnie nie | ❓ |
| Web zostaje invite-only poza sprzedażą | tak (unikamy kanibalizacji i wytycznych o omijaniu IAP) | ❓ |
| Lifetime w 1.0 | nie, dodać później | ❓ |

## 8. SMALL BUSINESS PROGRAM + PRZEDPOLE IAP (checklist)

Warunki wstępne (bez tego ani SBP, ani IAP nie ruszy):
- [ ] Konto Apple Developer Program aktywne (jest: wysyłamy na TestFlight)
- [ ] Rola Account Holder (zapisać może tylko Account Holder)
- [ ] ASC → Business/Agreements: zaakceptowany **Paid Applications Agreement**
- [ ] ASC: uzupełnione dane bankowe (konto do wypłat) i formularze podatkowe
- Zapis: developer.apple.com/app-store/small-business-program/ → Enroll, zalogować się jako Account Holder, potwierdzić listę powiązanych kont developerskich (wszystkie liczą się łącznie do progu 1 mln USD), zaakceptować warunki.
- Wejście w życie: stawka 15% aktywuje się 15 dni po końcu miesiąca fiskalnego Apple, w którym zatwierdzono zapis. Zapisać się PRZED launchem.
- Utrata: po przekroczeniu 1 mln USD proceeds w roku → 30% na dalszą sprzedaż; spadek poniżej → ponowna kwalifikacja od kolejnego roku.

## 9. RYZYKA

1. App Review przy pierwszej subskrypcji często odsyła do poprawki (paywall musi jasno pokazywać cenę, długość trialu, warunki odnowienia, linki do Terms/Privacy). Wkalkulowany bufor w tygodniu 3.
2. 30-dniowy trial = odroczona walidacja konwersji o miesiąc od launchu. Mierzyć od dnia 1 (RevenueCat charts).
3. Hevy/Strong od dołu, Fitbod od góry: pozycjonowanie wymaga, żeby AI coach i Watch były widoczne w screenshotach i opisie.
4. Web invite-only musi pozostać niepodlinkowany z apki jako alternatywa zakupu (wytyczne anti-steering: nie wolno kierować z apki do tańszego zakupu poza IAP).
