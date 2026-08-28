// Krok 4 przełożenia treningu: komponenty UI (sheet, baner, akcja na karcie).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { TrainingDay } from '@/data/trainingPlan';
import { RescheduleSheet } from '@/components/RescheduleSheet';
import { MissedWorkoutBanner } from '@/components/MissedWorkoutBanner';
import { TrainingDayCard } from '@/components/TrainingDayCard';

const day = (id: string, dayName: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName,
  weekday,
  focus: 'Klatka',
  exercises: [],
});

// 2026-08-10 pn, 2026-08-12 śr, 2026-08-14 pt.
const planDays = [
  day('day-1', 'Poniedziałek', 'monday'),
  day('day-2', 'Środa', 'wednesday'),
  day('day-3', 'Piątek', 'friday'),
];
const TODAY = '2026-08-14';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('RescheduleSheet', () => {
  const renderSheet = (onSelect = vi.fn()) => {
    wrap(
      <RescheduleSheet
        open
        onOpenChange={() => {}}
        fromDateISO="2026-08-14"
        planDays={planDays}
        overrides={{}}
        onSelect={onSelect}
        todayISO={TODAY}
      />,
    );
    return onSelect;
  };

  it('pokazuje 13 dat horyzontu (14 dni minus dzień źródłowy) z zajętością i "wolne"', () => {
    renderSheet();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(13 + 1); // 13 dat + przycisk zamknięcia sheeta
    // Poniedziałek 2026-08-17 zajęty przez day-1: zapowiedź swapu.
    expect(screen.getAllByText(/zamieni się miejscami/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('wolne').length).toBeGreaterThan(0);
  });

  it('wybór daty woła onSelect z datą ISO', () => {
    const onSelect = renderSheet();
    // 2026-08-15 to pierwsza sobota horyzontu (druga: 22 sie) — bierzemy pierwszą.
    fireEvent.click(screen.getAllByText(/sobota/i)[0].closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('2026-08-15');
  });

  it('data źródłowa nie występuje na liście', () => {
    renderSheet();
    expect(screen.queryByText(/14 sie/)).not.toBeNull(); // opis w nagłówku
    // Wiersze zaczynają się od 15 sie — piątek 14 sie pominięty jako opcja.
    const rows = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(rows.filter((textContent) => /piątek, 14/.test(textContent))).toEqual([]);
  });

  // WP-A (X27): data z ukończonym treningiem zostaje na liście (user rozumie,
  // czemu nie może wybrać), ale jest disabled z dopiskiem i nie woła onSelect.
  it('data z ukończonym treningiem: wiersz disabled z dopiskiem, klik nie woła onSelect', () => {
    const onSelect = vi.fn();
    wrap(
      <RescheduleSheet
        open
        onOpenChange={() => {}}
        fromDateISO="2026-08-14"
        planDays={planDays}
        overrides={{}}
        onSelect={onSelect}
        todayISO={TODAY}
        completedDates={new Set(['2026-08-15'])}
      />,
    );
    // 2026-08-15 = pierwsza sobota horyzontu.
    const row = screen.getAllByText(/sobota/i)[0].closest('button')!;
    expect(row.hasAttribute('disabled')).toBe(true);
    expect(row.getAttribute('aria-disabled')).toBe('true');
    expect(row.textContent).toContain('trening ukończony');
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
    // Pozostałe daty klikalne jak dotąd.
    fireEvent.click(screen.getAllByText(/niedziela/i)[0].closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('2026-08-16');
  });
});

describe('MissedWorkoutBanner', () => {
  const renderBanner = (over: Partial<Parameters<typeof MissedWorkoutBanner>[0]> = {}) => {
    const onDoToday = vi.fn();
    const onReschedule = vi.fn();
    wrap(
      <MissedWorkoutBanner
        planDays={planDays}
        overrides={{}}
        workouts={[]}
        todayISO={TODAY}
        onDoToday={onDoToday}
        onReschedule={onReschedule}
        {...over}
      />,
    );
    return { onDoToday, onReschedule };
  };

  it('pokazuje najświeższy niezrobiony trening z akcją Przełóż', () => {
    const { onReschedule } = renderBanner();
    expect(screen.getByText(/Środa.*niezrobiony/)).toBeTruthy();
    fireEvent.click(screen.getByText('Przełóż trening'));
    expect(onReschedule).toHaveBeenCalledWith('2026-08-12');
  });

  it('[Zrób dziś] ukryty gdy dziś jest trening (piątek = day-3), widoczny gdy dziś wolne', () => {
    renderBanner();
    expect(screen.queryByText('Zrób dziś')).toBeNull();
  });

  it('[Zrób dziś] widoczny gdy dziś wolne i woła onDoToday', () => {
    const { onDoToday } = renderBanner({ overrides: { '2026-08-14': null } });
    fireEvent.click(screen.getByText('Zrób dziś'));
    expect(onDoToday).toHaveBeenCalledWith('2026-08-12');
  });

  it('krzyżyk zapamiętuje odrzucenie tej daty (baner znika i nie wraca)', () => {
    renderBanner();
    const dismiss = screen.getByLabelText('Odrzuć');
    expect(dismiss.className).toContain('min-h-11');
    expect(dismiss.className).toContain('min-w-11');
    fireEvent.click(dismiss);
    // Baner przeskakuje na starszy pominięty dzień (pn), nie znika całkiem.
    expect(screen.queryByText(/Środa.*niezrobiony/)).toBeNull();
    expect(screen.getByText(/Poniedziałek.*niezrobiony/)).toBeTruthy();
    // Pamięć w localStorage: nowy render nie pokazuje odrzuconej środy.
    expect(JSON.parse(localStorage.getItem('fittracker_missed_dismissed')!)).toContain('2026-08-12');
  });

  it('ukończone wszystko = brak banera', () => {
    renderBanner({
      workouts: [
        { date: '2026-08-07', completed: true },
        { date: '2026-08-10', completed: true },
        { date: '2026-08-12', completed: true },
      ],
    });
    expect(screen.queryByText(/niezrobiony/)).toBeNull();
  });
});

describe('TrainingDayCard: akcja przełożenia', () => {
  it('akcja tylko z przekazanym onReschedule; wybór z menu nie odpala onClick karty', () => {
    const onClick = vi.fn();
    const onReschedule = vi.fn();
    wrap(
      <TrainingDayCard day={planDays[0]} onClick={onClick} onReschedule={onReschedule} />,
    );
    const trigger = screen.getByLabelText('Więcej akcji');
    expect(trigger.className).toContain('min-h-11');
    expect(trigger.className).toContain('min-w-11');
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przełóż trening' }));
    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('bez callbacków menu nie ma (dzień ukończony/przeszły)', () => {
    wrap(<TrainingDayCard day={planDays[0]} onClick={() => {}} />);
    expect(screen.queryByLabelText('Więcej akcji')).toBeNull();
  });
});
