// T6 (2026-09-29): miejsce treningu z kreatora ("Gdzie trenujesz?") i sprzęt
// szablonu planu. Czysty moduł bez importów Firebase / danych.

export type PlanEquipment = 'gym' | 'dumbbells_home' | 'bodyweight';

export const PLAN_EQUIPMENT_VALUES: readonly PlanEquipment[] = ['gym', 'dumbbells_home', 'bodyweight'];

/**
 * Stare dokumenty (users/{uid}.trainingProfile, szkice kreatora sprzed T6) nie
 * mają pola: brak albo nieznana wartość = 'gym', czyli dotychczasowe zachowanie
 * (cały katalog szablonów).
 */
export const resolvePlanEquipment = (value: unknown): PlanEquipment =>
  PLAN_EQUIPMENT_VALUES.includes(value as PlanEquipment) ? value as PlanEquipment : 'gym';

/** Twardy filtr: siłownia widzi wszystko, dom z hantlami widzi plany z hantlami
 *  i bez sprzętu, masa ciała tylko plany bez sprzętu. */
const ACCESSIBLE: Record<PlanEquipment, ReadonlySet<PlanEquipment>> = {
  gym: new Set<PlanEquipment>(['gym', 'dumbbells_home', 'bodyweight']),
  dumbbells_home: new Set<PlanEquipment>(['dumbbells_home', 'bodyweight']),
  bodyweight: new Set<PlanEquipment>(['bodyweight']),
};

export const isEquipmentAccessible = (templateEquipment: PlanEquipment, userEquipment: PlanEquipment): boolean =>
  ACCESSIBLE[userEquipment].has(templateEquipment);
