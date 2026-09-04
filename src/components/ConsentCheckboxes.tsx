import { useId } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TERMS_URL, PRIVACY_URL } from '@/lib/legal-links';
import type { ConsentSelection } from '@/lib/consent-selection';

// Rozdzielone oświadczenia zgód (pakiet prawny v2). Cztery ODRĘBNE,
// domyślnie odznaczone pola: akceptacja Regulaminu + wiek 16 lat,
// zapoznanie z Polityką prywatności (celowo NIE "akceptuję" — dokument
// informacyjny z art. 13 RODO), wyraźna zgoda zdrowotna (art. 9 ust. 2
// lit. a RODO) i opcjonalna zgoda marketingowa (art. 398 PKE).
// Jeden zbiorczy checkbox jest niezgodny z RODO — nie wracać do niego.
// Teksty oświadczeń i helpery selekcji: src/lib/consent-selection.ts.

interface ConsentRowProps {
  checked: boolean;
  onToggle: () => void;
  testId: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const ConsentRow = ({ checked, onToggle, testId, disabled = false, children }: ConsentRowProps) => {
  const labelId = useId();

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-low p-4">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={labelId}
        data-testid={testId}
        disabled={disabled}
        onClick={onToggle}
        className="mt-[-0.5rem] grid h-11 w-11 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid h-6 w-6 place-items-center rounded-md border-2 transition-colors',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground bg-surface-highest',
          )}
        >
          {checked && <Check className="h-4 w-4" />}
        </span>
      </button>
      <p id={labelId} className="text-[13px] leading-snug">{children}</p>
    </div>
  );
};

interface ConsentCheckboxesProps {
  value: ConsentSelection;
  onChange: (value: ConsentSelection) => void;
  /** Ukryj checkbox marketingowy (np. gdy zgoda już wyrażona wcześniej). */
  showMarketing?: boolean;
  disabled?: boolean;
}

export const ConsentCheckboxes = ({ value, onChange, showMarketing = true, disabled = false }: ConsentCheckboxesProps) => {
  const { t } = useTranslation();
  const toggle = (key: keyof ConsentSelection) => onChange({ ...value, [key]: !value[key] });

  return (
    <div className="space-y-2">
      <ConsentRow checked={value.terms} onToggle={() => toggle('terms')} testId="consent-terms" disabled={disabled}>
        {t('consent.termsPrefix')}{' '}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-1 underline underline-offset-2 text-primary">{t('consent.termsLink')}</a>.
      </ConsentRow>
      <ConsentRow checked={value.privacy} onToggle={() => toggle('privacy')} testId="consent-privacy" disabled={disabled}>
        {t('consent.privacyPrefix')}{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-1 underline underline-offset-2 text-primary">{t('consent.privacyLink')}</a>.
      </ConsentRow>
      <ConsentRow checked={value.health} onToggle={() => toggle('health')} testId="consent-health" disabled={disabled}>
        {t('consent.health')}
      </ConsentRow>
      {showMarketing && (
        <ConsentRow checked={value.marketing} onToggle={() => toggle('marketing')} testId="consent-marketing" disabled={disabled}>
          {t('consent.marketing')}
        </ConsentRow>
      )}
    </div>
  );
};
