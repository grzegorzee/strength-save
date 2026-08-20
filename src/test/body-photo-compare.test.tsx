import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { BodyPhotoCompare } from '@/components/BodyPhotoCompare';
import type { BodyMeasurement } from '@/types';

// T13b: porownanie przed/po — najstarsze zdjecie po lewej, najnowsze po prawej.

const measurement = (id: string, date: string, extras: Partial<BodyMeasurement> = {}): BodyMeasurement => ({
  id,
  userId: 'u1',
  date,
  ...extras,
});

const renderCompare = (measurements: BodyMeasurement[]) =>
  render(
    <LanguageProvider>
      <UnitProvider>
        <BodyPhotoCompare measurements={measurements} />
      </UnitProvider>
    </LanguageProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('BodyPhotoCompare (T13b)', () => {
  it('2 zdjecia z 3 pomiarow: najstarsze po lewej (Przed), najnowsze po prawej (Po)', () => {
    renderCompare([
      measurement('m-new', '2026-08-20', { weight: 80, photoUrl: 'https://x.test/new.jpg' }),
      measurement('m-mid', '2026-07-01', { weight: 82 }),
      measurement('m-old', '2026-06-01', { weight: 84, photoUrl: 'https://x.test/old.jpg' }),
    ]);

    const before = screen.getByAltText('Przed') as HTMLImageElement;
    const after = screen.getByAltText('Po') as HTMLImageElement;
    expect(before.src).toBe('https://x.test/old.jpg');
    expect(after.src).toBe('https://x.test/new.jpg');
    expect(screen.getByText('Porównanie sylwetki')).toBeTruthy();
  });

  it('1 zdjecie: hint zamiast porownania', () => {
    renderCompare([
      measurement('m-1', '2026-08-20', { weight: 80, photoUrl: 'https://x.test/only.jpg' }),
      measurement('m-2', '2026-07-01', { weight: 82 }),
    ]);

    expect(screen.getByText(/Masz jedno zdjęcie/)).toBeTruthy();
    expect(screen.queryByAltText('Po')).toBeNull();
    expect(screen.queryByTestId('body-photo-select-before')).toBeNull();
  });

  it('0 zdjec: nie renderuje nic', () => {
    const { container } = renderCompare([
      measurement('m-1', '2026-08-20', { weight: 80 }),
    ]);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('body-photo-compare')).toBeNull();
  });
});
