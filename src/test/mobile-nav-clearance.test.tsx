import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNavigation } from '@/components/AppNavigation';

vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key, lang: 'pl' }) }));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ profile: { displayName: 'Synthetic' }, isAdmin: false }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

let navHeight: number;
let navTop: number;
let navBottomInset: number;
let resized: () => void;
let disconnect: ReturnType<typeof vi.fn>;
let viewport: EventTarget;
let fonts: EventTarget & { ready: Promise<void> };
let resolveFonts: () => void;
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

const clearance = () => document.documentElement.style.getPropertyValue('--mobile-nav-clearance');
const renderNav = () => render(<MemoryRouter><AppNavigation /></MemoryRouter>);

beforeEach(() => {
  navHeight = 90;
  navTop = 730;
  navBottomInset = 24;
  resized = () => {};
  disconnect = vi.fn();
  viewport = new EventTarget();
  fonts = Object.assign(new EventTarget(), { ready: new Promise<void>(resolve => { resolveFonts = resolve; }) });
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 844);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  });
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.matches('nav[aria-label="nav.ariaMobile"]')) {
      return { x: 12, y: navTop, top: navTop, bottom: navTop + navHeight, left: 12, right: 378, width: 366, height: navHeight, toJSON: () => ({}) };
    }
    return originalRect.call(this);
  });
  const originalStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = originalStyle(element, pseudo);
    if (element.matches('nav[aria-label="nav.ariaMobile"]')) {
      Object.defineProperty(style, 'bottom', { configurable: true, value: `${navBottomInset}px` });
    }
    return style;
  });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
  else Reflect.deleteProperty(document, 'fonts');
  document.documentElement.style.removeProperty('--mobile-nav-clearance');
});

describe('odstęp nad mobilną nawigacją po zmianie viewportu i powrocie z tła', () => {
  it('rezerwuje pełną wysokość, inset i 8 px odstępu — również przy niespójnym innerHeight/rect.top', () => {
    navTop = 780; // e.g. translated visual viewport; fixed CSS bottom stays 24.
    renderNav();
    expect(clearance()).toBe('122px');
  });

  it('ResizeObserver aktualizuje clearance, gdy etykiety po skalowaniu tekstu rosną', () => {
    renderNav();
    navHeight = 150;
    navTop = 670;
    act(() => resized());
    expect(clearance()).toBe('182px');
  });

  it.each(['resize', 'scroll'])('visualViewport %s odświeża inset bez oczekiwania na zmianę rozmiaru nav', (event) => {
    renderNav();
    navBottomInset = 12;
    navTop = 742;
    act(() => viewport.dispatchEvent(new Event(event)));
    expect(clearance()).toBe('110px');
  });

  it('visibility resume odczytuje aktualną geometrię, nawet gdy ResizeObserver nie wysłał callbacka w tle', () => {
    renderNav();
    navHeight = 140;
    navTop = 680;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(clearance()).toBe('172px');
    Reflect.deleteProperty(document, 'hidden');
  });

  it.each(['pageshow', 'resize'])('window %s odświeża po powrocie i obrocie telefonu', (event) => {
    renderNav();
    navHeight = 100;
    navTop = 310;
    navBottomInset = 12;
    act(() => window.dispatchEvent(new Event(event)));
    expect(clearance()).toBe('120px');
  });

  it('doładowanie fontu ponownie mierzy etykiety, bez arbitralnego timeoutu', () => {
    renderNav();
    navHeight = 112;
    act(() => fonts.dispatchEvent(new Event('loadingdone')));
    expect(clearance()).toBe('144px');
  });

  it('klawiatura/pan visualViewport nie dodaje jego przesunięcia do stałego insetu paska', () => {
    renderNav();
    navTop = 300;
    act(() => viewport.dispatchEvent(new Event('scroll')));
    expect(clearance()).toBe('122px');
  });

  it('desktop usuwa zmienną, a powrót do widocznego nav przywraca właściwy odstęp', () => {
    renderNav();
    navHeight = 0;
    act(() => resized());
    expect(clearance()).toBe('');
    navHeight = 90;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(clearance()).toBe('122px');
  });

  it('po unmount observer/listenery i spóźnione fonts.ready nie przywracają starej rezerwy', async () => {
    const view = renderNav();
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    await act(async () => {
      resolveFonts();
      window.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('resize'));
      fonts.dispatchEvent(new Event('loadingdone'));
    });
    expect(clearance()).toBe('');
  });
});
