import { useMemo, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { PlanDurationPicker } from '@/components/PlanDaysEditor';
import { cn, parseLocalDateSafe } from '@/lib/utils';

const BASE_WEEKS = [8, 12, 16];

interface PlanSettingsRowProps {
  name: string;
  onNameChange: (name: string) => void;
  weeks: number;
  /** Długość z szablonu: domyślna, z etykietą "polecane"; spoza 8/12/16 = czwarty kafel. */
  templateWeeks: number;
  onWeeksChange: (weeks: number) => void;
  /** Wybrany poniedziałek startu (ISO). */
  startDate: string;
  startMondays: string[];
  onStartDateChange: (iso: string) => void;
}

/**
 * X33 WP-3: zwinięta linia ustawień planu w kroku 5A
 * ("{nazwa} · {n} tyg. · start {dzień} {d.MM}" + "Zmień"). Rozwinięcie: nazwa,
 * długość jako kafle 8 / 12 / 16 (+ wartość szablonu) + "Inna", start jako
 * chipy poniedziałków. Etykiety nie rzucą na złej dacie (zasada 11).
 */
export const PlanSettingsRow = ({ name, onNameChange, weeks, templateWeeks, onWeeksChange, startDate, startMondays, onStartDateChange }: PlanSettingsRowProps) => {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const tiles = useMemo(() => Array.from(new Set([...BASE_WEEKS, templateWeeks])).sort((a, b) => a - b), [templateWeeks]);
  const customActive = customOpen || !tiles.includes(weeks);

  const start = parseLocalDateSafe(startDate);
  const startDay = start ? start.toLocaleDateString(dateLocale(lang), { weekday: 'short' }) : '-';
  const startLabel = start ? `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, '0')}` : '-';

  return (
    <div className="rounded-2xl bg-surface-low p-3" data-testid="ob-plan-settings">
      <div className="flex items-center justify-between gap-3">
        <p data-testid="ob-plan-settings-summary" className="min-w-0 truncate text-[13px]">
          {t('ob.settings.summary', { name, weeks, day: startDay, date: startLabel })}
        </p>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="ob-plan-settings-panel"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 touch-manipulation text-[13px] font-medium text-primary"
        >
          {expanded ? t('ob.settings.collapse') : t('ob.settings.change')}
        </button>
      </div>
      {expanded && (
        <div id="ob-plan-settings-panel" className="mt-3 space-y-3">
          <div>
            {/* WP-PLANS-2 (X27, Task O3): nazwa planu edytowalna (default z szablonu). */}
            <label htmlFor="ob-plan-name" className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.planName')}</label>
            <input
              id="ob-plan-name"
              data-testid="ob-plan-name"
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="mt-0.5 w-full border-b border-transparent bg-transparent font-heading text-xl font-bold leading-tight text-primary outline-none focus:border-primary/40"
            />
          </div>
          {/* WP-PLANS-1 (X27, Task P5): długość nadpisywalna; kafle + "Inna" = istniejący picker (2-36). */}
          <div data-testid="template-duration-picker">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('planbuilder.planDuration')}</p>
            <div className="flex flex-wrap gap-2">
              {tiles.map((n) => {
                const on = !customActive && weeks === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setCustomOpen(false); onWeeksChange(n); }}
                    className={cn('touch-manipulation select-none rounded-full px-3.5 py-2 text-sm font-medium transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-foreground')}
                  >
                    {t('planbuilder.weeksShort', { n })}
                    {n === templateWeeks && (
                      <span data-testid="ob-weeks-recommended" className="ml-1.5 text-[10px] uppercase tracking-wide opacity-70">{t('ob.settings.recommendedWeeks')}</span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={customActive}
                onClick={() => setCustomOpen((v) => !v)}
                className={cn('touch-manipulation select-none rounded-full px-3.5 py-2 text-sm font-medium transition-colors', customActive ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-foreground')}
              >
                {t('ob.settings.otherWeeks')}
              </button>
            </div>
            {customActive && (
              <div className="mt-3" data-testid="ob-weeks-custom">
                <PlanDurationPicker value={weeks} onChange={onWeeksChange} />
              </div>
            )}
          </div>
          {/* WP-PLANS-2 (X27, Task O3): start planu = wybór z 8 najbliższych
              poniedziałków (default bieżący tydzień). */}
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.startWeek')}</p>
            <div className="flex gap-2 overflow-x-auto pb-1" data-testid="ob-start-week-chips">
              {startMondays.map((iso) => {
                const monday = parseLocalDateSafe(iso);
                const on = iso === startDate;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onStartDateChange(iso)}
                    className={cn('flex w-16 shrink-0 touch-manipulation select-none flex-col items-center rounded-full py-2 transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest')}
                  >
                    <span className="text-[10px] font-medium uppercase">{monday ? monday.toLocaleDateString(dateLocale(lang), { weekday: 'short' }) : '-'}</span>
                    <span className="mt-0.5 font-heading text-lg font-bold leading-none">{monday ? monday.getDate() : '-'}</span>
                    <span className="mt-0.5 text-[9px] uppercase opacity-70">{monday ? monday.toLocaleDateString(dateLocale(lang), { month: 'short' }) : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
