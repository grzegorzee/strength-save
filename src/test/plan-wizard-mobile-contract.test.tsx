import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ANDROID_BACK_EVENT } from '@/components/AndroidBackHandler';

const native = vi.hoisted(() => ({
  enabled: true,
  platform: 'android',
  addListener: vi.fn(),
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => native.enabled,
      getPlatform: () => native.platform,
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: native.addListener,
  },
}));

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => <h1>Własny plan</h1> }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const renderWizard = (props: Partial<React.ComponentProps<typeof PlanWizard>> = {}) => render(withProviders(
  <PlanWizard
    confirmLabelKey="newplan.toReview"
    onConfirm={() => {}}
    {...props}
  />,
));

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
};

const advanceToPlanChoice = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

const fireAndroidBack = () => {
  const event = new Event(ANDROID_BACK_EVENT, { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('PlanWizard: kontrakt mobilny', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    native.enabled = true;
    native.platform = 'android';
    native.addListener.mockReset();
  });

  it('odejmuje inset klawiatury, respektuje safe areas i rozdziela scroll od stałego CTA', () => {
    renderWizard();

    const root = screen.getByTestId('plan-wizard-root');
    expect(root.className).toContain('h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(root.className).toContain('min-h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).toContain('pt-[calc(2.5rem+env(safe-area-inset-top))]');
    expect(root.className).toContain('pb-[calc(1.5rem+env(safe-area-inset-bottom))]');
    expect(root.className).toContain('pl-[max(1.5rem,env(safe-area-inset-left))]');
    expect(root.className).toContain('pr-[max(1.5rem,env(safe-area-inset-right))]');

    const scrollArea = screen.getByTestId('ob-step-scroll');
    expect(scrollArea.className).toContain('min-h-0');
    expect(scrollArea.className).toContain('overflow-y-auto');
    const next = screen.getByRole('button', { name: /Następny krok/ });
    expect(next.parentElement?.className).toContain('shrink-0');
  });

  it('ma 48-punktowe targety dla strzałki Wstecz i obu CTA wyboru planu bez powiększania ikon', () => {
    renderWizard({ showWelcome: true, onExitBack: () => {} });

    const back = screen.getByRole('button', { name: 'Wstecz' });
    expect(back.className).toContain('min-h-12');
    expect(back.className).toContain('min-w-12');
    expect(back.querySelector('svg')?.getAttribute('class')).toContain('h-5');

    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    advanceToPlanChoice();
    expect(screen.getByRole('button', { name: /Ułóż własny plan/ }).className).toContain('min-h-12');
    expect(screen.getByRole('button', { name: /Biblioteka planów/ }).className).toContain('min-h-12');
    expect(screen.getByRole('button', { name: /Biblioteka planów/ }).querySelector('svg')?.getAttribute('class')).toContain('h-4');
  });

  it('stała strefa CTA kroków 1–5 nie blokuje przewijania dłuższego ekranu startu planu', () => {
    renderWizard();
    advanceToPlanChoice();
    fireEvent.click(screen.getByTestId('ob-match-next'));

    const root = screen.getByTestId('plan-wizard-root');
    expect(root.className).not.toContain('overflow-hidden');
    expect(root.className.split(/\s+/)).not.toContain('h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
  });

  it('po zmianie kroku przenosi fokus na programowy h1 i ogłasza numer kroku', () => {
    renderWizard();

    const firstHeading = screen.getByRole('heading', { level: 1 });
    expect(firstHeading).toHaveAttribute('tabindex', '-1');
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));

    const nextHeading = screen.getByRole('heading', { level: 1 });
    expect(nextHeading).toHaveAttribute('tabindex', '-1');
    expect(nextHeading).toHaveFocus();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent('03 / 06');
  });

  it('Android Back cofa lokalny krok, a dopiero na pierwszym ekranie oddaje sterowanie hostowi', async () => {
    const onExitBack = vi.fn();
    const view = renderWizard({ onExitBack });
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    expect(screen.getByText('03 / 06')).toBeInTheDocument();
    act(() => { fireAndroidBack(); });
    expect(screen.getByText('02 / 06')).toBeInTheDocument();
    expect(onExitBack).not.toHaveBeenCalled();

    act(() => { fireAndroidBack(); });
    expect(onExitBack).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(fireAndroidBack().defaultPrevented).toBe(false);
  });

  it('Android Back cofa formalności do personalizacji, zachowując dane, zanim odda sterowanie hostowi', async () => {
    const onExitBack = vi.fn();
    renderWizard({ showWelcome: true, legalConsent: true, askName: true, initialName: 'Ola', onExitBack });
    const nameInput = screen.getByTestId('ob-name-input');
    expect(nameInput).toHaveAttribute('autocomplete', 'given-name');
    expect(nameInput).toHaveAttribute('enterkeyhint', 'done');
    fireEvent.change(nameInput, { target: { value: 'Aleksandra' } });
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    expect(screen.getByRole('heading', { name: /Zanim zaczniesz/ })).toHaveFocus();

    act(() => { fireAndroidBack(); });
    expect(screen.getByTestId('ob-name-input')).toHaveValue('Aleksandra');
    expect(onExitBack).not.toHaveBeenCalled();

    act(() => { fireAndroidBack(); });
    expect(onExitBack).toHaveBeenCalledTimes(1);
  });

  it('Android Back nie opuszcza formalności podczas zapisu zgód', async () => {
    const saving = deferred<void>();
    renderWizard({
      showWelcome: true,
      legalConsent: true,
      onLegalConsent: () => saving.promise,
      onExitBack: vi.fn(),
    });
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    fireEvent.click(screen.getByTestId('consent-terms'));
    fireEvent.click(screen.getByTestId('consent-privacy'));
    fireEvent.click(screen.getByTestId('consent-health'));
    fireEvent.click(screen.getByTestId('ob-legal-submit'));

    act(() => { fireAndroidBack(); });
    expect(screen.getByRole('heading', { name: /Zanim zaczniesz/ })).toBeInTheDocument();
    expect(screen.getByTestId('ob-legal-submit')).toHaveAttribute('aria-busy', 'true');

    await act(async () => { saving.resolve(); await saving.promise; });
    expect(await screen.findByText('02 / 06')).toBeInTheDocument();
  });

  it('nie tworzy drugiego natywnego listenera na iOS ani na webie', async () => {
    native.platform = 'ios';
    const ios = renderWizard();
    await act(async () => { await Promise.resolve(); });
    expect(native.addListener).not.toHaveBeenCalled();
    ios.unmount();

    native.enabled = false;
    native.platform = 'web';
    renderWizard();
    await act(async () => { await Promise.resolve(); });
    expect(native.addListener).not.toHaveBeenCalled();
  });

  it('Android Back najpierw zamyka bibliotekę/builder i zostawia użytkownika na wyborze planu', async () => {
    renderWizard();
    advanceToPlanChoice();
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Plany na/);

    act(() => { fireAndroidBack(); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Plany na 4 dni w tygodniu/);
    expect(screen.getByRole('button', { name: /Biblioteka planów/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ułóż własny plan/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Własny plan');
    act(() => { fireAndroidBack(); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Plany na 4 dni w tygodniu/);
  });
});
