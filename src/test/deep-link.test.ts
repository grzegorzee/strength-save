import { describe, expect, it } from 'vitest';
import { DEEP_LINK_ROUTES, parseAppOpenUrl, sanitizeDeepLinkRoute } from '@/lib/deep-link';

// 2026-09-30: link "Otwórz aplikację" z maili (strengthsave.app/open) otwiera
// apkę przez Universal Links / App Links, a strengthsave://open przez intent
// z landingu. ?to= tylko z białej listy (ta sama lista co na landingu:
// strength_save_landing/api/_lib/open-target.ts).

describe('parseAppOpenUrl', () => {
  it('Universal/App Link bez celu: otwiera apkę, bez nawigacji', () => {
    expect(parseAppOpenUrl('https://strengthsave.app/open')).toEqual({ to: null });
    expect(parseAppOpenUrl('https://strengthsave.app/open/')).toEqual({ to: null });
  });

  it('Universal/App Link z trasą z białej listy', () => {
    expect(parseAppOpenUrl('https://strengthsave.app/open?to=%2Fhistory')).toEqual({ to: '/history' });
    expect(parseAppOpenUrl('https://strengthsave.app/open?to=/workout/day-1')).toEqual({ to: '/workout/day-1' });
    expect(parseAppOpenUrl('https://strengthsave.app/open?invite=K7Q2MZ9A')).toEqual({ to: null });
  });

  it('schemat strengthsave:// (intent z landingu, stary link)', () => {
    expect(parseAppOpenUrl('strengthsave://open')).toEqual({ to: null });
    expect(parseAppOpenUrl('strengthsave://open?to=%2Fprofile')).toEqual({ to: '/profile' });
  });

  it('trasa spoza listy: apka się otwiera, ale bez nawigacji', () => {
    expect(parseAppOpenUrl('https://strengthsave.app/open?to=/admin')).toEqual({ to: null });
    expect(parseAppOpenUrl('https://strengthsave.app/open?to=//evil.example')).toEqual({ to: null });
    expect(parseAppOpenUrl('https://strengthsave.app/open?to=/workout/../admin')).toEqual({ to: null });
  });

  it('obce linki i śmieci: null (nie nasz link)', () => {
    for (const url of [
      '',
      'not a url',
      'https://evil.example/open?to=/history',
      'https://strengthsave.app.evil.example/open',
      'http://strengthsave.app/open',
      'https://strengthsave.app/changelog',
      'https://strengthsave.app/openx',
      'https://app.strengthsave.app/open',
      'com.googleusercontent.apps.123:/oauth2redirect?code=x',
      'otherscheme://open?to=/history',
    ]) {
      expect(parseAppOpenUrl(url)).toBeNull();
    }
  });
});

describe('sanitizeDeepLinkRoute', () => {
  it('przepuszcza każdą trasę z listy', () => {
    for (const route of DEEP_LINK_ROUTES) expect(sanitizeDeepLinkRoute(route)).toBe(route);
  });

  it('lista nie zawiera tras admina, paywalla, logowania ani callbacków', () => {
    for (const route of DEEP_LINK_ROUTES) {
      expect(route).not.toMatch(/admin|paywall|login|register|callback|onboarding/);
    }
  });

  it('odrzuca query, hash, wielkie litery i zbyt długie id treningu', () => {
    for (const bad of ['/history?x=1', '/history#a', '/HISTORY', `/workout/${'a'.repeat(65)}`, '/workout/a b', '/workout/', null]) {
      expect(sanitizeDeepLinkRoute(bad)).toBeNull();
    }
  });
});
