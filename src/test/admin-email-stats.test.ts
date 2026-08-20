// G-T4: czysta logika panelu Maile — status wyświetlany (priorytety) i kafle
// zbiorcze 7/30 dni liczone z ostatnich N wpisów email_log (limit zapytania).
import { describe, expect, it } from 'vitest';
import { emailDisplayStatus, emailStats, type EmailLogRow } from '@/lib/admin-email-stats';

const row = (over: Partial<EmailLogRow> = {}): EmailLogRow => ({
  id: 'el1',
  uid: 'u1',
  to: 'trener@example.com',
  type: 'workout',
  subject: 'Trening 2026-08-20',
  transport: 'ses',
  status: 'sent',
  sentAt: '2026-08-20T10:00:00.000Z',
  ...over,
});

describe('emailDisplayStatus (G-T4)', () => {
  it('complaint wygrywa ze wszystkim (sygnał spamu)', () => {
    expect(emailDisplayStatus(row({ status: 'complaint', openedAt: 'T', deliveredAt: 'T' }))).toBe('complaint');
  });

  it('bounced i failed przed opened', () => {
    expect(emailDisplayStatus(row({ status: 'bounced', openedAt: 'T' }))).toBe('bounced');
    expect(emailDisplayStatus(row({ status: 'failed' }))).toBe('failed');
  });

  it('openedAt daje opened nawet gdy status delivered', () => {
    expect(emailDisplayStatus(row({ status: 'delivered', openedAt: 'T' }))).toBe('opened');
  });

  it('delivered bez otwarcia = delivered, świeży wpis = sent', () => {
    expect(emailDisplayStatus(row({ status: 'delivered' }))).toBe('delivered');
    expect(emailDisplayStatus(row())).toBe('sent');
  });
});

describe('emailStats (G-T4)', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  it('liczy tylko wpisy z okna (7 dni), starsze pomija', () => {
    const rows = [
      row({ id: 'a', sentAt: at(1), status: 'delivered', deliveredAt: 'T' }),
      row({ id: 'b', sentAt: at(6), status: 'sent' }),
      row({ id: 'c', sentAt: at(10), status: 'delivered', deliveredAt: 'T' }),
    ];
    const stats = emailStats(rows, 7, now);
    expect(stats.sent).toBe(2);
    expect(stats.deliveredPct).toBe(50);
  });

  it('okno 30 dni łapie starsze wpisy', () => {
    const rows = [
      row({ id: 'a', sentAt: at(10), status: 'delivered', deliveredAt: 'T' }),
      row({ id: 'b', sentAt: at(40), status: 'sent' }),
    ];
    expect(emailStats(rows, 30, now).sent).toBe(1);
  });

  it('otwieralność, bounce i skargi', () => {
    const rows = [
      row({ id: 'a', sentAt: at(1), status: 'delivered', deliveredAt: 'T', openedAt: 'T', openCount: 3 }),
      row({ id: 'b', sentAt: at(2), status: 'delivered', deliveredAt: 'T' }),
      row({ id: 'c', sentAt: at(3), status: 'bounced', bounceType: 'Permanent' }),
      row({ id: 'd', sentAt: at(4), status: 'complaint', deliveredAt: 'T' }),
    ];
    const stats = emailStats(rows, 7, now);
    expect(stats.sent).toBe(4);
    expect(stats.deliveredPct).toBe(75); // deliveredAt obecne w a, b, d
    expect(stats.openedPct).toBe(25);
    expect(stats.bouncePct).toBe(25);
    expect(stats.complaints).toBe(1);
  });

  it('zero wysyłek w oknie = null procenty (kafle pokazują kreskę)', () => {
    const stats = emailStats([row({ sentAt: at(20) })], 7, now);
    expect(stats.sent).toBe(0);
    expect(stats.deliveredPct).toBeNull();
    expect(stats.openedPct).toBeNull();
    expect(stats.bouncePct).toBeNull();
    expect(stats.complaints).toBe(0);
  });
});
