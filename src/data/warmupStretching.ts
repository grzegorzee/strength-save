export interface WarmupExercise {
  name: string;
  duration: string;
}

export const warmupExercises: WarmupExercise[] = [
  { name: 'Jumping Jacks', duration: '30 sek.' },
  { name: 'Kręcenie biodrami (Hip Circles)', duration: '10x każda strona' },
  { name: 'Kręcenie ramionami (Arm Circles)', duration: '10x każda strona' },
  { name: 'Przysiady z ciężarem ciała', duration: '15 powtórzeń' },
  { name: 'Lekki trucht / marsz w miejscu', duration: '1 min' },
];

export interface StretchExercise {
  name: string;
  duration: string;
}

// Stretching per day focus
export const stretchingByFocus: Record<string, StretchExercise[]> = {
  default: [
    { name: 'Rozciąganie klatki (drzwi)', duration: '30 sek. / strona' },
    { name: 'Rozciąganie czworogłowego (stojąc)', duration: '30 sek. / noga' },
    { name: 'Rozciąganie dwugłowego (w siadzie)', duration: '30 sek.' },
    { name: 'Skłon do palców (stojąc)', duration: '30 sek.' },
    { name: 'Cat-Cow (na czworakach)', duration: '10 powtórzeń' },
    { name: 'Child\'s Pose', duration: '30 sek.' },
  ],
  chest: [
    { name: 'Rozciąganie klatki (drzwi)', duration: '30 sek. / strona' },
    { name: 'Rozciąganie tricepsa', duration: '30 sek. / ręka' },
    { name: 'Rozciąganie czworogłowego (stojąc)', duration: '30 sek. / noga' },
    { name: 'Skręt tułowia (leżąc)', duration: '30 sek. / strona' },
    { name: 'Cat-Cow (na czworakach)', duration: '10 powtórzeń' },
    { name: 'Child\'s Pose', duration: '30 sek.' },
  ],
  back: [
    { name: 'Rozciąganie latów (boczne pochylenie)', duration: '30 sek. / strona' },
    { name: 'Rozciąganie dwugłowego (w siadzie)', duration: '30 sek.' },
    { name: 'Rozciąganie lędźwi (kolana do klatki)', duration: '30 sek.' },
    { name: 'Cat-Cow (na czworakach)', duration: '10 powtórzeń' },
    { name: 'Pigeon Pose', duration: '30 sek. / strona' },
    { name: 'Child\'s Pose', duration: '30 sek.' },
  ],
  shoulders: [
    { name: 'Rozciąganie barków (ramię w poprzek)', duration: '30 sek. / strona' },
    { name: 'Rozciąganie klatki (drzwi)', duration: '30 sek. / strona' },
    { name: 'Rozciąganie czworogłowego (stojąc)', duration: '30 sek. / noga' },
    { name: 'Rozciąganie bicepsa (ściana)', duration: '30 sek. / ręka' },
    { name: 'Cat-Cow (na czworakach)', duration: '10 powtórzeń' },
    { name: 'Child\'s Pose', duration: '30 sek.' },
  ],
};

// Try to match day focus to stretching category
export function getStretchingForFocus(focus: string): StretchExercise[] {
  const lowerFocus = focus.toLowerCase();
  if (lowerFocus.includes('klat') || lowerFocus.includes('chest')) return stretchingByFocus.chest;
  if (lowerFocus.includes('plec') || lowerFocus.includes('back')) return stretchingByFocus.back;
  if (lowerFocus.includes('bark') || lowerFocus.includes('shoulder')) return stretchingByFocus.shoulders;
  return stretchingByFocus.default;
}
