import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { displayDayNameForDate, localizeFocus } from '@/lib/plan-i18n';
import { formatLocalDateLabel } from '@/lib/utils';
import type { PreStartInfo } from '@/lib/plan-prestart';

// WP-F (X35a): wspólna karta "Plan startuje" (Dashboard T3 + zakładka Plan).
// Wygląd 1:1 z dotychczasowej karty Dashboardu; CTA zależy od miejsca
// (Dashboard: "Zobacz plan" -> /plan, Plan: "Zobacz pierwszy tydzień").

interface PreStartCardProps {
  info: PreStartInfo;
  ctaLabel: string;
  onCta: () => void;
  testId?: string;
}

export const PreStartCard = ({ info, ctaLabel, onCta, testId = 'prestart-card' }: PreStartCardProps) => {
  const { t, lang } = useTranslation();
  const longDate = (iso: string) =>
    formatLocalDateLabel(iso, dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container p-5" data-testid={testId}>
      <span className="eyebrow-mono text-primary">{t('dash.hero.planStarts')}</span>
      <p className="min-w-0 font-heading text-xl font-bold leading-tight tracking-tight">
        {t('dash.preStart.title', { date: longDate(info.startDateISO) })}
      </p>
      {info.firstEntry && (
        <p className="text-sm text-muted-foreground">
          {t('dash.preStart.firstWorkout', {
            day: `${displayDayNameForDate(info.firstEntry.day.dayName, info.firstEntry.day.weekday, info.firstEntry.date, lang)} (${localizeFocus(info.firstEntry.day.focus, lang)}) · ${longDate(info.firstEntry.dateKey)}`,
          })}
        </p>
      )}
      {/* Uwaga właściciela (121): przed startem cyklu to główna akcja dnia,
          więc CTA w akcencie jak hero, nie wyszarzony outline. */}
      <Button className="kinetic-primary-button mt-2 h-12 w-full gap-1.5 text-base hover:brightness-105" onClick={onCta}>
        {ctaLabel}
      </Button>
    </div>
  );
};
