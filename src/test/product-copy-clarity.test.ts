import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { en } from '@/i18n/locales/en';
import { pl } from '@/i18n/locales/pl';

describe('rzeczowe copy funkcji treningowych', () => {
  it('nazywa tryb lżejszy konkretną czynnością', () => {
    expect(pl['rmode.title']).toBe('Dostosuj trening');
    expect(en['rmode.title']).toBe('Adjust training');
  });

  it('opisuje progresję przez faktycznie wyliczane cele zamiast marketingowej etykiety', () => {
    expect(pl['paywall.feature2']).toBe('Tygodniowe cele z historii: ciężar, powtórzenia i serie');
    expect(en['paywall.feature2']).toBe('Weekly targets from your history: weight, reps and sets');
  });

  it('opisuje formę zgodnie z EWMA i jasno oznacza szacowane źródła obciążenia', () => {
    expect(pl['strava.trainingLoadDesc']).toBe(
      'Szacowana forma = 42-dniowa średnia wykładnicza obciążenia − 7-dniowa; obejmuje szacowane obciążenie siłowe i cardio',
    );
    expect(en['strava.trainingLoadDesc']).toBe(
      'Estimated form = 42-day exponential load average − 7-day; includes estimated strength and cardio load',
    );
  });

  it('uczciwie opisuje zapis wagi z Health na koncie', () => {
    expect(pl['health.description']).toBe(
      'Odczytujemy tylko dane, na które zezwolisz. Waga dodana do pomiarów jest zapisywana na Twoim koncie.',
    );
    expect(en['health.description']).toBe(
      'We only read data you allow. Weight added to measurements is saved to your account.',
    );
  });

  it('nie sprzedaje nieopublikowanej integracji Garmin na paywallu', () => {
    expect(pl['paywall.subtitle']).toBe('Funkcje w PRO');
    expect(en['paywall.subtitle']).toBe('Included with PRO');
    expect(pl['paywall.feature4']).toBe('Apple Watch: zapis treningu z nadgarstka');
    expect(en['paywall.feature4']).toBe('Apple Watch: log your workout from your wrist');
  });

  it('nie przedstawia rozgrzewki ani reakcji na ból jako gwarancji medycznej', () => {
    expect(pl['warmup.prestart.firstWhy']).toBe(
      'Krótka rozgrzewka przygotuje Cię do ruchów i serii roboczych. Zajmie około 4 do 6 minut.',
    );
    expect(en['warmup.prestart.firstWhy']).toBe(
      'A short warm-up prepares you for the movements and working sets. It takes about 4 to 6 minutes.',
    );
    expect(pl['progression.reason.pain']).toBe(
      'Ostatnio zgłosiłeś ból 4+/10. Nie zwiększaj obciążenia. Jeśli ból się utrzymuje lub nasila, przerwij ćwiczenie i skonsultuj się ze specjalistą.',
    );
    expect(en['progression.reason.pain']).toBe(
      'You reported pain rated 4+/10. Do not increase the load. If pain persists or worsens, stop the exercise and consult a qualified professional.',
    );
  });

  it('awaria trasy nie obiecuje bezpieczeństwa danych ani nie ujawnia surowego błędu', () => {
    expect(pl['errors.routeCrashDesc']).toBe('Nie udało się wyświetlić tego ekranu. Uruchom go ponownie.');
    expect(en['errors.routeCrashDesc']).toBe('This screen could not be displayed. Restart it to continue.');
    const routeShell = readFileSync('src/components/AuthenticatedApp.tsx', 'utf8');
    expect(routeShell).not.toContain('{error.message}');
  });
});
