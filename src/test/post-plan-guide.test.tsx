import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PostPlanGuide } from '@/components/PostPlanGuide';
import {
  POST_PLAN_GUIDE_REPLAY_PATH,
  isPostPlanGuideSeen,
  markPostPlanGuideSeen,
} from '@/lib/post-plan-guide';

const trackTelemetryEvent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent }));

const renderGuide = (props: Partial<React.ComponentProps<typeof PostPlanGuide>> = {}) => render(
  <LanguageProvider>
    <PostPlanGuide
      userId="u1"
      mode="welcome"
      planName="Plan siłowy"
      nextWorkoutName="Góra ciała"
      firstWorkoutPath="/workout/day-1?date=2026-08-31"
      onDismiss={() => {}}
      onNavigate={() => {}}
      {...props}
    />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('PostPlanGuide: prosty handoff do pierwszego treningu', () => {
  it('pokazuje jedno lekkie potwierdzenie, nazwę planu i najbliższy trening', () => {
    renderGuide();

    expect(screen.getByTestId('post-plan-guide')).toHaveAttribute('data-mode', 'welcome');
    expect(screen.getByRole('heading', { name: 'Twój plan jest gotowy' })).toBeInTheDocument();
    expect(screen.getByText('Plan siłowy')).toBeInTheDocument();
    expect(screen.getByText('Najbliższy trening')).toBeInTheDocument();
    expect(screen.getByText('Góra ciała')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('post-plan-primary-action')).toHaveClass('min-h-12');
  });

  it('ma jedno główne CTA do pierwszego treningu i nie powtarza mapy aplikacji', () => {
    const onNavigate = vi.fn();
    renderGuide({ onNavigate });

    expect(screen.getByRole('button', { name: 'Rozpocznij pierwszy trening' })).toBeInTheDocument();
    expect(screen.queryByText('Trzy miejsca, które warto znać')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pokaż, gdzie co jest' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij pierwszy trening' }));
    expect(onNavigate).toHaveBeenCalledWith('/workout/day-1?date=2026-08-31');
    expect(isPostPlanGuideSeen('u1')).toBe(true);
    expect(trackTelemetryEvent).toHaveBeenCalledWith('u1', 'post_plan_guide_completed');
  });

  it('gdy najbliższy trening nie jest jeszcze dostępny, nadal go pokazuje i prowadzi do planu', () => {
    const onNavigate = vi.fn();
    renderGuide({ firstWorkoutPath: null, onNavigate });

    expect(screen.getByText('Góra ciała')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zobacz plan' }));
    expect(onNavigate).toHaveBeenCalledWith('/plan');
  });

  it('dyskretne Później zapisuje pominięcie', () => {
    const onDismiss = vi.fn();
    renderGuide({ onDismiss });

    fireEvent.click(screen.getByRole('button', { name: 'Później' }));
    expect(onDismiss).toHaveBeenCalledWith('skipped');
    expect(isPostPlanGuideSeen('u1')).toBe(true);
    expect(trackTelemetryEvent).toHaveBeenCalledWith('u1', 'post_plan_guide_skipped');
  });

  it('replay z Profilu zachowuje stabilną ścieżkę i ten sam pojedynczy handoff', () => {
    renderGuide({ mode: 'replay' });

    expect(screen.getByTestId('post-plan-guide')).toHaveAttribute('data-mode', 'replay');
    expect(screen.getByRole('button', { name: 'Rozpocznij pierwszy trening' })).toBeInTheDocument();
    expect(POST_PLAN_GUIDE_REPLAY_PATH).toBe('/?guide=1');
  });

  it('stan seen jest wersjonowany per użytkownik', () => {
    expect(isPostPlanGuideSeen('u1')).toBe(false);
    markPostPlanGuideSeen('u1');
    expect(isPostPlanGuideSeen('u1')).toBe(true);
    expect(isPostPlanGuideSeen('u2')).toBe(false);
  });

  it('respektuje reduced motion bez animowania wejścia', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;

    renderGuide();

    expect(screen.getByTestId('post-plan-guide')).toHaveAttribute('data-motion', 'reduced');
    expect(screen.getByTestId('post-plan-guide')).not.toHaveClass('animate-in');
    window.matchMedia = originalMatchMedia;
  });
});
