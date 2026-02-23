export interface LibraryExercise {
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'glutes' | 'calves';
  type: 'compound' | 'isolation';
}

export const exerciseLibrary: LibraryExercise[] = [
  // Chest
  { name: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', type: 'compound' },
  { name: 'Wyciskanie hantli na ławce płaskiej', category: 'chest', type: 'compound' },
  { name: 'Wyciskanie hantli (Lekki skos)', category: 'chest', type: 'compound' },
  { name: 'Wyciskanie sztangi na skosie', category: 'chest', type: 'compound' },
  { name: 'Rozpiętki hantlami', category: 'chest', type: 'isolation' },
  { name: 'Rozpiętki na lince (Crossover)', category: 'chest', type: 'isolation' },
  { name: 'Pompki', category: 'chest', type: 'compound' },
  { name: 'Wyciskanie w maszynie', category: 'chest', type: 'compound' },

  // Back
  { name: 'Wiosłowanie sztangą', category: 'back', type: 'compound' },
  { name: 'Wiosłowanie hantlami na ławce (przodem)', category: 'back', type: 'compound' },
  { name: 'Wiosłowanie hantlem jednorącz (Laty)', category: 'back', type: 'compound' },
  { name: 'Ściąganie drążka (Szeroki nachwyt)', category: 'back', type: 'compound' },
  { name: 'Ściąganie drążka (Wąski nachwyt)', category: 'back', type: 'compound' },
  { name: 'Podciąganie na drążku', category: 'back', type: 'compound' },
  { name: 'Wiosłowanie na lince siedząc', category: 'back', type: 'compound' },
  { name: 'Pullover na lince', category: 'back', type: 'isolation' },

  // Shoulders
  { name: 'Wyciskanie hantli nad głowę (Siedząc)', category: 'shoulders', type: 'compound' },
  { name: 'Wyciskanie sztangi nad głowę (OHP)', category: 'shoulders', type: 'compound' },
  { name: 'Wznosy bokiem (Lateral Raise)', category: 'shoulders', type: 'isolation' },
  { name: 'Wznosy bokiem leżąc (Y-Raise)', category: 'shoulders', type: 'isolation' },
  { name: 'Odwrotne rozpiętki (Tył barku)', category: 'shoulders', type: 'isolation' },
  { name: 'Face Pull', category: 'shoulders', type: 'isolation' },
  { name: 'Arnoldki', category: 'shoulders', type: 'compound' },

  // Legs - Quads
  { name: 'Przysiad ze sztangą (High Bar)', category: 'legs', type: 'compound' },
  { name: 'Przysiad ze sztangą (Low Bar)', category: 'legs', type: 'compound' },
  { name: 'Przysiad goblet', category: 'legs', type: 'compound' },
  { name: 'Prasa nożna', category: 'legs', type: 'compound' },
  { name: 'Wyprosty nóg na maszynie', category: 'legs', type: 'isolation' },
  { name: 'Wykroki chodzone', category: 'legs', type: 'compound' },
  { name: 'Wykroki bułgarskie', category: 'legs', type: 'compound' },

  // Legs - Hamstrings
  { name: 'Martwy Ciąg Rumuński (RDL)', category: 'legs', type: 'compound' },
  { name: 'Martwy ciąg klasyczny', category: 'legs', type: 'compound' },
  { name: 'Uginanie nóg na maszynie (Siedząc)', category: 'legs', type: 'isolation' },
  { name: 'Uginanie nóg na maszynie (Leżąc)', category: 'legs', type: 'isolation' },
  { name: 'Good Morning', category: 'legs', type: 'compound' },

  // Glutes
  { name: 'Hip Thrust (Wypychanie bioder)', category: 'glutes', type: 'compound' },
  { name: 'Hip Thrust ze sztangą', category: 'glutes', type: 'compound' },
  { name: 'Odwodzenie na lince', category: 'glutes', type: 'isolation' },
  { name: 'Glute Bridge', category: 'glutes', type: 'isolation' },

  // Arms - Biceps
  { name: 'Uginanie hantli z supinacją (Ławka skośna)', category: 'arms', type: 'isolation' },
  { name: 'Uginanie sztangi stojąc', category: 'arms', type: 'isolation' },
  { name: 'Uginanie na lince (Hammer)', category: 'arms', type: 'isolation' },
  { name: 'Uginanie hantli hammer', category: 'arms', type: 'isolation' },

  // Arms - Triceps
  { name: 'Wyprosty francuskie zza głowy', category: 'arms', type: 'isolation' },
  { name: 'Wyprosty na lince (Pushdown)', category: 'arms', type: 'isolation' },
  { name: 'Dips (pompki na poręczach)', category: 'arms', type: 'compound' },
  { name: 'Skull Crushers', category: 'arms', type: 'isolation' },

  // Core
  { name: 'Dead Bug (Robak - Brzuch)', category: 'core', type: 'isolation' },
  { name: 'Plank', category: 'core', type: 'isolation' },
  { name: 'Ab Rollout', category: 'core', type: 'isolation' },
  { name: 'Unoszenie nóg w zwisie', category: 'core', type: 'isolation' },
  { name: 'Skręty rosyjskie', category: 'core', type: 'isolation' },

  // Calves
  { name: 'Wspięcia na palce (Nogi proste)', category: 'calves', type: 'isolation' },
  { name: 'Wspięcia na palce siedząc', category: 'calves', type: 'isolation' },
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
