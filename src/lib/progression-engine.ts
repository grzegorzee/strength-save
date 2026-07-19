// Progresja programowa v1 (Z119-Z121): silnik REGUŁOWY (nie LLM — decyzja v6.10.0).
// Silnik NIGDY nie zapisuje — liczy i proponuje; zmiany za tapnięciem usera.
// Kandydat premium: funkcje za flagą progressionEngine (gating = decyzja przy launchu).

export type DeloadDecision = 'applied' | 'skipped';

export interface ProgressionConfig {
  enabled: boolean;
  /** Co ile tygodni programowany deload (2-12, default 5). */
  deloadEveryWeeks: number;
  /** Decyzje usera per tydzień (klucz = numer tygodnia 1-based jako string). */
  deloadDecisions?: Record<string, DeloadDecision>;
}

export const DEFAULT_PROGRESSION: ProgressionConfig = { enabled: true, deloadEveryWeeks: 5 };

const DELOAD_MIN_WEEKS = 2;
const DELOAD_MAX_WEEKS = 12;

/** Sanityzacja pola `progression` z dokumentu planu. Brak/śmieci = null (silnik wyłączony). */
export const sanitizeProgressionConfig = (raw: unknown): ProgressionConfig | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.enabled !== 'boolean') return null;

  const weeksRaw = Number(record.deloadEveryWeeks);
  const deloadEveryWeeks = Number.isFinite(weeksRaw)
    ? Math.min(DELOAD_MAX_WEEKS, Math.max(DELOAD_MIN_WEEKS, Math.round(weeksRaw)))
    : DEFAULT_PROGRESSION.deloadEveryWeeks;

  let deloadDecisions: Record<string, DeloadDecision> | undefined;
  if (typeof record.deloadDecisions === 'object' && record.deloadDecisions !== null) {
    const entries = Object.entries(record.deloadDecisions as Record<string, unknown>)
      .filter(([, value]) => value === 'applied' || value === 'skipped') as Array<[string, DeloadDecision]>;
    if (entries.length > 0) deloadDecisions = Object.fromEntries(entries);
  }

  return {
    enabled: record.enabled,
    deloadEveryWeeks,
    ...(deloadDecisions && { deloadDecisions }),
  };
};

/** Czy tydzień (1-based) jest programowanym tygodniem deload. */
export const isDeloadWeek = (weekIndex: number, config: ProgressionConfig): boolean => {
  if (!config.enabled || weekIndex <= 0) return false;
  return weekIndex % config.deloadEveryWeeks === 0;
};
