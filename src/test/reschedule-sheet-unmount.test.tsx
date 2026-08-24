// Regresja z builda 92 (zgłoszenie usera 2026-08-12): po wyborze daty w
// RescheduleSheet apka "zawieszała się" — Dashboard czyścił fromDateISO,
// komponent robił twardy `return null` i odmontowywał OTWARTY Radix Sheet bez
// przejścia open=false. Scroll-lock/pointer-events zostawały na <body>, więc
// żaden tap nie działał, a tydzień nie przerysowywał się pod blokadą
// ("przełożyłem i nic się nie zmieniło" + "coś się zawiesza").
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { ScheduleOverrides } from '@/lib/plan-schedule';
import { RescheduleSheet } from '@/components/RescheduleSheet';

const day = (id: string, dayName: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName,
  weekday,
  focus: 'F',
  exercises: [],
});

// Plan 4-dniowy jak u usera: pn/wt/czw/pt. "Dziś" = środa 2026-08-12.
const planDays = [
  day('day-1', 'Poniedziałek', 'monday'),
  day('day-2', 'Wtorek', 'tuesday'),
  day('day-3', 'Czwartek', 'thursday'),
  day('day-4', 'Piątek', 'friday'),
];
const TODAY = '2026-08-12';

// Wierna kopia sprzężenia z Dashboardu: wybór daty aktualizuje overrides
// (dzień źródłowy staje się null => resolver przestaje go widzieć) i czyści
// fromDateISO w tym samym renderze.
const Harness = () => {
  const [from, setFrom] = useState<string | null>('2026-08-14');
  const [overrides, setOverrides] = useState<ScheduleOverrides>({});
  return (
    <LanguageProvider>
      <RescheduleSheet
        open={from !== null}
        onOpenChange={(open) => { if (!open) setFrom(null); }}
        fromDateISO={from}
        planDays={planDays}
        overrides={overrides}
        onSelect={(toISO) => {
          setOverrides({ '2026-08-14': null, [toISO]: 'day-4' });
          setFrom(null);
        }}
        todayISO={TODAY}
      />
    </LanguageProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  document.body.style.pointerEvents = '';
  document.body.removeAttribute('data-scroll-locked');
});

describe('RescheduleSheet: zamknięcie po wyborze daty (regresja builda 92)', () => {
  it('wybór daty NIE zostawia blokady pointer-events/scroll-lock na body', async () => {
    render(<Harness />);
    // Sheet otwarty: Radix zakłada blokadę na body.
    expect(screen.getByText('Przełóż trening')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText(/sobota/i)[0].closest('button')!);

    // Po zamknięciu body musi odzyskać interaktywność — inaczej apka
    // wygląda na zawieszoną (żaden tap nie działa).
    await waitFor(() => {
      expect(document.body.style.pointerEvents).not.toBe('none');
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    });
  });

  it('zwolnienie daty źródłowej przez świeże overrides NIE odmontowuje otwartego sheeta', () => {
    // Wyścig z builda 92: moveScheduledDay ustawia optymistycznie nowe overrides
    // (data źródłowa -> null) ZANIM Dashboard zamknie sheet. Resolver przestaje
    // widzieć dzień źródłowy — sheet musi renderować ZAMROŻONY kontekst,
    // a nie znikać twardym unmountem w stanie open (wiszący scroll-lock).
    const view = (overrides: ScheduleOverrides) => (
      <LanguageProvider>
        <RescheduleSheet
          open
          onOpenChange={() => {}}
          fromDateISO="2026-08-14"
          planDays={planDays}
          overrides={overrides}
          onSelect={() => {}}
          todayISO={TODAY}
        />
      </LanguageProvider>
    );
    const { rerender } = render(view({}));
    expect(screen.getByText('Przełóż trening')).toBeInTheDocument();

    rerender(view({ '2026-08-14': null, '2026-08-15': 'day-4' }));
    expect(screen.getByText('Przełóż trening')).toBeInTheDocument();
  });

  // WP-A (X29): dead-click builda 116 — klik ikony kalendarza na dacie, której
  // resolver nie widzi (override null / data przed startem planu), otwierał
  // "nic": frozen był pusty, komponent robił return null przy open=true.
  // Zasada 6 CLAUDE.md: każdy stan bez kontekstu musi mieć wyjście dla usera.
  it('data nierozwiązywalna przy open=true: sheet z komunikatem i zamknięciem zamiast return null', () => {
    const onOpenChange = vi.fn();
    render(
      <LanguageProvider>
        <RescheduleSheet
          open
          onOpenChange={onOpenChange}
          fromDateISO="2026-08-13"
          planDays={planDays}
          overrides={{ '2026-08-13': null }}
          onSelect={() => {}}
          todayISO={TODAY}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Tego dnia nie da się przełożyć.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('ponowne otwarcie resetuje zamrożony kontekst (bez stale danych z poprzedniego cyklu)', () => {
    const view = (open: boolean, fromDateISO: string | null) => (
      <LanguageProvider>
        <RescheduleSheet
          open={open}
          onOpenChange={() => {}}
          fromDateISO={fromDateISO}
          planDays={planDays}
          overrides={{ '2026-08-13': null }}
          onSelect={() => {}}
          todayISO={TODAY}
        />
      </LanguageProvider>
    );
    // Cykl 1: piątek 2026-08-14 rozwiązywalny — kontekst zamrożony.
    const { rerender } = render(view(true, '2026-08-14'));
    expect(screen.getByText(/Piątek z/)).toBeInTheDocument();

    // Zamknięcie i ponowne otwarcie na dacie nierozwiązywalnej: fallback,
    // NIE odgrzany kontekst piątku z poprzedniego otwarcia.
    rerender(view(false, null));
    rerender(view(true, '2026-08-13'));
    expect(screen.getByText('Tego dnia nie da się przełożyć.')).toBeInTheDocument();
    expect(screen.queryByText(/Piątek z/)).toBeNull();
  });

  it('zamknięcie krzyżykiem/gestem też zdejmuje blokadę', async () => {
    render(<Harness />);
    const close = document.querySelector('[data-radix-collection-item], [class*="absolute right"]');
    // Zamknięcie przez onOpenChange (ESC) — kanał Radix.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => {
      expect(document.body.style.pointerEvents).not.toBe('none');
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    });
    void close;
  });
});
