import { useEffect, useState } from 'react';
import { Bell, CalendarCheck, ClipboardList, Info, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getInbox, markAllRead, unreadCount, type InboxItem } from '@/lib/notification-inbox';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';

const TYPE_ICONS = {
  pr: Trophy,
  badge: Trophy,
  week: CalendarCheck,
  plan: ClipboardList,
  system: Info,
} as const;

export const NotificationBell = ({ uid }: { uid: string }) => {
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setItems(getInbox(uid));
      setUnread(unreadCount(uid));
    };
    refresh();
    window.addEventListener('ss-inbox-change', refresh);
    return () => window.removeEventListener('ss-inbox-change', refresh);
  }, [uid]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markAllRead(uid);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('inbox.open')}
        onClick={() => handleOpenChange(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span data-testid="inbox-unread-dot" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Zawsze zamontowany, sterowany open — lekcja builda 92. */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full max-w-sm border-0 bg-surface-low">
          <SheetHeader>
            <SheetTitle className="font-heading uppercase">{t('inbox.title')}</SheetTitle>
          </SheetHeader>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-highest">
                <Bell className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">{t('inbox.empty.title')}</p>
              <p className="max-w-[26ch] text-sm text-muted-foreground">{t('inbox.empty.desc')}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2 overflow-y-auto">
              {items.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl bg-surface-container p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.body && <p className="text-xs text-muted-foreground">{item.body}</p>}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {new Date(item.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
