// Zgłoszenie usera po treningu 2026-07-20: „możliwość ustawiania domyślnej przerwy
// między seriami w ustawieniach i domyślnej przerwy między ćwiczeniami".
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RestSettingsCard } from '@/components/RestSettingsCard';
import { loadRestSettings, saveRestSettings, DEFAULT_REST_SETTINGS, resolveRestSeconds } from '@/lib/rest-timer';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

const renderCard = () => render(
  <LanguageProvider>
    <RestSettingsCard />
  </LanguageProvider>,
);

describe('RestSettingsCard', () => {
  it('pokazuje domyślne czasy przerw', () => {
    renderCard();
    expect((screen.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('90');
    expect((screen.getByLabelText(/Przerwa między ćwiczeniami/i) as HTMLInputElement).value).toBe('150');
    expect((screen.getByLabelText(/Przerwa po rozgrzewce/i) as HTMLInputElement).value).toBe('45');
  });

  it('zapisuje przerwę między seriami', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między seriami/i), { target: { value: '120' } });
    expect(loadRestSettings().workingSeconds).toBe(120);
  });

  it('zapisuje przerwę między ćwiczeniami niezależnie od przerwy między seriami', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między ćwiczeniami/i), { target: { value: '240' } });
    const saved = loadRestSettings();
    expect(saved.betweenExercisesSeconds).toBe(240);
    expect(saved.workingSeconds).toBe(DEFAULT_REST_SETTINGS.workingSeconds);
  });

  it('szybkie presety ustawiają czas jednym tapnięciem', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('rest-preset-working-120'));
    expect(loadRestSettings().workingSeconds).toBe(120);
  });

  it('wartość spoza zakresu nie psuje zapisu', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między seriami/i), { target: { value: '0' } });
    expect(loadRestSettings().workingSeconds).toBeGreaterThan(0);
  });

  it('czyta zapisane ustawienia przy montowaniu', () => {
    saveRestSettings({ workingSeconds: 111, warmupSeconds: 22, betweenExercisesSeconds: 333, perExercise: {} });
    renderCard();
    expect((screen.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('111');
    expect((screen.getByLabelText(/Przerwa między ćwiczeniami/i) as HTMLInputElement).value).toBe('333');
  });
});

describe('resolveRestSeconds — przerwa między ćwiczeniami', () => {
  it('po ukończeniu ćwiczenia bierze czas „między ćwiczeniami", nie „między seriami"', () => {
    const settings = { workingSeconds: 90, warmupSeconds: 45, betweenExercisesSeconds: 180, perExercise: {} };
    expect(resolveRestSeconds(settings, { exerciseFinished: true })).toBe(180);
    expect(resolveRestSeconds(settings, { exerciseFinished: false })).toBe(90);
  });

  it('nadpisanie per ćwiczenie NIE dotyczy przerwy między ćwiczeniami', () => {
    const settings = { workingSeconds: 90, warmupSeconds: 45, betweenExercisesSeconds: 180, perExercise: { przysiad: 300 } };
    expect(resolveRestSeconds(settings, { exerciseFinished: true, exerciseKey: 'przysiad' })).toBe(180);
    expect(resolveRestSeconds(settings, { exerciseFinished: false, exerciseKey: 'przysiad' })).toBe(300);
  });
});
