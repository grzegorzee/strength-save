import { describe, expect, it } from 'vitest';
import {
  bundlesToDelete,
  decideLiveUpdate,
  rolloutBucketFor,
  type LiveUpdateDecisionInput,
} from '@/lib/live-update-policy';
import { isDraftBlockingLiveUpdate, isTrainingActive } from '@/lib/live-update-activity';
import {
  formatAppVersionLabel,
  parseOtaBundleId,
  telemetryAppVersion,
} from '@/lib/live-update-version';
import { makePayload, makeTarget } from './live-update-test-keys';

const base = (overrides: Partial<LiveUpdateDecisionInput> = {}): LiveUpdateDecisionInput => ({
  native: { version: '1.0.1', build: 153 },
  manifest: { status: 'ok', payload: makePayload() },
  current: null,
  next: null,
  downloaded: [],
  blocked: [],
  lastGood: null,
  rollbackJustHappened: false,
  resumeAfterLongBackground: false,
  isPluginAvailable: () => true,
  rolloutBucket: () => 0,
  trainingActive: false,
  ...overrides,
});

describe('decyzja OTA: zgodność natywna', () => {
  it('nowy zgodny pakiet: najpierw pobranie, bez aktywacji', () => {
    const decision = decideLiveUpdate(base());
    expect(decision.download?.bundleId).toBe('1.0.1-ota.2');
    expect(decision.setNext).toBe('unchanged');
    expect(decision.reloadNow).toBe(false);
  });

  it('pobrany pakiet zostaje „następnym” (aktywacja przy kolejnym starcie), bez przeładowania', () => {
    const decision = decideLiveUpdate(base({ downloaded: ['1.0.1-ota.2'] }));
    expect(decision.download).toBeNull();
    expect(decision.setNext).toBe('1.0.1-ota.2');
    expect(decision.reloadNow).toBe(false);
  });

  it('build natywny poniżej minNativeBuild: brak pobrania i telemetria', () => {
    const decision = decideLiveUpdate(base({ native: { version: '1.0.1', build: 152 }, current: null }));
    expect(decision.download).toBeNull();
    expect(decision.setNext).toBe('unchanged');
    expect(decision.reports).toEqual([{ code: 'live-update-incompatible', detail: '1.0.1-ota.2 native-build<153' }]);
  });

  it('brak wymaganego pluginu natywnego: pakiet nieaktywowany', () => {
    const decision = decideLiveUpdate(base({ isPluginAvailable: (name) => name !== 'LiveUpdate' }));
    expect(decision.download).toBeNull();
    expect(decision.reason).toMatch(/missing-plugins:LiveUpdate/);
  });

  it('pakiet innej wersji natywnej (np. lokalny ostatni dobry z 1.0.0) nigdy nie jest celem', () => {
    const decision = decideLiveUpdate(base({
      manifest: { status: 'unavailable' },
      rollbackJustHappened: true,
      lastGood: '1.0.0-ota.9',
      downloaded: ['1.0.0-ota.9'],
    }));
    expect(decision.setNext).toBe('unchanged');
  });
});

describe('decyzja OTA: aktywny trening', () => {
  it('nie aktywuje i przypina „następny” do bieżącego, gdy trening trwa', () => {
    const decision = decideLiveUpdate(base({
      current: '1.0.1-ota.1',
      next: '1.0.1-ota.2',
      downloaded: ['1.0.1-ota.1', '1.0.1-ota.2'],
      trainingActive: true,
      resumeAfterLongBackground: true,
    }));
    expect(decision.setNext).toBe('1.0.1-ota.1');
    expect(decision.reloadNow).toBe(false);
  });

  it('po rollbacku w trakcie treningu też bez przeładowania', () => {
    const decision = decideLiveUpdate(base({
      current: null,
      rollbackJustHappened: true,
      lastGood: '1.0.1-ota.1',
      downloaded: ['1.0.1-ota.1'],
      blocked: ['1.0.1-ota.2'],
      trainingActive: true,
    }));
    expect(decision.reloadNow).toBe(false);
    expect(decision.setNext).toBe('unchanged');
  });

  it('po treningu i długim tle: przeładowanie do oczekującego pakietu', () => {
    const decision = decideLiveUpdate(base({
      current: '1.0.1-ota.1',
      next: '1.0.1-ota.2',
      downloaded: ['1.0.1-ota.1', '1.0.1-ota.2'],
      resumeAfterLongBackground: true,
    }));
    expect(decision.setNext).toBe('unchanged');
    expect(decision.reloadNow).toBe(true);
  });

  it('krótkie tło: bez przeładowania (aktywacja przy zimnym starcie)', () => {
    const decision = decideLiveUpdate(base({
      current: '1.0.1-ota.1',
      next: '1.0.1-ota.2',
      downloaded: ['1.0.1-ota.1', '1.0.1-ota.2'],
    }));
    expect(decision.reloadNow).toBe(false);
  });

  it('bramka: ekran treningu, nieznany user, błąd IndexedDB i świeży draft blokują; zakończony zsynchronizowany nie', () => {
    const now = 1_000_000_000;
    const fresh = { completedLocally: false, finalSyncPending: false, updatedAt: now - 60_000, startedAt: now - 3_600_000 };
    const done = { ...fresh, completedLocally: true };
    const pendingSync = { ...done, finalSyncPending: true };
    const stale = { ...fresh, updatedAt: now - 13 * 3_600_000, startedAt: now - 14 * 3_600_000 };
    expect(isTrainingActive({ user: { uid: 'u' }, drafts: [], currentPath: '/workout/day-1', now })).toBe(true);
    expect(isTrainingActive({ user: undefined, drafts: [], currentPath: '/', now })).toBe(true);
    expect(isTrainingActive({ user: { uid: 'u' }, drafts: 'error', currentPath: '/', now })).toBe(true);
    expect(isTrainingActive({ user: { uid: 'u' }, drafts: [fresh], currentPath: '/', now })).toBe(true);
    expect(isTrainingActive({ user: { uid: 'u' }, drafts: [pendingSync], currentPath: '/', now })).toBe(true);
    expect(isTrainingActive({ user: { uid: 'u' }, drafts: [done, stale], currentPath: '/', now })).toBe(false);
    expect(isTrainingActive({ user: null, drafts: [], currentPath: '/login', now })).toBe(false);
    expect(isDraftBlockingLiveUpdate({ ...done, healthSyncPending: true }, now)).toBe(true);
  });
});

describe('decyzja OTA: rollback, blokady, wyłącznik, rollout', () => {
  it('po automatycznym rollbacku (C zablokowany) wraca do ostatniego dobrego B i przeładowuje od razu', () => {
    const decision = decideLiveUpdate(base({
      manifest: { status: 'ok', payload: makePayload({ target: makeTarget({ bundleId: '1.0.1-ota.3', otaNumber: 3 }) }) },
      current: null,
      next: null,
      downloaded: ['1.0.1-ota.2'],
      blocked: ['1.0.1-ota.3'],
      lastGood: '1.0.1-ota.2',
      rollbackJustHappened: true,
    }));
    expect(decision.download).toBeNull();
    expect(decision.setNext).toBe('1.0.1-ota.2');
    expect(decision.reloadNow).toBe(true);
  });

  it('rollback + brak sieci: też wraca do ostatniego dobrego', () => {
    const decision = decideLiveUpdate(base({
      manifest: { status: 'unavailable' },
      downloaded: ['1.0.1-ota.2'],
      blocked: ['1.0.1-ota.3'],
      lastGood: '1.0.1-ota.2',
      rollbackJustHappened: true,
    }));
    expect(decision.setNext).toBe('1.0.1-ota.2');
    expect(decision.reloadNow).toBe(true);
  });

  it('uszkodzony manifest: brak zmian + telemetria', () => {
    const decision = decideLiveUpdate(base({
      manifest: { status: 'invalid', reason: 'signature' },
      current: '1.0.1-ota.1',
      next: '1.0.1-ota.1',
      downloaded: ['1.0.1-ota.1'],
    }));
    expect(decision.setNext).toBe('unchanged');
    expect(decision.download).toBeNull();
    expect(decision.reloadNow).toBe(false);
    expect(decision.reports).toEqual([{ code: 'live-update-manifest-invalid', detail: 'signature' }]);
  });

  it('zablokowany cel nigdy nie jest pobierany ponownie', () => {
    const decision = decideLiveUpdate(base({ blocked: ['1.0.1-ota.2'], current: '1.0.1-ota.1', next: '1.0.1-ota.1' }));
    expect(decision.download).toBeNull();
    expect(decision.setNext).toBe('unchanged');
  });

  it('wyłącznik (target null): powrót do bundla wbudowanego przy następnym starcie', () => {
    const decision = decideLiveUpdate(base({
      manifest: { status: 'ok', payload: makePayload({ target: null }) },
      current: '1.0.1-ota.2',
      next: '1.0.1-ota.2',
      downloaded: ['1.0.1-ota.2'],
    }));
    expect(decision.setNext).toBeNull();
    expect(decision.reloadNow).toBe(false);
  });

  it('rollout procentowy: kubełek poza zakresem = brak zmian; bieżący pakiet nie jest cofany', () => {
    const payload = makePayload({ target: makeTarget({ rolloutPercent: 10 }) });
    expect(decideLiveUpdate(base({ manifest: { status: 'ok', payload }, rolloutBucket: () => 50 })).download).toBeNull();
    expect(decideLiveUpdate(base({ manifest: { status: 'ok', payload }, rolloutBucket: () => 5 })).download).not.toBeNull();
    const bucket = rolloutBucketFor('install-1', '1.0.1-ota.2');
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(100);
    expect(rolloutBucketFor('install-1', '1.0.1-ota.2')).toBe(bucket);
  });

  it('sprzątanie zostawia bieżący, następny, ostatni dobry i cel', () => {
    expect(bundlesToDelete(['a', 'b', 'c', 'd'], ['a', null, 'c', undefined])).toEqual(['b', 'd']);
  });
});

describe('wersja widoczna w Profilu i w telemetrii', () => {
  const pl = (n: number) => `aktualizacja ${n}`;
  const en = (n: number) => `update ${n}`;

  it('parsuje wyłącznie <MAJOR.MINOR.PATCH>-ota.<N>', () => {
    expect(parseOtaBundleId('1.0.1-ota.3')).toEqual({ nativeVersion: '1.0.1', otaNumber: 3 });
    expect(parseOtaBundleId('1.0.1-ota.0')).toBeNull();
    expect(parseOtaBundleId('1.0-ota.1')).toBeNull();
    expect(parseOtaBundleId(null)).toBeNull();
  });

  it('„1.0.1 (153) · aktualizacja 3” / „update 3”; bez OTA sama wersja z buildem; web bez buildu', () => {
    const native = { version: '1.0.1', build: '153' };
    expect(formatAppVersionLabel({ version: '1.0.1', native, otaBundleId: '1.0.1-ota.3' }, pl)).toBe('1.0.1 (153) · aktualizacja 3');
    expect(formatAppVersionLabel({ version: '1.0.1', native, otaBundleId: '1.0.1-ota.3' }, en)).toBe('1.0.1 (153) · update 3');
    expect(formatAppVersionLabel({ version: '1.0.1', native, otaBundleId: null }, pl)).toBe('1.0.1 (153)');
    expect(formatAppVersionLabel({ version: '1.0.1', native: null, otaBundleId: null }, pl)).toBe('1.0.1');
  });

  it('telemetria: ten sam identyfikator, zawsze ≤ 32 znaki (reguła client_errors bez zmian)', () => {
    const native = { version: '1.0.1', build: '153' };
    expect(telemetryAppVersion({ version: '1.0.1', native, otaBundleId: '1.0.1-ota.3' })).toBe('1.0.1-ota.3 (153)');
    expect(telemetryAppVersion({ version: '1.0.1', native, otaBundleId: null })).toBe('1.0.1 (153)');
    expect(telemetryAppVersion({ version: '1.0.1', native: null, otaBundleId: null })).toBe('1.0.1');
    const long = telemetryAppVersion({
      version: '999.999.999',
      native: { version: '999.999.999', build: '99999999' },
      otaBundleId: '999.999.999-ota.99999',
    });
    expect(long.length).toBeLessThanOrEqual(32);
  });
});
