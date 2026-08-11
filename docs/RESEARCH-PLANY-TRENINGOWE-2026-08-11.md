# Research: 12 nowych szablonów planów treningowych (X26 / Z246)

> Wynik agenta research 2026-08-11. Źródło danych do implementacji w `src/data/planTemplates.ts`.

Research zakończony. Poniżej pełny wynik.

---

# 12 nowych szablonów planów dla Strength Save

## Executive summary

Przeszukałem materiały topowych twórców (Nippard, Israetel/RP, Ethier, Wendler, Norton, Contreras, Cody Lefever/GZCL, nSuns) oraz wiki r/Fitness i r/bodyweightfitness. Wybrałem 12 planów, które **nie duplikują** obecnych 12 szablonów w `src/data/planTemplates.ts`, a domykają luki: 2 dni minimalist, kalistenika bez sprzętu, glute/kobiety, siła procentowa (5/3/1, GZCLP, nSuns), powerbuilding 4-5 dni (PHUL, PHAT), hipertrofia naukowa z rampą objętości (RP) i 6-dniowy Arnold Split.

Rozkład dni: 2 dni (1 plan), 3 dni (3), 4 dni (3), 5 dni (3), 6 dni (1).

Uwaga: programy płatne (Nippard "Pure Bodybuilding", RP Hypertrophy App) nie mają publicznej rozpiski 1:1. Te dwa plany zbudowałem **w stylu / wg publicznych zasad** autorów (darmowe filmy, artykuły), co jest bezpieczne prawnie i uczciwe. Oznaczam je jawnie jako "inspirowany".

---

## Legenda mapowania na bibliotekę

Wszystkie ćwiczenia sprawdziłem względem `src/data/exerciseLibrary.ts` (105 pozycji). Ćwiczenia oznaczone **[NOWE]** trzeba dodać do biblioteki albo podmienić na wskazany zamiennik. Pełna lista braków na końcu.

---

# 1. Minimalna Dawka

**ID:** `tpl-minimalist-2` · **EN:** `Minimalist Protocol` · **PL:** `Minimalna Dawka`

**Źródło:** Jeff Nippard, "The Best Science-Based Minimalist Workout Plan (Under 45 Mins)" (YouTube: `https://www.youtube.com/watch?v=eMjyvIQbn9M`), omówienie: [Fitness Volt](https://fitnessvolt.com/jeff-nippard-minimalist-training-program/)

**Dla kogo:** początkujący i średniozaawansowani, mało czasu, powrót po przerwie
**Cel:** masa i utrzymanie siły przy minimalnej objętości (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `beginner` · **Dni:** 2 · **Długość:** 8 tygodni

### Dzień 1 (poniedziałek) - Całe ciało A
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie hantli na ławce płaskiej | 1 x 4-6 (ciężko) + 1 x 8-10 (back-off) |
| Martwy Ciąg Rumuński (RDL) | 2 x 8-10 |
| Ściąganie drążka (Szeroki nachwyt) | 1 x 10-12 |
| Ściąganie drążka (Wąski nachwyt) | 1 x 10-12 |
| Wykroki bułgarskie | 1 x 8-10 / noga |
| Wyprosty francuskie zza głowy | 1 x 12-15 + drop set (-30%) |
| Wznosy bokiem na maszynie | 1 x 12-15 + drop set (-30%) |
| Wspięcia na palce siedząc | 1 x 12-15 + drop set (-30%) |

### Dzień 2 (czwartek) - Całe ciało B
| Ćwiczenie | Serie x powt. |
|---|---|
| Hack Squat (maszyna) | 1 x 4-6 (RPE 9) + 1 x 8-10 (kontrolowany negatyw) |
| Wyciskanie sztangi na skosie | 2 x 10-12 (superseria A) |
| Wiosłowanie T-bar | 2 x 10-12 (superseria A) |
| Uginanie nóg na maszynie (Siedząc) | 1 x 10-12 + drop set (-30%) |
| Uginanie sztangi stojąc | 1 x 12-15 + myo-reps |
| Modlitewnik (Cable Crunch) | 1 x 12-15 + 2 drop sety |

**Progresja:** double progression. Pierwsza seria ciężka do RPE 9 (1 powtórzenie w zapasie), back-off do RPE 10. Gdy trafisz górę zakresu we wszystkich seriach, dodaj 2,5 kg (góra) lub 5 kg (dół). Przerwa 3 min po seriach ciężkich, 60-90 s po izolacji.

---

# 2. Sześć Ruchów

**ID:** `tpl-six-lifts-3` · **EN:** `Six Lift Blueprint` · **PL:** `Sześć Ruchów`

**Źródło:** Jeremy Ethier / Built With Science, "The PERFECT Full Body Workout Routine (3x/Week: 6 Exercises + 1 Bonus)" ([builtwithscience.com](https://builtwithscience.com/workouts/full-body-workout-routine/))

**Dla kogo:** początkujący, osoby wracające, każdy kto chce prostoty
**Cel:** masa i ogólna sylwetka (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `beginner` · **Dni:** 3 · **Długość:** 8 tygodni

Idea: **te same 6 ćwiczeń na każdym treningu**, zmienia się tylko obciążenie i zakres powtórzeń. Minimalny próg wejścia, maksymalna częstotliwość na mięsień (3x/tydz).

### Dzień 1 (poniedziałek), Dzień 2 (środa), Dzień 3 (piątek) - identyczne
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie hantli (Lekki skos) | 3 x 10-15 |
| Przysiad goblet | 3 x 10-15 |
| Podciąganie na drążku | 3 x 5-8 (lub Ściąganie drążka 3 x 10-12) |
| Martwy Ciąg Rumuński (RDL) | 3 x 10-15 |
| Wiosłowanie na lince siedząc | 3 x 10-15 |
| Wznosy bokiem (Lateral Raise) | 3 x 10-20 |
| **Dodatek (opcja):** Dead Bug (Robak - Brzuch) | 3 x 5 / stronę |

**Wariant zaawansowany** (do rozważenia jako drugi preset albo tygodnie 5-8): Wyciskanie hantli (Lekki skos) 3 x 6-8, Przysiad ze sztangą (High Bar) 3 x 6-8, Podciąganie na drążku 3 x 5-8 (z obciążeniem), RDL 3 x 6-10, Wiosłowanie na lince siedząc 3 x 10-15, Wznosy bokiem 3 x 10-20.

**Progresja:** double progression. Dodaj ciężar dopiero, gdy zrobisz górę zakresu we wszystkich seriach z czystą techniką. Gdy ciężaru dodać się nie da, liczy się dołożenie powtórzenia albo poprawa techniki.

---

# 3. Trójstopniowa Siła

**ID:** `tpl-gzclp-3` · **EN:** `Three Tier Strength` · **PL:** `Trójstopniowa Siła`

**Źródło:** GZCLP (Cody Lefever, metoda GZCL). Opis: [Lift Vault](https://liftvault.com/programs/powerlifting/gzclp-program-spreadsheets/), [SET FOR SET](https://www.setforset.com/blogs/news/gzclp-beginner-linear-progression-strength-program), [thefitness.wiki](https://thefitness.wiki/routines/strength-training-muscle-building/)

**Dla kogo:** początkujący po StrongLifts / Starting Strength, którym kończy się liniowa progresja
**Cel:** siła + trochę masy (`goal: 'strength'`, `objective: 'peak_strength'`)
**Level:** `beginner` · **Dni:** 3 · **Długość:** 12 tygodni

Struktura: **T1** ciężki bój główny, **T2** średni bój dodatkowy, **T3** lekka izolacja. Reguła objętości 1:2:3 (na 1 powtórzenie w T1 przypadają 2 w T2 i 3 w T3).

### Dzień 1 (poniedziałek) - Przysiad
| Tier | Ćwiczenie | Serie x powt. |
|---|---|---|
| T1 | Przysiad ze sztangą (High Bar) | 5 x 3, ostatnia seria AMRAP (min. 3) |
| T2 | Wyciskanie sztangi na ławce płaskiej | 3 x 10 |
| T3 | Prasa nożna | 3 x 15, ostatnia AMRAP |
| T3 | Ściąganie drążka (Szeroki nachwyt) | 3 x 15, ostatnia AMRAP |

### Dzień 2 (środa) - Wyciskanie
| Tier | Ćwiczenie | Serie x powt. |
|---|---|---|
| T1 | Wyciskanie sztangi na ławce płaskiej | 5 x 3, ostatnia AMRAP |
| T2 | Przysiad ze sztangą (High Bar) | 3 x 10 |
| T3 | Wyprosty na lince (Pushdown) | 3 x 15, ostatnia AMRAP |
| T3 | Wiosłowanie na lince siedząc | 3 x 15, ostatnia AMRAP |

### Dzień 3 (piątek) - Martwy ciąg
| Tier | Ćwiczenie | Serie x powt. |
|---|---|---|
| T1 | Martwy ciąg klasyczny | 5 x 3, ostatnia AMRAP |
| T2 | Wyciskanie sztangi nad głowę (OHP) | 3 x 10 |
| T3 | Uginanie nóg na maszynie (Leżąc) | 3 x 15, ostatnia AMRAP |
| T3 | Uginanie sztangi stojąc | 3 x 15, ostatnia AMRAP |

**Progresja (liniowa z AMRAP):**
- T1: co trening +2,5 kg (góra) / +5 kg (dół). Po dwóch nieudanych sesjach zmiana schematu: 5x3 → 6x2 → 10x1 → reset na 85-90% ciężaru i start od 5x3.
- T2: co trening +2,5 kg / +5 kg. Nie domkniesz 3x10 → powtórz ciężar, potem 3x8 → 3x6 → reset.
- T3: ciężar w górę dopiero, gdy w ostatniej serii AMRAP zrobisz 25+ powtórzeń.

---

# 4. Własny Ciężar

**ID:** `tpl-calisthenics-3` · **EN:** `Bodyweight Foundation` · **PL:** `Własny Ciężar`

**Źródło:** r/bodyweightfitness Recommended Routine ([redditbwf.github.io](https://redditbwf.github.io/wiki/recommended_routine.html), [antranik.org/rr](https://antranik.org/rr/))

**Dla kogo:** początkujący bez siłowni, dom, wakacje, hotel
**Cel:** siła relatywna i kondycja bez sprzętu (`goal: 'health'`, `objective: 'athletic'`)
**Level:** `beginner` · **Dni:** 3 · **Długość:** 12 tygodni

Wymagany minimalny sprzęt: drążek lub stabilny stół (do wiosłowania), poręcze lub dwa krzesła.

### Dzień 1 (pon.), Dzień 2 (śr.), Dzień 3 (pt.) - identyczne
**Rozgrzewka (5-10 min):** Wall Angel 10, Mountain Climbers 30 s, Dead Bug (Robak - Brzuch) 30 s, przysiady bez obciążenia 10.

| Para | Ćwiczenie | Serie x powt. | Przerwa |
|---|---|---|---|
| A | Podciąganie na drążku | 3 x 5-8 | 90 s |
| A | Przysiady wykroczne (lub Cossack Squat) | 3 x 5-8 | 90 s |
| B | Dips (pompki na poręczach) | 3 x 5-8 | 90 s |
| B | **[NOWE]** Nordic Curl / zamiennik: Glute Bridge jednonóż | 3 x 5-8 | 90 s |
| C | **[NOWE]** Wiosłowanie w podporze (Australian pull-up) | 3 x 5-8 | 90 s |
| C | Pompki | 3 x 5-8 | 90 s |
| Core | Ab Rollout (albo Plank) | 3 x 8-12 | 60 s |
| Core | Pallof Press | 3 x 8-12 | 60 s |
| Core | Prostowniki grzbietu (Hyperextensions) | 3 x 8-12 | 60 s |

**Progresja (progresja ruchu, nie ciężaru):** gdy zrobisz 3 x 8 z czystą techniką, przechodzisz na trudniejszy wariant i zaczynasz od 3 x 5. Przykłady drabinek:
- Podciąganie: martwy zwis → negatywy → podciąganie pełne → z obciążeniem
- Dipy: pompki na poręczach z podparciem → pełne dipy → dipy z obciążeniem
- Pompki: pod kątem (o ścianę/ławkę) → pełne → pompki diamentowe → archer
- Wiosłowanie: nogi ugięte → nogi proste → nogi na podwyższeniu

Izometrie (Plank, Hollow Hold, L-sit): 3 serie po 10-30 s, progresja po 30 s w każdej serii.
Tempo: 1-0-X-0 (sekunda w dół, bez pauzy, dynamicznie w górę).

---

# 5. Moc Pośladków

**ID:** `tpl-glutes-3` · **EN:** `Glute Foundations` · **PL:** `Moc Pośladków`

**Źródło:** Bret Contreras & Kellie Davis, "Strong Curves" - program Bootyful Beginnings. Rozpiski: [Lift Vault](https://liftvault.com/programs/strength/strong-curves-program-spreadsheet/), [Boostcamp](https://www.boostcamp.app/coaches/bret-contreras/strong-curves-bootyful-beginnings)

**Dla kogo:** kobiety zaczynające trening siłowy, priorytet pośladki i dół ciała
**Cel:** kształt pośladków + ogólna siła (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `beginner` · **Dni:** 3 · **Długość:** 12 tygodni (3 fazy po 4 tygodnie)

Każdy trening: 2 ćwiczenia pośladkowe (para A), 2 na całe ciało (para B), 1-3 na core i stabilizację.

### Dzień 1 (poniedziałek) - Trening A
| Ćwiczenie | Serie x powt. |
|---|---|
| Glute Bridge | 3 x 10-20 (superseria A) |
| Wiosłowanie hantlem jednorącz (Laty) | 3 x 8-12 / rękę (superseria A) |
| Przysiad goblet (faza 1: przysiad do skrzyni) | 3 x 10-20 (superseria B) |
| Wyciskanie sztangi na ławce płaskiej | 3 x 8-12 (superseria B) |
| Martwy Ciąg Rumuński (RDL) | 3 x 10-20 |
| Odwodziciele na maszynie (albo odwodzenie leżąc bokiem) | 1 x 15-30 / stronę |
| Plank | 1 x 20-120 s |

### Dzień 2 (środa) - Trening B
| Ćwiczenie | Serie x powt. |
|---|---|
| Hip Thrust (Wypychanie bioder), jednonóż z nogą na podwyższeniu | 3 x 10-20 (superseria A) |
| Ściąganie drążka (Szeroki nachwyt) | 3 x 8-12 (superseria A) |
| **[NOWE]** Wejścia na skrzynię (Step-up) / zamiennik: Wejścia bokiem na skrzynię | 3 x 10-20 / nogę (superseria B) |
| Wyciskanie hantli nad głowę (Siedząc) | 3 x 8-12 (superseria B) |
| Prostowniki grzbietu (Hyperextensions) | 3 x 10-20 |
| Pallof Press | 1 x 10 / stronę |
| Hollow Hold | 1 x 20-60 s |

### Dzień 3 (piątek) - Trening C
| Ćwiczenie | Serie x powt. |
|---|---|
| **[NOWE]** Glute March / zamiennik: Glute Bridge z zatrzymaniem | 3 x 60 s (superseria A) |
| Wiosłowanie na lince siedząc | 3 x 8-12 (superseria A) |
| Przysiad goblet | 3 x 10-20 (superseria B) |
| Wyciskanie hantli (Lekki skos) | 3 x 8-12 (superseria B) |
| Martwy Ciąg Rumuński (RDL) jednonóż | 3 x 10-20 / nogę |
| **[NOWE]** Chód bokiem z gumą (X-band walk) / zamiennik: Odwodzenie na lince | 1 x 10-20 kroków / stronę |
| Cable Woodchopper | 1 x 10 / stronę |

**Progresja przez fazy (kluczowa cecha programu):**
- Tygodnie 1-4: głównie masa własna i hantle, uczysz się wzorców ruchu, zakresy 10-20
- Tygodnie 5-8: wchodzą sztanga i kettlebell, zakresy 8-12, ciężar rośnie
- Tygodnie 9-12: pełne boje ze sztangą (Hip Thrust ze sztangą, Przysiad ze sztangą, RDL ze sztangą), zakresy 6-12

W obrębie fazy: double progression. Startujesz od dołu zakresu, dokładasz powtórzenia, po trafieniu góry zakresu we wszystkich seriach dodajesz 2,5 kg i wracasz na dół zakresu. Contreras rekomenduje autoregulację RPE zamiast sztywnych procentów.

---

# 6. Moc i Objętość (PHUL)

**ID:** `tpl-phul-4` · **EN:** `Power Hypertrophy U/L` · **PL:** `Moc i Objętość`

**Źródło:** Brandon Campbell, PHUL. Pełna rozpiska: [Muscle & Strength](https://www.muscleandstrength.com/workouts/phul-workout), [Lift Vault](https://liftvault.com/programs/strength/phul-spreadsheet/), [StrengthLog](https://www.strengthlog.com/phul-workout-routine/)

**Dla kogo:** średniozaawansowani, którzy chcą jednocześnie siły i sylwetki
**Cel:** siła + masa (`goal: 'strength'`, `objective: 'build_muscle'`)
**Level:** `intermediate` · **Dni:** 4 · **Długość:** 12 tygodni

### Dzień 1 (poniedziałek) - Góra siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi na ławce płaskiej | 4 x 3-5 |
| Wyciskanie hantli (Lekki skos) | 3 x 6-10 |
| Wiosłowanie sztangą | 4 x 3-5 |
| Ściąganie drążka (Szeroki nachwyt) | 3 x 6-10 |
| Wyciskanie sztangi nad głowę (OHP) | 3 x 5-8 |
| Uginanie sztangi stojąc | 3 x 6-10 |
| Skull Crushers | 3 x 6-10 |

### Dzień 2 (wtorek) - Dół siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 4 x 3-5 |
| Martwy ciąg klasyczny | 4 x 3-5 |
| Prasa nożna | 4 x 10-15 |
| Uginanie nóg na maszynie (Leżąc) | 4 x 6-10 |
| Wspięcia na palce (Nogi proste) | 4 x 6-10 |

### Dzień 3 (czwartek) - Góra objętościowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi na skosie | 4 x 8-12 |
| Rozpiętki hantlami | 3 x 8-12 |
| Wiosłowanie na lince siedząc | 4 x 8-12 |
| Wiosłowanie hantlem jednorącz (Laty) | 3 x 8-12 |
| Wznosy bokiem (Lateral Raise) | 4 x 8-12 |
| Uginanie hantli z supinacją (Ławka skośna) | 3 x 8-12 |
| Wyprosty na lince (Pushdown) | 3 x 8-12 |

### Dzień 4 (piątek) - Dół objętościowo
| Ćwiczenie | Serie x powt. |
|---|---|
| **[NOWE]** Przysiad przedni (Front Squat) / zamiennik: Hack Squat (maszyna) | 4 x 8-12 |
| Wykroki chodzone | 3 x 8-12 / nogę |
| Wyprosty nóg na maszynie | 3 x 10-15 |
| Uginanie nóg na maszynie (Siedząc) | 3 x 10-15 |
| Wspięcia na palce siedząc | 4 x 8-12 |
| Wspięcia na palce na suwnicy | 3 x 8-12 |

**Progresja:** dni siłowe to liniowa progresja obciążenia (+2,5 kg góra, +5 kg dół, gdy domkniesz wszystkie serie w zakresie 3-5). Dni objętościowe to double progression w zakresie 8-12. Wszystkie serie z minimum 1 powtórzeniem w zapasie (RIR 1). Każdy mięsień 2x w tygodniu.

---

# 7. Żelazny Cykl (5/3/1 Boring But Big)

**ID:** `tpl-531-bbb-4` · **EN:** `Iron Cycle 5/3/1` · **PL:** `Żelazny Cykl`

**Źródło:** Jim Wendler, 5/3/1 + szablon Boring But Big ([jimwendler.com](https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big), [Lift Vault](https://liftvault.com/programs/strength/531-bbb/), [Liftosaur](https://www.liftosaur.com/programs/the531bbb))

**Dla kogo:** średniozaawansowani, którym skończyła się liniowa progresja
**Cel:** siła w bojach głównych + masa (`goal: 'strength'`, `objective: 'peak_strength'`)
**Level:** `intermediate` · **Dni:** 4 · **Długość:** 12 tygodni (3 cykle po 4 tygodnie)

**Fundament:** wszystko liczysz od **Training Max = 90% aktualnego 1RM** (nie od 1RM).

**Procenty tygodni (% Training Max):**
| Tydzień | Seria 1 | Seria 2 | Seria 3 |
|---|---|---|---|
| 1 ("5s") | 65% x 5 | 75% x 5 | 85% x 5+ (AMRAP) |
| 2 ("3s") | 70% x 3 | 80% x 3 | 90% x 3+ (AMRAP) |
| 3 ("5/3/1") | 75% x 5 | 85% x 3 | 95% x 1+ (AMRAP) |
| 4 (deload) | 40% x 5 | 50% x 5 | 60% x 5 (bez AMRAP) |

Po każdym 4-tygodniowym cyklu Training Max rośnie: **+2,5 kg** wyciskanie i OHP, **+5 kg** przysiad i martwy ciąg.

### Dzień 1 (poniedziałek) - OHP
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi nad głowę (OHP) | 5/3/1 wg tabeli |
| Wyciskanie sztangi na ławce płaskiej | 5 x 10 @ 50% TM |
| Podciąganie na drążku | 5 x 10 |
| Uginanie hantli hammer | 3 x 12 |

### Dzień 2 (wtorek) - Martwy ciąg
| Ćwiczenie | Serie x powt. |
|---|---|
| Martwy ciąg klasyczny | 5/3/1 wg tabeli |
| Przysiad ze sztangą (High Bar) | 5 x 10 @ 50% TM |
| Unoszenie nóg w zwisie | 5 x 12 |
| Prostowniki grzbietu (Hyperextensions) | 3 x 12 |

### Dzień 3 (czwartek) - Wyciskanie leżąc
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi na ławce płaskiej | 5/3/1 wg tabeli |
| Wyciskanie sztangi nad głowę (OHP) | 5 x 10 @ 50% TM |
| Wiosłowanie sztangą | 5 x 10 |
| Wyprosty na lince (Pushdown) | 3 x 12 |

### Dzień 4 (piątek) - Przysiad
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 5/3/1 wg tabeli |
| Martwy ciąg klasyczny | 5 x 10 @ 50% TM |
| Uginanie nóg na maszynie (Leżąc) | 5 x 10 |
| Ab Rollout | 3 x 12 |

**Progresja:** procentowa od Training Max. Serie AMRAP (oznaczone "+") robisz do 1-2 powtórzeń w zapasie, nigdy do upadku technicznego. Objętość BBB 5x10 startuje z 50% TM; jeśli po 2-3 cyklach idzie zbyt łatwo, można podnieść do 60% TM. Nie zdołasz zrobić minimum powtórzeń w serii AMRAP przez dwa cykle → obniż Training Max o 10%.

**Uwaga implementacyjna:** ten plan wymaga w aplikacji obsługi procentów 1RM. Jeśli silnik jej nie ma, wpisz serie opisowo (np. `3 x 5 (65/75/85% TM)`) i dodaj instrukcję "📋 Parametry" z tabelą procentów, tak jak robi to helper `imp()`.

---

# 8. Mezocykl Naukowy

**ID:** `tpl-meso-4` · **EN:** `Science Mesocycle` · **PL:** `Mezocykl Naukowy`

**Źródło:** inspirowany metodologią Renaissance Periodization (dr Mike Israetel, dr James Hoffmann): volume landmarks MEV/MAV/MRV, rampa objętości, progresja RIR, obowiązkowy deload. Opis publiczny: [Lift Vault](https://liftvault.com/programs/bodybuilding/mike-israetel-5-week-hypertrophy-workout-routine-spreadsheet/), [Arvo: RP Volume Landmarks](https://arvo.guru/resources/methods/rp-training)

**Dla kogo:** średniozaawansowani i zaawansowani, którzy chcą sterować objętością świadomie
**Cel:** czysta hipertrofia (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `advanced` · **Dni:** 4 · **Długość:** 10 tygodni (2 mezocykle: 4 tyg. rampy + 1 tydz. deload, dwa razy)

**Serie w tabeli to tydzień 1 (start na MEV).** Co tydzień dokładasz 1 serię do 2-3 ćwiczeń na trening (rampa w stronę MRV). Tydzień 5 to deload: połowa serii, ciężar 50-60%, RIR 4-5.

### Dzień 1 (poniedziałek) - Góra A
| Ćwiczenie | Serie x powt. (tydz. 1) |
|---|---|
| Wyciskanie sztangi na skosie | 3 x 6-10 |
| Wiosłowanie sztangą | 3 x 8-12 |
| Wyciskanie hantli nad głowę (Siedząc) | 2 x 10-15 |
| Ściąganie drążka (Szeroki nachwyt) | 2 x 10-15 |
| Wznosy bokiem na wyciągu | 2 x 12-20 |
| Uginanie hantli z supinacją (Ławka skośna) | 2 x 10-15 |
| Wyprosty francuskie zza głowy | 2 x 10-15 |

### Dzień 2 (wtorek) - Dół A
| Ćwiczenie | Serie x powt. (tydz. 1) |
|---|---|
| Przysiad ze sztangą (High Bar) | 3 x 6-10 |
| Martwy Ciąg Rumuński (RDL) | 3 x 8-12 |
| Prasa nożna | 2 x 10-15 |
| Uginanie nóg na maszynie (Siedząc) | 2 x 10-15 |
| Wspięcia na palce (Nogi proste) | 3 x 10-15 |
| Modlitewnik (Cable Crunch) | 2 x 12-20 |

### Dzień 3 (czwartek) - Góra B
| Ćwiczenie | Serie x powt. (tydz. 1) |
|---|---|
| Wyciskanie hantli na ławce płaskiej | 3 x 8-12 |
| Podciąganie na drążku | 3 x 6-10 |
| Wiosłowanie na lince siedząc | 2 x 10-15 |
| Pec Deck (Butterfly) | 2 x 12-20 |
| Odwrotne rozpiętki (Tył barku) | 2 x 15-20 |
| Uginanie na lince (Hammer) | 2 x 12-20 |
| Wyprosty na lince (Pushdown) | 2 x 12-20 |

### Dzień 4 (piątek) - Dół B
| Ćwiczenie | Serie x powt. (tydz. 1) |
|---|---|
| Hack Squat (maszyna) | 3 x 8-12 |
| Hip Thrust ze sztangą | 3 x 8-12 |
| Wyprosty nóg na maszynie | 2 x 12-20 |
| Uginanie nóg na maszynie (Leżąc) | 2 x 10-15 |
| Wspięcia na palce siedząc | 3 x 12-20 |
| Unoszenie nóg w zwisie | 2 x 12-20 |

**Progresja (podwójna, po objętości i intensywności):**
- Tydzień 1: RIR 3 (trzy powtórzenia w zapasie), objętość na MEV (ok. 10-12 serii / mięsień / tydzień)
- Tydzień 2: RIR 2, +1 seria do części ćwiczeń
- Tydzień 3: RIR 1, kolejne serie
- Tydzień 4: RIR 0-1, szczyt objętości (18-22 serie / mięsień / tydzień, okolice MRV)
- Tydzień 5: deload, ~50% serii, RIR 4-5, potem nowy mezocykl od nieco wyższego ciężaru

Ciężary: 65-85% 1RM. Sygnał do zatrzymania rampy: spada wydajność między seriami, ból stawów, brak pompy, senność. Wtedy deload wcześniej.

---

# 9. Powerbuilding PHAT

**ID:** `tpl-phat-5` · **EN:** `PHAT Powerbuilding` · **PL:** `Powerbuilding PHAT`

**Źródło:** dr Layne Norton, Power Hypertrophy Adaptive Training. Rozpiska: [StrengthLog](https://www.strengthlog.com/phat-workout-routine/), [Lift Vault](https://liftvault.com/programs/bodybuilding/phat-spreadsheet/), oryginał: [SimplyShredded](https://simplyshredded.com/mega-feature-layne-norton-training-series-full-powerhypertrophy-routine-updated-2011.html)

**Dla kogo:** zaawansowani z minimum 2 latami stażu, wysoka tolerancja objętości
**Cel:** siła + masa jednocześnie (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `advanced` · **Dni:** 5 · **Długość:** 12 tygodni

### Dzień 1 (poniedziałek) - Góra siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Wiosłowanie sztangą | 3 x 3-5 |
| Podciąganie na drążku | 2 x 6-10 |
| Ściąganie drążka (Szeroki nachwyt) | 2 x 6-10 |
| Wyciskanie hantli na ławce płaskiej | 3 x 3-5 |
| Dips (pompki na poręczach) | 2 x 6-10 |
| Wyciskanie hantli nad głowę (Siedząc) | 3 x 6-10 |
| Uginanie sztangi stojąc | 3 x 6-10 |
| Skull Crushers | 3 x 6-10 |

### Dzień 2 (wtorek) - Dół siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 3 x 3-5 |
| Hack Squat (maszyna) | 2 x 6-10 |
| Wyprosty nóg na maszynie | 2 x 6-10 |
| Martwy Ciąg Rumuński (RDL) | 3 x 5-8 |
| Uginanie nóg na maszynie (Leżąc) | 2 x 6-10 |
| Wspięcia na palce (Nogi proste) | 3 x 6-10 |
| Wspięcia na palce siedząc | 2 x 6-10 |

### Dzień 3 (czwartek) - Plecy i barki, objętość
| Ćwiczenie | Serie x powt. |
|---|---|
| Wiosłowanie sztangą | 4 x 8-10 (ok. 85% ciężaru z dnia 1) |
| Ściąganie drążka (Szeroki nachwyt) | 3 x 8-12 |
| Wiosłowanie na lince siedząc | 3 x 8-12 |
| Wiosłowanie hantlem jednorącz (Laty) | 2 x 12-15 |
| Ściąganie drążka (Wąski nachwyt) | 2 x 15-20 |
| Wyciskanie hantli nad głowę (Siedząc) | 3 x 8-12 |
| **[NOWE]** Podciąganie sztangi wzdłuż tułowia (Upright row) / zamiennik: Face Pull | 2 x 12-15 |
| Wznosy bokiem (Lateral Raise) | 3 x 12-20 |

### Dzień 4 (piątek) - Dół, objętość
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 4 x 8-10 (ok. 85% ciężaru z dnia 2) |
| Hack Squat (maszyna) | 3 x 8-12 |
| Prasa nożna | 2 x 12-15 |
| Wyprosty nóg na maszynie | 3 x 15-20 |
| Martwy Ciąg Rumuński (RDL) | 3 x 8-12 |
| Uginanie nóg na maszynie (Leżąc) | 2 x 12-15 |
| Uginanie nóg na maszynie (Siedząc) | 2 x 15-20 |
| Donkey Calf Raise | 4 x 10-15 |
| Wspięcia na palce siedząc | 3 x 15-20 |

### Dzień 5 (sobota) - Klatka i ramiona, objętość
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie hantli na ławce płaskiej | 4 x 8-10 (ok. 85% ciężaru z dnia 1) |
| Wyciskanie hantli (Lekki skos) | 3 x 8-12 |
| Wyciskanie na maszynie Hammer | 3 x 12-15 |
| Rozpiętki na lince (Crossover) | 2 x 15-20 |
| Uginania ze sztangą na modlitewniku | 3 x 8-12 |
| Uginanie na wyciągu dolnym | 2 x 12-15 |
| Uginanie na maszynie | 2 x 15-20 |
| Wyprosty francuskie zza głowy | 3 x 8-12 |
| Wyprosty na lince (Pushdown) | 2 x 12-15 |
| Kickback z hantlą | 2 x 15-20 |

**Progresja:** dni siłowe to liniowa progresja (+1-2,5 kg góra, +2,5-5 kg dół po domknięciu zakresu 3-5 we wszystkich seriach), przerwa 3-5 min. Dni objętościowe to double progression, przerwa do 3 min, ciężar bazowy w pierwszym ćwiczeniu ok. 85% tego, co na dniu siłowym. Zastój: najpierw zmień wariant boju głównego (przysiad → przysiad przedni, wiosłowanie sztangą → wiosłowanie Pendleya), dopiero potem deload. Norton zaleca rotację bojów co 2-3 tygodnie.

---

# 10. Hybryda Pięciu Dni

**ID:** `tpl-hybrid-5` · **EN:** `Hybrid Five` · **PL:** `Hybryda Pięciu Dni`

**Źródło:** inspirowany podziałem Upper/Lower/Push/Pull/Legs promowanym przez Jeffa Nipparda (Pure Bodybuilding Program). Publiczne omówienia: [Fitbod review](https://fitbod.me/blog/jeff-nippard-upper-lower-size-and-strength-program-review/), [Medium: Program Review Ultimate PPL](https://medium.com/practice-in-public/program-review-jeff-nippards-ultimate-push-pull-legs-5a1b42615b61)

**Dla kogo:** średniozaawansowani i zaawansowani chcący 5 treningów bez pełnego 6-dniowego PPL
**Cel:** masa z bazą siłową (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `intermediate` · **Dni:** 5 · **Długość:** 12 tygodni

Logika: dni Góra i Dół są **cięższe** (nacisk na siłę, 4-8 powtórzeń), dni Push / Pull / Legs są **objętościowe** (8-15 powtórzeń, więcej izolacji). Każdy mięsień 2x w tygodniu.

### Dzień 1 (poniedziałek) - Góra siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi na ławce płaskiej | 4 x 4-6 |
| Wiosłowanie Pendleya | 4 x 5-8 |
| Wyciskanie sztangi nad głowę (OHP) | 3 x 6-8 |
| Podciąganie na drążku | 3 x 6-10 |
| Wznosy bokiem (Lateral Raise) | 3 x 12-15 |
| Uginanie hantli z supinacją (Ławka skośna) | 3 x 8-12 |

### Dzień 2 (wtorek) - Dół siłowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 4 x 4-6 |
| Martwy Ciąg Rumuński (RDL) | 3 x 6-8 |
| Prasa nożna | 3 x 8-12 |
| Uginanie nóg na maszynie (Leżąc) | 3 x 10-12 |
| Wspięcia na palce (Nogi proste) | 4 x 8-12 |
| Ab Rollout | 3 x 10-15 |

### Dzień 3 (czwartek) - Push objętościowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie hantli (Lekki skos) | 4 x 8-12 |
| Wyciskanie na maszynie Hammer | 3 x 10-15 |
| Wyciskanie nad głowę na maszynie | 3 x 10-12 |
| Rozpiętki na lince (Crossover) | 3 x 12-15 |
| Wznosy bokiem na wyciągu | 3 x 15-20 |
| Wyprosty na lince (Pushdown) | 3 x 12-15 |
| Wyprosty francuskie zza głowy | 2 x 12-15 |

### Dzień 4 (piątek) - Pull objętościowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Ściąganie drążka (Szeroki nachwyt) | 4 x 10-12 |
| Wiosłowanie na maszynie (Hammer) | 4 x 10-12 |
| Wiosłowanie na lince siedząc | 3 x 12-15 |
| Ściąganie linki prostymi ramionami | 3 x 12-15 |
| Face Pull | 3 x 15-20 |
| Uginanie na lince (Hammer) | 3 x 12-15 |
| Uginanie na modlitewniku (Preacher) | 2 x 12-15 |

### Dzień 5 (sobota) - Nogi objętościowo
| Ćwiczenie | Serie x powt. |
|---|---|
| Hack Squat (maszyna) | 4 x 8-12 |
| Hip Thrust ze sztangą | 3 x 10-12 |
| Wykroki bułgarskie | 3 x 10-12 / nogę |
| Wyprosty nóg na maszynie | 3 x 12-20 |
| Uginanie nóg na maszynie (Siedząc) | 3 x 12-15 |
| Wspięcia na palce siedząc | 4 x 12-20 |
| Modlitewnik (Cable Crunch) | 3 x 12-20 |

**Progresja:** dni siłowe to liniowa progresja z autoregulacją (RPE 8, czyli 2 powtórzenia w zapasie, dodaj ciężar po domknięciu góry zakresu). Dni objętościowe to double progression, ostatnia seria każdego ćwiczenia do upadku technicznego (RIR 0), pozostałe RIR 1-2. Deload w 7. i 13. tygodniu (połowa serii).

---

# 11. Objętość Maksymalna (nSuns 531 LP)

**ID:** `tpl-nsuns-5` · **EN:** `Volume Max LP` · **PL:** `Objętość Maksymalna`

**Źródło:** nSuns 531 LP (użytkownik nSuns z r/fitness, rozwinięcie 5/3/1). Opis: [Lift Vault](https://liftvault.com/programs/powerlifting/n-suns-lifting-spreadsheets/), [FitFrek](https://fitfrek.com/nsuns-program/), [Liftosaur](https://www.liftosaur.com/programs/nsuns)

**Dla kogo:** zaawansowani z bardzo dobrą regeneracją, staż 2+ lata, na nadwyżce kalorycznej
**Cel:** siła w bojach (`goal: 'strength'`, `objective: 'peak_strength'`)
**Level:** `advanced` · **Dni:** 5 · **Długość:** 8 tygodni

**Fundament:** Training Max = 90% aktualnego 1RM. **T1** to 9 serii boju głównego z falowaniem procentów, **T2** to 8 serii boju pokrewnego.

**Schemat T1 (9 serii, procenty Training Max):**
65% x 5 → 75% x 3 → 85% x 1+ (AMRAP) → 85% x 3 → 80% x 3 → 75% x 3 → 70% x 5 → 65% x 5 → 60% x 5+ (AMRAP)

**Schemat T2 (8 serii, procenty TM odpowiedniego boju):**
50% x 6 → 60% x 5 → 70% x 3 → 70% x 5 → 70% x 7 → 70% x 4 → 70% x 6 → 70% x 8

### Dzień 1 (poniedziałek)
| Rola | Ćwiczenie | Serie |
|---|---|---|
| T1 | Wyciskanie sztangi na ławce płaskiej | 9 serii wg schematu T1 |
| T2 | Wyciskanie sztangi nad głowę (OHP) | 8 serii wg schematu T2 |
| T3 | Ściąganie drążka (Szeroki nachwyt) | 3 x 12 |
| T3 | Face Pull | 3 x 15 |

### Dzień 2 (wtorek)
| Rola | Ćwiczenie | Serie |
|---|---|---|
| T1 | Przysiad ze sztangą (High Bar) | 9 serii wg schematu T1 |
| T2 | **[NOWE]** Martwy ciąg sumo / zamiennik: Martwy ciąg klasyczny | 8 serii wg schematu T2 |
| T3 | Uginanie nóg na maszynie (Leżąc) | 3 x 12 |
| T3 | Modlitewnik (Cable Crunch) | 3 x 15 |

### Dzień 3 (środa)
| Rola | Ćwiczenie | Serie |
|---|---|---|
| T1 | Wyciskanie sztangi nad głowę (OHP) | 9 serii wg schematu T1 |
| T2 | Wyciskanie sztangi na skosie | 8 serii wg schematu T2 |
| T3 | Wiosłowanie na lince siedząc | 3 x 12 |
| T3 | Wznosy bokiem (Lateral Raise) | 3 x 15 |

### Dzień 4 (piątek)
| Rola | Ćwiczenie | Serie |
|---|---|---|
| T1 | Martwy ciąg klasyczny | 9 serii wg schematu T1 |
| T2 | **[NOWE]** Przysiad przedni (Front Squat) / zamiennik: Przysiad ze sztangą (Low Bar) | 8 serii wg schematu T2 |
| T3 | Prostowniki grzbietu (Hyperextensions) | 3 x 12 |
| T3 | Unoszenie nóg w zwisie | 3 x 15 |

### Dzień 5 (sobota)
| Rola | Ćwiczenie | Serie |
|---|---|---|
| T1 | Wyciskanie sztangi na ławce płaskiej (drugi raz w tygodniu) | 9 serii wg schematu T1 |
| T2 | Wyciskanie wąsko (Close-grip) | 8 serii wg schematu T2 |
| T3 | Wiosłowanie sztangą | 3 x 12 |
| T3 | Uginanie sztangi stojąc | 3 x 15 |

**Progresja (tygodniowa, sterowana wynikiem AMRAP):**
- 0-1 powtórzenie w serii AMRAP: Training Max bez zmian albo w dół
- 2-3 powtórzenia: +2,5 kg
- 4-5 powtórzeń: +5 kg (góra) / +5-7,5 kg (dół)
- 6+ powtórzeń: +5 kg (góra) / +10-15 kg (dół)

T2 rośnie liniowo co sesję: +2,5 kg góra, +5 kg dół.

**Uwaga:** to najcięższy plan z całej dwunastki (objętość ok. 40-50 serii bojów tygodniowo). W opisie w aplikacji trzeba jasno ostrzec, że wymaga nadwyżki kalorycznej i 8+ godzin snu.

---

# 12. Złota Era (Arnold Split)

**ID:** `tpl-arnold-6` · **EN:** `Golden Era Split` · **PL:** `Złota Era`

**Źródło:** Arnold Split w wersji nowoczesnej (objętość zgodna z aktualnymi rekomendacjami 12-18 serii / mięsień / tydzień). Opis: [Lift Vault](https://liftvault.com/programs/bodybuilding/arnold-split/), [Gym Geek](https://gymgeek.com/workout-routines/arnold-split/), [hypro.app](https://www.hypro.app/blog/arnold-split)

**Dla kogo:** zaawansowani, którzy lubią wysoką częstotliwość i długie sesje
**Cel:** masa i sylwetka (`goal: 'muscle'`, `objective: 'build_muscle'`)
**Level:** `advanced` · **Dni:** 6 · **Długość:** 12 tygodni

Trzy sesje powtarzane dwa razy w tygodniu: Klatka+Plecy, Barki+Ramiona, Nogi. Znak firmowy: **supersety antagonistyczne** (klatka z plecami, biceps z tricepsem).

Uwaga: oryginalna wersja Arnolda z lat 70. to ok. 45 serii na trening i 168 serii tygodniowo. To jest wersja przycięta do 12-18 serii na grupę tygodniowo, zgodna z aktualnymi metaanalizami.

### Dzień 1 (poniedziałek) i Dzień 4 (czwartek) - Klatka + Plecy
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi na ławce płaskiej | 4 x 6-10 (superseria A) |
| Wiosłowanie sztangą | 4 x 6-10 (superseria A) |
| Wyciskanie hantli (Lekki skos) | 3 x 8-12 (superseria B) |
| Podciąganie na drążku | 3 x 8-12 (superseria B) |
| Rozpiętki na lince (Crossover) | 3 x 12-15 (superseria C) |
| Wiosłowanie na lince siedząc | 3 x 12-15 (superseria C) |
| Pullover na lince | 2 x 12-15 |
| Modlitewnik (Cable Crunch) | 3 x 15-20 |

Dzień 4 wariant: zamień Wyciskanie sztangi na ławce płaskiej na Wyciskanie sztangi na skosie, Wiosłowanie sztangą na Wiosłowanie T-bar.

### Dzień 2 (wtorek) i Dzień 5 (piątek) - Barki + Ramiona
| Ćwiczenie | Serie x powt. |
|---|---|
| Wyciskanie sztangi nad głowę (OHP) | 4 x 6-10 |
| Arnoldki | 3 x 8-12 |
| Wznosy bokiem (Lateral Raise) | 4 x 12-20 |
| Odwrotne rozpiętki (Tył barku) | 3 x 15-20 |
| Uginanie sztangi stojąc | 3 x 8-12 (superseria A) |
| Wyciskanie wąsko (Close-grip) | 3 x 8-12 (superseria A) |
| Uginanie hantli z supinacją (Ławka skośna) | 3 x 10-15 (superseria B) |
| Wyprosty na lince (Pushdown) | 3 x 10-15 (superseria B) |

Dzień 5 wariant: OHP → Wyciskanie hantli nad głowę (Siedząc), Uginanie sztangi stojąc → Uginania ze sztangą na modlitewniku.

### Dzień 3 (środa) i Dzień 6 (sobota) - Nogi
| Ćwiczenie | Serie x powt. |
|---|---|
| Przysiad ze sztangą (High Bar) | 4 x 6-10 |
| Prasa nożna | 3 x 10-15 |
| Wykroki chodzone | 3 x 10-12 / nogę |
| Martwy Ciąg Rumuński (RDL) | 3 x 8-12 |
| Uginanie nóg na maszynie (Leżąc) | 3 x 10-15 |
| Wyprosty nóg na maszynie | 3 x 12-20 |
| Wspięcia na palce (Nogi proste) | 4 x 10-15 |
| Wspięcia na palce siedząc | 3 x 15-20 |

Dzień 6 wariant: Przysiad ze sztangą → Hack Squat (maszyna), Wykroki chodzone → Wykroki bułgarskie.

**Progresja:** piramida obciążenia w pierwszym ćwiczeniu każdej sesji (seria 1 lżejsza na 10-12, potem cięższe na 6-8). Poza tym double progression, wszystkie serie robocze w odległości 1-3 powtórzeń od upadku. Deload w 7. tygodniu.

---

## Podsumowanie tabelaryczne (do przełożenia na `planTemplates.ts`)

| ID | EN | PL | goal | objective | level | dni | tyg. | Źródło |
|---|---|---|---|---|---|---|---|---|
| `tpl-minimalist-2` | Minimalist Protocol | Minimalna Dawka | muscle | build_muscle | beginner | 2 | 8 | Nippard |
| `tpl-six-lifts-3` | Six Lift Blueprint | Sześć Ruchów | muscle | build_muscle | beginner | 3 | 8 | Ethier / BWS |
| `tpl-gzclp-3` | Three Tier Strength | Trójstopniowa Siła | strength | peak_strength | beginner | 3 | 12 | GZCL / Lefever |
| `tpl-calisthenics-3` | Bodyweight Foundation | Własny Ciężar | health | athletic | beginner | 3 | 12 | r/bodyweightfitness RR |
| `tpl-glutes-3` | Glute Foundations | Moc Pośladków | muscle | build_muscle | beginner | 3 | 12 | Contreras, Strong Curves |
| `tpl-phul-4` | Power Hypertrophy U/L | Moc i Objętość | strength | build_muscle | intermediate | 4 | 12 | Brandon Campbell |
| `tpl-531-bbb-4` | Iron Cycle 5/3/1 | Żelazny Cykl | strength | peak_strength | intermediate | 4 | 12 | Jim Wendler |
| `tpl-meso-4` | Science Mesocycle | Mezocykl Naukowy | muscle | build_muscle | advanced | 4 | 10 | RP / Israetel |
| `tpl-phat-5` | PHAT Powerbuilding | Powerbuilding PHAT | muscle | build_muscle | advanced | 5 | 12 | Layne Norton |
| `tpl-hybrid-5` | Hybrid Five | Hybryda Pięciu Dni | muscle | build_muscle | intermediate | 5 | 12 | Nippard UL+PPL |
| `tpl-nsuns-5` | Volume Max LP | Objętość Maksymalna | strength | peak_strength | advanced | 5 | 8 | nSuns |
| `tpl-arnold-6` | Golden Era Split | Złota Era | muscle | build_muscle | advanced | 6 | 12 | Arnold Split |

Po dodaniu pokrycie w aplikacji wyniesie: 2 dni (2 plany), 3 dni (6), 4 dni (8), 5 dni (4), 6 dni (2). Rekomendator (`daysPerWeek` + `levelRank` w `planTemplates.ts:612`) dostanie sensowne opcje w każdej kombinacji.

---

## Brakujące ćwiczenia do dodania w `exerciseLibrary.ts`

Sprawdziłem każde ćwiczenie względem 105 pozycji biblioteki. Do dodania (albo podmiany na zamiennik wskazany przy planie):

| Nazwa proponowana | Potrzebne w planie | Zamiennik z biblioteki |
|---|---|---|
| Przysiad przedni (Front Squat) | PHUL, nSuns, GZCLP | Hack Squat (maszyna) |
| Wiosłowanie w podporze (Australian pull-up) | Własny Ciężar | brak dobrego, warto dodać |
| Wejścia na skrzynię (Step-up) | Moc Pośladków, Minimalna Dawka | Wejścia bokiem na skrzynię |
| Martwy ciąg sumo | nSuns | Martwy ciąg klasyczny |
| Nordic Curl | Własny Ciężar | Glute Bridge jednonóż |
| Glute March | Moc Pośladków | Glute Bridge z zatrzymaniem |
| Chód bokiem z gumą (X-band walk) | Moc Pośladków | Odwodzenie na lince |
| Podciąganie sztangi wzdłuż tułowia (Upright row) | PHAT | Face Pull |
| Pompki diamentowe | Własny Ciężar (progresja) | Pompki |
| L-sit | Własny Ciężar (progresja) | Hollow Hold |

Minimalna wersja wdrożenia bez dotykania biblioteki: użyj wszędzie zamienników. Wtedy 12 planów startuje w 100% z `source: 'library'` i dziedziczy instrukcje oraz i18n.

---

## Uwagi wdrożeniowe

1. **Plany procentowe (5/3/1, nSuns) potrzebują wsparcia dla `% Training Max`.** Model `Exercise.sets` jest tekstowy, więc da się to zrobić bez zmiany schematu: `sets: '5/3/1 (65/75/85% TM)'` plus instrukcja `📋 Parametry` z tabelą tygodni, tak jak działa helper `imp()` w `planTemplates.ts:60`. Docelowo warto rozważyć pole na Training Max w profilu użytkownika.

2. **i18n:** dla każdego nowego id trzeba dopisać wpis `{ pl, en }` w `src/lib/plan-i18n.ts` (wzorzec z linii 79-89) oraz klucze opisów do OBU plików `src/i18n/locales/pl.ts` i `en.ts`, inaczej typecheck padnie (zasada z CLAUDE.md).

3. **Test biblioteki:** helper `ex()` loguje ostrzeżenie przy nazwie spoza biblioteki (`planTemplates.ts:37`), a istniejący test `planTemplates` to wyłapuje. Dodaj nowe plany partiami i uruchamiaj `npm run test` po każdej partii.

4. **Supersety:** Arnold Split, Moc Pośladków i Własny Ciężar mocno korzystają z par ćwiczeń. Użyj `opts.superset` (grupa 'A'/'B'/'C'), tak jak w `tpl-fullbody-3`.

5. **Prawnie:** wszystkie 12 planów to publicznie opisane schematy treningowe (schematy serii i powtórzeń nie są objęte prawem autorskim), a dwa oznaczone jako "inspirowany" (Mezocykl Naukowy, Hybryda Pięciu Dni) celowo nie odtwarzają płatnych PDF-ów Nipparda ani aplikacji RP. Nie kopiuj do aplikacji opisów marketingowych ani nazw handlowych typu "Pure Bodybuilding Program".

---

## Źródła

1. [Jeff Nippard minimalist training program, rozpiska](https://fitnessvolt.com/jeff-nippard-minimalist-training-program/) oraz film [The Best Science-Based Minimalist Workout Plan](https://www.youtube.com/watch?v=eMjyvIQbn9M)
2. [Built With Science: The PERFECT Full Body Workout Routine (Jeremy Ethier)](https://builtwithscience.com/workouts/full-body-workout-routine/)
3. [GZCLP Program Guide, Lift Vault](https://liftvault.com/programs/powerlifting/gzclp-program-spreadsheets/)
4. [GZCLP pełny układ 3 i 4 dni, SET FOR SET](https://www.setforset.com/blogs/news/gzclp-beginner-linear-progression-strength-program)
5. [r/bodyweightfitness Recommended Routine, oficjalne wiki](https://redditbwf.github.io/wiki/recommended_routine.html)
6. [Recommended Routine, wersja Antranika](https://antranik.org/rr/)
7. [Strong Curves spreadsheets, Bootyful Beginnings i Gluteal Goddess](https://liftvault.com/programs/strength/strong-curves-program-spreadsheet/)
8. [Strong Curves Bootyful Beginnings, Boostcamp](https://www.boostcamp.app/coaches/bret-contreras/strong-curves-bootyful-beginnings)
9. [PHUL, pełna rozpiska, Muscle & Strength](https://www.muscleandstrength.com/workouts/phul-workout)
10. [PHUL guide, Lift Vault](https://liftvault.com/programs/strength/phul-spreadsheet/)
11. [5/3/1 Boring But Big, Jim Wendler](https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big)
12. [5/3/1 BBB procenty i układ, Liftosaur](https://www.liftosaur.com/programs/the531bbb)
13. [5/3/1 BBB, Lift Vault](https://liftvault.com/programs/strength/531-bbb/)
14. [PHAT, pełna rozpiska, StrengthLog](https://www.strengthlog.com/phat-workout-routine/)
15. [PHAT oryginał Layne Nortona, SimplyShredded](https://simplyshredded.com/mega-feature-layne-norton-training-series-full-powerhypertrophy-routine-updated-2011.html)
16. [RP volume landmarks i mezocykle, Arvo](https://arvo.guru/resources/methods/rp-training)
17. [Mike Israetel 5-week hypertrophy, Lift Vault](https://liftvault.com/programs/bodybuilding/mike-israetel-5-week-hypertrophy-workout-routine-spreadsheet/)
18. [nSuns 531 LP guide, Lift Vault](https://liftvault.com/programs/powerlifting/n-suns-lifting-spreadsheets/)
19. [nSuns 531 LP, FitFrek](https://fitfrek.com/nsuns-program/)
20. [Arnold Split, Lift Vault](https://liftvault.com/programs/bodybuilding/arnold-split/)
21. [Arnold Split nowoczesna objętość, hypro.app](https://www.hypro.app/blog/arnold-split)
22. [thefitness.wiki, oficjalne wiki r/Fitness, lista polecanych programów](https://thefitness.wiki/routines/strength-training-muscle-building/)
23. [Reddit PPL (metallicadpa), Lift Vault](https://liftvault.com/programs/strength/reddit-ppl/)

Pliki projektu, których dotyczy wdrożenie:
- `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/data/planTemplates.ts`
- `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/data/exerciseLibrary.ts`
- `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/plan-i18n.ts`
- `/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/i18n/locales/pl.ts` oraz `en.ts`
