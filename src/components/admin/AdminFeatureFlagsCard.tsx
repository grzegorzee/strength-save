import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Flag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

// Globalne flagi funkcji (config/feature_flags). Admin przełącza, klient może czytać.
const FLAGS: ReadonlyArray<{ key: string; labelKey: TranslationKey; descKey: TranslationKey; defaultOn: boolean }> = [
  { key: 'aiEnabled', labelKey: 'admin.flagAiLabel', descKey: 'admin.flagAiDesc', defaultOn: true },
  { key: 'registrationOpen', labelKey: 'admin.flagRegistrationLabel', descKey: 'admin.flagRegistrationDesc', defaultOn: true },
  { key: 'stravaForAll', labelKey: 'admin.flagStravaLabel', descKey: 'admin.flagStravaDesc', defaultOn: false },
];

const FLAGS_DOC = doc(db, 'config', 'feature_flags');

export const AdminFeatureFlagsCard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getDoc(FLAGS_DOC)
      .then((snap) => setFlags((snap.data() as Record<string, boolean>) || {}))
      .catch(() => setFlags({}))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string, value: boolean) => {
    setSaving(key);
    try {
      await setDoc(FLAGS_DOC, { [key]: value }, { merge: true });
      setFlags((prev) => ({ ...prev, [key]: value }));
    } catch (e) {
      toast({
        title: t('admin.errorTitle'),
        description: e instanceof Error ? e.message : t('admin.flagSaveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase tracking-tight">
          <Flag className="h-4 w-4 text-primary" /> {t('admin.flagsTitle')}
        </CardTitle>
        <CardDescription>{t('admin.flagsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          FLAGS.map((f) => {
            const value = flags[f.key] ?? f.defaultOn;
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(f.labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(f.descKey)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving === f.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={value}
                    onCheckedChange={(v) => toggle(f.key, v)}
                    aria-label={t(f.labelKey)}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
