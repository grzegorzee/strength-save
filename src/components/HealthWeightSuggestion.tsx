import { useEffect, useState } from 'react';
import { HeartPulse, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { getHealthBridge, loadHealthSettings } from '@/lib/health-bridge';
import { newerHealthWeight, type HealthWeightSample } from '@/lib/health-sync';
import type { BodyMeasurement } from '@/types';
import { dateLocale } from '@/i18n';
import { parseLocalDate } from '@/lib/utils';

interface HealthWeightSuggestionProps {
  measurements: BodyMeasurement[];
  onAccept: (sample: HealthWeightSample) => Promise<void>;
}

/**
 * Propozycja wagi ze Zdrowia (Z118): dyskretny banner, NIGDY auto-zapis — user
 * zatwierdza tapnięciem. Widoczny tylko gdy toggle włączony i Health ma nowszą wagę.
 */
export const HealthWeightSuggestion = ({ measurements, onAccept }: HealthWeightSuggestionProps) => {
  const { t, lang } = useTranslation();
  const [sample, setSample] = useState<HealthWeightSample | null>(null);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const settings = loadHealthSettings();
    if (!settings.suggestWeight) return;
    let cancelled = false;
    void getHealthBridge().readLatestWeight().then((latest) => {
      if (cancelled) return;
      setSample(newerHealthWeight(latest, measurements));
    });
    return () => { cancelled = true; };
  }, [measurements]);

  if (!sample || dismissed) return null;

  const handleAccept = async () => {
    setSaving(true);
    await onAccept(sample);
    setSaving(false);
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-fitness-cyan/10 px-4 py-3" data-testid="health-weight-suggestion">
      <span className="flex items-center gap-2 text-sm">
        <HeartPulse className="h-4 w-4 shrink-0 text-fitness-cyan" />
        {t('health.weightSuggestion', {
          kg: Math.round(sample.kg * 10) / 10,
          date: parseLocalDate(sample.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
        })}
      </span>
      <Button size="sm" variant="outline" className="shrink-0 gap-1.5" disabled={saving} onClick={() => void handleAccept()}>
        <Plus className="h-3.5 w-3.5" />
        {t('common.save')}
      </Button>
    </div>
  );
};
