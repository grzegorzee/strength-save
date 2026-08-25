import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { PlanDurationPicker } from '@/components/PlanDaysEditor';
import type { PlanObjective } from '@/data/planTemplates';
import { cn, parseLocalDateSafe } from '@/lib/utils';

const BASE_WEEKS = [8, 12, 16];

// X34: główny CTA ekranu 6/6 spersonalizowany celem z kroku 3; nieznany cel
// (uszkodzony profil) spada na neutralne "Rozpocznij plan".
const START_CTA_KEY: Partial<Record<PlanObjective, TranslationKey>> = {
  build_muscle: 'ob.start.cta.build_muscle',
  peak_strength: 'ob.start.cta.peak_strength',
  fat_loss: 'ob.start.cta.fat_loss',
  athletic: 'ob.start.cta.athletic',
};
const startCtaKey = (objective: PlanObjective): TranslationKey => START_CTA_KEY[objective] ?? 'ob.start.cta.default';

interface PlanStartStepProps {
  name: string;
  onNameChange: (name: string) => void;
  weeks: number;
  /** Długość z szablonu: kafel z etykietą "polecane" (spoza 8/12/16 = czwarty kafel). Własny plan = brak. */
  templateWeeks?: number;
  onWeeksChange: (weeks: number) => void;
  /** X34b: wybrany dzień pierwszego treningu (ISO). */
  firstWorkoutDate: string;
  /** X34b: kolejne dni treningowe od dziś (listFirstWorkoutOptions). */
  firstWorkoutOptions: string[];
  onFirstWorkoutChange: (iso: string) => void;
  /** Dzisiejsza data (ISO) — chip tej daty dostaje etykietę "Dziś". */
  todayISO: string;
  objective: PlanObjective;
  onStart: () => void;
  onPreview: () => void;
  previewLabel: string;
  isSaving?: boolean;
  error?: string | null;
}

/**
 * X34 / X34b: ekran 6/6 "Start planu" (po wyborze planu w 5A). Kolejność od góry
 * (decyzja właściciela po buildzie 121): data PIERWSZEGO TRENINGU (chipy kolejnych
 * dni treningowych od dziś, "Dziś" gdy dotyczy), długość jako kafle 8 / 12 / 16
 * (+ wartość szablonu "polecane") + "Inna" z PlanDurationPicker, nazwa planu na
 * końcu. Na dole główny CTA celu (zapis od razu) i drugorzędny "Podgląd planu".
 * Zasada 7: kafle/chipy touch-manipulation, bez zaznaczania; etykiety dat nie
 * rzucą na złej dacie (zasada 11).
 */
export const PlanStartStep = ({
  name, onNameChange, weeks, templateWeeks, onWeeksChange,
  firstWorkoutDate, firstWorkoutOptions, onFirstWorkoutChange, todayISO,
  objective, onStart, onPreview, previewLabel, isSaving, error,
}: PlanStartStepProps) => {
  const { t, lang } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);
  const tiles = useMemo(
    () => Array.from(new Set(templateWeeks ? [...BASE_WEEKS, templateWeeks] : BASE_WEEKS)).sort((a, b) => a - b),
    [templateWeeks],
  );
  const customActive = customOpen || !tiles.includes(weeks);

  return (
    <div data-testid="ob-start-step" className="flex flex-1 flex-col">
      <div className="mt-5 mb-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-primary">{t('ob.start.kicker')}</p>
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">{t('ob.start.title')}</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{t('ob.start.desc')}</p>
      </div>
      <div className="flex-1 space-y-3">
        <div className="rounded-2xl bg-surface-low p-4" data-testid="ob-first-workout">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.start.firstWorkout')}</p>
          <p className="mb-2 text-[12px] text-muted-foreground">{t('ob.start.firstWorkoutHint')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="ob-first-workout-chips">
            {firstWorkoutOptions.map((iso) => {
              const date = parseLocalDateSafe(iso);
              const on = iso === firstWorkoutDate;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={on}
                  data-date={iso}
                  onClick={() => onFirstWorkoutChange(iso)}
                  className={cn('flex w-16 shrink-0 touch-manipulation select-none flex-col items-center rounded-full py-2 transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest')}
                >
                  <span className="text-[10px] font-medium uppercase">
                    {isToday ? t('ob.start.today') : date ? date.toLocaleDateString(dateLocale(lang), { weekday: 'short' }) : '-'}
                  </span>
                  <span className="mt-0.5 font-heading text-lg font-bold leading-none">{date ? date.getDate() : '-'}</span>
                  <span className="mt-0.5 text-[9px] uppercase opacity-70">{date ? date.toLocaleDateString(dateLocale(lang), { month: 'short' }) : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-surface-low p-4" data-testid="ob-duration-tiles">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('planbuilder.planDuration')}</p>
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
                    <span data-testid="ob-weeks-recommended" className="ml-1.5 text-[10px] uppercase tracking-wide opacity-70">{t('ob.start.recommendedWeeks')}</span>
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
              {t('ob.start.otherWeeks')}
            </button>
          </div>
          {customActive && (
            <div className="mt-3" data-testid="ob-weeks-custom">
              <PlanDurationPicker value={weeks} onChange={onWeeksChange} />
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-surface-low p-4">
          <label htmlFor="ob-plan-name" className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.planName')}</label>
          {/* X34 QA: 60 znaków nie mieści się w jednej linii na 393 px — pole
              rośnie w dół (textarea bez Entera), zamiast przewijać tekst w bok. */}
          <textarea
            id="ob-plan-name"
            data-testid="ob-plan-name"
            rows={1}
            maxLength={60}
            value={name}
            onChange={(e) => onNameChange(e.target.value.replace(/[\r\n]+/g, ' '))}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            ref={(el) => {
              if (!el) return;
              el.style.height = '0px';
              el.style.height = `${el.scrollHeight}px`;
            }}
            className="mt-1 w-full resize-none overflow-hidden border-b border-transparent bg-transparent font-heading text-xl font-bold leading-tight text-primary outline-none focus:border-primary/40"
          />
        </div>
      </div>
      <div className="space-y-2 pt-4">
        <button
          type="button"
          data-testid="ob-start-cta"
          onClick={onStart}
          disabled={isSaving}
          className="flex w-full touch-manipulation select-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary-light to-primary py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t(startCtaKey(objective))}
        </button>
        <button
          type="button"
          data-testid="ob-start-preview"
          onClick={onPreview}
          disabled={isSaving}
          className="w-full touch-manipulation select-none rounded-2xl bg-surface-high py-3 text-sm font-medium disabled:opacity-50"
        >
          {previewLabel}
        </button>
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};
