// Bug 29 (X30): gest swipe-back na iOS nawigował PONAD otwartymi modalami —
// navigate(-1) twardo unmountowało stronę razem z otwartym Radix Dialogiem
// (klasa incydentu b.92: wiszący scroll-lock na body w WKWebView). Otwarty
// dialog/alertdialog blokuje gest; bez overlaya stary przepływ bez zmian.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IosSwipeBack } from '@/components/IosSwipeBack';

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios' },
}));

// jsdom nie ma konstruktora TouchEvent — zwykły Event z podstawionym touches
// wystarcza (handler czyta tylko event.touches[0].clientX/clientY).
const fireTouch = (type: 'touchstart' | 'touchmove', x: number, y: number) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] });
  window.dispatchEvent(event);
};

const edgeSwipeRight = () => {
  fireTouch('touchstart', 10, 300);
  fireTouch('touchmove', 100, 305);
};

const mountOverlay = (role: 'dialog' | 'alertdialog', state: 'open' | 'closed' = 'open') => {
  const node = document.createElement('div');
  node.setAttribute('role', role);
  node.setAttribute('data-state', state);
  document.body.appendChild(node);
  return node;
};

const mountWorkoutOverlay = (state: 'open' | 'closed' = 'open') => {
  const node = document.createElement('div');
  node.setAttribute('data-app-overlay', '');
  node.setAttribute('data-state', state);
  document.body.appendChild(node);
  return node;
};

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('IosSwipeBack (bug 29)', () => {
  it('niezmiennik: bez otwartego overlaya edge swipe woła navigate(-1)', () => {
    render(<IosSwipeBack />);
    edgeSwipeRight();
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('otwarty Radix Dialog (role=dialog, data-state=open) blokuje gest', () => {
    render(<IosSwipeBack />);
    mountOverlay('dialog');
    edgeSwipeRight();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('otwarty AlertDialog (role=alertdialog) blokuje gest', () => {
    render(<IosSwipeBack />);
    mountOverlay('alertdialog');
    edgeSwipeRight();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('custom overlay treningu blokuje gest jak Radix Dialog', () => {
    // Blackout: celebracja / live PR / pełny timer mają data-app-overlay, ale
    // nie role=dialog. Stary selektor ich nie widział i robił route unmount.
    render(<IosSwipeBack />);
    mountWorkoutOverlay();
    edgeSwipeRight();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('dialog otwarty W TRAKCIE gestu (między start a move) też blokuje', () => {
    render(<IosSwipeBack />);
    fireTouch('touchstart', 10, 300);
    mountOverlay('dialog');
    fireTouch('touchmove', 100, 305);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('zamknięty dialog (data-state=closed) nie blokuje kolejnego gestu', () => {
    render(<IosSwipeBack />);
    mountOverlay('dialog', 'closed');
    edgeSwipeRight();
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('start poza krawędzią nadal nie nawiguje (stary kontrakt)', () => {
    render(<IosSwipeBack />);
    fireTouch('touchstart', 120, 300);
    fireTouch('touchmove', 220, 305);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
