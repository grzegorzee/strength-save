import type { TrackingType } from '@/lib/set-tracking';

export interface LibraryExercise {
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'glutes' | 'calves';
  type: 'compound' | 'isolation';
  /** @deprecated YouTube usunięte (Error 153 w WebView) — animacje przez exercise-media. Pole zostaje tymczasowo dla logiki swap, do usunięcia przy redesignie modelu ćwiczenia. */
  videoUrl?: string;
  isBodyweight?: boolean;
  /** Typ śledzenia serii (Z105). Brak = weight_reps (isBodyweight => bodyweight_reps). */
  tracking?: TrackingType;
  instructions?: { title: string; content: string }[];
}

export const exerciseLibrary: LibraryExercise[] = [
  // Chest
  { name: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Łopatki ściągnięte i wciśnięte w ławkę. Sztanga nad linią brodawek, łokcie ~75° od tułowia.' }] },
  { name: 'Wyciskanie hantli na ławce płaskiej', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Używając dwóch hantli, wpisz łączny ciężar. Hantli nie stukaj u góry — zatrzymaj tuż przed.' }] },
  { name: 'Wyciskanie hantli (Lekki skos)', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Ławka na skosie 15-30°. Hantli prowadź nad górną klatką. Łopatki ściągnięte.' }] },
  { name: 'Wyciskanie sztangi na skosie', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Skos 30-45°. Sztanga opada na górną część klatki. Nie odrywaj pleców od ławki.' }] },
  { name: 'Rozpiętki hantlami', category: 'chest', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łokcie lekko ugięte przez cały ruch. Rozciągaj klatkę na dole, ściskaj na górze.' }] },
  { name: 'Rozpiętki na lince (Crossover)', category: 'chest', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Lekki krok do przodu dla stabilności. Łokcie lekko ugięte, ruch jak przytulanie drzewa.' }] },
  { name: 'Pompki', category: 'chest', type: 'compound', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Ciało proste jak deska. Łokcie ~45° od tułowia, pełen zakres ruchu — klatka do podłogi.' }] },
  { name: 'Wyciskanie w maszynie', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Ustaw siedzisko tak, by uchwyty były na wysokości środka klatki. Łopatki ściągnięte.' }] },

  // Back
  { name: 'Wiosłowanie sztangą', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Tułów pochylony ~45°. Ciągnij sztangę do pępka, łokcie blisko ciała. Nie zaokrąglaj pleców.' }] },
  { name: 'Wiosłowanie hantlami na ławce (przodem)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Klatka oparta o ławkę skośną. Ciągnij hantli do bioder, ściskaj łopatki na górze.' }] },
  { name: 'Wiosłowanie hantlem jednorącz (Laty)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Kolano i dłoń na ławce. Ciągnij hantel do biodra, łokieć przy ciele. Pełne rozciągnięcie na dole.' }] },
  { name: 'Ściąganie drążka (Szeroki nachwyt)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Chwyt szerszy niż barki. Ciągnij drążek do górnej klatki, łokcie w dół. Nie ciągnij za szyję.' }] },
  { name: 'Ściąganie drążka (Wąski nachwyt)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Chwyt wąski podchwyt lub trójkąt. Ciągnij do klatki, ściskaj łopatki na dole ruchu.' }] },
  { name: 'Podciąganie na drążku', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Pełne zwisanie na dole, broda nad drążkiem na górze. Kontroluj fazę opuszczania.' }] },
  { name: 'Wiosłowanie na lince siedząc', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Plecy proste, klatka do przodu. Ciągnij do brzucha, ściskaj łopatki. Nie odchylaj się nadmiernie.' }] },
  { name: 'Pullover na lince', category: 'back', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łokcie lekko ugięte. Ciągnij drążek łukiem od góry do bioder. Czuj rozciąganie latów.' }] },

  // Shoulders
  { name: 'Wyciskanie hantli nad głowę (Siedząc)', category: 'shoulders', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Oparcie ławki ~85°. Hantli startują na wysokości uszu, wyciskaj do góry bez blokowania łokci.' }] },
  { name: 'Wyciskanie sztangi nad głowę (OHP)', category: 'shoulders', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Stopa na szerokość bioder, pośladki napięte. Sztanga startuje z klatki, wyciskaj prosto nad głowę.' }] },
  { name: 'Wznosy bokiem (Lateral Raise)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Lekki pochył do przodu. Unoś do linii barków, kciuki lekko w dół. Kontroluj opuszczanie.' }] },
  { name: 'Wznosy bokiem leżąc (Y-Raise)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Leżąc przodem na ławce skośnej. Unoś hantle w kształcie litery Y. Mały ciężar, duża kontrola.' }] },
  { name: 'Odwrotne rozpiętki (Tył barku)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Pochyl się do przodu lub użyj maszyny pec-deck odwrotnie. Ściskaj łopatki na szczycie.' }] },
  { name: 'Face Pull', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka na wysokości twarzy. Ciągnij do twarzy rozkładając ręce, rotuj zewnętrznie. Ściskaj łopatki.' }] },
  { name: 'Arnoldki', category: 'shoulders', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Start z hantlami przed twarzą (supinacja). Podczas wyciskania obracaj dłonie na zewnątrz.' }] },

  // Legs - Quads
  { name: 'Przysiad ze sztangą (High Bar)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Sztanga na górze trapezów. Kolana w linii palców stóp. Siadaj do minimum równoległego uda.' }] },
  { name: 'Przysiad ze sztangą (Low Bar)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Sztanga na tylnym delcie. Większy pochył tułowia. Mocniej angażuje pośladki i tylną nogę.' }] },
  { name: 'Przysiad goblet', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Hantel trzymaj przy klatce. Łokcie między kolanami na dole. Utrzymuj klatkę do góry.' }] },
  { name: 'Prasa nożna', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Stopy na środku platformy, szerzej niż biodra. Nie prostuj kolan do końca. Dolna część pleców na siedzisku.' }] },
  { name: 'Wyprosty nóg na maszynie', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Oparcie za kolanami, wałek na kostkach. Prostuj nogi do pełnego zakresu, ściskaj quady na górze.' }] },
  { name: 'Wykroki chodzone', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Duży krok do przodu, kolano tylne do podłogi. Tułów prosto. Wpisz łączny ciężar obu hantli.' }] },
  { name: 'Wykroki bułgarskie', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Tylna stopa na ławce. Kolano przedniej nogi nie wychodzi za palce. Wpisz ciężar obu hantli.' }] },

  // Legs - Hamstrings
  { name: 'Martwy Ciąg Rumuński (RDL)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Nogi prawie proste (lekki ugięcie). Sztanga blisko ciała, cofaj biodra. Czuj rozciąganie hamstringów.' }] },
  { name: 'Martwy ciąg klasyczny', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Sztanga nad środkiem stopy. Plecy proste, napnij brzuch. Ciągnij nogami, nie plecami.' }] },
  { name: 'Uginanie nóg na maszynie (Siedząc)', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Wałek za kostkami. Uginaj do pełnego zakresu, ściskaj hamstringi. Kontroluj powrót.' }] },
  { name: 'Uginanie nóg na maszynie (Leżąc)', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Biodra przyciśnięte do ławki. Uginaj pełen zakres, nie podrzucaj ciężaru.' }] },
  { name: 'Good Morning', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Sztanga na trapezach. Cofaj biodra, pochylaj tułów do ~90°. Plecy ZAWSZE proste.' }] },

  // Glutes
  { name: 'Hip Thrust (Wypychanie bioder)', category: 'glutes', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Łopatki na ławce, stopy płasko. Wypychaj biodra do pełnego wyprostu, ściskaj pośladki na górze.' }] },
  { name: 'Hip Thrust ze sztangą', category: 'glutes', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Użyj podkładki na sztangę. Stopy na szerokość bioder. Pełne wypychanie + 1s pauza na górze.' }] },
  { name: 'Odwodzenie na lince', category: 'glutes', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Mankiet na kostce. Odwódź nogę do tyłu, ściskaj pośladek. Nie wyginaj pleców.' }] },
  { name: 'Glute Bridge', category: 'glutes', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Leżąc na plecach, stopy blisko pośladków. Wypychaj biodra do góry, ściskaj na szczycie.' }] },

  // Arms - Biceps
  { name: 'Uginanie hantli z supinacją (Ławka skośna)', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ławka 45°. Hantli zwisają, uginaj z obrotem nadgarstka (supinacja). Pełne rozciągnięcie na dole.' }] },
  { name: 'Uginanie sztangi stojąc', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łokcie przy ciele, nie pomagaj tułowiem. Pełen zakres ruchu — od prostego do ugiętego.' }] },
  { name: 'Uginanie na lince (Hammer)', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Chwyt młotkowy (kciuki do góry). Łokcie nieruchomo przy ciele. Ściskaj biceps na górze.' }] },
  { name: 'Uginanie hantli hammer', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Chwyt neutralny (dłonie do siebie). Naprzemiennie lub razem. Łokcie stabilne.' }] },

  // Arms - Triceps
  { name: 'Wyprosty francuskie zza głowy', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Hantel za głową, łokcie skierowane do góry. Prostuj w łokciach, nie ruszaj ramionami.' }] },
  { name: 'Wyprosty na lince (Pushdown)', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łokcie przy ciele, nie pomagaj barkami. Prostuj do pełnego zakresu, ściskaj triceps na dole.' }] },
  { name: 'Dips (pompki na poręczach)', category: 'arms', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Pochyl tułów lekko do przodu na klatkę, prosto na triceps. Pełen zakres — łokcie do 90°.' }] },
  { name: 'Skull Crushers', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Leżąc na ławce, sztanga nad czołem. Zginaj TYLKO w łokciach. Łokcie skierowane do sufitu.' }] },

  // Core
  { name: 'Dead Bug (Robak - Brzuch)', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Plecy wciśnięte w podłogę przez cały ruch. Powoli wyprostuj przeciwną rękę i nogę.' }] },
  { name: 'Plank', category: 'core', type: 'isolation', isBodyweight: true, tracking: 'duration', instructions: [{ title: '💡 Technika', content: 'Ciało proste od głowy do pięt. Brzuch mocno napięty, biodra nie opadają. Oddychaj normalnie.' }] },
  { name: 'Ab Rollout', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Start z kolan. Wyjeżdżaj kółkiem do przodu napinając brzuch. Nie wyginaj pleców w łuk.' }] },
  { name: 'Unoszenie nóg w zwisie', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Zwis na drążku. Unoś kolana do klatki (łatwiej) lub proste nogi (trudniej). Nie huśtaj się.' }] },
  { name: 'Skręty rosyjskie', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Siedząc z uniesionymi nogami. Obracaj tułów ze strony na stronę. Kontroluj ruch, nie pędź.' }] },
  { name: 'Modlitewnik (Cable Crunch)', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Klęknij przodem do wyciągu. Zginaj tułów siłą brzucha, nie ramion. Łokcie przy uszach.' }] },
  { name: 'Reverse Crunch na ławce', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Leżąc na ławce, chwyt za głową. Unoś biodra z ławki zwijając miednicę do klatki.' }] },

  // Calves
  { name: 'Wspięcia na palce (Nogi proste)', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Pełne rozciągnięcie na dole, maksymalne wspięcie na górze. Pauza 1s na szczycie.' }] },
  { name: 'Wspięcia na palce siedząc', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Siedząc z ciężarem na kolanach. Pełen zakres — od rozciągnięcia do wspięcia. Kontroluj tempo.' }] },

  // ══════════════════════════════════════════════════════════════
  // ROZSZERZENIE BIBLIOTEKI: maszyny, wyciągi, mobilność, ćwiczenia z planów
  // ══════════════════════════════════════════════════════════════

  // Chest
  { name: 'Wyciskanie na maszynie Hammer', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Ustaw siedzisko tak, by uchwyty były na linii środka klatki. Wyciskaj kontrolowanie, ściskaj klatkę na końcu.' }] },
  { name: 'Pec Deck (Butterfly)', category: 'chest', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łokcie na wysokości barków, lekko ugięte. Zwódź ramiona ściskając klatkę po środku. Powoli wracaj.' }] },
  { name: 'Otwieranie klatki hantlami', category: 'chest', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Mobilność: leżąc lub stojąc rozciągaj klatkę z lekkimi hantlami. Kontroluj zakres, nie szarp.' }] },

  // Back
  { name: 'Wiosłowanie na maszynie (Hammer)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Klatka na podparciu. Ciągnij łokciami w tył, ściskaj łopatki. Nie zaokrąglaj pleców.' }] },
  { name: 'Wiosłowanie T-bar', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Pochylony tułów, plecy proste. Ciągnij sztangę do brzucha, ściskaj łopatki na górze.' }] },
  { name: 'Wiosłowanie Pendleya', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Tułów równolegle do podłogi. Każde powtórzenie startuje z martwego punktu na ziemi. Eksplozywne ciągnięcie do brzucha.' }] },
  { name: 'Podciąganie na drążku podchwytem', category: 'back', type: 'compound', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Chwyt podchwytem na szerokość barków. Mocniej angażuje biceps. Broda nad drążkiem, pełne zwisanie na dole.' }] },
  { name: 'Ściąganie linki prostymi ramionami', category: 'back', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ramiona niemal proste. Ciągnij drążek łukiem do ud, czuj napięcie w latach. Izolacja pleców.' }] },
  { name: 'Przenoszenie hantla za głowę', category: 'back', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Pullover z hantlem. Leżąc, opuszczaj hantel za głowę z lekko ugiętymi łokciami. Czuj rozciąganie latów i klatki.' }] },
  { name: 'Szrugi ze sztangą', category: 'back', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Unoś barki prosto do uszu (nie obracaj). Pauza na górze, kontroluj opuszczanie. Cel: kaptury.' }] },
  { name: 'Szrugi z hantlami', category: 'back', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Hantli po bokach. Wzrusz barkami maksymalnie w górę, krótka pauza, powolny powrót.' }] },
  { name: 'Prostowniki grzbietu (Hyperextensions)', category: 'back', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Na ławce rzymskiej. Schodź tułowiem w dół, wracaj do linii ciała (nie przeprostuj). Ściskaj pośladki.' }] },

  // Shoulders
  { name: 'Wyciskanie nad głowę na maszynie', category: 'shoulders', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Plecy oparte. Wyciskaj uchwyty nad głowę bez blokowania łokci. Kontroluj fazę opuszczania.' }] },
  { name: 'Wznosy bokiem na maszynie', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ramiona przy podpórkach. Unoś do linii barków, pauza, powoli wracaj. Stały opór na bocznym aktonie.' }] },
  { name: 'Wznosy bokiem na wyciągu', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka dolna, jednorącz. Unoś ramię bokiem do linii barku. Stałe napięcie przez cały zakres.' }] },
  { name: 'Wznosy bokiem na lince (zza pleców)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka za plecami. Prowadź łokieć w górę i w bok. Lekki ciężar, pełna kontrola — maksymalne rozciągnięcie boku barku.' }] },
  { name: 'Rotacje ramienia z gumą frontem', category: 'shoulders', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Łokieć przy ciele zgięty 90°. Rotuj przedramię na zewnątrz przeciw gumie. Zdrowie barku i rotatorów.' }] },
  { name: 'Aniołki i demony', category: 'shoulders', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Mobilność barków leżąc na brzuchu: ramiona w górę (anioł) i w dół wzdłuż ciała (demon). Powoli i kontrolowanie.' }] },
  { name: 'Wall Angel', category: 'shoulders', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Plecy i ramiona przy ścianie. Przesuwaj ręce w górę i w dół utrzymując kontakt ze ścianą. Mobilność i postawa.' }] },
  { name: 'Rozciąganie gumy nad głową', category: 'shoulders', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Guma w obu dłoniach nad głową. Rozciągaj na boki, ściągając łopatki. Rozgrzewka barków i klatki.' }] },

  // Legs
  { name: 'Hack Squat (maszyna)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Plecy płasko na oparciu. Stopy na środku platformy. Schodź do równoległości ud, napęd przez pięty.' }] },
  { name: 'Wyciskanie jednonóż na suwnicy', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Jedna stopa na platformie. Pełny zakres, kontrola. Świetne na asymetrie między nogami.' }] },
  { name: 'Sissy Squat', category: 'legs', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Odchyl tułów do tyłu zginając kolana, pięty w górę. Maksymalne rozciągnięcie czworogłowego. Trzymaj się podpory.' }] },
  { name: 'Przywodziciele na maszynie', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ściskaj nogi do środka przeciw oporowi. Kontroluj powrót, pełen zakres rozciągnięcia.' }] },
  { name: 'Cossack Squat', category: 'legs', type: 'compound', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Szeroki rozkrok. Przysiad na jedną nogę, druga wyprostowana. Mobilność bioder i siła jednonóż.' }] },
  { name: 'Przysiady wykroczne', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Wykrok w miejscu lub chodzony. Kolano przedniej nogi nad stopą, tylne nisko. Tułów pionowo.' }] },
  { name: 'Zakroki sprinterskie', category: 'legs', type: 'compound', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Zakrok w tył, dynamiczne wybicie do przodu kolanem (jak sprinter). Angażuje pośladki i hamstringi.' }] },
  { name: 'Wejścia bokiem na skrzynię', category: 'legs', type: 'compound', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Stań bokiem do skrzyni. Wchodź nogą bliższą, prostuj biodro na górze. Skupienie na pośladku.' }] },

  // Glutes
  { name: 'Odwodziciele na maszynie', category: 'glutes', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Rozsuwaj nogi na zewnątrz przeciw oporowi. Lekki pochył tułowia mocniej angażuje pośladki średnie.' }] },
  { name: 'Glute Kickback na wyciągu', category: 'glutes', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Mankiet na kostce, linka dolna. Wykop nogą w tył prosto, ściskaj pośladek. Nie wyginaj lędźwi.' }] },
  { name: 'Pull Through', category: 'glutes', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Linka między nogami, tyłem do wyciągu. Ruch zawiasowy w biodrach, wypchnij biodra do przodu ściskając pośladki.' }] },
  { name: 'Wyprosty biodra z gumą', category: 'glutes', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Guma wokół bioder/kostek. Wykop nogą w tył lub wypychaj biodra, aktywując pośladek. Lekki opór, dużo powtórzeń.' }] },

  // Arms - Biceps
  { name: 'Uginanie na modlitewniku (Preacher)', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ramiona na pulpicie. Pełen zakres, nie odrywaj łokci. Maksymalne rozciągnięcie na dole eksponuje biceps.' }] },
  { name: 'Uginania ze sztangą na modlitewniku', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łamana sztanga na pulpicie modlitewnika. Powolne opuszczanie do prawie pełnego wyprostu, ściskaj na górze.' }] },
  { name: 'Uginania łokci z hantlami stojąc', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Hantli po bokach, łokcie przy tułowiu. Uginaj naprzemiennie lub razem, bez bujania tułowiem.' }] },
  { name: 'Uginanie na wyciągu dolnym', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka dolna z drążkiem. Stałe napięcie przez cały zakres. Łokcie stabilne przy ciele.' }] },
  { name: 'Uginanie na maszynie', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ramiona na podpórce. Stabilizuje ruch i izoluje biceps. Pełen zakres, kontrolowane tempo.' }] },

  // Arms - Triceps
  { name: 'Wyciskanie wąsko (Close-grip)', category: 'arms', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Chwyt na szerokość barków. Łokcie blisko tułowia. Główny nacisk na triceps, wspomaga klatka.' }] },
  { name: 'Francuskie wyciskanie sztangi leżąc', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Łamana sztanga, leżąc. Opuszczaj za czoło zginając tylko łokcie. Łokcie stabilne, skierowane do sufitu.' }] },
  { name: 'Wyciskanie hantla oburącz w klęku', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Klęcząc, hantel oburącz za głową. Prostuj łokcie nad głowę, kontroluj opuszczanie. Stabilny tułów.' }] },
  { name: 'Triceps na maszynie', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ustaw oparcie. Prostuj ramiona do pełnego zakresu, ściskaj triceps. Kontroluj fazę powrotu.' }] },
  { name: 'Kickback z hantlą', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Tułów pochylony, ramię wzdłuż ciała. Prostuj łokieć w tył, ściskaj triceps na końcu. Łokieć nieruchomy.' }] },

  // Core
  { name: 'Brzuszki na maszynie', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Zginaj tułów siłą brzucha przeciw oporowi. Powolny powrót, stałe napięcie. Pozwala progresować ciężarem.' }] },
  { name: 'Pallof Press', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka z boku. Wypychaj ramiona przed siebie opierając się rotacji tułowia. Antyrotacyjna stabilizacja core.' }] },
  { name: 'Cable Woodchopper', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Linka od góry do dołu (lub odwrotnie) po skosie. Rotuj tułów kontrolowanie, ruch z brzucha nie z rąk.' }] },
  { name: 'Mountain Climbers', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Pozycja deski. Przyciągaj kolana naprzemiennie do klatki. Biodra nisko, brzuch napięty.' }] },
  { name: 'Hollow Hold', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Leżąc, unieś nogi i barki, lędźwie wciśnięte w podłogę. Trzymaj pozycję łódki, napięty brzuch.' }] },

  // Calves
  { name: 'Wspięcia na palce na suwnicy', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Palce na platformie, pięty w dół do rozciągnięcia, wspięcie maksymalne. Pauza 1s na górze i na dole.' }] },
  { name: 'Wspięcia na maszynie stojąc', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Barki pod podpórkami. Pełen zakres — głębokie rozciągnięcie, pełne wspięcie. Kontroluj tempo.' }] },
  { name: 'Donkey Calf Raise', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Tułów pochylony, ciężar na biodrach. Wspięcia na palce z pełnym zakresem. Mocno rozciąga łydki.' }] },

  // chest (added)
  { name: "Wyciskanie sztangi na ławce ujemnej (deklina)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskanie na ujemnym kącie akcentuje dolną część klatki. Kontroluj ekscentrykę." }] },
  { name: "Wyciskanie hantli na ławce ujemnej (deklina)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Hantle na deklinie dają większy zakres ruchu i akcent na dolną klatkę." }] },
  { name: "Wyciskanie na Smith maszynie (ławka skośna)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Smith maszyna stabilizuje tor ruchu, idealna do izolacji górnej klatki." }] },
  { name: "Wyciskanie na Smith maszynie (ławka płaska)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Płaskie wyciskanie w Smith maszynie do bezpiecznego dociążania klatki." }] },
  { name: "Wyciskanie na maszynie Hammer (skos góra)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Hammer ze skosem w górę celuje w górną klatkę po naturalnym łuku." }] },
  { name: "Wyciskanie na maszynie Hammer (skos dół)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Hammer z deklinacją obciąża dolną część klatki bezpiecznie i stabilnie." }] },
  { name: "Dipy na poręczach (na klatkę)", category: "chest", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Pochyl się do przodu, by zaangażować klatkę zamiast tricepsa." }] },
  { name: "Dipy z obciążeniem (na klatkę)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Wersja progresywna dipów: dociąż klatkę pasem z talerzem." }] },
  { name: "Rozpiętki na wyciągu z dołu (góra klatki)", category: "chest", type: "isolation", instructions: [{ title: "💡 Technika", content: "Wyciąg z dołu i ruch w górę akcentują górną część klatki." }] },
  { name: "Rozpiętki na wyciągu z góry (dół klatki)", category: "chest", type: "isolation", instructions: [{ title: "💡 Technika", content: "Wyciąg z góry i ruch w dół akcentują dolną część klatki." }] },
  { name: "Wyciskanie na wyciągu stojąc (góra klatki)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskanie na wyciągu stojąc utrzymuje stałe napięcie na klatce." }] },
  { name: "Svend Press (ściskanie talerzy)", category: "chest", type: "isolation", instructions: [{ title: "💡 Technika", content: "Ściskanie talerzy mocno angażuje wewnętrzną część klatki. Idealne na rozgrzewkę lub dobicie." }] },
  { name: "Wyciskanie hantli wąsko (chwyt neutralny)", category: "chest", type: "compound", instructions: [{ title: "💡 Technika", content: "Chwyt neutralny i docisk hantli celują w wewnętrzną klatkę, oszczędzając barki." }] },
  { name: "Rozpiętki gumą oporową stojąc", category: "chest", type: "isolation", instructions: [{ title: "💡 Technika", content: "Rozpiętki gumą to świetna opcja domowa lub na rozgrzewkę barków i klatki." }] },
  { name: "Pompki na podwyższeniu (nogi w górze)", category: "chest", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Uniesienie nóg przenosi obciążenie na górną część klatki." }] },
  { name: "Pompki diamentowe", category: "chest", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Wąski układ dłoni mocno angażuje wewnętrzną klatkę i triceps." }] },

  // back (added)
  { name: "Ściąganie drążka podchwytem (wąsko)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Ściąganie drążka podchwytem do klatki, łokcie blisko ciała." }] },
  { name: "Ściąganie drążka neutralnym chwytem", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Ściąganie uchwytu V do mostka, łokcie w dół." }] },
  { name: "Podciąganie wspomagane na maszynie", category: "back", type: "compound", tracking: "assisted_bodyweight", instructions: [{ title: "💡 Technika", content: "Podciąganie z przeciwwagą maszyny, klatka do uchwytów." }] },
  { name: "Wiosłowanie T-bar wąskim chwytem (uchwyt V)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Wiosłowanie T-bar wąskim uchwytem do brzucha." }] },
  { name: "Wiosłowanie na maszynie jednorącz (plate-loaded)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Wiosłowanie jednorącz na maszynie, łokieć do biodra." }] },
  { name: "Wiosłowanie w podporze na ławce skośnej (chest-supported)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Wiosłowanie hantlami leżąc na skośnej ławce, łokcie do bioder." }] },
  { name: "Wiosłowanie Meadowsa", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Wiosłowanie końcem sztangi landmine jednorącz, łokieć wysoko." }] },
  { name: "Martwy ciąg częściowy z podstawek (Rack Pull)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Martwy ciąg z podstawek poniżej kolan, pełny wyprost bioder." }] },
  { name: "Wiosłowanie w maszynie Smitha", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Wiosłowanie gryfem Smitha do klatki w pochyleniu." }] },
  { name: "Australijskie podciąganie (Inverted Row)", category: "back", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Podciąganie ciała do gryfu w poziomie, sylwetka napięta." }] },
  { name: "Szrugi w maszynie Smitha", category: "back", type: "isolation", instructions: [{ title: "💡 Technika", content: "Unoszenie barków z gryfem Smitha, pauza na szczycie." }] },
  { name: "Szrugi na wyciągu", category: "back", type: "isolation", instructions: [{ title: "💡 Technika", content: "Szrugi na dolnym wyciągu, stałe napięcie linki." }] },
  { name: "Pullover na maszynie", category: "back", type: "isolation", instructions: [{ title: "💡 Technika", content: "Pullover na maszynie łukiem do bioder, praca najszerszych." }] },
  { name: "Wiosłowanie na lince stojąc (Face Pull do twarzy)", category: "back", type: "isolation", instructions: [{ title: "💡 Technika", content: "Ściąganie liny do twarzy z rotacją zewnętrzną ramion." }] },
  { name: "Martwy ciąg sumo (akcent na plecy)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Martwy ciąg w szerokim rozkroku, plecy proste, biodra do przodu." }] },
  { name: "Martwy ciąg z deficytu", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Martwy ciąg ze stania na podwyższeniu, większy zakres ruchu." }] },
  { name: "Wymachy kettlebell (posterior chain)", category: "back", type: "compound", instructions: [{ title: "💡 Technika", content: "Dynamiczny zawias biodrowy z wyrzutem kettlebell do klatki." }] },

  // shoulders (added)
  { name: "Wyciskanie barków na maszynie Hammer Strength (jednorącz)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskaj jedną ręką, druga stabilizuje. Pełen zakres bez blokowania łokcia." }] },
  { name: "Wyciskanie nad głowę w Smith (Smith OHP)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskaj gryf pionowo nad głowę po prowadnicy, opuszczając do brody. Tułów napięty." }] },
  { name: "Odwrotne rozpiętki na maszynie (Reverse Pec Deck)", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Odwiedź ramiona do tyłu łukiem, ściągając łopatki. Kontroluj powrót." }] },
  { name: "Wznosy bokiem jednorącz na wyciągu dolnym", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Unieś ramię bokiem do wysokości barku przeciw oporowi wyciągu. Stałe napięcie." }] },
  { name: "Podciąganie sztangi wzdłuż tułowia (Upright Row)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Podciągaj sztangę wzdłuż tułowia do mostka, łokcie wyżej niż dłonie." }] },
  { name: "Podciąganie wzdłuż tułowia na wyciągu (Cable Upright Row)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Podciągaj drążek wyciągu wzdłuż tułowia do mostka, łokcie na boki." }] },
  { name: "Podciąganie hantli wzdłuż tułowia (Dumbbell Upright Row)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Podciągaj hantle wzdłuż tułowia do górnej klatki, łokcie wyżej niż dłonie." }] },
  { name: "Cuban Press (rotacja zewnętrzna z wyciskaniem)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Połączenie podciągania, rotacji zewnętrznej i wyciskania nad głowę. Lekki ciężar." }] },
  { name: "Z-Press (wyciskanie siedząc na podłodze)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskaj sztangę nad głowę siedząc na podłodze z nogami w V. Tułów pionowy." }] },
  { name: "Landmine Press (wyciskanie jednorącz)", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskaj koniec gryfu po skosie w górę jedną ręką. Łagodny tor dla barków." }] },
  { name: "Pompki w pozycji szczytowej (Pike Push-up)", category: "shoulders", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "W pozycji V opuść głowę między dłonie i wyciśnij się w górę. Biodra wysoko." }] },
  { name: "Wyciskanie hantli neutralnym chwytem nad głowę", category: "shoulders", type: "compound", instructions: [{ title: "💡 Technika", content: "Wyciskaj hantle nad głowę dłońmi zwróconymi do siebie. Łagodniejszy dla barków." }] },
  { name: "Wznosy bokiem z gumą oporową", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Unieś ramiona bokiem, rozciągając gumę spod stóp. Napięcie rośnie ku górze." }] },
  { name: "Wznosy sztangi w przód (Barbell Front Raise)", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Unieś sztangę przed siebie do wysokości barków na wyprostowanych ramionach." }] },
  { name: "Wznosy krążka w przód (Plate Front Raise)", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Unieś krążek trzymany oburącz przed siebie do wysokości oczu. Bez bujania." }] },
  { name: "Wznosy 6-kierunkowe (6-Way Raise)", category: "shoulders", type: "isolation", instructions: [{ title: "💡 Technika", content: "Sekwencja sześciu ruchów łącząca wznosy boczne i frontalne. Bardzo lekki ciężar." }] },

  // legs (added)
  { name: "Przysiad przedni ze sztangą (Front Squat)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Sztanga z przodu barków, tułów pionowo, akcent na czworogłowe." }] },
  { name: "Prasa nożna pozioma (siedząc)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Prasa pozioma siedząc, mniejsze obciążenie kręgosłupa, akcent na uda." }] },
  { name: "Prasa nożna pionowa (leżąc)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Prasa pionowa leżąc, duży zakres, akcent na czworogłowe i pośladki." }] },
  { name: "Hack Squat odwrotny (twarzą do oparcia)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Hack squat twarzą do oparcia, akcent na pośladki." }] },
  { name: "Pendulum Squat (maszyna wahadłowa)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Maszyna wahadłowa, łukowy tor, stałe napięcie na czworogłowych." }] },
  { name: "Przysiad Belt Squat (z pasem biodrowym)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Przysiad z pasem biodrowym, zero nacisku na kręgosłup." }] },
  { name: "Wyprosty nóg na maszynie jednonóż", category: "legs", type: "isolation", instructions: [{ title: "💡 Technika", content: "Wyprosty jednonóż, izolacja czworogłowego, korekta asymetrii." }] },
  { name: "Uginanie nóg stojąc jednonóż na maszynie", category: "legs", type: "isolation", instructions: [{ title: "💡 Technika", content: "Uginanie stojąc jednonóż, czysta izolacja dwugłowego." }] },
  { name: "Przysiad w suwnicy Smitha", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Przysiad w suwnicy, stabilny tor, akcent na czworogłowe." }] },
  { name: "Wykrok w suwnicy Smitha", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Wykrok w suwnicy, stabilny tor, praca jednonóż." }] },
  { name: "Glute-Ham Raise (GHR)", category: "legs", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Unoszenie tułowia na GHD siłą dwugłowych, masa ciała." }] },
  { name: "Nordic Hamstring Curl", category: "legs", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Powolne opuszczanie z kolan hamowane dwugłowymi, masa ciała." }] },
  { name: "Przysiad pistolet (jednonóż)", category: "legs", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Pełny przysiad na jednej nodze, masa ciała, siła i balans." }] },
  { name: "Przysiad z masą ciała (Air Squat)", category: "legs", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Przysiad bez obciążenia, baza techniki i rozgrzewka." }] },
  { name: "Sissy Squat na maszynie", category: "legs", type: "isolation", instructions: [{ title: "💡 Technika", content: "Sissy squat na maszynie, mocna izolacja czworogłowego." }] },
  { name: "Wejścia przodem na skrzynię ze sztangielkami", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Wejścia przodem na skrzynię z hantlami, praca jednonóż." }] },
  { name: "Przysiad do skrzyni (Box Squat)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Przysiad z siadem na skrzynię, akcent na pośladki i moc." }] },
  { name: "Przysiad Zercher (sztanga w zgięciach łokci)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Przysiad z gryfem w zgięciach łokci, tułów pionowy, mocny core." }] },
  { name: "Przysiad sumo z kettlebell", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Przysiad sumo z kettlebell, akcent na pośladki i przywodziciele." }] },
  { name: "Wykroki chodzone z hantlami (długi krok)", category: "legs", type: "compound", instructions: [{ title: "💡 Technika", content: "Wykroki chodzone długim krokiem, akcent na pośladki." }] },

  // glutes (added)
  { name: "Wypychanie bioder na maszynie Glute Drive", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Wypchnij biodra w górę, napnij pośladki, zatrzymaj na szczycie." }] },
  { name: "Hip Thrust w maszynie Smith", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Gryf nisko na biodrach, wypchnij biodra do równoległej, napnij pośladki." }] },
  { name: "Odwodzenie ud na maszynie z pochyleniem tułowia", category: "glutes", type: "isolation", instructions: [{ title: "💡 Technika", content: "Pochyl tułów do przodu i rozsuwaj kolana na boki kontrolowanie." }] },
  { name: "Kickback pośladka na maszynie", category: "glutes", type: "isolation", instructions: [{ title: "💡 Technika", content: "Wypchnij stopę w tył i górę, napnij pośladek, kontrolowany powrót." }] },
  { name: "Przeciąganie linki między nogami (Cable Pull-Through)", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Zawias biodrowy z linką między nogami, wypchnij biodra do przodu." }] },
  { name: "Mostek pośladkowy na jednej nodze", category: "glutes", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Wypchnij biodra w górę na jednej nodze, druga uniesiona, biodra na poziomie." }] },
  { name: "Frog Pump (mostek z rozłożonymi kolanami)", category: "glutes", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Podeszwy razem, kolana na boki, wypchnij biodra w górę i napnij pośladki." }] },
  { name: "Wykrok ukośny (Curtsy Lunge)", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Krok ukośnie w tył krzyżując nogę, opuść biodra, odepchnij przez piętę." }] },
  { name: "Wysoki step-up z hantlami", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Wejdź na wysoką skrzynię przez piętę, pełny wyprost biodra, kontrolowane zejście." }] },
  { name: "Wykrok w tył z akcentem na pośladek", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Długi krok w tył, ciężar na pięcie przedniej, napnij pośladek przy wstawaniu." }] },
  { name: "Rumuński martwy ciąg z akcentem na pośladek", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Zawias biodrowy ze sztangą blisko nóg, wypchnij biodra do przodu i napnij pośladki." }] },
  { name: "Wymachy kettlebell", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Zawias biodrowy i eksplozywny wyrzut bioder, kettlebell leci na wysokość klatki." }] },
  { name: "Kickback pośladka z gumą oporową", category: "glutes", type: "isolation", instructions: [{ title: "💡 Technika", content: "Z podporu wypchnij ugiętą nogę w tył i górę przeciw gumie, napnij pośladek." }] },
  { name: "Hip Thrust w rozstawie B-stance", category: "glutes", type: "compound", instructions: [{ title: "💡 Technika", content: "Stopa robocza płasko, druga cofnięta na pięcie, wypchnij biodra przez przednią nogę." }] },

  // arms (added)
  { name: "Uginanie skoncentrowane (Concentration Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Łokieć oparty o udo, uginaj hantlę kontrolowanym tempem z napięciem na szczycie." }] },
  { name: "Uginanie na pająku (Spider Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Brzuch na ławce skośnej, ramiona pionowo, uginaj bez rozpędu." }] },
  { name: "Uginanie z dociąganiem (Drag Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Sztanga sunie wzdłuż tułowia, łokcie cofają się za plecy." }] },
  { name: "Uginanie bayesowskie na wyciągu (Bayesian Cable Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Stań tyłem do wyciągu, ramię za ciałem, uginaj jednorącz z supinacją." }] },
  { name: "Uginanie hantli na ławce skośnej (Incline Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Plecy na ławce skośnej, ramiona zwisają, uginaj z supinacją." }] },
  { name: "Uginanie Zottmana (Zottman Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Uginaj podchwytem, obróć na szczycie do nachwytu, opuszczaj w nachwycie." }] },
  { name: "Uginanie ramion na maszynie wyciąg jednorącz (Single-Arm Cable Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Jednorącz na wyciągu dolnym, łokieć przy ciele, stałe napięcie." }] },
  { name: "Uginanie odwrotne (Reverse Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Uginanie sztangi nachwytem, nadgarstki proste, łokcie przy ciele." }] },
  { name: "Uginanie 21-tki (21s)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "7 dół-połowa, 7 połowa-góra, 7 pełny zakres. Lekki ciężar." }] },
  { name: "Prostowanie ramion zza głowy na wyciągu (Overhead Cable Extension)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Tyłem do wyciągu, linka zza głowy, prostuj łokcie w górę." }] },
  { name: "Prostowanie ramion z liną na wyciągu (Rope Pushdown)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Lina na górnym wyciągu, łokcie przy ciele, rozsuwaj końce na dole." }] },
  { name: "Prostowanie ramienia na wyciągu jednorącz (Single-Arm Pushdown)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Jednorącz podchwytem na górnym wyciągu, łokieć przy ciele." }] },
  { name: "JM Press (wyciskanie JM)", category: "arms", type: "compound", instructions: [{ title: "💡 Technika", content: "Hybryda skull crusher i wyciskania wąsko, łokcie do przodu i nisko." }] },
  { name: "Tate Press (wyciskanie Tate)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Leżąc, opuszczaj hantle do środka klatki łokciami na zewnątrz." }] },
  { name: "Dipy na maszynie (Assisted Dip Machine)", category: "arms", type: "compound", instructions: [{ title: "💡 Technika", content: "Siedząc w maszynie, prostuj łokcie wypychając uchwyty w dół." }] },
  { name: "Pompki diamentowe (Diamond Push-up)", category: "arms", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Dłonie razem w kształt diamentu, łokcie przy ciele, opuszczaj do dłoni." }] },
  { name: "Dipy na ławce (Bench Dips)", category: "arms", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Dłonie na ławce za plecami, opuszczaj biodra zginając łokcie." }] },
  { name: "Prostowanie ramion zza głowy z hantlą oburącz (Overhead DB Extension)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Hantla oburącz nad głową, opuszczaj za głowę z łokciami przy głowie." }] },
  { name: "Uginanie nadgarstków ze sztangą (Wrist Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Przedramiona na udach dłońmi w górę, zwijaj nadgarstki ze sztangą." }] },
  { name: "Odwrotne uginanie nadgarstków ze sztangą (Reverse Wrist Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Przedramiona na udach dłońmi w dół, prostuj nadgarstki ze sztangą." }] },
  { name: "Izometryczny chwyt farmera (Farmer's Hold)", category: "arms", type: "isolation", tracking: "weight_distance_duration", instructions: [{ title: "💡 Technika", content: "Trzymaj ciężkie hantle po bokach przez czas, mocny chwyt, plecy proste." }] },
  { name: "Uginanie hammer na wyciągu z liną (Cable Rope Hammer Curl)", category: "arms", type: "isolation", instructions: [{ title: "💡 Technika", content: "Lina na dolnym wyciągu, chwyt neutralny, uginaj łokcie w górę." }] },
  { name: "Wyciskanie wąsko w maszynie Smitha (Smith Close-Grip Press)", category: "arms", type: "compound", instructions: [{ title: "💡 Technika", content: "Wąski chwyt w maszynie Smitha, łokcie przy ciele, do dołu klatki." }] },

  // core (added)
  { name: "Brzuszki klasyczne (Crunch)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Unieś łopatki zwijając tułów, nie ciągnij za szyję." }] },
  { name: "Pełne spięcie brzucha (Sit-up)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Unieś cały tułów do siadu, kontroluj opadanie." }] },
  { name: "Brzuszki rowerek (Bicycle Crunch)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Naprzemienny łokieć do przeciwnego kolana, plecy na podłodze." }] },
  { name: "Plank boczny (Side Plank)", category: "core", type: "isolation", isBodyweight: true, tracking: "duration", instructions: [{ title: "💡 Technika", content: "Oparcie na przedramieniu, biodra w górę, prosta linia ciała." }] },
  { name: "Hollow Rock (Bujanie w łódce)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Pozycja łódki, bujaj się utrzymując napięty brzuch." }] },
  { name: "V-up (Scyzoryk)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Unieś tułów i nogi jednocześnie do kształtu V." }] },
  { name: "Nogi do drążka (Toes to Bar)", category: "core", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Zwis na drążku, unieś proste nogi aż palce dotkną drążka." }] },
  { name: "Unoszenie kolan w zwisie", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Zwis na drążku, przyciągnij kolana do klatki ze zwinięciem miednicy." }] },
  { name: "Wyciskanie kółka do brzucha z klęku jednorącz", category: "core", type: "compound", instructions: [{ title: "💡 Technika", content: "Wytaczaj kółko jedną ręką z klęku, utrzymując napięty brzuch." }] },
  { name: "Spięcia brzucha na ławce skośnej (Decline Sit-up)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Spięcia na ławce głową w dół, kontroluj opadanie tułowia." }] },
  { name: "Modlitewnik klęczący jednostronny (Cable Crunch)", category: "core", type: "isolation", instructions: [{ title: "💡 Technika", content: "Klęczący crunch na wyciągu, zwijaj tułów ku przeciwnemu biodru." }] },
  { name: "Wysoki Woodchopper na wyciągu (z dołu do góry)", category: "core", type: "compound", instructions: [{ title: "💡 Technika", content: "Ukośny ruch z dołu nad przeciwny bark, rotacja z brzucha." }] },
  { name: "Dead Bug z hantlami (obciążony)", category: "core", type: "isolation", instructions: [{ title: "💡 Technika", content: "Opuszczaj przeciwległe ramię i nogę z hantlami, plecy na podłodze." }] },
  { name: "Pallof Press w przysiadzie (warianty)", category: "core", type: "isolation", instructions: [{ title: "💡 Technika", content: "Wyciskaj uchwyt przed siebie w półprzysiadzie, opieraj się rotacji." }] },
  { name: "Dragon Flag (Flaga Smoka)", category: "core", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Opuszczaj sztywne ciało jako jedną linię, oparcie na łopatkach." }] },
  { name: "L-sit (Podpór kątowy)", category: "core", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Podpór na poręczach, unieś proste nogi do poziomu w kształt L." }] },
  { name: "Plank z dotykaniem barków", category: "core", type: "isolation", isBodyweight: true, tracking: "duration", instructions: [{ title: "💡 Technika", content: "Plank na prostych rękach, dotykaj przeciwnego barku bez ruchu bioder." }] },
  { name: "Superman (Unoszenie tułowia leżąc na brzuchu)", category: "core", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Unieś ramiona i nogi leżąc na brzuchu, napnij grzbiet i pośladki." }] },
  { name: "Burpees", category: "core", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Pełny ruch całego ciała: przysiad, deska, pompka, wyskok. Tempo kontrolowane, miękkie lądowanie." }] },

  // calves (added)
  { name: "Wspięcia na palce na prasie nożnej (Leg Press)", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Śródstopia na dolnej krawędzi platformy, pełen zakres góra-dół. Nie blokuj kolan." }] },
  { name: "Wspięcia na palce w maszynie Smitha (stojąc)", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Gryf na karku, śródstopia na podwyższeniu, pełen zakres ruchu w kostce." }] },
  { name: "Wspięcia na palce jednonóż z hantlą", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Hantla w ręce, jedna noga na podwyższeniu, pełne wzniesienie na palcach." }] },
  { name: "Wspięcia na palce ze sztangą stojąc", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Sztanga na karku, śródstopia na krążku, pełen zakres ruchu w kostce." }] },
  { name: "Wspięcia na palce jednonóż na podwyższeniu (masa ciała)", category: "calves", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Jedna noga na krawędzi stopnia, pełne opuszczenie pięty i wznios na palcach." }] },
  { name: "Wznosy palców na piszczel (Tibialis Raise)", category: "calves", type: "isolation", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Plecy o ścianie, unoszenie palców w stronę piszczeli. Pięty na podłodze." }] },
  { name: "Skakanka jako trening łydek", category: "calves", type: "compound", isBodyweight: true, instructions: [{ title: "💡 Technika", content: "Niskie, sprężyste odbicia ze śródstopia. Lądowanie na palcach, miękka praca kostek." }] },
  { name: "Wspięcia na palce z kettlebell stojąc", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Kettlebell w dłoniach, śródstopia na podwyższeniu, pełen zakres ruchu w kostce." }] },
  { name: "Wspięcia na palce na hack squacie", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Śródstopia na dolnej krawędzi platformy, nogi proste, pełen zakres w kostce." }] },
  { name: "Wspięcia na palce na suwnicy siedząc (zgięte kolana)", category: "calves", type: "isolation", instructions: [{ title: "💡 Technika", content: "Gryf suwnicy na udach nad kolanami, śródstopia na krążku, pełen zakres w kostce." }] },
  // Nowe typy śledzenia (Z105): ciężar + dystans + czas oraz asysta.
  { name: "Spacer farmera (Farmer's Walk)", category: "core", type: "compound", tracking: "weight_distance_duration", instructions: [{ title: "💡 Technika", content: "Ciężkie hantle lub uchwyty po bokach, plecy proste, mocny chwyt, krótkie stabilne kroki na dystans lub czas." }] },
  { name: "Dipy wspomagane na maszynie", category: "chest", type: "compound", tracking: "assisted_bodyweight", instructions: [{ title: "💡 Technika", content: "Dipy z przeciwwagą maszyny — im mniejsza asysta, tym trudniej. Pochyl tułów lekko do przodu na klatkę." }] },
];

export const categoryLabels: Record<LibraryExercise['category'], string> = {
  chest: 'Klatka piersiowa',
  back: 'Plecy',
  shoulders: 'Barki',
  legs: 'Nogi',
  arms: 'Ramiona',
  core: 'Brzuch',
  glutes: 'Pośladki',
  calves: 'Łydki',
};
