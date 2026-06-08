import { describe, it, expect } from 'vitest';
import { getInboxProviders } from '@/lib/inbox-links';

describe('getInboxProviders', () => {
  it('zwraca Gmail dla gmail.com', () => {
    expect(getInboxProviders('jan@gmail.com')).toEqual([{ provider: 'Gmail', url: 'https://mail.google.com' }]);
  });

  it('zwraca iCloud dla icloud.com/me.com', () => {
    expect(getInboxProviders('jan@icloud.com')[0].provider).toBe('iCloud');
    expect(getInboxProviders('jan@me.com')[0].provider).toBe('iCloud');
  });

  it('jest case-insensitive', () => {
    expect(getInboxProviders('Jan@GMAIL.com')[0].provider).toBe('Gmail');
  });

  it('zwraca fallback Gmail+iCloud dla nieznanej domeny', () => {
    const r = getInboxProviders('jan@firma-xyz.pl');
    expect(r.map(p => p.provider)).toEqual(['Gmail', 'iCloud']);
  });

  it('zwraca fallback dla pustego/niepoprawnego maila', () => {
    expect(getInboxProviders('').length).toBe(2);
    expect(getInboxProviders('bezdomeny').length).toBe(2);
  });
});
