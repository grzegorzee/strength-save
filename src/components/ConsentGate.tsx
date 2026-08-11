import { useEffect, useRef, useState } from 'react';
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

// Re-consent (pakiet prawny v2): istniejący user bez kompletu aktualnych zgód
// (brak mirrora, stara wersja dokumentu po bumpie w legal-versions.ts) dostaje
// pełnoekranową bramkę przed trasami (warunek: needsConsentRefresh z
// src/lib/consent-selection.ts). Nowi userzy zbierają zgody w onboardingu
// (krok Welcome), więc bramka ich nie dotyczy. Zniknięcie bramki napędza
// onSnapshot na users/{uid}: recordConsent aktualizuje mirror consents.

// Reguła #6 (incydent buildu 87): po udanym zapisie czekamy na snapshot mirrora,
// ale NIE w nieskończoność — po timeoucie spinner znika i przycisk wraca (retry
// jest bezpieczny, recordConsent nadpisuje te same zgody).
const SNAPSHOT_TIMEOUT_MS = 12_000;

export const ConsentGate = ({ profile }: { profile: UserProfile | null }) => {
  const { t, lang } = useTranslation();
  const [selection, setSelection] = useState<ConsentSelection>(EMPTY_CONSENT_SELECTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const marketingAlreadyGranted = getConsentMirror(profile)?.marketingGranted === true;

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(false);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    try {
      await recordConsents(buildConsentSubmissions(t, selection), lang);
      // Bramkę zamyka aktualizacja mirrora users/{uid}.consents przez onSnapshot.
      // Jeśli snapshot nie dojedzie w rozsądnym czasie, oddajemy sterowanie
      // userowi (komunikat współdzieli copy saveError do czasu wolnego okna
      // na nowe klucze i18n — pliki locales edytuje równoległa sesja).
      timeoutRef.current = window.setTimeout(() => {
        setError(true);
        setSaving(false);
      }, SNAPSHOT_TIMEOUT_MS);
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
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
        </CardContent>
      </Card>
    </div>
  );
};
