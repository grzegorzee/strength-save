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
};

/** Focus dnia po angielsku (tłumaczy znane tokeny, resztę zostawia). */
export const localizeFocusEn = (focus: string): string => {
  if (!focus) return focus;
  return focus
    .split(/(\s+)/)
    .map((tok) => FOCUS_TOKEN_EN[tok] ?? tok)
    .join("");
};
