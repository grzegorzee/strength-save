import { useRef } from 'react';
import { CalendarClock, CircleSlash, Play } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { displayDayNameForDateISO } from '@/lib/plan-i18n';
import { formatLocalDateLabel } from '@/lib/utils';
import type { Lapse } from '@/lib/lapse-detection';

// Tray zaległości (Runna pakiet 1, spec C2): bottom sheet z wyjściem jednym
// tapem — [Odpuść] / [Przełóż], przy zaległości tygodnia+ [Kontynuuj od dziś].
// Ton neutralny (zero pretensji). Rodzic zamyka sheet PRZED mutacją danych,
// a kontekst widoku jest zamrożony na czas domykania (lekcja builda 92:
// nie wolno odmontować otwartego Radix Sheeta).

interface LapseTrayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lapse: Lapse | null;
  onSkip: (dateISO: string) => void;
  onMove: (dateISO: string) => void;
  onContinueToday: () => void;
  /** Spec C3: wejście do trybu "nie na 100%" z traya. */
  onReducedMode?: () => void;
}

export const LapseTray = ({ open, onOpenChange, lapse, onSkip, onMove, onContinueToday, onReducedMode }: LapseTrayProps) => {
  const { t, lang } = useTranslation();

  // Zamrożony kontekst: po akcji lapse znika ze stanu rodzica, a sheet musi
  // wyrenderować ostatni dobry widok podczas animacji zamykania.
  const lastLapseRef = useRef<Lapse | null>(null);
  if (lapse) lastLapseRef.current = lapse;
  const view = lapse ?? lastLapseRef.current;
  if (!view) return null;

  const dateLabel = formatLocalDateLabel(view.dateISO, dateLocale(lang), {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl" data-testid="lapse-tray">
        <SheetHeader className="text-left">
          <SheetTitle>{t('lapse.title')}</SheetTitle>
          <SheetDescription>
            {/* WP-L (X30): domyslna nazwa weekday podaza za date zaleglosci. */}
            {view.kind === 'stale-session' && view.day
              ? t('lapse.staleDesc', { day: displayDayNameForDateISO(view.day.dayName, view.day.weekday, view.dateISO, lang), date: dateLabel })
              : t('lapse.weekDesc')}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          {view.kind === 'stale-session' && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                data-testid="lapse-skip"
                onClick={() => onSkip(view.dateISO)}
              >
                <CircleSlash className="h-4 w-4" />
                {t('skipday.action')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                data-testid="lapse-move"
                onClick={() => onMove(view.dateISO)}
              >
                <CalendarClock className="h-4 w-4" />
                {t('reschedule.action')}
              </Button>
            </>
          )}
          {view.weekPlus && (
            <div className="space-y-1.5">
              <Button
                className="w-full justify-start gap-2"
                data-testid="lapse-continue"
                onClick={onContinueToday}
              >
                <Play className="h-4 w-4" />
                {t('lapse.continue')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('lapse.continueDesc')}</p>
            </div>
          )}
          {onReducedMode && (
            <button
              type="button"
              data-testid="lapse-reduced-mode"
              onClick={onReducedMode}
              className="mt-1 text-left text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              {t('lapse.notFull')}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
