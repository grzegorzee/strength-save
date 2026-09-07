import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { translate, type LanguageCode } from '@/i18n';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';

// Different item IDs can still prescribe the same movement: the pulse item
// includes arm circles, and used to be followed by standalone arm circles.
const movementsFor = (key: string): string[] => key === 'warmup.v3.heelsArmCircles'
  ? ['butt-kicks', 'arm-circles']
  : key === 'warmup.v3.armCircles' ? ['arm-circles'] : [key];

describe('general warmup does not repeat a movement across phases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each(['beginner', 'intermediate', 'advanced', undefined])('unique movements for every category and fallback at level %s', (level) => {
    for (const category of ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'calves', 'core', 'custom', undefined]) {
      const plan = buildPreStartWarmup({ exerciseName: category ? 'Synthetic exercise' : '', category, level });
      const movements = plan.items.flatMap((item) => movementsFor(item.key));
      expect(new Set(movements).size, `${category ?? 'empty quick session'} / ${level ?? 'unknown'}`).toBe(movements.length);
      expect(new Set(plan.items.map((item) => item.key)).size).toBe(plan.items.length);
      for (const lang of ['pl', 'en'] as const) {
        const labels = plan.items.map((item) => translate(lang, item.key).trim().toLocaleLowerCase(lang));
        expect(new Set(labels).size, `${category} / ${lang}`).toBe(labels.length);
      }
      expect([...new Set(plan.items.map((item) => item.phase))]).toEqual(['pulse', 'mobility', 'activation']);
      expect(plan.items.length).toBeGreaterThanOrEqual(level === 'beginner' ? 5 : 6);
      expect(plan.items.length).toBeLessThanOrEqual(level === 'beginner' ? 6 : 9);
    }
  });

  it.each<LanguageCode>(['pl', 'en'])('after pulse completion the UI does not ask for arm circles again (%s)', (lang) => {
    localStorage.setItem('app-language', lang);
    const onToggle = vi.fn();
    const plan = buildPreStartWarmup({ exerciseName: 'Synthetic press', category: 'chest' });
    render(
      <LanguageProvider>
        <WarmupRoutineDialog
          focus="Chest"
          plan={plan}
          open
          onOpenChange={() => {}}
          checked={new Set(['warmup.v3.cardioEasy', 'warmup.v3.heelsArmCircles'])}
          onToggle={onToggle}
        />
      </LanguageProvider>,
    );

    expect(screen.queryAllByText(translate(lang, 'warmup.v3.armCircles'))).toHaveLength(0);
    expect(screen.getByTestId('warmup-active-instruction')).toHaveTextContent(translate(lang, 'warmup.v3.armSwings'));
    fireEvent.click(screen.getByTestId('warmup-next'));
    expect(onToggle).toHaveBeenCalledWith('warmup.v3.armSwings');
  });
});
