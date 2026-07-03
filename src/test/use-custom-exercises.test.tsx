import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

type SnapshotDoc = { id: string; data: () => Record<string, unknown> };
type SnapshotHandler = (snapshot: {
  forEach: (cb: (doc: SnapshotDoc) => void) => void;
}) => void;

const asSnapshot = (docs: SnapshotDoc[]) => ({
  forEach: (cb: (doc: SnapshotDoc) => void) => docs.forEach(cb),
});

const snapshotHandlers: SnapshotHandler[] = [];
const addDocMock = vi.fn(async (_collection: unknown, _payload: Record<string, unknown>) => ({ id: 'doc123' }));
const deleteDocMock = vi.fn(async (_ref: unknown) => undefined);
const docMock = vi.fn((_db: unknown, _col: string, id: string) => ({ path: `custom_exercises/${id}` }));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: (collectionRef: unknown, payload: Record<string, unknown>) => addDocMock(collectionRef, payload),
  collection: vi.fn(() => 'collection'),
  deleteDoc: (ref: unknown) => deleteDocMock(ref),
  doc: (db: unknown, col: string, id: string) => docMock(db, col, id),
  limit: vi.fn(() => 'limit'),
  onSnapshot: vi.fn((_query: unknown, onNext: SnapshotHandler) => {
    snapshotHandlers.push(onNext);
    return () => undefined;
  }),
  query: vi.fn(() => 'query'),
  where: vi.fn(() => 'where'),
}));

import { useCustomExercises } from '@/hooks/useCustomExercises';

describe('useCustomExercises (Z71)', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    addDocMock.mockClear();
    deleteDocMock.mockClear();
    docMock.mockClear();
  });

  it('mapuje dokumenty na kształt Exercise z prefiksem custom- i pustymi instrukcjami', async () => {
    const { result } = renderHook(() => useCustomExercises('user-1'));
    act(() => {
      snapshotHandlers[0](asSnapshot([
        { id: 'abc', data: () => ({ userId: 'user-1', name: 'Moje wiosłowanie', category: 'back', isBodyweight: false, type: 'compound', createdAt: 111 }) },
      ]));
    });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.customExercises).toHaveLength(1);
    expect(result.current.customExercises[0]).toMatchObject({
      id: 'custom-abc',
      name: 'Moje wiosłowanie',
      category: 'back',
      isBodyweight: false,
      type: 'compound',
      instructions: [],
    });
  });

  it('addCustomExercise zapisuje payload z userId i zwraca kształt Exercise', async () => {
    const { result } = renderHook(() => useCustomExercises('user-1'));

    let created: { id: string; name: string } | null = null;
    await act(async () => {
      created = await result.current.addCustomExercise({
        name: '  Moje wiosłowanie  ',
        category: 'back',
        isBodyweight: false,
        type: 'compound',
      });
    });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const payload = addDocMock.mock.calls[0][1];
    expect(payload.userId).toBe('user-1');
    expect(payload.name).toBe('Moje wiosłowanie');
    expect(payload.category).toBe('back');
    expect(typeof payload.createdAt).toBe('number');
    expect(created).toMatchObject({ id: 'custom-doc123', name: 'Moje wiosłowanie' });
  });

  it('removeCustomExercise kasuje dokument po docId bez prefiksu custom-', async () => {
    const { result } = renderHook(() => useCustomExercises('user-1'));
    await act(async () => {
      await result.current.removeCustomExercise('custom-abc');
    });
    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'custom_exercises', 'abc');
  });
});
