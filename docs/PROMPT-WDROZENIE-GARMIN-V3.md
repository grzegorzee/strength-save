# PROMPT: autonomiczne dokończenie Garmin v3 (przerwy + zegar sesji + ekran Sesja)

Skopiuj poniższy blok jako pierwszą wiadomość w nowej sesji w `~/FIRMA/projekty/strength_save`.

---

Przejmij dokończenie apki Garmin Connect IQ wg planu `docs/PLAN-GARMIN-V3-2026-07-28.md`. Pracuj w `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`.

KONTEKST: apka CIQ (folder `garmin/`) DZIAŁA na zegarku usera (epix Gen 2, id CIQ `epix2`) — UI v2 + szybki trening wdrożone dziś (2026-07-28). Ostatni commit to `wip(garmin): v3 w toku` — repo garmin/ celowo NIE KOMPILUJE SIĘ (brakujące stringi), FAZA 1 planu to naprawia. Przeczytaj NAJPIERW: plan (cały, z wklejonymi snippetami kodu) + `garmin/README.md` (STATUS) + memory `garmin-ciq-dev-workflow` i `garmin-device-user`.

TRYB: 100% autonomiczny. Decyzje designu JUŻ ZAPADŁY (sekcja 0 planu, twarda zasada 3) — nie pytaj, nie podważaj. Źródło prawdy o postępie: checkboxy w pliku planu, odhaczaj po wykonaniu i commituj plan razem z kodem.

ŚRODOWISKO:
- Build: `cd garmin && export PATH="$HOME/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH" && ./build.sh epix2`
- Klucz developerski: `~/.garmin/developer_key.der` (jest).
- Symulator: warsztat opisany w FAZIE 5 planu i memory `garmin-ciq-dev-workflow` (monkeydo przez nohup, zrzuty po window id z Quartz, klawisze osascript 126/125/36/53).

TWARDE ZASADY (pełna lista w sekcji 0 planu):
- Symulator jest SPAROWANY z produkcyjnym kontem usera. **NIGDY nie klikaj "Zakończ trening" w symulatorze** — wysłałby trening na realne konto. Odhaczanie serii = lokalne, dozwolone.
- Zero `git add -A` (w repo m.in. nietrackowane 699 MB w `animacje-cwiczen/`). Pliki imiennie.
- Monkey C: `new Lang.Method($.Modul, :sym)` zamiast `method()` w module; brak `.bind()`; `FONT_NUMBER_*` tylko cyfry; stringi do OBU plików (resources-pol + resources).
- Weryfikacja wizualna obowiązkowa: zrzuty z symulatora czytasz narzędziem Read i OCENIASZ layout (obcinanie na okrągłym ekranie!), nie tylko odnotowujesz istnienie pliku.
- Nie wchodź w zakres "POZA ZAKRESEM" planu (Store, cardio, HR, revoke symulatora).

KOLEJNOŚĆ: FAZY 1→5 sekwencyjnie (1 odblokowuje kompilację). Commit per faza, opisy jak w planie, push na main.

HANDOFF PO CAŁOŚCI: świeży `.prg` na Pulpit (`cp garmin/bin/strengthsave-epix2.prg ~/Desktop/StrengthSave.prg`) + krótki raport dla usera: co nowego, zrzuty ekranów, instrukcja wgrania (USB → OpenMTP, Garmin Express ZAMKNIĘTY → przeciągnij do GARMIN/Apps → Replace → odłącz) i co przetestować na siłowni (przerwy z menu, mini zegar po pierwszej serii, swipe w lewo na ekran Sesja). Zaktualizuj STATUS w `garmin/README.md`.
