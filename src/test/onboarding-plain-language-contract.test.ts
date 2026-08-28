import { describe, expect, it } from 'vitest';
import { pl } from '@/i18n/locales/pl';
import { en } from '@/i18n/locales/en';

const onboardingCopy = (locale: Record<string, string>): string => [
  locale['ob.obj.desc'],
  locale['ob.obj.muscle.desc'],
  locale['ob.obj.strength.desc'],
  locale['ob.obj.fatloss.desc'],
  locale['ob.obj.athletic.desc'],
  locale['ob.protocol.title1'],
  locale['ob.protocol.title2'],
  locale['ob.protocol.desc'],
].join(' ');

describe('onboarding: prosty i rzetelny język rekomendacji planu', () => {
  it('PL jasno podaje kryteria rekomendacji i unika pseudotechnicznych obietnic', () => {
    expect(pl['ob.obj.desc']).toBe(
      'Wybierz główny cel. Propozycję planu oprzemy także na Twoim poziomie i liczbie dni treningowych.',
    );
    expect(pl['ob.protocol.title1']).toBe('Wybierz');
    expect(pl['ob.protocol.title2']).toBe('dni treningowe');
    expect(pl['ob.protocol.desc']).toBe(
      'Wybierz, ile razy w tygodniu chcesz trenować, i zaznacz pasujące dni.',
    );
    expect(onboardingCopy(pl)).not.toMatch(/napięci|stres metaboliczny|sprawność funkcjonalna|protokół/i);
    expect(onboardingCopy(pl)).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('EN mówi to samo prostym językiem, bez pseudotechnicznego żargonu', () => {
    expect(en['ob.obj.desc']).toBe(
      'Choose your main goal. We will also use your experience level and number of training days to suggest a plan.',
    );
    expect(en['ob.protocol.title1']).toBe('Choose your');
    expect(en['ob.protocol.title2']).toBe('training days');
    expect(en['ob.protocol.desc']).toBe(
      'Choose how many times a week you want to train, then select the days that suit you.',
    );
    expect(onboardingCopy(en)).not.toMatch(/mechanical tension|metabolic stress|kinetic chains|protocol/i);
    expect(onboardingCopy(en)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
