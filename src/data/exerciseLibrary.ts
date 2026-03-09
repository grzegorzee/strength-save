export interface LibraryExercise {
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'glutes' | 'calves';
  type: 'compound' | 'isolation';
  videoUrl?: string;
}

export const exerciseLibrary: LibraryExercise[] = [
  // Chest
  { name: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=GxXifj9_y5o' },
  { name: 'Wyciskanie hantli na ławce płaskiej', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=QApcl3o3tE0' },
  { name: 'Wyciskanie hantli (Lekki skos)', category: 'chest', type: 'compound' },
  { name: 'Wyciskanie sztangi na skosie', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=8RkENeYk2iQ' },
  { name: 'Rozpiętki hantlami', category: 'chest', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ITQaSEvPKhA' },
  { name: 'Rozpiętki na lince (Crossover)', category: 'chest', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=R-2HZLAlY8w' },
  { name: 'Pompki', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=u5TyFkCeuUk' },
  { name: 'Wyciskanie w maszynie', category: 'chest', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=9ZE-Y9NSScQ' },

  // Back
  { name: 'Wiosłowanie sztangą', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=G8l_8chR5BE' },
  { name: 'Wiosłowanie hantlami na ławce (przodem)', category: 'back', type: 'compound' },
  { name: 'Wiosłowanie hantlem jednorącz (Laty)', category: 'back', type: 'compound' },
  { name: 'Ściąganie drążka (Szeroki nachwyt)', category: 'back', type: 'compound' },
  { name: 'Ściąganie drążka (Wąski nachwyt)', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=urbHobVf5Ok' },
  { name: 'Podciąganie na drążku', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=qhFWICium0U' },
  { name: 'Wiosłowanie na lince siedząc', category: 'back', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=6_H-HwE5Duc' },
  { name: 'Pullover na lince', category: 'back', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=32auHIqgEoM' },

  // Shoulders
  { name: 'Wyciskanie hantli nad głowę (Siedząc)', category: 'shoulders', type: 'compound' },
  { name: 'Wyciskanie sztangi nad głowę (OHP)', category: 'shoulders', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=F3QY5vMz_6I' },
  { name: 'Wznosy bokiem (Lateral Raise)', category: 'shoulders', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
  { name: 'Wznosy bokiem leżąc (Y-Raise)', category: 'shoulders', type: 'isolation' },
  { name: 'Odwrotne rozpiętki (Tył barku)', category: 'shoulders', type: 'isolation' },
  { name: 'Face Pull', category: 'shoulders', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk' },
  { name: 'Arnoldki', category: 'shoulders', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=ris9tKqMwgU' },

  // Legs - Quads
  { name: 'Przysiad ze sztangą (High Bar)', category: 'legs', type: 'compound' },
  { name: 'Przysiad ze sztangą (Low Bar)', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=vmNPOjaGrVE' },
  { name: 'Przysiad goblet', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=k_EhLGvM8TQ' },
  { name: 'Prasa nożna', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=K5n2vg3oZa4' },
  { name: 'Wyprosty nóg na maszynie', category: 'legs', type: 'isolation' },
  { name: 'Wykroki chodzone', category: 'legs', type: 'compound' },
  { name: 'Wykroki bułgarskie', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=hiLF_pF3EJM' },

  // Legs - Hamstrings
  { name: 'Martwy Ciąg Rumuński (RDL)', category: 'legs', type: 'compound' },
  { name: 'Martwy ciąg klasyczny', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=VL5Ab0T07e4' },
  { name: 'Uginanie nóg na maszynie (Siedząc)', category: 'legs', type: 'isolation' },
  { name: 'Uginanie nóg na maszynie (Leżąc)', category: 'legs', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=vl5nUdE9mWM' },
  { name: 'Good Morning', category: 'legs', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=nWyx81AfTos' },

  // Glutes
  { name: 'Hip Thrust (Wypychanie bioder)', category: 'glutes', type: 'compound' },
  { name: 'Hip Thrust ze sztangą', category: 'glutes', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=Zp26q4BY5HE' },
  { name: 'Odwodzenie na lince', category: 'glutes', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=5jJNfIlKTmg' },
  { name: 'Glute Bridge', category: 'glutes', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=wPM8icPu6H8' },

  // Arms - Biceps
  { name: 'Uginanie hantli z supinacją (Ławka skośna)', category: 'arms', type: 'isolation' },
  { name: 'Uginanie sztangi stojąc', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=QZEqB6wUPxQ' },
  { name: 'Uginanie na lince (Hammer)', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=1Quc_tOv97I' },
  { name: 'Uginanie hantli hammer', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=8XLxfXROrTo' },

  // Arms - Triceps
  { name: 'Wyprosty francuskie zza głowy', category: 'arms', type: 'isolation' },
  { name: 'Wyprosty na lince (Pushdown)', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=mpZ9VRisAyw' },
  { name: 'Dips (pompki na poręczach)', category: 'arms', type: 'compound', videoUrl: 'https://www.youtube.com/watch?v=8UugSoVJLag' },
  { name: 'Skull Crushers', category: 'arms', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=kOXVmFFTcio' },

  // Core
  { name: 'Dead Bug (Robak - Brzuch)', category: 'core', type: 'isolation' },
  { name: 'Plank', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c' },
  { name: 'Ab Rollout', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=ikkOq5mHaho' },
  { name: 'Unoszenie nóg w zwisie', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=Pr1ieGZ5atk' },
  { name: 'Skręty rosyjskie', category: 'core', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI' },
  { name: 'Modlitewnik (Cable Crunch)', category: 'core', type: 'isolation' },
  { name: 'Reverse Crunch na ławce', category: 'core', type: 'isolation' },

  // Calves
  { name: 'Wspięcia na palce (Nogi proste)', category: 'calves', type: 'isolation' },
  { name: 'Wspięcia na palce siedząc', category: 'calves', type: 'isolation', videoUrl: 'https://www.youtube.com/watch?v=JbyjNymZOt0' },
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
