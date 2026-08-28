import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { ConsentCheckboxes } from '@/components/ConsentCheckboxes';
import {
  EMPTY_CONSENT_SELECTION,
  buildConsentSubmissions,
  getConsentMirror,
  hasRequiredConsents,
  type ConsentSelection,
} from '@/lib/consent-selection';
import { recordConsents } from '@/lib/consents-api';
import type { UserProfile } from '@/lib/user-profile';
import type { ConsentMirror } from '@/lib/legal-versions';

// Re-consent (pakiet prawny v2): istniejący user bez kompletu aktualnych zgód
// (brak mirrora, stara wersja dokumentu po bumpie w legal-versions.ts) dostaje
// pełnoekranową bramkę przed trasami (warunek: needsConsentRefresh z
// src/lib/consent-selection.ts). Nowi userzy zbierają zgody w onboardingu
// (krok Welcome), więc bramka ich nie dotyczy. Zniknięcie bramki napędza
// autorytatywny mirror zwrócony po batch.commit(); onSnapshot później go
// rekonsyliuje, ale nie jest już krytyczną ścieżką UX.

export const ConsentGate = ({ profile, onConfirmed, onLogout }: {
  profile: UserProfile | null;
  /** Autorytatywny mirror zwrócony dopiero po atomowym zapisie na serwerze. */
  onConfirmed: (mirror: ConsentMirror) => void;
  /** Zasada 6 (bug 32): bramka zastępuje cały router, więc musi mieć wyjście
   *  niezależne od zatwierdzenia zgód — symetrycznie do EmailVerificationGate. */
  onLogout: () => Promise<void>;
}) => {
  const { t, lang } = useTranslation();
  const [selection, setSelection] = useState<ConsentSelection>(EMPTY_CONSENT_SELECTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const marketingAlreadyGranted = getConsentMirror(profile)?.marketingGranted === true;

  const submit = async () => {
    setSaving(true);
    setError(false);
    try {
      const confirmedMirror = await recordConsents(buildConsentSubmissions(t, selection), lang);
      setSaving(false);
      onConfirmed(confirmedMirror);
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] justify-center overflow-y-auto bg-background pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Card className="my-auto w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-7 w-7 text-primary shrink-0" />
            <h1 className="font-heading font-bold text-2xl leading-tight">{t('consent.gateTitle')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">{t('consent.gateDesc')}</p>
          <ConsentCheckboxes
            value={selection}
            onChange={setSelection}
            showMarketing={!marketingAlreadyGranted}
          />
          {error && (
            <p className="mt-3 text-sm text-destructive" data-testid="consent-gate-error">{t('consent.saveError')}</p>
          )}
          <Button
            className="w-full mt-5"
            size="lg"
            disabled={!hasRequiredConsents(selection) || saving}
            onClick={submit}
            data-testid="consent-gate-submit"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('consent.gateSubmit')}
          </Button>
          <Button
            variant="secondary"
            className="w-full mt-2"
            onClick={() => void onLogout()}
            data-testid="consent-gate-logout"
          >
            {t('profile.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
