import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(async () => ({ id: 'a-1' })),
  collection: vi.fn(() => 'audit-collection'),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));

import { buildAdminAuditDoc, formatRepairOperations } from '@/lib/admin-audit';

describe('buildAdminAuditDoc (Z101)', () => {
  it('kształt wpisu: clampy długości, ISO createdAt, expiresAt +365 dni', () => {
    const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
    const entry = buildAdminAuditDoc('admin-1', { action: 'x'.repeat(200), targetUid: 'u-1', detail: 'd'.repeat(600) }, nowMs);
    expect((entry.action as string).length).toBe(100);
    expect((entry.detail as string).length).toBe(500);
    expect(entry.createdAt).toBe('2026-07-17T12:00:00.000Z');
    expect((entry.expiresAt as { toMillis: () => number }).toMillis()).toBe(nowMs + 365 * 24 * 60 * 60 * 1000);
  });
  it('bez detail nie ma pola detail (schemat hasOnly w rules)', () => {
    const entry = buildAdminAuditDoc('admin-1', { action: 'toggle', targetUid: 'u-1' }, Date.now());
    expect('detail' in entry).toBe(false);
  });
});

describe('formatRepairOperations (Z102)', () => {
  it('delete i update czytelnie, puste after = aktualizacja', () => {
    expect(formatRepairOperations([
      { collection: 'workouts', docId: 'w-1', op: 'delete', after: null },
      { collection: 'plan_cycles', docId: 'c-1', op: 'update', after: { status: 'completed', endDate: '2026-07-17' } },
    ])).toEqual([
      'workouts/w-1: usunięcie',
      'plan_cycles/c-1: status → completed, endDate → 2026-07-17',
    ]);
  });
});
