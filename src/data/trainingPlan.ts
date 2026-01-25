export interface Exercise {
  id: string;
  name: string;
  sets: string;
  instructions: {
    title: string;
    content: string;
  }[];
  isSuperset?: boolean;
  supersetGroup?: string;
}

export interface TrainingDay {
  id: string;
  dayName: string;
  focus: string;
  exercises: Exercise[];
}

export const trainingPlan: TrainingDay[] = [
  {
    id: "day-1",
    dayName: "Poniedziałek",
    focus: "Klatka / Przysiad / Środek Pleców",
    exercises: [
      {
        id: "ex-1-1",
        name: "Wyciskanie hantli (Lekki skos)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Ustawienie (Test Telefonu)",
            content: "Połóż telefon płasko na mostku. Jeśli spada na twarz = Twój mostek jest stromy, daj ławkę wyżej."
          },
          {
            title: "Wykonanie (Kształt Strzały)",
            content: "Nie prowadź łokci szeroko (kształt litery T). Zbliż je lekko do tułowia (kształt strzały / A)."
          }
        ]
      },
      {
        id: "ex-1-2",
        name: "Przysiad ze sztangą (High Bar)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Budowa ciała",
            content: "Masz długie kości udowe? Pochylisz się mocniej w przód. Podłóż małe talerze pod pięty."
          },
          {
            title: "Rozstaw stóp",
            content: "Podskocz w miejscu i wyląduj stabilnie. To jest Twój naturalny rozstaw stóp do przysiadu."
          }
        ]
      },
      {
        id: "ex-1-3",
        name: "Wiosłowanie hantlami na ławce",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Ustawienie",
            content: "Ławka pod kątem 30-45 stopni. Kładziesz się klatką na oparciu. To eliminuje bujanie tułowiem."
          },
          {
            title: "Ruch (Góra Pleców)",
            content: "Prowadź łokcie szeroko. W górnej fazie ściągaj łopatki do siebie."
          }
        ]
      },
      {
        id: "ex-1-4",
        name: "Uginanie nóg na maszynie (Siedząc)",
        sets: "3 x 8-12",
        instructions: [
          {
            title: "Dlaczego siedząc?",
            content: "Rozciąga mięśnie dwugłowe uda mocniej niż wersja leżąca."
          },
          {
            title: "Wskazówka Pro",
            content: "Pochyl tułów lekko do przodu - zwiększa napięcie tylnej taśmy."
          }
        ]
      },
      {
        id: "ex-1-5a",
        name: "Uginanie hantli z supinacją (Ławka skośna)",
        sets: "3 x 10-12",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Superseria: Biceps + Triceps",
            content: "Łokcie muszą zostać za linią tułowia. Rozciągnij biceps na dole."
          }
        ]
      },
      {
        id: "ex-1-5b",
        name: "Wyprosty francuskie zza głowy",
        sets: "3 x 10-12",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Triceps",
            content: "Łokcie przy uszach. Opuszczaj ciężar głęboko za głowę."
          }
        ]
      }
    ]
  },
  {
    id: "day-2",
    dayName: "Środa",
    focus: "Szerokie Plecy / Tył Uda",
    exercises: [
      {
        id: "ex-2-1",
        name: "Wyciskanie sztangi/hantli (Płasko)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Stabilność",
            content: "Ściągnij łopatki pod siebie (retrakcja). Stopy wbij w ziemię."
          },
          {
            title: "Tor ruchu",
            content: "Opuszczaj sztangę na linię sutków lub nieco poniżej."
          }
        ]
      },
      {
        id: "ex-2-2",
        name: "Martwy Ciąg Rumuński (RDL)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Ruch Zawiasowy",
            content: "Wyobraź sobie, że zamykasz drzwi od samochodu pośladkami. Kolana lekko ugięte."
          },
          {
            title: "Zakres ruchu",
            content: "Opuszczaj ciężar tylko do momentu, w którym biodra przestają się cofać."
          }
        ]
      },
      {
        id: "ex-2-3",
        name: "Ściąganie drążka (Szeroki nachwyt)",
        sets: "3 x 8-10",
        instructions: [
          {
            title: "Dłonie jako Haki",
            content: "Wyobraź sobie, że dłonie to haki, a ciągniesz łokciami."
          },
          {
            title: "Celowanie",
            content: "Ciągnij drążek do górnej części klatki (obojczyków)."
          }
        ]
      },
      {
        id: "ex-2-4",
        name: "Wykroki chodzone",
        sets: "3 x 10/noga",
        instructions: [
          {
            title: "Focus na Pośladki",
            content: "Pochyl tułów lekko do przodu - mocniej angażuje pośladek."
          },
          {
            title: "Bezpieczeństwo",
            content: "Kolano tylnej nogi zatrzymuj centymetr nad ziemią."
          }
        ]
      },
      {
        id: "ex-2-5a",
        name: "Wznosy bokiem leżąc na ławce (Y-Raise)",
        sets: "3 x 10-15",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Superseria: Barki + Brzuch",
            content: "Wnoś hantle szeroko, tworząc kształt litery Y."
          }
        ]
      },
      {
        id: "ex-2-5b",
        name: "Dead Bug (Robak)",
        sets: "3 x MAX",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Brzuch",
            content: "Dociśnij lędźwie do maty. Opuszczaj na przemian rękę i nogę."
          }
        ]
      }
    ]
  },
  {
    id: "day-3",
    dayName: "Piątek",
    focus: "Barki / Jednonóż / Detale",
    exercises: [
      {
        id: "ex-3-1",
        name: "Wyciskanie hantli nad głowę (Siedząc)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Kąt ławki",
            content: "Nie ustawiaj oparcia pionowo. Obniż o jeden ząbek (ok. 75-80 stopni)."
          },
          {
            title: "Pozycja łokci",
            content: "Łokcie lekko wysunięte przed ciało, nie idealnie na boki."
          }
        ]
      },
      {
        id: "ex-3-2",
        name: "Wiosłowanie hantlem jednorącz (Laty)",
        sets: "3 x 6-8",
        instructions: [
          {
            title: "Ruch Zamiatanie",
            content: "Ciągnij hantel po łuku w stronę biodra."
          },
          {
            title: "Izolacja",
            content: "Nie skręcaj tułowia! Barki równolegle do podłogi."
          }
        ]
      },
      {
        id: "ex-3-3",
        name: "Hip Thrust (Wypychanie bioder)",
        sets: "3 x 8-10",
        instructions: [
          {
            title: "Spięcie",
            content: "Napnij pośladki na górze ruchu."
          },
          {
            title: "Stabilność",
            content: "Plecy oparte o ławkę na wysokości łopatek."
          }
        ]
      },
      {
        id: "ex-3-4",
        name: "Bułgarskie wspięcia",
        sets: "3 x 8/noga",
        instructions: [
          {
            title: "Ustawienie",
            content: "Tylna noga na ławce, przednia stabilnie na podłodze."
          },
          {
            title: "Focus",
            content: "Utrzymuj tułów pionowo przez cały ruch."
          }
        ]
      },
      {
        id: "ex-3-5a",
        name: "Wznosy bokiem (Standing)",
        sets: "3 x 12-15",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Superseria: Barki + Łydki",
            content: "Kontrolowany ruch, bez rozpędu."
          }
        ]
      },
      {
        id: "ex-3-5b",
        name: "Wspięcia na palce (stojąc)",
        sets: "3 x 15-20",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "Łydki",
            content: "Pełen zakres ruchu - od rozciągnięcia do maksymalnego napięcia."
          }
        ]
      }
    ]
  }
];
