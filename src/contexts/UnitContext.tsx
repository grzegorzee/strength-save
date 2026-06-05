import { createContext, useContext, useState, type ReactNode } from 'react';
import { formatWeight, toDisplayWeight, fromInputWeight, type UnitSystem } from '@/lib/units';

const STORAGE_KEY = 'unit-system';

interface UnitContextValue {
  unit: UnitSystem;
  setUnit: (u: UnitSystem) => void;
  /** Formatuje ciężar zapisany w kg w aktualnej jednostce. */
  fmt: (kg: number, opts?: { decimals?: number; withUnit?: boolean }) => string;
  toDisplay: (kg: number) => number;
  fromInput: (value: number) => number;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unit, setUnitState] = useState<UnitSystem>(() => {
    if (typeof localStorage === 'undefined') return 'kg';
    return localStorage.getItem(STORAGE_KEY) === 'lbs' ? 'lbs' : 'kg';
  });

  const setUnit = (u: UnitSystem) => {
    setUnitState(u);
    try {
      localStorage.setItem(STORAGE_KEY, u);
    } catch {
      /* ignore */
    }
  };

  return (
    <UnitContext.Provider
      value={{
        unit,
        setUnit,
        fmt: (kg, opts) => formatWeight(kg, unit, opts),
        toDisplay: (kg) => toDisplayWeight(kg, unit),
        fromInput: (value) => fromInputWeight(value, unit),
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextValue => {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used within UnitProvider');
  return ctx;
};
