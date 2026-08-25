import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// WP-M: warstwa danych edycji/usuwania wpisu pomiaru ciala.
// Kontrakty pod testem:
// - updateMeasurement = PELNY setDoc (bez merge): wyczyszczone pole znika,
//   recordedAt pochodzi z formularza/oryginalu (NIGDY z zegara przy edycji),
// - podmiana/usuniecie zdjecia = best-effort deleteObject starego photoPath
//   (blad Storage nie blokuje zapisu dokumentu),
// - deleteMeasurement usuwa dokument + best-effort zdjecie,
// - NIEZMIENNIK: addMeasurement dziala jak dotad (recordedAt domyslnie z zegara).

const fs = vi.hoisted(() => ({
  // Sygnatura (ref, data) jawna — typecheck czyta mock.calls[0][1] jako payload.
  setDoc: vi.fn(async (_ref: unknown, _data: unknown) => undefined),
  deleteDoc: vi.fn(async () => undefined),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
}));

const storageMocks = vi.hoisted(() => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  deleteObject: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {} }));
vi.mock('firebase/storage', () => ({ ref: storageMocks.ref, deleteObject: storageMocks.deleteObject }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: fs.doc,
  getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  setDoc: fs.setDoc,
  updateDoc: vi.fn(),
  deleteDoc: fs.deleteDoc,
  query: vi.fn(),
  where: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useFirebaseWorkoutActions } from '@/hooks/useFirebaseWorkouts';
import {
  CANONICAL_UID,
  buildMeasurement,
  buildPhotoWeightMeasurement,
  buildRecordedMeasurement,
} from '@/test/canonical-states';

// Fixtury przez kanoniczne buildery (zasada 11): legacy bez recordedAt,
// wpis z godzina wykonania, wpis ze zdjeciem (photoUrl + photoPath).
const recordedEntry = buildRecordedMeasurement('2026-08-10', 8);
const photoEntry = buildPhotoWeightMeasurement('2026-08-12', 84);
const legacyEntry = buildMeasurement('2026-08-01');
const measurements = [recordedEntry, photoEntry, legacyEntry];

const setup = () => renderHook(
  () => useFirebaseWorkoutActions(CANONICAL_UID, { workouts: [], measurements }),
).result.current;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateMeasurement (WP-M)', () => {
  it('pelny setDoc: recordedAt z inputu, wyczyszczone pole znika z dokumentu', async () => {
    const actions = setup();
    const result = await actions.updateMeasurement(recordedEntry.id, {
      date: recordedEntry.date,
      weight: 90,
      recordedAt: recordedEntry.recordedAt,
    });

    expect(result.error).toBeUndefined();
    expect(result.measurement).not.toBeNull();
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    const payload = fs.setDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toEqual({
      id: recordedEntry.id,
      userId: CANONICAL_UID,
      date: recordedEntry.date,
      weight: 90,
      // Zachowany DOKLADNIE oryginalny epoch — nie Date.now() jak w add.
      recordedAt: recordedEntry.recordedAt,
    });
    // waist byla w oryginale (builder) — wyczyszczona nie wraca.
    expect('waist' in payload).toBe(false);
  });

  it('podmiana zdjecia: best-effort deleteObject STAREGO photoPath', async () => {
    const actions = setup();
    await actions.updateMeasurement(photoEntry.id, {
      date: photoEntry.date,
      weight: 85,
      photoUrl: 'https://example.test/new.jpg?token=y',
      photoPath: `body-photos/${CANONICAL_UID}/new.jpg`,
    });

    expect(storageMocks.ref).toHaveBeenCalledWith(expect.anything(), photoEntry.photoPath);
    expect(storageMocks.deleteObject).toHaveBeenCalledTimes(1);
  });

  it('zdjecie bez zmian (ten sam photoPath): zero deleteObject', async () => {
    const actions = setup();
    await actions.updateMeasurement(photoEntry.id, {
      date: photoEntry.date,
      weight: 85,
      photoUrl: photoEntry.photoUrl,
      photoPath: photoEntry.photoPath,
    });

    expect(storageMocks.deleteObject).not.toHaveBeenCalled();
  });

  it('blad Storage przy sprzataniu starego zdjecia NIE blokuje zapisu', async () => {
    storageMocks.deleteObject.mockRejectedValueOnce(new Error('storage/unknown'));
    const actions = setup();
    const result = await actions.updateMeasurement(photoEntry.id, {
      date: photoEntry.date,
      weight: 85,
      photoUrl: 'https://example.test/new.jpg?token=y',
      photoPath: `body-photos/${CANONICAL_UID}/new.jpg`,
    });

    expect(result.error).toBeUndefined();
    expect(result.measurement).not.toBeNull();
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
  });

  it('walidacja: wartosc poza limitem = INVALID_MEASUREMENT, zero zapisu', async () => {
    const actions = setup();
    const result = await actions.updateMeasurement(recordedEntry.id, {
      date: recordedEntry.date,
      weight: 9999,
    });

    expect(result.measurement).toBeNull();
    expect(result.error).toBe('INVALID_MEASUREMENT');
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('nieznane id = MEASUREMENT_NOT_FOUND, zero zapisu', async () => {
    const actions = setup();
    const result = await actions.updateMeasurement('measurement-ghost', {
      date: '2026-08-10',
      weight: 90,
    });

    expect(result.measurement).toBeNull();
    expect(result.error).toBe('MEASUREMENT_NOT_FOUND');
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});

describe('deleteMeasurement (WP-M)', () => {
  it('usuwa dokument + best-effort zdjecie ze Storage', async () => {
    const actions = setup();
    const result = await actions.deleteMeasurement(photoEntry.id);

    expect(result.ok).toBe(true);
    expect(fs.deleteDoc).toHaveBeenCalledTimes(1);
    expect(fs.doc).toHaveBeenCalledWith(expect.anything(), 'measurements', photoEntry.id);
    expect(storageMocks.ref).toHaveBeenCalledWith(expect.anything(), photoEntry.photoPath);
    expect(storageMocks.deleteObject).toHaveBeenCalledTimes(1);
  });

  it('blad Storage nie blokuje usuniecia dokumentu (ok:true)', async () => {
    storageMocks.deleteObject.mockRejectedValueOnce(new Error('storage/object-not-found'));
    const actions = setup();
    const result = await actions.deleteMeasurement(photoEntry.id);

    expect(result.ok).toBe(true);
    expect(fs.deleteDoc).toHaveBeenCalledTimes(1);
  });

  it('wpis bez zdjecia: sam deleteDoc, zero Storage', async () => {
    const actions = setup();
    const result = await actions.deleteMeasurement(legacyEntry.id);

    expect(result.ok).toBe(true);
    expect(storageMocks.deleteObject).not.toHaveBeenCalled();
  });

  it('blad Firestore = ok:false (wpis zostaje, user widzi blad)', async () => {
    fs.deleteDoc.mockRejectedValueOnce(new Error('permission-denied'));
    const actions = setup();
    const result = await actions.deleteMeasurement(legacyEntry.id);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('addMeasurement — niezmiennik starego przeplywu (WP-M)', () => {
  it('nowy wpis nadal dostaje recordedAt z zegara i pelne identyfikatory', async () => {
    const actions = setup();
    const before = Date.now();
    const result = await actions.addMeasurement({ date: '2026-08-20', weight: 80 });
    const after = Date.now();

    expect(result.measurement).not.toBeNull();
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    const payload = fs.setDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.userId).toBe(CANONICAL_UID);
    expect(String(payload.id)).toMatch(/^measurement-/);
    expect(payload.date).toBe('2026-08-20');
    expect(payload.weight).toBe(80);
    expect(payload.recordedAt).toBeGreaterThanOrEqual(before);
    expect(payload.recordedAt).toBeLessThanOrEqual(after);
  });
});
