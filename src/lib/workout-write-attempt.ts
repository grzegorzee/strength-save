export type WriteAttemptResolution = 'ok' | 'already-applied' | 'conflict';

// Klucz idempotencji zapisu treningu. Lost-ack (suspend, słaby zasięg) oznacza,
// że commit doszedł do serwera, a odpowiedź zginęła — retry z TYM SAMYM writeId
// rozpoznaje własny zapis po lastWriteId w dokumencie i kończy się sukcesem no-op,
// zamiast fałszywym konfliktem.
export const resolveWriteAttempt = (
  current: { revision?: number; lastWriteId?: string },
  expectedRevision: number | null,
  writeId: string,
): WriteAttemptResolution => {
  if (expectedRevision === null) return 'ok';
  const currentRevision = Math.max(0, Math.floor(current.revision ?? 0));
  const expected = Math.max(0, Math.floor(expectedRevision));
  if (currentRevision === expected) return 'ok';
  if (current.lastWriteId && current.lastWriteId === writeId) return 'already-applied';
  return 'conflict';
};

// writeId per treść: reuse pendingWriteId TYLKO gdy wersja draftu się zgadza.
// Reuse przy nowszej treści dałby fałszywy "already-applied" i utratę tej treści.
export const draftWriteId = (
  draft: { pendingWriteId?: string | null; pendingWriteVersion?: number | null; version: number },
): { writeId: string; reused: boolean } => {
  if (draft.pendingWriteId && draft.pendingWriteVersion === draft.version) {
    return { writeId: draft.pendingWriteId, reused: true };
  }
  return { writeId: crypto.randomUUID(), reused: false };
};
