/** Exact international avoirdupois conversion; storage remains canonical kg. */
export const LB_TO_KG = 0.45359237;

export const kgToLbs = (kg: number): number => kg / LB_TO_KG;
export const lbsToKg = (lbs: number): number => lbs * LB_TO_KG;
