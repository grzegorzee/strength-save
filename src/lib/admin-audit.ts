import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Z101: dziennik akcji administracyjnych. Wpisy klienckie (toggles, edycje)
// create-only wg rules; naprawy dopisuje Admin SDK w adminUserRepair.
// Best-effort: audyt nie może wywrócić samej akcji.

const AUDIT_COLLECTION = 'admin_audit_log';
const AUDIT_TTL_DAYS = 365;

export interface AdminAuditEntry {
  action: string;
  targetUid: string;
  detail?: string;
}

export const buildAdminAuditDoc = (
  adminUid: string,
  entry: AdminAuditEntry,
  nowMs: number,
): Record<string, unknown> => ({
  adminUid,
  action: String(entry.action).slice(0, 100),
  targetUid: String(entry.targetUid).slice(0, 128),
  ...(entry.detail ? { detail: String(entry.detail).slice(0, 500) } : {}),
  createdAt: new Date(nowMs).toISOString(),
  expiresAt: Timestamp.fromMillis(nowMs + AUDIT_TTL_DAYS * 24 * 60 * 60 * 1000),
});

export const logAdminAction = async (adminUid: string, entry: AdminAuditEntry): Promise<void> => {
  try {
    if (!adminUid) return;
    await addDoc(collection(db, AUDIT_COLLECTION), buildAdminAuditDoc(adminUid, entry, Date.now()));
  } catch {
    // best-effort
  }
};

// Z102: czytelna lista operacji dry-run ("kolekcja/dokument: co się zmieni").
export interface RepairOperationLike {
  collection: string;
  docId: string;
  op: string;
  after: Record<string, unknown> | null;
}

export const formatRepairOperations = (operations: RepairOperationLike[]): string[] =>
  operations.map((operation) => {
    const target = `${operation.collection}/${operation.docId}`;
    if (operation.op === 'delete') return `${target}: usunięcie`;
    const changes = Object.entries(operation.after ?? {})
      .map(([key, value]) => `${key} → ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join(', ');
    return `${target}: ${changes || 'aktualizacja'}`;
  });
