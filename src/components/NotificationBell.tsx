import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, ClipboardList, Info, Megaphone, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  countUnreadUserEvents,
  markAllUserEventsRead,
  subscribeUserEvents,
  type UserEvent,
} from '@/lib/user-events';
import { describeUserEvent } from '@/lib/user-event-display';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { dateLocale } from '@/i18n';

const TYPE_ICONS = {
  pr: Trophy,
  badge: Trophy,
  week: CalendarCheck,
  plan: ClipboardList,
  announcement: Megaphone,
} as const;

// B-T6: dzwonek czyta serwerowe user_events (offline cache daje persistence
// SDK), nie lokalny localStorage — drugi telefon widzi te same zdarzenia
// i ten sam stan przeczytania.
export const NotificationBell = ({ uid }: { uid: string }) => {
  const { t, lang } = useTranslation();
  const { toDisplay, unit } = useUnit();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<UserEvent[]>([]);

  useEffect(() => subscribeUserEvents(uid, setEvents), [uid]);

  const unread = countUnreadUserEvents(events);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void markAllUserEventsRead(uid, events);
  };

  const displayCtx = {
    t,
    localizeExerciseName: (name: string) => localizeExerciseName(name, lang),
    fmtWeight: (kg: number) => `${Math.round(toDisplay(kg))} ${unit}`,
    fmtDuration: (sec: number) => `${Math.round(sec)}s`,
    toDisplay,
    unit,
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
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-highest">
                <Bell className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">{t('inbox.empty.title')}</p>
              <p className="max-w-[26ch] text-sm text-muted-foreground">{t('inbox.empty.desc')}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2 overflow-y-auto">
              {events.map((event) => {
                const Icon = TYPE_ICONS[event.type] ?? Info;
                const { title, body } = describeUserEvent(event, displayCtx);
                const clickable = Boolean(event.deepLink);
                const openLink = () => {
                  if (!event.deepLink) return;
                  setOpen(false);
                  // X29: legacy eventy week sprzed X29 mają deepLink "/analytics"
                  // (tab summary) — raport tygodnia zawsze prowadzi na listę tygodni.
                  navigate(event.type === 'week' ? '/analytics?tab=weekly' : event.deepLink);
                };
                return (
                  <div
                    key={event.key}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={openLink}
                    onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) openLink(); }}
                    className={`flex items-start gap-3 rounded-xl bg-surface-container p-3 ${clickable ? 'cursor-pointer transition-colors hover:bg-surface-highest' : ''}`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{title}</p>
                      {body && <p className="text-xs text-muted-foreground">{body}</p>}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {new Date(event.createdAt).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}
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
