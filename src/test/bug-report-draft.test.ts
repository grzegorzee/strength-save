import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBugReportDraft, readBugReportDraft, writeBugReportDraft } from '@/lib/bug-report-draft';

describe('bug report draft', () => {
  beforeEach(() => localStorage.clear());

  it('przywraca tekst i stabilny identyfikator po restarcie formularza', () => {
    const draft = {
      reportId: '123e4567-e89b-42d3-a456-426614174010',
      message: 'Po powrocie z tła przycisk zapisu nie działa.',
      category: 'workout' as const,
    };
    writeBugReportDraft('u1', draft);
    expect(readBugReportDraft('u1')).toEqual(draft);
  });

  it('awaria storage nie blokuje formularza, a clear usuwa tylko draft danego usera', () => {
    writeBugReportDraft('u1', { reportId: crypto.randomUUID(), message: 'A'.repeat(20), category: 'ui' });
    writeBugReportDraft('u2', { reportId: crypto.randomUUID(), message: 'B'.repeat(20), category: 'other' });
    clearBugReportDraft('u1');
    expect(readBugReportDraft('u1')).toBeNull();
    expect(readBugReportDraft('u2')).not.toBeNull();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('quota'); });
    expect(() => writeBugReportDraft('u1', { reportId: crypto.randomUUID(), message: 'C'.repeat(20), category: 'ui' })).not.toThrow();
  });
});
