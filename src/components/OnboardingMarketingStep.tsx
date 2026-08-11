import { ArrowLeft, Dumbbell, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface OnboardingMarketingStepProps {
  onAccept: () => void;
  onDecline: () => void;
  /** Systemowy "wstecz" kroku: powrót BEZ zapisu (spec 2026-08-11, zasada 2). */
  onBack: () => void;
  isSaving?: boolean;
  error?: boolean;
}

/**
 * Dedykowany krok zgody marketingowej w onboardingu (wzorzec Runna "Be the
 * first to know"). Zero dark patterns: obie opcje widoczne bez scrolla, brak
 * pre-selekcji, brak wymuszonego opóźnienia. Wizual to mock karty powiadomienia
 * w HTML/CSS — zero nowych assetów binarnych.
 */
export const OnboardingMarketingStep = ({ onAccept, onDecline, onBack, isSaving, error }: OnboardingMarketingStepProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={onBack} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
          <span />
        </div>

        <div className="flex-1 flex flex-col justify-center py-6">
          <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">
            {t('obMarketing.title1')}<br />
            <span className="text-primary">{t('obMarketing.title2')}</span>
          </h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">{t('obMarketing.desc')}</p>

          {/* Mock powiadomienia push (czysty HTML/CSS) */}
          <div className="mt-8 rounded-2xl bg-surface-low p-4" data-testid="marketing-mock-notification">
            <div className="rounded-xl bg-surface-high p-3.5 flex items-start gap-3 shadow-lg shadow-black/10">
              <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide">{t('ob.brand')}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{t('obMarketing.mockTime')}</span>
                </span>
                <span className="block text-[13px] font-semibold mt-0.5">{t('obMarketing.mockTitle')}</span>
                <span className="block text-[12px] text-muted-foreground leading-snug">{t('obMarketing.mockBody')}</span>
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-[13px] text-destructive" data-testid="marketing-consent-error">{t('consent.saveError')}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onAccept}
            disabled={isSaving}
            data-testid="marketing-accept"
            className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-[#f4ffc9] to-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('obMarketing.accept')}
          </button>
          <button
            onClick={onDecline}
            disabled={isSaving}
            data-testid="marketing-decline"
            className="w-full rounded-2xl py-3.5 font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {t('obMarketing.decline')}
          </button>
          {/* Dokładna treść oświadczenia (statementText w logu zgód) */}
          <p className="text-[11px] text-muted-foreground leading-snug text-center pt-1">{t('consent.marketing')}</p>
        </div>
      </div>
    </div>
  );
};
