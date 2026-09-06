import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import {
  MAIN_DESTINATIONS,
  isMainDestinationPath,
} from '@/lib/main-navigation';

describe('centralny kontrakt głównej nawigacji', () => {
  it('ma dokładnie pięć stabilnych destynacji bez zmiany URL-i', () => {
    expect(MAIN_DESTINATIONS.map(({ id, path }) => ({ id, path }))).toEqual([
      { id: 'today', path: '/' },
      { id: 'plan', path: '/plan' },
      { id: 'history', path: '/history' },
      { id: 'progress', path: '/achievements' },
      { id: 'profile', path: '/profile' },
    ]);
  });

  it('daje pełne, jawne etykiety w obu językach', () => {
    expect(MAIN_DESTINATIONS.map((item) => translate('pl', item.labelKey))).toEqual([
      'Dzisiaj',
      'Plan',
      'Historia',
      'Postępy',
      'Profil',
    ]);
    expect(MAIN_DESTINATIONS.map((item) => translate('en', item.labelKey))).toEqual([
      'Today',
      'Plan',
      'History',
      'Progress',
      'Profile',
    ]);
  });

  it('rozpoznaje wyłącznie rooty pięciu głównych destynacji', () => {
    for (const { path } of MAIN_DESTINATIONS) {
      expect(isMainDestinationPath(path)).toBe(true);
    }
    expect(isMainDestinationPath('/profile')).toBe(true);
    expect(isMainDestinationPath('/exercises')).toBe(false);
    expect(isMainDestinationPath('/plan/edit')).toBe(false);
  });

  it('nazywa ekran startowy tak samo jak zakładkę Dzisiaj/Today', () => {
    expect(translate('pl', 'layout.title.dashboard')).toBe('Dzisiaj');
    expect(translate('en', 'layout.title.dashboard')).toBe('Today');
  });
});
