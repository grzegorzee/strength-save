import { Timestamp } from 'firebase/firestore';

// Budowa CSV z logu zgód (panel admina). Wymóg usera 2026-08-11: każda zgoda
// wyciągalna do CSV z datą, godziną i adresem IP.

export interface ConsentRow {
  id: string;
  uid: string;
  type: string;
  action: string;
  docVersion: string;
  lang: string;
  channel: string;
  appVersion: string | null;
  ip: string;
  statementText: string;
  createdAt: Date | null;
}

export const toConsentRow = (id: string, data: Record<string, unknown>): ConsentRow => ({
  id,
  uid: String(data.uid ?? ''),
  type: String(data.type ?? ''),
  action: String(data.action ?? ''),
  docVersion: String(data.docVersion ?? ''),
  lang: String(data.lang ?? ''),
  channel: String(data.channel ?? ''),
  appVersion: data.appVersion == null ? null : String(data.appVersion),
  ip: String(data.ip ?? ''),
  statementText: String(data.statementText ?? ''),
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
});

/** Pole CSV wg RFC 4180: cudzysłowy podwojone, całość w cudzysłowach gdy trzeba. */
export const csvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const buildConsentsCsv = (rows: ConsentRow[], emailByUid: Record<string, string>): string => {
  const header = 'createdAtUtc,email,uid,type,action,docVersion,lang,channel,appVersion,ip,statementText';
  const lines = rows.map((row) => [
    row.createdAt ? row.createdAt.toISOString() : '',
    emailByUid[row.uid] ?? '',
    row.uid,
    row.type,
    row.action,
    row.docVersion,
    row.lang,
    row.channel,
    row.appVersion ?? '',
    row.ip,
    row.statementText,
  ].map(csvField).join(','));
  return [header, ...lines].join('\r\n');
};
