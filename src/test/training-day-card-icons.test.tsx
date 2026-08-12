import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TrainingDayCard } from '@/components/TrainingDayCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

const day = { id: 'd1', dayName: 'Poniedziałek', focus: 'Push', exercises: [{ id: 'e1' }] } as never;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

describe('TrainingDayCard', () => {
  it('nie renderuje emoji w żadnym stanie', () => {
    for (const props of [{}, { skipped: true }] as const) {
      const { container, unmount } = render(
        <TrainingDayCard day={day} onClick={() => {}} {...props} />,
      );
      expect(container.textContent ?? '').not.toMatch(EMOJI_RE);
      unmount();
    }
  });
});
