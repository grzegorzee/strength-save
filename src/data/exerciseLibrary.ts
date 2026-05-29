export interface LibraryExercise {
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'glutes' | 'calves';
  type: 'compound' | 'isolation';
  videoUrl?: string;
  isBodyweight?: boolean;
  instructions?: { title: string; content: string }[];
}

export const exerciseLibrary: LibraryExercise[] = [
  // Chest
  { name: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=GxXifj9_y5o', instructions: [{ title: '💡 Technika', content: 'Łopatki ściągnięte i wciśnięte w ławkę. Sztanga nad linią brodawek, łokcie ~75° od tułowia.' }] },
  { name: 'Wyciskanie hantli na ławce płaskiej', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=QApcl3o3tE0', instructions: [{ title: '💡 Technika', content: 'Używając dwóch hantli, wpisz łączny ciężar. Hantli nie stukaj u góry — zatrzymaj tuż przed.' }] },
  { name: 'Wyciskanie hantli (Lekki skos)', category: 'chest', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Ławka na skosie 15-30°. Hantli prowadź nad górną klatką. Łopatki ściągnięte.' }] },
  { name: 'Wyciskanie sztangi na skosie', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=8RkENeYk2iQ', instructions: [{ title: '💡 Technika', content: 'Skos 30-45°. Sztanga opada na górną część klatki. Nie odrywaj pleców od ławki.' }] },
  { name: 'Rozpiętki hantlami', category: 'chest', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ITQaSEvPKhA', instructions: [{ title: '💡 Technika', content: 'Łokcie lekko ugięte przez cały ruch. Rozciągaj klatkę na dole, ściskaj na górze.' }] },
  { name: 'Rozpiętki na lince (Crossover)', category: 'chest', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=R-2HZLAlY8w', instructions: [{ title: '💡 Technika', content: 'Lekki krok do przodu dla stabilności. Łokcie lekko ugięte, ruch jak przytulanie drzewa.' }] },
  { name: 'Pompki', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=u5TyFkCeuUk', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Ciało proste jak deska. Łokcie ~45° od tułowia, pełen zakres ruchu — klatka do podłogi.' }] },
  { name: 'Wyciskanie w maszynie', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=9ZE-Y9NSScQ', instructions: [{ title: '💡 Technika', content: 'Ustaw siedzisko tak, by uchwyty były na wysokości środka klatki. Łopatki ściągnięte.' }] },

  // Back
  { name: 'Wiosłowanie sztangą', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=G8l_8chR5BE', instructions: [{ title: '💡 Technika', content: 'Tułów pochylony ~45°. Ciągnij sztangę do pępka, łokcie blisko ciała. Nie zaokrąglaj pleców.' }] },
  { name: 'Wiosłowanie hantlami na ławce (przodem)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Klatka oparta o ławkę skośną. Ciągnij hantli do bioder, ściskaj łopatki na górze.' }] },
  { name: 'Wiosłowanie hantlem jednorącz (Laty)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Kolano i dłoń na ławce. Ciągnij hantel do biodra, łokieć przy ciele. Pełne rozciągnięcie na dole.' }] },
  { name: 'Ściąganie drążka (Szeroki nachwyt)', category: 'back', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Chwyt szerszy niż barki. Ciągnij drążek do górnej klatki, łokcie w dół. Nie ciągnij za szyję.' }] },
  { name: 'Ściąganie drążka (Wąski nachwyt)', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=urbHobVf5Ok', instructions: [{ title: '💡 Technika', content: 'Chwyt wąski podchwyt lub trójkąt. Ciągnij do klatki, ściskaj łopatki na dole ruchu.' }] },
  { name: 'Podciąganie na drążku', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=qhFWICium0U', instructions: [{ title: '💡 Technika', content: 'Pełne zwisanie na dole, broda nad drążkiem na górze. Kontroluj fazę opuszczania.' }] },
  { name: 'Wiosłowanie na lince siedząc', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=6_H-HwE5Duc', instructions: [{ title: '💡 Technika', content: 'Plecy proste, klatka do przodu. Ciągnij do brzucha, ściskaj łopatki. Nie odchylaj się nadmiernie.' }] },
  { name: 'Pullover na lince', category: 'back', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=32auHIqgEoM', instructions: [{ title: '💡 Technika', content: 'Łokcie lekko ugięte. Ciągnij drążek łukiem od góry do bioder. Czuj rozciąganie latów.' }] },

  // Shoulders
  { name: 'Wyciskanie hantli nad głowę (Siedząc)', category: 'shoulders', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Oparcie ławki ~85°. Hantli startują na wysokości uszu, wyciskaj do góry bez blokowania łokci.' }] },
  { name: 'Wyciskanie sztangi nad głowę (OHP)', category: 'shoulders', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=F3QY5vMz_6I', instructions: [{ title: '💡 Technika', content: 'Stopa na szerokość bioder, pośladki napięte. Sztanga startuje z klatki, wyciskaj prosto nad głowę.' }] },
  { name: 'Wznosy bokiem (Lateral Raise)', category: 'shoulders', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo', instructions: [{ title: '💡 Technika', content: 'Lekki pochył do przodu. Unoś do linii barków, kciuki lekko w dół. Kontroluj opuszczanie.' }] },
  { name: 'Wznosy bokiem leżąc (Y-Raise)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Leżąc bokiem na ławce skośnej. Unoś hantel w kształcie litery Y. Mały ciężar, duża kontrola.' }] },
  { name: 'Odwrotne rozpiętki (Tył barku)', category: 'shoulders', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Pochyl się do przodu lub użyj maszyny pec-deck odwrotnie. Ściskaj łopatki na szczycie.' }] },
  { name: 'Face Pull', category: 'shoulders', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk', instructions: [{ title: '💡 Technika', content: 'Linka na wysokości twarzy. Ciągnij do twarzy rozkładając ręce, rotuj zewnętrznie. Ściskaj łopatki.' }] },
  { name: 'Arnoldki', category: 'shoulders', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=ris9tKqMwgU', instructions: [{ title: '💡 Technika', content: 'Start z hantlami przed twarzą (supinacja). Podczas wyciskania obracaj dłonie na zewnątrz.' }] },

  // Legs - Quads
  { name: 'Przysiad ze sztangą (High Bar)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Sztanga na górze trapezów. Kolana w linii palców stóp. Siadaj do minimum równoległego uda.' }] },
  { name: 'Przysiad ze sztangą (Low Bar)', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=vmNPOjaGrVE', instructions: [{ title: '💡 Technika', content: 'Sztanga na tylnym delcie. Większy pochył tułowia. Mocniej angażuje pośladki i tylną nogę.' }] },
  { name: 'Przysiad goblet', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=k_EhLGvM8TQ', instructions: [{ title: '💡 Technika', content: 'Hantel trzymaj przy klatce. Łokcie między kolanami na dole. Utrzymuj klatkę do góry.' }] },
  { name: 'Prasa nożna', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=K5n2vg3oZa4', instructions: [{ title: '💡 Technika', content: 'Stopy na środku platformy, szerzej niż biodra. Nie prostuj kolan do końca. Dolna część pleców na siedzisku.' }] },
  { name: 'Wyprosty nóg na maszynie', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Oparcie za kolanami, wałek na kostkach. Prostuj nogi do pełnego zakresu, ściskaj quady na górze.' }] },
  { name: 'Wykroki chodzone', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Duży krok do przodu, kolano tylne do podłogi. Tułów prosto. Wpisz łączny ciężar obu hantli.' }] },
  { name: 'Wykroki bułgarskie', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=hiLF_pF3EJM', instructions: [{ title: '💡 Technika', content: 'Tylna stopa na ławce. Kolano przedniej nogi nie wychodzi za palce. Wpisz ciężar obu hantli.' }] },

  // Legs - Hamstrings
  { name: 'Martwy Ciąg Rumuński (RDL)', category: 'legs', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Nogi prawie proste (lekki ugięcie). Sztanga blisko ciała, cofaj biodra. Czuj rozciąganie hamstringów.' }] },
  { name: 'Martwy ciąg klasyczny', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=VL5Ab0T07e4', instructions: [{ title: '💡 Technika', content: 'Sztanga nad środkiem stopy. Plecy proste, napnij brzuch. Ciągnij nogami, nie plecami.' }] },
  { name: 'Uginanie nóg na maszynie (Siedząc)', category: 'legs', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Wałek za kostkami. Uginaj do pełnego zakresu, ściskaj hamstringi. Kontroluj powrót.' }] },
  { name: 'Uginanie nóg na maszynie (Leżąc)', category: 'legs', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=vl5nUdE9mWM', instructions: [{ title: '💡 Technika', content: 'Biodra przyciśnięte do ławki. Uginaj pełen zakres, nie podrzucaj ciężaru.' }] },
  { name: 'Good Morning', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=nWyx81AfTos', instructions: [{ title: '💡 Technika', content: 'Sztanga na trapezach. Cofaj biodra, pochylaj tułów do ~90°. Plecy ZAWSZE proste.' }] },

  // Glutes
  { name: 'Hip Thrust (Wypychanie bioder)', category: 'glutes', type: 'compound', instructions: [{ title: '💡 Technika', content: 'Łopatki na ławce, stopy płasko. Wypychaj biodra do pełnego wyprostu, ściskaj pośladki na górze.' }] },
  { name: 'Hip Thrust ze sztangą', category: 'glutes', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=Zp26q4BY5HE', instructions: [{ title: '💡 Technika', content: 'Użyj podkładki na sztangę. Stopy na szerokość bioder. Pełne wypychanie + 1s pauza na górze.' }] },
  { name: 'Odwodzenie na lince', category: 'glutes', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=5jJNfIlKTmg', instructions: [{ title: '💡 Technika', content: 'Mankiet na kostce. Odwódź nogę do tyłu, ściskaj pośladek. Nie wyginaj pleców.' }] },
  { name: 'Glute Bridge', category: 'glutes', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=wPM8icPu6H8', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Leżąc na plecach, stopy blisko pośladków. Wypychaj biodra do góry, ściskaj na szczycie.' }] },

  // Arms - Biceps
  { name: 'Uginanie hantli z supinacją (Ławka skośna)', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Ławka 45°. Hantli zwisają, uginaj z obrotem nadgarstka (supinacja). Pełne rozciągnięcie na dole.' }] },
  { name: 'Uginanie sztangi stojąc', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=QZEqB6wUPxQ', instructions: [{ title: '💡 Technika', content: 'Łokcie przy ciele, nie pomagaj tułowiem. Pełen zakres ruchu — od prostego do ugiętego.' }] },
  { name: 'Uginanie na lince (Hammer)', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=1Quc_tOv97I', instructions: [{ title: '💡 Technika', content: 'Chwyt młotkowy (kciuki do góry). Łokcie nieruchomo przy ciele. Ściskaj biceps na górze.' }] },
  { name: 'Uginanie hantli hammer', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=8XLxfXROrTo', instructions: [{ title: '💡 Technika', content: 'Chwyt neutralny (dłonie do siebie). Naprzemiennie lub razem. Łokcie stabilne.' }] },

  // Arms - Triceps
  { name: 'Wyprosty francuskie zza głowy', category: 'arms', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Hantel za głową, łokcie skierowane do góry. Prostuj w łokciach, nie ruszaj ramionami.' }] },
  { name: 'Wyprosty na lince (Pushdown)', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=mpZ9VRisAyw', instructions: [{ title: '💡 Technika', content: 'Łokcie przy ciele, nie pomagaj barkami. Prostuj do pełnego zakresu, ściskaj triceps na dole.' }] },
  { name: 'Dips (pompki na poręczach)', category: 'arms', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=8UugSoVJLag', instructions: [{ title: '💡 Technika', content: 'Pochyl tułów lekko do przodu na klatkę, prosto na triceps. Pełen zakres — łokcie do 90°.' }] },
  { name: 'Skull Crushers', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=kOXVmFFTcio', instructions: [{ title: '💡 Technika', content: 'Leżąc na ławce, sztanga nad czołem. Zginaj TYLKO w łokciach. Łokcie skierowane do sufitu.' }] },

  // Core
  { name: 'Dead Bug (Robak - Brzuch)', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Plecy wciśnięte w podłogę przez cały ruch. Powoli wyprostuj przeciwną rękę i nogę.' }] },
  { name: 'Plank', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Ciało proste od głowy do pięt. Brzuch mocno napięty, biodra nie opadają. Oddychaj normalnie.' }] },
  { name: 'Ab Rollout', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ikkOq5mHaho', instructions: [{ title: '💡 Technika', content: 'Start z kolan. Wyjeżdżaj kółkiem do przodu napinając brzuch. Nie wyginaj pleców w łuk.' }] },
  { name: 'Unoszenie nóg w zwisie', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=Pr1ieGZ5atk', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Zwis na drążku. Unoś kolana do klatki (łatwiej) lub proste nogi (trudniej). Nie huśtaj się.' }] },
  { name: 'Skręty rosyjskie', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Siedząc z uniesionymi nogami. Obracaj tułów ze strony na stronę. Kontroluj ruch, nie pędź.' }] },
  { name: 'Modlitewnik (Cable Crunch)', category: 'core', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Klęknij przodem do wyciągu. Zginaj tułów siłą brzucha, nie ramion. Łokcie przy uszach.' }] },
  { name: 'Reverse Crunch na ławce', category: 'core', type: 'isolation', isBodyweight: true, instructions: [{ title: '💡 Technika', content: 'Leżąc na ławce, chwyt za głową. Unoś biodra z ławki zwijając miednicę do klatki.' }] },

  // Calves
  { name: 'Wspięcia na palce (Nogi proste)', category: 'calves', type: 'isolation', instructions: [{ title: '💡 Technika', content: 'Pełne rozciągnięcie na dole, maksymalne wspięcie na górze. Pauza 1s na szczycie.' }] },
  { name: 'Wspięcia na palce siedząc', category: 'calves', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=JbyjNymZOt0', instructions: [{ title: '💡 Technika', content: 'Siedząc z ciężarem na kolanach. Pełen zakres — od rozciągnięcia do wspięcia. Kontroluj tempo.' }] },

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
