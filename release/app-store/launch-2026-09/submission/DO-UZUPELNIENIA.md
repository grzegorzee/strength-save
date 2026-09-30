# App Review: historia przygotowania zgłoszenia

**Aktualny stan: 13.09.2026 o 17:21 czasu polskiego właściciel wysłał zgłoszenie do Apple. Build 148, grupa PRO i obie subskrypcje mają WAITING_FOR_REVIEW.** [Pełny zapis dat i dowody](../../../../docs/APP-REVIEW-2026-09-13.md).

Poniżej zachowano historię wcześniejszych ustaleń i czynności. Informacje o pustym szkicu, nieopublikowanym App Privacy, brakach Content Rights oraz niewysłaniu aplikacji opisują wcześniejsze etapy z tego samego dnia. Zostały zastąpione powyższym potwierdzeniem wysłania.

## Gotowe i sprawdzone w Apple

- Podpięty build 148, VALID, uprawniony do App Store, niewygasły.
- Polskie i angielskie opisy, tytuły, podtytuły i słowa kluczowe.
- 34 screenshoty: po 8 iPhone, 6 iPad i 3 Apple Watch na język. Wszystkie mają stan COMPLETE.
- Wszystkie wymagane pola kontaktu i logowania recenzenta są obecne. Konto PRO i logowanie sprawdzono dziś przy przygotowaniu materiałów. Hasła pozostają wyłącznie w prywatnych polach Apple.
- Strony support, privacy i terms odpowiadają HTTP 200.
- Obie subskrypcje PRO mają stan READY_TO_SUBMIT; ich wersje są robocze.
- Uzupełniono copyright: 2026 WEB3 POWER Grzegorz Jasionowicz.
- Zmieniono releaseType z AFTER_APPROVAL na MANUAL. Akceptacja Apple nie uruchomi sama premiery.

## Trzy błędy zwrócone przez Apple

Próba dodania wersji aplikacji do roboczego zgłoszenia zakończyła się HTTP 409. Apple zwrócił następujące braki:

1. DAC7: brak deklaracji, czy aplikacja oferuje usługi osobiste.
2. App Privacy: odpowiedzi dotyczące zbierania danych nie są opublikowane.
3. Content Rights: brak deklaracji praw do treści.

Pełny dowód bez haseł: `app-item-create.json`. Powstał pusty szkic zgłoszenia, ale aplikacja nie została do niego dodana. Nie wykonywano końcowego Submit for Review.

## DAC7

W App Information, w części dotyczącej DAC7, trzeba określić, czy aplikacja oferuje personal services. Z funkcji aktualnej aplikacji wynika odpowiedź **No**: to oprogramowanie do samodzielnego zapisywania i planowania treningów, nie zakup pracy trenera wykonywanej na indywidualne zlecenie. To wniosek z modelu produktu i definicji Apple. Jeśli faktycznie sprzedajesz w aplikacji indywidualną usługę żywego trenera, odpowiedź trzeba zmienić.

[Definicja i instrukcja Apple](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-information-for-directive-on-administrative-cooperation-7th-amendment/).

## Content Rights

Nie zaznaczać automatycznie braku treści zewnętrznych. Aplikacja ma integrację Strava i import danych użytkownika. Deklaracja używania treści zewnętrznych zawiera potwierdzenie posiadania wymaganych praw. Właściciel musi potwierdzić prawa do wykorzystywanych materiałów i usług, jeśli ta odpowiedź ma zostać wybrana. W tej operacji nie składano takiego oświadczenia.

[Zasady Apple dotyczące treści i usług zewnętrznych](https://developer.apple.com/app-store/review/guidelines/#intellectual-property).

## App Privacy: wynik audytu kodu i archiwum 148

Bieżącą listę pól i uzasadnienia zapisano w [APP-PRIVACY-CODE-AUDIT.md](APP-PRIVACY-CODE-AUDIT.md). Zastępuje wcześniejszą roboczą tabelę opartą częściowo na manifeście własnej aplikacji.

Audyt uwzględnia Google Sign-In, Firebase, RevenueCat, oryginalny upload avatara i zachowywanie treści maili z treningiem. Rekomendacja dla obecnego builda: 19 typów danych. Performance Data nie ma potwierdzonej wysyłki poza urządzenie. Precise Location uwzględniono ze względu na możliwość zachowania GPS w oryginalnym pliku avatara, a Coarse Location ze względu na Google Sign-In. Numer telefonu uwzględniono na podstawie deklaracji aktywnego SDK Google, a nie własnego profilu użytkownika.

Publiczne API nie udostępnia ankiety: autoryzowany odczyt appDataUsages zwraca 404, a oficjalna specyfikacja Apple 4.4.1 nie ma operacji dla tych deklaracji. Odpowiedzi nadal wymagają zapisania i publikacji w panelu. Nie opublikowano ich podczas audytu.

## Ostatni etap zgłoszenia

1. Uzupełnić trzy deklaracje i opublikować App Privacy.
2. Sprawdzić rynki dystrybucji w Pricing and Availability. Odczyt appAvailabilityV2 nie zwrócił konfiguracji; cena aplikacji jest skonfigurowana, lecz to nie potwierdza listy krajów. Ta pozycja nie pojawiła się w otrzymanej liście trzech błędów Apple.
3. Na stronie wersji 1.0 dołączyć pierwsze subskrypcje PRO Monthly i PRO Yearly razem z buildem 148.
4. Add for Review, sprawdzić zawartość szkicu, następnie Submit for Review.
5. Odczytać stan WAITING_FOR_REVIEW lub IN_REVIEW. Sam pusty szkic, READY_FOR_REVIEW lub obecny PREPARE_FOR_SUBMISSION nie oznacza wysłania.

Apple opisuje pierwszą wysyłkę subskrypcji z binarką przez panel: [Submitting subscriptions and subscription groups for App Review](https://developer.apple.com/documentation/appstoreconnectapi/submitting-subscriptions-and-subscription-groups-for-app-review).

W tej sesji API Apple działa, ale narzędzie sterowania przeglądarką nie jest dostępne. Nie odczytywano cookies ani haseł przeglądarki i nie wprowadzano deklaracji przez prywatne API panelu.

## Aktualny stan po uzupełnieniu App Privacy

2026-09-13: API zaakceptowało dodanie aplikacji do szkicu (201). Poprzednie błędy dotyczące App Privacy, Content Rights i DAC7 nie blokują już dodania wersji. Szkic d1171049-43f8-490c-8927-d879dfc8d21e zawiera teraz 4 elementy, wszystkie READY_FOR_REVIEW:

1. iOS 1.0 z buildem 148.
2. Grupa StrengthSave PRO, wersja metadanych 1.
3. PRO Monthly, wersja metadanych 1.
4. PRO Yearly, wersja metadanych 1.

Dołączenie produktów wykonano przez nowe relacje subscriptionVersion i subscriptionGroupVersion w reviewSubmissionItems. Wcześniejsza informacja, że dołączenie pierwszych subskrypcji wymaga ręcznej obsługi panelu, była zbyt kategoryczna. Wszystkie trzy operacje zwróciły 201, a odczyt szkicu potwierdził cztery elementy. Nie wysłano jeszcze finalnego zgłoszenia: submittedDate jest puste. Publikacja aplikacji pozostaje MANUAL. Szczegóły: complete-draft-preflight.json.

Następny krok w panelu: App Review lub Draft Submissions, otworzyć istniejący szkic, sprawdzić cztery elementy i kliknąć Submit for Review. Końcowe powodzenie potwierdza stan WAITING_FOR_REVIEW, nie READY_FOR_REVIEW.
