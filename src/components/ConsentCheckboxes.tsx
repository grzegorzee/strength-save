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
  children: React.ReactNode;
}

const ConsentRow = ({ checked, onToggle, testId, children }: ConsentRowProps) => (
  <div className="flex items-start gap-3 rounded-2xl bg-surface-low p-4">
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-testid={testId}
      onClick={onToggle}
      className={cn(
        'mt-0.5 h-6 w-6 shrink-0 rounded-md flex items-center justify-center transition-colors',
        checked ? 'bg-primary text-primary-foreground' : 'border-2 border-surface-highest',
      )}
    >
      {checked && <Check className="h-4 w-4" />}
    </button>
    <p className="text-[13px] leading-snug">{children}</p>
  </div>
);

interface ConsentCheckboxesProps {
  value: ConsentSelection;
  onChange: (value: ConsentSelection) => void;
  /** Ukryj checkbox marketingowy (np. gdy zgoda już wyrażona wcześniej). */
  showMarketing?: boolean;
}

export const ConsentCheckboxes = ({ value, onChange, showMarketing = true }: ConsentCheckboxesProps) => {
  const { t } = useTranslation();
  const toggle = (key: keyof ConsentSelection) => onChange({ ...value, [key]: !value[key] });

  return (
    <div className="space-y-2">
      <ConsentRow checked={value.terms} onToggle={() => toggle('terms')} testId="consent-terms">
        {t('consent.termsPrefix')}{' '}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-fitness-cyan">{t('consent.termsLink')}</a>.
      </ConsentRow>
      <ConsentRow checked={value.privacy} onToggle={() => toggle('privacy')} testId="consent-privacy">
        {t('consent.privacyPrefix')}{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-fitness-cyan">{t('consent.privacyLink')}</a>.
      </ConsentRow>
      <ConsentRow checked={value.health} onToggle={() => toggle('health')} testId="consent-health">
        {t('consent.health')}
      </ConsentRow>
      {showMarketing && (
        <ConsentRow checked={value.marketing} onToggle={() => toggle('marketing')} testId="consent-marketing">
          {t('consent.marketing')}
        </ConsentRow>
      )}
    </div>
  );
};
