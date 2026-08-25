import { describe, expect, it } from 'vitest';
import { composeRecordedAt, recordedAtToTimeInput } from '@/lib/measurement-time';

// WP-M: mapowanie data + godzina (input type="time") <-> recordedAt (epoch ms
// lokalny). Kontrakt: round-trip bez dryfu, pusta godzina = brak recordedAt
// (wpis legacy zostaje legacy), zmiana daty przenosi godzinę na nowy dzień.

describe('measurement-time (WP-M)', () => {
  it('recordedAtToTimeInput: epoch -> HH:MM lokalnie, z zerami wiodącymi', () => {
    const epoch = new Date(2026, 7, 10, 8, 5).getTime();
    expect(recordedAtToTimeInput(epoch)).toBe('08:05');
  });

  it('composeRecordedAt: data + HH:MM -> epoch lokalny tego dnia', () => {
    expect(composeRecordedAt('2026-08-10', '17:45')).toBe(new Date(2026, 7, 10, 17, 45).getTime());
  });

  it('round-trip zachowuje godzinę i minutę', () => {
    const original = new Date(2026, 7, 10, 23, 59).getTime();
    expect(composeRecordedAt('2026-08-10', recordedAtToTimeInput(original))).toBe(original);
  });

  it('pusta albo zła godzina = undefined (wpis bez recordedAt)', () => {
    expect(composeRecordedAt('2026-08-10', '')).toBeUndefined();
    expect(composeRecordedAt('2026-08-10', 'abc')).toBeUndefined();
  });

  it('zła data = undefined, nie wyjątek (formularz waliduje datę osobno)', () => {
    expect(composeRecordedAt('', '08:00')).toBeUndefined();
    expect(composeRecordedAt('2026-02-31', '08:00')).toBeUndefined();
  });
});
