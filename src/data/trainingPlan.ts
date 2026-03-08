export interface Exercise {
  id: string;
  name: string;
  sets: string;
  instructions: {
    title: string;
    content: string;
  }[];
  videoUrl?: string;
  isSuperset?: boolean;
  supersetGroup?: string;
}

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TrainingDay {
  id: string;
  dayName: string;
  weekday: Weekday;
  focus: string;
  exercises: Exercise[];
}

const weekdayToOffset: Record<Weekday, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

// Helper to generate N weeks of training dates, dynamically based on plan weekdays
export const getTrainingSchedule = (
  startDate: Date = new Date(),
  weeks: number = 12,
  days?: TrainingDay[],
): { date: Date; dayId: string }[] => {
  const schedule: { date: Date; dayId: string }[] = [];
  const start = new Date(startDate);

  // Find the current week's Monday (go back to Monday if we're past it)
  const dayOfWeek = start.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);

  // Use plan days or default Mon/Wed/Fri
  const planDays = days && days.length > 0
    ? days.map(d => ({ id: d.id, offset: weekdayToOffset[d.weekday] }))
    : [
        { id: 'day-1', offset: 0 },  // Monday
        { id: 'day-2', offset: 2 },  // Wednesday
        { id: 'day-3', offset: 4 },  // Friday
      ];

  // Sort by offset so days within a week are in order
  planDays.sort((a, b) => a.offset - b.offset);

  for (let week = 0; week < weeks; week++) {
    const weekMonday = new Date(start);
    weekMonday.setDate(start.getDate() + week * 7);

    for (const { id, offset } of planDays) {
      const dayDate = new Date(weekMonday);
      dayDate.setDate(weekMonday.getDate() + offset);
      schedule.push({ date: dayDate, dayId: id });
    }
  }

  return schedule;
};

export const getTodaysTraining = (): TrainingDay | null => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Monday = 1, Wednesday = 3, Friday = 5
  if (dayOfWeek === 1) return trainingPlan.find(d => d.weekday === 'monday') || null;
  if (dayOfWeek === 3) return trainingPlan.find(d => d.weekday === 'wednesday') || null;
  if (dayOfWeek === 5) return trainingPlan.find(d => d.weekday === 'friday') || null;
  
  return null;
};

export const getTrainingDates = (): Date[] => {
  return getTrainingSchedule().map(s => s.date);
};

export const trainingPlan: TrainingDay[] = [
  {
    id: "day-1",
    dayName: "Poniedziałek",
    weekday: "monday",
    focus: "Klatka / Przysiad / Środek Pleców",
    exercises: [
      {
        id: "ex-1-1",
        name: "Wyciskanie hantli (Lekki skos)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=-iWjdKWNpNg",
        instructions: [
          {
            title: "🎯 Test Telefonu",
            content: "Połóż telefon na mostku. Jeśli leży płasko = skos minimalny (1. dziurka). Jeśli spada = wyższy skos (2. dziurka)."
          },
          {
            title: "💪 Ruch (Kształt Strzały)",
            content: "Łokcie prowadź węziej ('w strzałę'), nie szeroko w literę T."
          },
          {
            title: "⚡ Ciężar",
            content: "Taki, by ostatnie powtórzenie było walką, ale techniczną (1-2 ruchy zapasu)."
          }
        ]
      },
      {
        id: "ex-1-2",
        name: "Przysiad ze sztangą (High Bar)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=bEv6CCg2BC8",
        instructions: [
          {
            title: "📐 Rozstaw stóp",
            content: "Podskocz i wyląduj – tak ustaw stopy."
          },
          {
            title: "🦵 Tip dla długich ud",
            content: "Jeśli masz długie uda i lecisz do przodu, podłóż małe talerzyki pod pięty."
          },
          {
            title: "⏱️ Przerwa",
            content: "2-3 minuty między seriami."
          }
        ]
      },
      {
        id: "ex-1-3",
        name: "Wiosłowanie hantlami na ławce (przodem)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=axoeDmW0oAY",
        instructions: [
          {
            title: "📍 Ustawienie",
            content: "Klatka leży na ławce (30-45°). Eliminuje to bujanie."
          },
          {
            title: "💪 Ruch (Góra Pleców)",
            content: "Łokcie prowadź szeroko (60°). Na górze mocno ściągnij łopatki ('zgnieć orzech')."
          }
        ]
      },
      {
        id: "ex-1-4",
        name: "Uginanie nóg na maszynie (Siedząc)",
        sets: "3 x 8-12",
        videoUrl: "https://www.youtube.com/watch?v=oFxEDkppbSQ",
        instructions: [
          {
            title: "🎯 Dlaczego siedząc?",
            content: "Wersja siedząca daje lepsze przyrosty niż leżąca."
          },
          {
            title: "💡 Tip Pro",
            content: "Podczas ruchu pochyl tułów do przodu (w stronę kolan) – to mocniej rozciąga mięsień."
          },
          {
            title: "⏱️ Przerwa",
            content: "60-90 sekund między seriami."
          }
        ]
      },
      {
        id: "ex-1-5a",
        name: "Uginanie hantli z supinacją (Ławka skośna)",
        sets: "3 x 10-12",
        videoUrl: "https://www.youtube.com/watch?v=i1YgFZB6alI",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA: Biceps + Triceps",
            content: "Robisz oba ćwiczenia ciągiem bez przerwy. Dopiero po zrobieniu B odpoczywasz."
          },
          {
            title: "📍 Ustawienie",
            content: "Leżąc na ławce skośnej. Łokcie muszą zostać za linią tułowia dla maksymalnego rozciągnięcia bicepsa."
          }
        ]
      },
      {
        id: "ex-1-5b",
        name: "Wyprosty francuskie zza głowy",
        sets: "3 x 10-12",
        videoUrl: "https://www.youtube.com/watch?v=popGXI-qs98",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA",
            content: "Kontynuuj od razu po bicepsie."
          },
          {
            title: "💪 Triceps",
            content: "Hantel lub linka. Łokcie przy uszach, opuszczaj głęboko za kark."
          }
        ]
      }
    ]
  },
  {
    id: "day-2",
    dayName: "Środa",
    weekday: "wednesday",
    focus: "Szerokie Plecy / Tył Uda / Klatka Płasko",
    exercises: [
      {
        id: "ex-2-1",
        name: "Wyciskanie sztangi/hantli (Płasko)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=vcBig73ojpE",
        instructions: [
          {
            title: "📍 Stabilizacja",
            content: "Ściągnij łopatki pod siebie (retrakcja). Stopy wbij w ziemię. Lekki mostek jest konieczny dla zdrowia barków."
          },
          {
            title: "💪 Ruch",
            content: "Opuszczaj sztangę na linię sutków lub nieco poniżej."
          }
        ]
      },
      {
        id: "ex-2-2",
        name: "Martwy Ciąg Rumuński (RDL)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=_oyxCn2iSjU",
        instructions: [
          {
            title: "🎯 Ruch zawiasowy",
            content: "Wyobraź sobie, że zamykasz drzwi pośladkami. Kolana lekko ugięte, ale zablokowane."
          },
          {
            title: "📏 Zakres",
            content: "Zatrzymaj się, gdy biodra przestaną się cofać (zwykle połowa piszczeli)."
          },
          {
            title: "⏱️ Przerwa",
            content: "2-3 minuty między seriami."
          }
        ]
      },
      {
        id: "ex-2-3",
        name: "Ściąganie drążka (Szeroki nachwyt)",
        sets: "3 x 8-10",
        videoUrl: "https://www.youtube.com/watch?v=O94yEoGXtBY",
        instructions: [
          {
            title: "🖐️ Chwyt",
            content: "Dłonie jak haki (nie ściskaj mocno)."
          },
          {
            title: "🎯 Cel",
            content: "Ciągnij łokciami w dół, celując drążkiem w górną część klatki/obojczyki. Nie garb się."
          }
        ]
      },
      {
        id: "ex-2-4",
        name: "Wykroki chodzone",
        sets: "3 x 10/noga",
        videoUrl: "https://www.youtube.com/watch?v=_DLIS8SySzs",
        instructions: [
          {
            title: "🍑 Focus na pośladki",
            content: "Podczas kroku pochyl tułów lekko do przodu ('zawiśnij' nad nogą)."
          },
          {
            title: "💡 Tip",
            content: "Kolano tylnej nogi zatrzymuj 1 cm nad ziemią."
          }
        ]
      },
      {
        id: "ex-2-5a",
        name: "Wznosy bokiem leżąc (Y-Raise)",
        sets: "3 x 10-15",
        videoUrl: "https://www.youtube.com/watch?v=U7Pdw5wFGh0",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA: Barki + Brzuch",
            content: "Robisz oba ćwiczenia ciągiem bez przerwy."
          },
          {
            title: "💪 Wykonanie",
            content: "Leżąc na ławce skośnej na plecach. Wnoś hantle szeroko w kształt litery Y. Nie szarp."
          }
        ]
      },
      {
        id: "ex-2-5b",
        name: "Dead Bug (Robak - Brzuch)",
        sets: "3 x MAX",
        videoUrl: "https://www.youtube.com/watch?v=I9x8KzS_jKw",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA",
            content: "Kontynuuj od razu po barkach."
          },
          {
            title: "🎯 Kluczowe",
            content: "Leżąc na macie. Lędźwie muszą być wklejone w podłogę. Opuszczaj rękę i nogę na przemian powoli."
          }
        ]
      }
    ]
  },
  {
    id: "day-3",
    dayName: "Piątek",
    weekday: "friday",
    focus: "Barki / Jednonóż / Detale",
    exercises: [
      {
        id: "ex-3-1",
        name: "Wyciskanie hantli nad głowę (Siedząc)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog",
        instructions: [
          {
            title: "📍 Ustawienie",
            content: "Ławka nie pionowo! Obniż oparcie o jeden ząbek (75-80°)."
          },
          {
            title: "💪 Ruch",
            content: "Łokcie lekko wysunięte przed ciało (nie idealnie na boki)."
          },
          {
            title: "⏱️ Przerwa",
            content: "2-3 minuty między seriami."
          }
        ]
      },
      {
        id: "ex-3-2",
        name: "Wiosłowanie hantlem jednorącz (Laty)",
        sets: "3 x 6-8",
        videoUrl: "https://www.youtube.com/watch?v=EEFHHOCfHgw",
        instructions: [
          {
            title: "🎯 Ruch 'Zamiatanie'",
            content: "Ciągnij hantel po łuku w stronę biodra ('chowaj do kieszeni'), a nie pionowo do pachy."
          },
          {
            title: "💡 Tip",
            content: "Nie skręcaj tułowia. Barki równolegle do podłogi."
          }
        ]
      },
      {
        id: "ex-3-3",
        name: "Hip Thrust (Wypychanie bioder)",
        sets: "3 x 8-10",
        videoUrl: "https://www.youtube.com/watch?v=xDmFkJxPzeM",
        instructions: [
          {
            title: "💪 Spięcie",
            content: "Na górze ściskaj pośladki, jakbyś trzymał między nimi banknot 100 zł."
          },
          {
            title: "👤 Głowa",
            content: "Broda przyklejona do klatki (patrz przed siebie), chroni to lędźwie."
          },
          {
            title: "📍 Stabilność",
            content: "Plecy oparte o ławkę na wysokości łopatek."
          }
        ]
      },
      {
        id: "ex-3-4",
        name: "Wyprosty nóg na maszynie",
        sets: "3 x 10-15",
        videoUrl: "https://www.youtube.com/watch?v=ljO4jkwv8wQ",
        instructions: [
          {
            title: "📍 Ustawienie",
            content: "Jeśli maszyna pozwala, odchyl oparcie mocno do tyłu (pozycja półleżąca). To lepiej angażuje prosty uda."
          },
          {
            title: "⏱️ Przerwa",
            content: "60-90 sekund między seriami."
          }
        ]
      },
      {
        id: "ex-3-5a",
        name: "Odwrotne rozpiętki (Tył barku)",
        sets: "3 x 10-15",
        videoUrl: "https://www.youtube.com/watch?v=lPt0GqwaqEw",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA: Barki + Łydki",
            content: "Robisz oba ćwiczenia ciągiem bez przerwy."
          },
          {
            title: "📍 Ustawienie",
            content: "Leżąc brzuchem na ławce skośnej. Podłóż bluzę pod klatkę. Ręce szeroko."
          }
        ]
      },
      {
        id: "ex-3-5b",
        name: "Wspięcia na palce (Nogi proste)",
        sets: "3 x 10-15",
        videoUrl: "https://www.youtube.com/watch?v=21inrjhoFkQ",
        isSuperset: true,
        supersetGroup: "5",
        instructions: [
          {
            title: "🔄 SUPERSERIA",
            content: "Kontynuuj od razu po barkach."
          },
          {
            title: "🦵 Łydki",
            content: "Stojąc lub na suwnicy. Kolana proste. Długa pauza (2 sekundy) w dolnym rozciągnięciu!"
          }
        ]
      }
    ]
  }
];

// General training rules
export const trainingRules = {
  weight: "Ciężar: Taki, by ostatnie powtórzenie było walką, ale techniczną (1-2 ruchy zapasu).",
  restMain: "Przerwy główne ćwiczenia: 2–3 minuty.",
  restIsolation: "Przerwy izolacje: 60–90 sekund.",
  supersets: "Superserie: Ostatnie dwa ćwiczenia (A i B) robisz ciągiem bez przerwy. Dopiero po zrobieniu B odpoczywasz."
};
