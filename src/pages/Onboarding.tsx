import { useMemo, useState } from 'react';
import { Loader2, ArrowRight, ArrowLeft, ArrowUpRight, Dumbbell, Weight, Flame, Zap, Link2, Medal, Calendar, Check, Pencil, ListChecks } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { localizeDayName, localizeFocus, localizeWeekdayShort } from '@/lib/plan-i18n';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { PlanBuilder } from '@/components/PlanBuilder';
import { planTemplates, getRecommendedPlan, type PlanTemplate, type PlanObjective } from '@/data/planTemplates';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { cn, formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

type Level = 'beginner' | 'intermediate' | 'advanced' | 'elite';

const weekMondayStr = (date: Date): string => formatLocalDate(getStartOfPlanWeek(date));

const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 'monday', short: 'Pn', long: 'Poniedziałek' },
  { value: 'tuesday', short: 'Wt', long: 'Wtorek' },
  { value: 'wednesday', short: 'Śr', long: 'Środa' },
  { value: 'thursday', short: 'Cz', long: 'Czwartek' },
  { value: 'friday', short: 'Pt', long: 'Piątek' },
  { value: 'saturday', short: 'So', long: 'Sobota' },
  { value: 'sunday', short: 'Nd', long: 'Niedziela' },
];
const weekdayLong = (value: Weekday) => WEEKDAYS.find(w => w.value === value)?.long ?? value;

// Domyślny rozkład dni wg liczby treningów (równo rozłożone w tygodniu).
const DEFAULT_DAYS: Record<number, Weekday[]> = {
  2: ['monday', 'thursday'],
  3: ['monday', 'wednesday', 'friday'],
  4: ['monday', 'tuesday', 'thursday', 'friday'],
  5: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  6: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

const LEVELS: { value: Level; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Dumbbell }[] = [
  { value: 'beginner', labelKey: 'ob.level.beginner', descKey: 'ob.level.beginner.desc', icon: ArrowUpRight },
  { value: 'intermediate', labelKey: 'ob.level.intermediate', descKey: 'ob.level.intermediate.desc', icon: Link2 },
  { value: 'advanced', labelKey: 'ob.level.advanced', descKey: 'ob.level.advanced.desc', icon: Weight },
  { value: 'elite', labelKey: 'ob.level.elite', descKey: 'ob.level.elite.desc', icon: Medal },
];

const OBJECTIVES: { value: PlanObjective; labelKey: TranslationKey; descKey: TranslationKey; icon: typeof Dumbbell }[] = [
  { value: 'build_muscle', labelKey: 'ob.obj.muscle', descKey: 'ob.obj.muscle.desc', icon: Dumbbell },
  { value: 'peak_strength', labelKey: 'ob.obj.strength', descKey: 'ob.obj.strength.desc', icon: Weight },
  { value: 'fat_loss', labelKey: 'ob.obj.fatloss', descKey: 'ob.obj.fatloss.desc', icon: Flame },
  { value: 'athletic', labelKey: 'ob.obj.athletic', descKey: 'ob.obj.athletic.desc', icon: Zap },
];

const OBJECTIVE_TAGS: Record<PlanObjective, TranslationKey[]> = {
  build_muscle: ['ob.tag.hypertrophy'],
  peak_strength: ['ob.tag.strength', 'ob.tag.power'],
  fat_loss: ['ob.tag.conditioning'],
  athletic: ['ob.tag.power', 'ob.tag.conditioning'],
};

const mapLevel = (l: Level): PlanTemplate['level'] => (l === 'elite' ? 'advanced' : l);

// Szacowana miesięczna objętość (tonaż) — heurystyka pod kartę "Precision Protocol".
const estimateMonthlyVolume = (tpl: PlanTemplate): number => {
  let weeklySets = 0;
  tpl.days.forEach(d => d.exercises.forEach(e => {
    const m = e.sets.match(/^(\d+)/);
    weeklySets += m ? parseInt(m[1], 10) : 3;
  }));
  // sety/tydz × ~10 powt × ~35 kg × 4.3 tyg → zaokrąglone do 500
  return Math.round((weeklySets * 10 * 35 * 4.3) / 500) * 500;
};

// ── Wspólny chrome kroku (brand + pasek postępu) ──
const StepHeader = ({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : <span />}
        <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
        <span />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < step ? 'bg-primary' : 'bg-surface-highest')} />
          ))}
        </div>
        <span className="text-[11px] font-medium tracking-widest text-muted-foreground tabular-nums">
          {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

// ── Karta opcji (level/objective) ──
const OptionCard = ({ icon: Icon, title, desc, selected, onClick }: { icon: typeof Dumbbell; title: string; desc: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3',
      selected ? 'bg-surface-high ring-2 ring-primary' : 'bg-surface-low hover:bg-surface-container',
    )}
  >
    <span className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', selected ? 'bg-primary/15 text-primary' : 'bg-surface-highest text-fitness-cyan')}>
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-heading font-bold text-[17px] leading-tight">{title}</span>
      <span className="block text-[13px] text-muted-foreground mt-0.5 leading-snug">{desc}</span>
    </span>
    <span className={cn('mt-1 h-5 w-5 rounded-full shrink-0 flex items-center justify-center', selected ? 'bg-primary text-primary-foreground' : 'border-2 border-surface-highest')}>
      {selected && <Check className="h-3 w-3" />}
    </span>
  </button>
);

const Onboarding = () => {
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);

  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<Level>('beginner');
  const [objective, setObjective] = useState<PlanObjective>('build_muscle');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [trainingDays, setTrainingDays] = useState<Weekday[]>(DEFAULT_DAYS[4]);
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));
  const [mode, setMode] = useState<'recommend' | 'browse' | 'own'>('recommend');
  const [picked, setPicked] = useState<PlanTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = useMemo(() => getRecommendedPlan(objective, mapLevel(level), daysPerWeek), [objective, level, daysPerWeek]);
  const chosen = picked ?? recommended;

  const setDays = (n: number) => {
    setDaysPerWeek(n);
    setTrainingDays(DEFAULT_DAYS[n] ?? DEFAULT_DAYS[4]);
  };

  const toggleDay = (d: Weekday) => {
    setTrainingDays(prev => {
      if (prev.includes(d)) return prev.filter(x => x !== d);
      return [...prev, d];
    });
  };

  // Przypisz wybrane dni tygodnia do dni planu (po kolei wg porządku tygodnia).
  const applyWeekdays = (days: TrainingDay[]): TrainingDay[] => {
    const order = WEEKDAYS.map(w => w.value);
    const sorted = [...trainingDays].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return days.map((d, i) => {
      const wd = sorted[i];
      return wd ? { ...d, weekday: wd, dayName: weekdayLong(wd) } : d;
    });
  };

  const persist = async (days: TrainingDay[], durationWeeks: number) => {
    setIsSaving(true);
    setError(null);
    try {
      const planStartDate = weekMondayStr(new Date(`${startDate}T00:00:00`));
      const result = await savePlan(days, { durationWeeks, startDate: planStartDate });
      if (!result.success) {
        setError(result.error || t('onboarding.error.saveFailed'));
        setIsSaving(false);
        return;
      }
      await createActiveCycle(days, durationWeeks, planStartDate);
      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        onboarding: { state: 'completed', version: 2 },
        trainingProfile: { level, objective, daysPerWeek },
      });
      // onboardingCompleted w profilu przekieruje na dashboard (router).
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  const confirmTemplate = () => persist(applyWeekdays(chosen.days), chosen.durationWeeks);

  // ── Tryb: ułóż własny plan ──
  if (mode === 'own') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-lg mx-auto">
          <PlanBuilder
            initialDurationWeeks={12}
            onSubmit={(days, weeks) => persist(applyWeekdays(days), weeks)}
            onCancel={() => setMode('recommend')}
          />
          {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  const PrimaryButton = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-[#f4ffc9] to-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        {/* ── STEP 1: Welcome ── */}
        {step === 1 && (
          <>
            <StepHeader step={1} total={5} />
            <div className="flex-1 flex flex-col justify-center py-10">
              <h1 className="font-heading font-bold text-5xl leading-[1.05] tracking-tight">
                {t('ob.welcome.title1')}<br />
                <span className="text-primary">{t('ob.welcome.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-5 leading-relaxed">{t('ob.welcome.desc')}</p>
            </div>
            <PrimaryButton onClick={() => setStep(2)}>
              {t('ob.next')} <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
            <p className="text-center text-[11px] font-medium tracking-widest uppercase text-muted-foreground mt-4">{t('ob.social')}</p>
          </>
        )}

        {/* ── STEP 2: Baseline (level) ── */}
        {step === 2 && (
          <>
            <StepHeader step={2} total={5} onBack={() => setStep(1)} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">
                {t('ob.baseline.title1')} <span className="text-primary italic">{t('ob.baseline.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.baseline.desc')}</p>
            </div>
            <div className="flex-1 space-y-3">
              {LEVELS.map(l => (
                <OptionCard key={l.value} icon={l.icon} title={t(l.labelKey)} desc={t(l.descKey)} selected={level === l.value} onClick={() => setLevel(l.value)} />
              ))}
            </div>
            <div className="pt-5"><PrimaryButton onClick={() => setStep(3)}>{t('ob.nextStep')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {/* ── STEP 3: Objective ── */}
        {step === 3 && (
          <>
            <StepHeader step={3} total={5} onBack={() => setStep(2)} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">
                {t('ob.obj.title1')} <span className="text-primary">{t('ob.obj.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.obj.desc')}</p>
            </div>
            <div className="flex-1 space-y-3">
              {OBJECTIVES.map(o => (
                <OptionCard key={o.value} icon={o.icon} title={t(o.labelKey)} desc={t(o.descKey)} selected={objective === o.value} onClick={() => setObjective(o.value)} />
              ))}
            </div>
            <div className="pt-5"><PrimaryButton onClick={() => setStep(4)}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {/* ── STEP 4: Protocol (days + schedule + start date) ── */}
        {step === 4 && (
          <>
            <StepHeader step={4} total={5} onBack={() => setStep(3)} />
            <div className="mt-7 mb-5">
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight italic">
                {t('ob.protocol.title1')} <span className="text-primary">{t('ob.protocol.title2')}</span>
              </h1>
              <p className="text-muted-foreground mt-2">{t('ob.protocol.desc')}</p>
            </div>
            <div className="flex-1 space-y-4">
              {/* dni/tydzień */}
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysQ')}</p>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setDays(n)} className={cn('flex-1 h-11 rounded-xl font-heading font-bold transition-colors', daysPerWeek === n ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-foreground')}>{n}</button>
                  ))}
                </div>
              </div>
              {/* wybór dni */}
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('ob.protocol.daysSelect')}</p>
                <div className="flex justify-between gap-1.5">
                  {WEEKDAYS.map(w => {
                    const on = trainingDays.includes(w.value);
                    return (
                      <button key={w.value} onClick={() => toggleDay(w.value)} className={cn('h-10 w-10 rounded-full font-bold text-sm transition-colors', on ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}>
                        {localizeWeekdayShort(w.short, lang).slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{t('ob.protocol.daysHint', { picked: trainingDays.length, target: daysPerWeek })}</p>
              </div>
              {/* data startu */}
              <div className="rounded-2xl bg-surface-low p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('ob.protocol.startDate')}</p>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-fitness-cyan">{t('ob.protocol.phase')}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i);
                    const ds = formatLocalDate(d);
                    const on = ds === startDate;
                    return (
                      <button key={ds} onClick={() => setStartDate(ds)} className={cn('shrink-0 w-16 rounded-xl py-2 flex flex-col items-center transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-surface-highest')}>
                        <span className="text-[10px] font-medium uppercase">{i === 0 ? t('ob.today') : d.toLocaleDateString(dateLocale(lang), { month: 'short' })}</span>
                        <span className="font-heading font-bold text-lg leading-none mt-0.5">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{t('ob.protocol.specificDate')}</span>
                  <input type="date" value={startDate} min={formatLocalDate(new Date())} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-foreground outline-none" />
                </label>
              </div>
            </div>
            <div className="pt-5"><PrimaryButton onClick={() => { setPicked(null); setStep(5); }}>{t('ob.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton></div>
          </>
        )}

        {/* ── STEP 5: Precision Protocol ── */}
        {step === 5 && mode === 'recommend' && (
          <>
            <StepHeader step={5} total={5} onBack={() => setStep(4)} />
            <div className="mt-7 mb-5">
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-2">{t('ob.precision.kicker')}</p>
              <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">{t('ob.precision.title')}</h1>
              <p className="text-muted-foreground mt-2">{picked ? t('ob.precision.chosen') : t('ob.precision.recommended', { name: chosen.name })}</p>
            </div>
            <div className="flex-1 space-y-3">
              {/* karta planu */}
              <div className="rounded-2xl bg-surface-low p-5">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.planName')}</p>
                <h2 className="font-heading font-bold text-2xl text-primary mt-1 leading-tight">{chosen.name}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {OBJECTIVE_TAGS[chosen.objective].map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-surface-highest text-muted-foreground">{t(tag)}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface-low p-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.duration')}</p>
                  <p className="font-heading font-bold text-2xl mt-1"><span className="text-fitness-cyan">{chosen.durationWeeks}</span> <span className="text-sm text-muted-foreground font-sans font-medium">{t('ob.precision.weeks')}</span></p>
                </div>
                <div className="rounded-2xl bg-surface-low p-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.frequency')}</p>
                  <p className="font-heading font-bold text-2xl mt-1"><span className="text-primary">{chosen.daysPerWeek}</span> <span className="text-sm text-muted-foreground font-sans font-medium">{t('ob.precision.daysWk')}</span></p>
                </div>
              </div>
              <div className="rounded-2xl bg-surface-low p-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('ob.precision.volume')}</p>
                <p className="font-heading font-bold text-2xl mt-1">{estimateMonthlyVolume(chosen).toLocaleString(dateLocale(lang))} <span className="text-sm text-muted-foreground font-sans font-medium">{t('ob.precision.kgMonth')}</span></p>
              </div>
              {/* podgląd dni */}
              <div className="rounded-2xl bg-surface-low p-4 space-y-1.5">
                {chosen.days.map((d, i) => (
                  <div key={d.id} className="text-[13px] flex gap-2">
                    <span className="text-fitness-cyan font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-muted-foreground">{localizeFocus(d.focus, lang)} · {d.exercises.length} {t('ob.precision.exercises')}</span>
                  </div>
                ))}
              </div>
              {/* alternatywy */}
              <div className="flex gap-2">
                <button onClick={() => setMode('browse')} className="flex-1 rounded-2xl py-3 bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><ListChecks className="h-4 w-4 text-fitness-cyan" />{t('ob.precision.browse')}</button>
                <button onClick={() => setMode('own')} className="flex-1 rounded-2xl py-3 bg-surface-high text-sm font-medium flex items-center justify-center gap-2"><Pencil className="h-4 w-4 text-fitness-cyan" />{t('ob.precision.own')}</button>
              </div>
            </div>
            <div className="pt-5">
              <PrimaryButton onClick={confirmTemplate} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t('ob.precision.confirm')}
              </PrimaryButton>
              {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
            </div>
          </>
        )}

        {/* ── STEP 5: Browse all plans ── */}
        {step === 5 && mode === 'browse' && (
          <>
            <StepHeader step={5} total={5} onBack={() => setMode('recommend')} />
            <div className="mt-7 mb-4">
              <h1 className="font-heading font-bold text-3xl tracking-tight uppercase">{t('ob.browse.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('ob.browse.desc')}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {planTemplates.map(tpl => (
                <button key={tpl.id} onClick={() => { setPicked(tpl); setMode('recommend'); }} className="w-full text-left rounded-2xl bg-surface-low hover:bg-surface-container p-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-lg text-primary">{tpl.name}</h3>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{tpl.daysPerWeek}× · {tpl.durationWeeks}{t('ob.browse.wk')}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{tpl.description}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
