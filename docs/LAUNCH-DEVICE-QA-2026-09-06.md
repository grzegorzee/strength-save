# Ręczne testy urządzeniowe przed premierą — 2026-09-06

**Wszystkie scenariusze: NOT RUN.** Podczas audytu nie było fizycznych urządzeń.
Uruchomienie aplikacji lub ekranu logowania na symulatorze nie potwierdza treningu,
trwałości danych po suspendzie, alarmu systemowego, Health ani zakupów.

## Przygotowanie i zapis dowodów

- Wyłącznie dedykowane konta testowe A/B i dane syntetyczne. Osobny profil/telefon
  do Health; nie importować prywatnej historii zdrowotnej ani treningowej.
  Zakupy wyłącznie Apple Sandbox / Google Play license testing, bez realnych opłat.
- Przygotować plan z 6 ćwiczeniami, szybki trening, serie kg/powtórzenia,
  czas/dystans/asysta, notatki i RPE. Osobno CSV Strong/Hevy z cytowaną notatką
  wieloliniową, przecinkiem i `"`, wariant bez RPE oraz backup JSON v3.
- Testować iOS i Android fizycznie. Dla Androida uwzględnić świeżą instalację
  na API 31+ z wyłączonym dostępem do dokładnych alarmów. Zgoda na powiadomienia
  i dostęp do dokładnych alarmów są odrębnymi ustawieniami.
- Dla każdego przebiegu zapisać: tester, data/strefa czasowa, model, wersja OS,
  środowisko backendu i jego rewizja, Git SHA aplikacji, źródło instalacji,
  **iOS `1.0.0` + `CFBundleVersion` / Android `1.0.0` + `versionCode`** oraz hash
  zainstalowanego artefaktu. Numer odczytać z rzeczywiście zainstalowanego builda;
  wartości z projektu nie są dowodem instalacji.
- Dowód per ID/platforma: wynik, rzeczywisty przebieg, oczekiwany i faktyczny czas
  alarmu/zapisu, ustawienia sieci/zgód/ciszy/oszczędzania baterii, nagranie lub
  zrzuty przed/po oraz identyfikatory syntetycznych sesji. Dźwięk i haptykę ocenić
  na urządzeniu; samo nagranie ekranu ich nie potwierdza. Nie zapisywać tokenów
  ani danych prawdziwych użytkowników. Błąd wiązać z numerem builda i dowodem.

## Macierz

Każdy wiersz „oba” wykonać oddzielnie na iOS i Androidzie. Wynik jednej platformy
nie zalicza drugiej. Każde powtórzenie po zmianie builda wymaga własnego dowodu.

| ID / platforma | Kroki | Oczekiwany wynik | Status |
| --- | --- | --- | --- |
| W01 / oba | Plan: odhacz serię i dopisz notatkę → wyjdź → rozpocznij szybki trening → wróć do planu → zakończ → synchronizuj → otwórz historię. | Wszystkie 6 ćwiczeń planu pozostaje dostępnych; sesje nie mieszają serii/notatek. Wynik planu i szybkiego treningu zapisany pod właściwymi sesjami. | NOT RUN |
| W02 / oba | Włącz tryb samolotowy; zapisz serie/notatki → zgaś ekran na 2 min → wróć → zamknij proces i otwórz aplikację → zakończ offline → przywróć sieć. | Szkic zachowuje ostatnie dane; zakończenie oczekuje na sync i ma dostępne recovery. Po ACK dokładnie jeden trening w historii; brak utraty serii lub podwójnego zapisu. | NOT RUN |
| W03 / oba | Po pierwszym sync zmień notatkę ćwiczenia, wyczyść notatkę dnia, cofnij pominięcie ćwiczenia, usuń serię. Zapisz, wyjdź, wróć, zakończ i synchronizuj. | Nowa notatka zostaje; skasowane treści/serie nie wracają. Cofnięte pominięcie pozostaje cofnięte. Lokalny szkic nie znika przed potwierdzeniem aktualnej treści. | NOT RUN |
| W04 / oba | Zapisz wyniki: 12,25 kg, czas 60 s, dystans 250 m i asysta 17,5 kg. Zrób eksport CSV w PL/EN i backup JSON v3; odtwórz JSON na koncie testowym zgodnie z jego uprawnieniami. | Wartości pozostają dokładne; CSV zawiera czas serii/dystans/asystę i kanoniczne kg. JSON zachowuje obsługiwane dane. Własny CSV służy analizie, nie jest formatem pełnego odtwarzania. | NOT RUN |
| T01 / oba | Włącz systemowe powiadomienia i dźwięk. Start przerwy 45/90 s → od razu zgaś ekran → czekaj do deadline → wróć. Powtórz z normalnym oszczędzaniem baterii. | Przy zawieszonym JS alarm pochodzi z systemu; właściwy dźwięk/haptyka według ustawień OS. Po powrocie czas wynika z deadline; brak ponownego alarmu i wiszącego timera. Zanotowany faktyczny czas dostarczenia. | NOT RUN |
| T02 / oba | Rozgrzewka → seria robocza → timer innego ćwiczenia; zmień czas ±15 s, zgaś ekran, wróć i kliknij „Pomiń”. Powtórz zakończenie ostatnią serią treningu. | Jedna aktywna przerwa i najwyżej jedno właściwe powiadomienie. Zmiana przezbraja deadline; pominięcie i zakończenie kasują alarm. Stary deadline nie wywołuje późniejszego sygnału. | NOT RUN |
| T03 / oba | Odrzuć zgodę na powiadomienia; wykonaj przerwę i resume. Następnie nadaj zgodę w ustawieniach i rozpocznij nową przerwę. Sprawdź każdy z 3 dźwięków; powtórz z wyciszonym telefonem. | Brak zgody nie blokuje treningu ani zegara po resume; aplikacja nie udaje dostarczenia alarmu. Po nadaniu zgody sygnał wraca. Dźwięki odpowiadają wyborowi, z uwzględnieniem ciszy i ustawień kanałów OS. | NOT RUN |
| T04 / Android API 31+ | Świeża instalacja: odmów dokładnych alarmów → sprawdź komunikat i przerwę przy zgaszonym ekranie → przejdź z aplikacji do ustawień, nadaj dostęp, wróć i rozpocznij nową przerwę. Cofnij dostęp i ponownie otwórz aplikację. | Bez dostępu widoczna informacja i droga do ustawień; trening działa, możliwe opóźnienie alarmu jest odnotowane. Po nadaniu dostęp rozpoznany i nowy alarm działa według deadline. Cofnięcie dostępu nie gubi szkicu, także gdy OS restartuje proces. | NOT RUN |
| H01 / oba | Włącz funkcje zdrowotne; zakończ trening siłowy i osobno ręczne cardio. Wywołaj ponowienie sync po chwilowej awarii/utracie sieci i ponownie otwórz aplikację. | Sukces wymaga potwierdzenia właściwej warstwy zapisu. W systemowym Health znajduje się jeden wpis każdej aktywności; retry nie tworzy duplikatu. Brak fałszywego sukcesu po odmowie lub błędzie mostu. | NOT RUN |
| H02 / oba | Zablokuj/opóźnij zapis dla zgody G1 → wycofaj zgodę → ponów → nadaj nową zgodę G2 → pozwól zakończyć staremu żądaniu. | Stara operacja nie uzyskuje automatycznie uprawnień G2 i nie rozpoczyna nowego zapisu/retry pod G1. Oczekujące dane nie znikają wskutek samego potwierdzenia bazowego treningu; UI pozwala odzyskać dane. | NOT RUN |
| H03 / oba | A rozpoczyna eksport Health z opóźnioną odpowiedzią → wyloguj A i zaloguj B → zwolnij odpowiedź oraz uruchom retry. | Wynik A nie aktualizuje stanu B; żaden nowy zapis/retry danych A nie startuje z tożsamością lub zgodą B. Wcześniej rozpoczęty zapis OS, jeśli zdążył się zakończyć, nie jest błędnie przypisany B. | NOT RUN |
| I01 / oba | Importuj Strong i Hevy z RPE i wieloliniową notatką przy wyłączonych funkcjach zdrowotnych; następnie włącz je i ponów. Osobno importuj plik bez RPE przy wyłączonych funkcjach. | Plik z RPE bez zgody odrzucony w całości z czytelnym wyjściem do ustawień; zero częściowych zapisów. Po zgodzie notatka/RPE i kolejne serie zachowane. Plik bez RPE importuje dane bazowe bez wymagania zgody Health. | NOT RUN |
| I02 / oba | A importuje plik dwukrotnie → B importuje ten sam plik → wróć do A → cofnij import A. Powtórz zmianę konta podczas opóźnionego importu/restore JSON i Undo. | Deduplikacja dotyczy tylko właściciela. A/B mają oddzielną historię importów; Undo A nie usuwa B ani wcześniejszych niezwiązanych treningów. Spóźniona operacja nie zapisuje/usuwa pod nowym UID; częściowy wynik jest jawny. | NOT RUN |
| A01 / oba | A ma szkic offline i opóźniony sync → wyloguj → zaloguj B → przywróć sieć → wróć do A. | B nie widzi danych, błędów ani uprawnień A. Szkic A nadal dostępny dla A; późna odpowiedź nie nadpisuje stanu B. Nie ma automatycznego przypisania anonimowej starej historii importu do B. | NOT RUN |
| P01 / oba, sandbox | Zimny start po zalogowaniu A → otwórz ofertę → kup → zamknij i uruchom aplikację → przywróć zakupy. Osobno anuluj systemowe okno zakupu. | Właściwy produkt/cena i systemowy arkusz; jeden zakup, poprawne uprawnienia A po potwierdzeniu. Restore jest powtarzalny. Anulowanie nie przyznaje premium i pozostawia działający ekran. | NOT RUN |
| P02 / oba, sandbox | Opóźnij odczyt uprawnień/przerwij sieć → retry po odzyskaniu sieci. Osobno A rozpoczyna odczyt/restore → przełącz na B przed odpowiedzią. | B nie dostaje premium ze spóźnionego wyniku A. Ekran ma recovery po błędzie/timeout; kolejny odczyt lub zakup może się rozpocząć. Aktywny arkusz sklepu nie jest automatycznie ponawiany ani zamykany przez timeout odczytu. | NOT RUN |
| OB01 / oba | Nowy użytkownik: wybierz szablon → podmień ćwiczenie w podglądzie → Wstecz → podgląd → zamknij proces → wróć → zatwierdź. Powtórz dla własnego planu. | Zamienniki i komplet ćwiczeń pozostają w szkicu tego konta i w zapisanym planie. Świadomy wybór innego szablonu usuwa wyłącznie poprzedni podgląd. | NOT RUN |
| OB02 / oba | Opóźnij zapis planu; kliknij zatwierdzenie dwukrotnie i spróbuj Wstecz/gestu cofania. Osobno utrata odpowiedzi po zapisie → restart przy zmianie tygodnia → ponowienie onboardingu. Zmianę czasu wykonać tylko w izolowanym środowisku testowym. | Jedna operacja, zablokowana edycja podczas oczekiwania, po błędzie dostępny retry. Po cold restart i nowym terminie powstaje dokładnie jeden aktywny cykl; historia zakończonych cykli pozostaje. | NOT RUN |
| OB03 / oba | Wznów szkic własnego planu z nieaktualnymi wymaganymi zgodami → zaakceptuj aktualne warunki i odrzuć opcjonalne Health. Osobno opóźnij ACK zgód A, przełącz na B i zwolnij odpowiedź; wycofaj Health z drugiej sesji przed starszym ACK. | Wymagane zgody poprzedzają builder, szkic pozostaje. Odmowa Health pozwala skończyć podstawowy onboarding. Starsza zgoda A nie jest przypisywana B; nowsze wycofanie Health ma pierwszeństwo. | NOT RUN |
| OB04 / oba | Logowanie i rejestracja: otwórz klawiaturę, wpisz syntetyczne dane, przełącz pola, przewiń do przycisku, zamknij klawiaturę i obróć telefon. Sprawdź także większy systemowy tekst. | Pola i przycisk są osiągalne, dane nie znikają, klawiatura nie przykrywa jedynej drogi dalej. Zmiana nie powoduje skoku layoutu lub scrolla podczas istniejącego treningu. | NOT RUN |
| R01 / oba | Włącz propozycję rozgrzewki. Rozpocznij świeży trening z planu głównym przyciskiem Dzisiaj; osobno rozpocznij szybki trening z wybranym ćwiczeniem. Otwórz górną rozgrzewkę standardową i początkującą. Powtórz przy jawnie wyłączonej propozycji oraz starcie z Watch. | Start z telefonu respektuje ustawienie propozycji; sterowanie z Watch zachowuje odrębny przebieg. Fazy górnej rozgrzewki nie zlecają ponownie tych samych krążeń ramion. Serie wprowadzające do ćwiczenia pozostają odrębnym, opisanym elementem. | NOT RUN |
| R02 / oba | Odhacz jedynie elementy rozgrzewki, bez serii roboczych → zgaś ekran → wróć → zamknij proces → wznów tę samą sesję. Następnie rozpocznij inną sesję i wróć do pierwszej. | Ukończone elementy rozgrzewki są zachowane; wznowienie nie tworzy pustej sesji ani nie kasuje odhaczeń. Nowa sesja ma własny stan i właściwą propozycję rozgrzewki. | NOT RUN |

## Zaliczenie

Uzupełnić wynik **PASS / FAIL** osobno dla każdej wymaganej platformy dopiero po
wykonaniu kroków na wskazanym fizycznym urządzeniu i buildzie oraz podłączeniu
dowodu. Brak sandboxu, kontroli opóźnienia lub wymaganej konfiguracji oznacza
**NOT RUN** z powodem, nie PASS. Szczególnie W01–W03, T01–T04 i H01–H03 wymagają
rzeczywistego sprawdzenia suspend/resume i zachowania systemu. Zielone testy
automatyczne i smoke logowania na symulatorze nie zastępują tej macierzy.
