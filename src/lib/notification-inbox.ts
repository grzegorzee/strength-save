// Lokalny inbox powiadomień (PRO-B). Bez sieci: zdarzenia emitują ekrany apki,
// storage per uid, limit 50. Wersjonowany klucz na wypadek zmiany kształtu.
export type InboxItemType = 'pr' | 'badge' | 'week' | 'plan' | 'system';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  body?: string;
  date: string; // ISO
  read: boolean;
}

const MAX_ITEMS = 50;
const key = (uid: string) => `ss_inbox_v1_${uid}`;

const load = (uid: string): InboxItem[] => {
  try {
    const raw = localStorage.getItem(key(uid));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save = (uid: string, items: InboxItem[]) => {
  try {
    localStorage.setItem(key(uid), JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // pełny storage nie może wywrócić treningu — inbox jest best-effort
  }
};

export const addInboxItem = (
  uid: string,
  item: Omit<InboxItem, 'id' | 'read' | 'date'> & { date?: string },
): void => {
  const entry: InboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    date: item.date ?? new Date().toISOString(),
    type: item.type,
    title: item.title,
    body: item.body,
  };
  const items = [entry, ...load(uid)];
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  save(uid, items);
  window.dispatchEvent(new CustomEvent('ss-inbox-change'));
};

export const getInbox = (uid: string): InboxItem[] => load(uid);
export const unreadCount = (uid: string): number => load(uid).filter((i) => !i.read).length;

export const markAllRead = (uid: string): void => {
  save(uid, load(uid).map((i) => ({ ...i, read: true })));
  window.dispatchEvent(new CustomEvent('ss-inbox-change'));
};
