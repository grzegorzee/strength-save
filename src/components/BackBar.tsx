import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface BackBarProps {
  onBack: () => void;
  /** Tytuł trasy (opcjonalny) — wyrównany do prawej, żeby przycisk był pierwszy pod kciukiem. */
  title?: string;
}

/**
 * WP-C (X35b): "nie mam jak wrócić z dołu strony". Na trasach spoza dolnej
 * nawigacji (Profil, Pomiary, Cykle, szczegóły ćwiczenia, edytor planu, admin)
 * strzałka wstecz żyła tylko w nagłówku. Ten pasek dokuje NAD dolnym navem
 * (ten sam slot 6rem co RestBar / CTA startu z X29 WP-D), więc powrót jest
 * zawsze pod kciukiem, także po przewinięciu długiej strony. Tylko mobile:
 * na desktopie jest sidebar i nagłówek w przewijanym kontenerze.
 */
export const BackBar = ({ onBack, title }: BackBarProps) => {
  const { t } = useTranslation();
  return (
    <div
      data-testid="back-bar"
      className="kinetic-glass fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-2xl px-2 py-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.45)] md:hidden"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold text-foreground transition-transform active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('nav.back')}
      </button>
      {title && (
        <span className="min-w-0 flex-1 truncate pr-2 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      )}
    </div>
  );
};
