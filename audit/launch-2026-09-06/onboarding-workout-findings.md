# Onboarding — podgląd, szkic i zapis (dodatkowe zlecenie właściciela)

Zakres: PlanWizard/Onboarding oraz podgląd i lokalny szkic. Środowisko docelowe:
iOS/Android z suspendem WebView i niepewną siecią. Bez danych prawdziwych kont.

| ID | Problem i osiągalna sekwencja | Root cause | Naprawa i niezmiennik |
| --- | --- | --- | --- |
| OB-W1 / P1 | Podgląd → podmień ćwiczenie → Wstecz → ponowny podgląd albo restart usuwa zamiennik. | Onboarding aktualizował tylko reviewDays; choice i draft nie dostawały zmian. PlanWizard dla szablonu odtwarzał oryginalne chosen.days nawet przy resume. | Zmiany podglądu aktualizują choice i owner draft; reviewDays jest sanityzowane jako kompletna lista. Wizard zachowuje snapshot przypisany do wybranego templateId; świadomy wybór innego szablonu usuwa override. Custom draft także zachowuje podgląd. Nowa nazwa/długość planu nie kasuje ćwiczeń. |
| OB-W2 / P1 | Zatwierdź przy opóźnionym zapisie → edytuj nazwę/datę lub Wstecz/Android Back → zmień wybór → późny sukces usuwa nowszy szkic i zapisuje poprzedni wybór. | isSaving blokował tylko finalne CTA; nawigacja i edycja pozostawały dostępne. Brak synchronicznej blokady powtórnego wywołania hosta. | Ref blokuje drugi start operacji, UI blokuje edycję i nawigację podczas zapisu, Android Back respektuje isSaving. Błąd zachowuje wybór i odblokowuje retry. Podgląd także blokuje podmianę i powrót podczas zapisu. |
| OB-W3 / P1 | Restart z własnym planem w lokalnym szkicu i nieaktualnymi wymaganymi zgodami otwiera builder zamiast zgód. | resumedCustomDraft wymuszał step 5/mode own mimo ustawienia kroku 1 przez hosta. Sam draft nie jest dowodem recordConsent. | Przy braku potwierdzonych wymaganych zgód nowy mount przechodzi przez krok 1. Odpowiedzi i ćwiczenia pozostają dostępne po zgodach; odmowa Health nie blokuje podstawowego onboardingu. Powrót w tej samej zatwierdzonej sesji działa nadal. |

OB-W1/W2: `onboarding-preview-recovery.test.tsx` początkowo **3 RED**;
OB-W3: `plan-wizard-draft-consent.test.tsx` początkowo **3 RED**.
Rozszerzone testy sprawdzają również świadomy wybór nowego szablonu, powtórny
submit, retry, izolację UID oraz odrzucenie całego uszkodzonego podglądu zamiast
odtworzenia podzbioru ćwiczeń. Po poprawkach **90 PASS w 14 plikach**, typecheck
PASS i targeted ESLint bez ostrzeżeń.

Dowody: `onboarding-recovery-red.log`, `onboarding-custom-consent-red.log`,
`onboarding-recovery-green.log`, `onboarding-recovery-typecheck.log`,
`onboarding-recovery-lint.log` w tym katalogu. Produkcja: `Onboarding.tsx`,
`PlanWizard.tsx`, `PlanPreview.tsx`, `PlanStartStep.tsx`, `onboarding-draft.ts`.
Zmiany handlera zgód i auth wykonał oddzielnie agent native.

## Granice dowodów

Testy są lokalne, bez fizycznego urządzenia. Rzeczywisty suspend/resume nadal
ma status NOT RUN według `docs/LAUNCH-DEVICE-QA-2026-09-06.md`.

Istniejący mechanizm createActiveCycle używa transakcyjnego klucza
`cycle-${uid}-${startDate}`. Testy `plan-cycle-same-start-replan.test.tsx`
oraz `plan-cycle-choice-sequence.test.tsx` potwierdzają ponowienie po braku ACK
i zmianę wyboru dla tej samej daty startu bez duplikowania aktywnego cyklu.
**Dodatkowy P1 potwierdzony przez niezależny test agenta native:** niedziela
2026-09-06, zapis cyklu i planu z początkiem 2026-08-31, utrata ACK i profil nadal
nieukończony → odmontowanie → poniedziałek 2026-09-07 → ponowienie. Rzeczywisty
PlanWizard, dwa hooki, completeOnboardingPlan i owner draft tworzą dwa aktywne
cykle. Nowy test w `plan-cycle-choice-sequence.test.tsx` był RED; nie był to
problem mocka. Naprawa: transakcyjny `onboarding.pendingCycleId` w profilu wiąże
ponowienia z jednym cyklem niezależnie od daty; zachowuje legacy ID i chroni
cudze/zakończone plany. **69 targeted PASS**, łącznie z finalną datą/choice,
retry współbieżnej transakcji i komunikatem recovery dla niejednoznacznej historii.
Pełny opis i historyczne RED: `onboarding-week-boundary-findings.md`.

Końcowy przebieg po integracji: **469 plików / 4072 testy PASS, 16 dotychczasowych
SKIP**, typecheck PASS, lint 0 błędów / 15 zastanych ostrzeżeń. Pełny emulator
backendu przechodzi **18/18** także z transakcyjnym wskaźnikiem onboardingu.
Późniejsze zgłoszenie rozgrzewki z 7 września ma osobne uzupełnienie i ponowną
walidację końcową w raporcie głównym.
