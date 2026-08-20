// G-T4: czysta logika sekcji Maile w panelu admina.
// Wiersze pochodzą z email_log (limit zapytania — statystyki liczone
// z ostatnich N wysyłek, co UI zaznacza w adnotacji).

export interface EmailLogRow {
  id: string;
  uid: string;
  to: string;
  type: string;
  subject: string;
  transport?: string;
  status: string;
  error?: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  openCount?: number;
  clickedAt?: string;
  clickCount?: number;
  bounceType?: string;
  complaintFeedbackType?: string;
  sesMessageId?: string;
}

export type EmailDisplayStatus = 'sent' | 'delivered' | 'opened' | 'bounced' | 'complaint' | 'failed';

/** Priorytety: complaint (spam) > bounced > failed > opened > delivered > sent. */
export function emailDisplayStatus(row: EmailLogRow): EmailDisplayStatus {
  if (row.status === 'complaint') return 'complaint';
  if (row.status === 'bounced') return 'bounced';
  if (row.status === 'failed') return 'failed';
  if (row.openedAt) return 'opened';
  if (row.status === 'delivered') return 'delivered';
  return 'sent';
}

export interface EmailStats {
  sent: number;
  deliveredPct: number | null;
  openedPct: number | null;
  bouncePct: number | null;
  complaints: number;
}

export function emailStats(rows: EmailLogRow[], days: number, now: Date = new Date()): EmailStats {
  const since = now.getTime() - days * 86400000;
  const windowRows = rows.filter((r) => {
    const ts = Date.parse(r.sentAt);
    return !Number.isNaN(ts) && ts >= since;
  });
  const sent = windowRows.length;
  const pct = (count: number): number | null => (sent > 0 ? Math.round((count / sent) * 100) : null);
  const delivered = windowRows.filter((r) => r.deliveredAt || r.status === 'delivered').length;
  const opened = windowRows.filter((r) => r.openedAt).length;
  const bounced = windowRows.filter((r) => r.status === 'bounced').length;
  const complaints = windowRows.filter((r) => r.status === 'complaint').length;
  return {
    sent,
    deliveredPct: pct(delivered),
    openedPct: pct(opened),
    bouncePct: pct(bounced),
    complaints,
  };
}
