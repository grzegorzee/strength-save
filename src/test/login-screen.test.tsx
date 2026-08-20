// Redesign logowania 2026-08-20: pierwszy ekran = Kontynuuj z Apple/Google
// (kolejność per platforma) + wyraźny przycisk emaila niżej. Bez zakładek
// i bez osobnej strony rejestracji jako punktu wejścia.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Login from '@/pages/Login';

let platform = 'web';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform,
    isNativePlatform: () => platform !== 'web',
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    registerWithEmail: vi.fn(),
    loginWithEmail: vi.fn(),
    resetPassword: vi.fn(),
    error: null,
    loading: false,
  }),
}));

// Pułapka z redesignu Profilu: transitive import lib/firebase wywraca suitę.
vi.mock('@/lib/registration-api', () => ({
  createWaitlistEntry: vi.fn(async () => ({})),
}));

const renderLogin = (mode: 'login' | 'register' = 'login') => {
  localStorage.setItem('app-language', 'pl');
  return render(
    <LanguageProvider>
      <Login mode={mode} />
    </LanguageProvider>,
  );
};

const buttonTexts = () =>
  Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

describe('Login: pierwszy ekran (social-first)', () => {
  beforeEach(() => {
    localStorage.clear();
    platform = 'web';
  });

  it('pokazuje Apple + Google + wyraźny przycisk emaila, bez zakładek i boxu rejestracji', () => {
    renderLogin();
    expect(screen.getByText('Kontynuuj z Google')).toBeTruthy();
    expect(screen.getByText('Kontynuuj z Apple')).toBeTruthy();
    expect(screen.getByText('Kontynuuj z emailem')).toBeTruthy();
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Przejdź do rejestracji');
  });

  it('web/Android: Google przed Apple; iOS: Apple przed Google (HIG)', () => {
    const { unmount } = renderLogin();
    let texts = buttonTexts();
    expect(texts.indexOf('Kontynuuj z Google')).toBeLessThan(texts.indexOf('Kontynuuj z Apple'));
    unmount();

    platform = 'ios';
    renderLogin();
    texts = buttonTexts();
    expect(texts.indexOf('Kontynuuj z Apple')).toBeLessThan(texts.indexOf('Kontynuuj z Google'));
  });

  it('Apple dostępne też poza iOS (konto z iPhone loguje się na Androidzie/webie)', () => {
    platform = 'android';
    renderLogin();
    expect(screen.getByText('Kontynuuj z Apple')).toBeTruthy();
  });

  it('link prawny prowadzi do Regulaminu i Prywatności', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: 'Regulamin' }).getAttribute('href')).toContain('/terms');
    expect(screen.getByRole('link', { name: 'Prywatność' }).getAttribute('href')).toContain('/privacy');
  });
});

describe('Login: ścieżka email', () => {
  beforeEach(() => {
    localStorage.clear();
    platform = 'web';
  });

  it('przycisk emaila otwiera formularz, Wstecz wraca do social', () => {
    renderLogin();
    fireEvent.click(screen.getByText('Kontynuuj z emailem'));
    expect(screen.getByPlaceholderText('Hasło')).toBeTruthy();
    expect(screen.getByText('Zaloguj przez email')).toBeTruthy();

    fireEvent.click(screen.getByText('Wstecz'));
    expect(screen.getByText('Kontynuuj z Google')).toBeTruthy();
  });

  it('przełącznik logowanie/rejestracja pokazuje Powtórz hasło i wybór języka', () => {
    renderLogin();
    fireEvent.click(screen.getByText('Kontynuuj z emailem'));
    fireEvent.click(screen.getByText('Nie masz konta? Zarejestruj się'));
    expect(screen.getByPlaceholderText('Powtórz hasło')).toBeTruthy();
    expect(screen.getByText('Załóż konto i wyślij kod')).toBeTruthy();
    fireEvent.click(screen.getByText('Masz już konto? Zaloguj się'));
    expect(screen.queryByPlaceholderText('Powtórz hasło')).toBeNull();
    expect(screen.getByText('Reset hasła')).toBeTruthy();
  });

  it('trasa /register startuje od social (Apple/Google też zakładają konto)', () => {
    renderLogin('register');
    expect(screen.getByText('Kontynuuj z Google')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Hasło')).toBeNull();
  });
});

// Zasada #5: nowy układ nie zabiera niczego istniejącym przepływom web.
describe('Login: niezmienniki web (waitlista)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('waitlista widoczna na web, ukryta na native', () => {
    platform = 'web';
    const { unmount } = renderLogin();
    expect(screen.getByText('Zapisz na waitlistę')).toBeTruthy();
    unmount();

    platform = 'ios';
    renderLogin();
    expect(screen.queryByText('Zapisz na waitlistę')).toBeNull();
  });
});
