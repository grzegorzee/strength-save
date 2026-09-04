// Z167: PORT mapy tokenów focusu z src/lib/plan-i18n.ts — push dnia tłumaczy focus
// dla userów EN. Spójność z klientem pilnuje test src/test/exercise-i18n-coverage.test.ts.

export const FOCUS_TOKEN_EN: Record<string, string> = {
  "Góra": "Upper",
  "Dół": "Lower",
  "Nogi": "Legs",
  "Klatka": "Chest",
  "Plecy": "Back",
  "Barki": "Shoulders",
  "Ramiona": "Arms",
  "Brzuch": "Core",
  "Pośladki": "Glutes",
  "Łydki": "Calves",
  "Ciało": "Body",
  "ciało": "Body",
  "Całe": "Full",
  "Cały": "Full",
  "Tył": "Posterior",
  "Przód": "Anterior",
  "Siła": "Strength",
  "Wytrzymałość": "Endurance",
  "Kondycja": "Conditioning",
  "Akcesoria": "Accessories",
  "Jednonóż": "Unilateral",
  "Detale": "Detail Work",
  "Płasko": "Flat",
  "Środek": "Mid",
  "Szerokie": "Wide",
  "Uda": "Thighs",
  "Przysiad": "Squat",
};

const FOCUS_PHRASE_EN: Record<string, string> = {
  "Szerokie Plecy": "Back Width",
  "Tył Uda": "Hamstrings",
  "Klatka Płasko": "Flat Chest",
  "Środek Pleców": "Mid Back",
};

/** Focus dnia po angielsku (tłumaczy znane tokeny, resztę zostawia). */
export const localizeFocusEn = (focus: string): string => {
  if (!focus) return focus;
  return focus
    .split(/(\s*\/\s*)/)
    .map((segment) => {
      if (/^\s*\/\s*$/.test(segment)) return segment;
      const trimmed = segment.trim();
      const phrase = FOCUS_PHRASE_EN[trimmed];
      if (phrase) return segment.replace(trimmed, phrase);
      return segment
        .split(/(\s+)/)
        .map((token) => FOCUS_TOKEN_EN[token] ?? token)
        .join("");
    })
    .join("");
};
