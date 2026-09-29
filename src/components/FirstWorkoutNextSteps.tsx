import { ChevronRight, ScrollText, Trophy, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Przewodnik nowego konta, etap "co dalej": karta INLINE w podsumowaniu
// pierwszego treningu (nie modal: nie koliduje z celebracją ani oceną sesji,
// nie znika sama, zamyka ją user). Stan "przewodnik ukończony" zapisuje
// rodzic w momencie pokazania karty.
interface FirstWorkoutNextStepsProps {
  onNavigate: (path: string) => void;
  onDismiss: () => void;
}

export const FirstWorkoutNextSteps = ({ onNavigate, onDismiss }: FirstWorkoutNextStepsProps) => {
  const { t } = useTranslation();
  const reduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [
    { path: '/history', icon: ScrollText, title: t('tour.next.history'), desc: t('tour.next.historyDesc'), testId: 'tour-next-history' },
    { path: '/achievements', icon: Trophy, title: t('tour.next.progress'), desc: t('tour.next.progressDesc'), testId: 'tour-next-progress' },
  ];

  return (
    <section
      data-testid="tour-whats-next"
      aria-labelledby="tour-whats-next-title"
      className={cn(
        'rounded-2xl border border-primary/25 bg-surface-container p-4',
        !reduceMotion && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow-mono text-primary">{t('tour.next.kicker')}</p>
          <h2 id="tour-whats-next-title" className="font-heading text-xl font-bold tracking-tight">
            {t('tour.next.title')}
          </h2>
        </div>
        <button
          type="button"
          aria-label={t('tour.next.done')}
          onClick={onDismiss}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(({ path, icon: Icon, title, desc, testId }) => (
          <button
            key={path}
            type="button"
            data-testid={testId}
            onClick={() => onNavigate(path)}
            className="flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-xl bg-surface-low px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.06]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-bold leading-tight">{title}</span>
              <span className="block text-sm leading-snug text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
};
