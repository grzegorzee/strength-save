import { beforeEach, describe, expect, it } from 'vitest';
import { addInboxItem, getInbox, markAllRead, unreadCount } from '@/lib/notification-inbox';

const UID = 'user-1';

describe('notification-inbox', () => {
  beforeEach(() => localStorage.clear());

  it('dodaje wpis jako nieprzeczytany, najnowsze pierwsze', () => {
    addInboxItem(UID, { type: 'pr', title: 'Rekord: Przysiad 100 kg', date: '2026-08-01T10:00:00Z' });
    addInboxItem(UID, { type: 'week', title: 'Tydzień domknięty', date: '2026-08-02T10:00:00Z' });
    const items = getInbox(UID);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Tydzień domknięty');
    expect(unreadCount(UID)).toBe(2);
  });

  it('markAllRead zeruje licznik, wpisy zostają', () => {
    addInboxItem(UID, { type: 'pr', title: 'x' });
    markAllRead(UID);
    expect(unreadCount(UID)).toBe(0);
    expect(getInbox(UID)).toHaveLength(1);
  });

  it('trzyma max 50 wpisów (FIFO od najstarszych)', () => {
    for (let i = 0; i < 55; i++) {
      addInboxItem(UID, { type: 'system', title: `n${i}`, date: new Date(2026, 0, 1, 0, i).toISOString() });
    }
    expect(getInbox(UID)).toHaveLength(50);
    expect(getInbox(UID)[0].title).toBe('n54');
  });

  it('izoluje per uid i przeżywa uszkodzony JSON', () => {
    localStorage.setItem('ss_inbox_v1_user-2', '{zepsute');
    addInboxItem(UID, { type: 'pr', title: 'x' });
    expect(getInbox('user-2')).toEqual([]);
    expect(getInbox(UID)).toHaveLength(1);
  });
});
