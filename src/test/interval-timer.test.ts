import { describe, expect, it } from 'vitest';
import { parseIntervalTimer } from '@/lib/interval-timer';

describe('parseIntervalTimer', () => {
  it('EMOM n → co minutę, n rund', () => {
    expect(parseIntervalTimer('EMOM 8')).toEqual({ kind: 'emom', intervalSec: 60, rounds: 8, totalSec: 480, label: 'EMOM 8' });
    expect(parseIntervalTimer('EMOM 10')).toEqual({ kind: 'emom', intervalSec: 60, rounds: 10, totalSec: 600, label: 'EMOM 10' });
  });

  it('E{k}MOM x{n} → co k minut, n rund', () => {
    expect(parseIntervalTimer('E4MOM x5')).toEqual({ kind: 'emom', intervalSec: 240, rounds: 5, totalSec: 1200, label: 'E4MOM × 5' });
    expect(parseIntervalTimer('E3MOM x4')).toEqual({ kind: 'emom', intervalSec: 180, rounds: 4, totalSec: 720, label: 'E3MOM × 4' });
  });

  it('ignoruje sufiks "alt"', () => {
    expect(parseIntervalTimer('E2MOM x8 alt')).toEqual({ kind: 'emom', intervalSec: 120, rounds: 8, totalSec: 960, label: 'E2MOM × 8' });
    expect(parseIntervalTimer('E2MOM x6 alt')?.rounds).toBe(6);
  });

  it('AMRAP n → pojedynczy blok', () => {
    expect(parseIntervalTimer('AMRAP 8')).toEqual({ kind: 'amrap', intervalSec: 480, rounds: 1, totalSec: 480, label: 'AMRAP 8' });
  });

  it('akceptuje znak × oraz x', () => {
    expect(parseIntervalTimer('E4MOM × 5')?.totalSec).toBe(1200);
  });

  it('null dla zapisów nie-interwałowych', () => {
    expect(parseIntervalTimer('4 x 6-8')).toBeNull();
    expect(parseIntervalTimer('Warm-up')).toBeNull();
    expect(parseIntervalTimer('')).toBeNull();
    expect(parseIntervalTimer(undefined)).toBeNull();
  });
});
