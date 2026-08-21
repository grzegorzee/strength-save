import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Share2, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { hapticSuccess } from '@/lib/haptics';
import { useTranslation } from '@/contexts/LanguageContext';
import { getCurrentAccent } from '@/lib/accent-theme';
import { formatLocalDateLabel } from '@/lib/utils';
import { workoutDurationSec } from '@/lib/monthly-stats';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import appIcon from '@/assets/app-icon.png';

// WP-PLANS-2 (X27, Task O4): karta podsumowania cyklu do udostępnienia.
// Mechanizm DOKŁADNIE wzorem share'a treningu (ShareWorkoutDialog/share-utils):
// html2canvas-pro lazy, navigator.share z fallbackiem pobrania, zero nowych
// zależności i zewnętrznych hostów. Format 4:5 (540x675 @scale 2 = 1080x1350).

/**
 * Łączny czas na siłowni w cyklu: suma czasu ukończonych sesji cyklu
 * (durationSec, fallback ze znaczników jak w Analityce; brak czasu = 0).
 * Sesje cyklu = tagowane cycleId LUB nietagowane w zakresie dat cyklu
 * (stare sesje sprzed tagowania) — spójnie z computeCycleStats.
 */
export const computeCycleTimeAtGymSec = (
  workouts: WorkoutSession[],
  cycle: Pick<PlanCycle, 'id' | 'startDate' | 'endDate'>,
): number => {
  const rangeEnd = cycle.endDate || '9999-12-31';
  return workouts.reduce((total, workout) => {
    if (!workout.completed) return total;
    const inCycle = workout.cycleId
      ? workout.cycleId === cycle.id
      : workout.date >= cycle.startDate && workout.date <= rangeEnd;
    if (!inCycle) return total;
    return total + (workoutDurationSec(workout) ?? 0);
  }, 0);
};

export interface CycleShareData {
  /** Nazwa planu (training_plans.name); null = bez wiersza nazwy. */
  planName: string | null;
  startDate: string;
  endDate: string;
  /** Gotowe etykiety (formatowanie jednostek robi caller przez useUnit). */
  workoutsLabel: string;
  tonnageLabel: string;
  attendanceLabel: string;
  prCount: number;
  timeLabel: string;
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export function buildCycleShareHtml(
  data: CycleShareData,
  lang: LanguageCode,
  accentHex: string,
): string {
  const fmtDate = (iso: string) =>
    formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  const range = `${fmtDate(data.startDate)} · ${fmtDate(data.endDate)}`;

  const statCell = (value: string, label: string): string => `
    <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 12px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#fff;">${value}</div>
      <div style="font-size:10px;color:#8b93a1;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">${label}</div>
    </div>`;

  return `
    <div style="
      width:540px;height:675px;position:relative;overflow:hidden;
      background:#07080a;color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:36px 32px;display:flex;flex-direction:column;
    ">
      <div style="position:absolute;top:-140px;right:-140px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%);"></div>
      <div style="position:relative;z-index:1;display:flex;align-items:center;gap:8px;">
        <img src="${appIcon}" style="width:24px;height:24px;border-radius:6px;" />
        <span style="font-size:13px;color:#8b93a1;">Strength Save</span>
      </div>
      <div style="position:relative;z-index:1;margin-top:26px;">
        <div style="font-size:12px;color:${accentHex};text-transform:uppercase;letter-spacing:2px;font-weight:700;">${escapeHtml(translate(lang, 'newplan.closeout.kicker'))}</div>
        <div style="font-size:30px;font-weight:800;margin-top:6px;line-height:1.15;">${escapeHtml(data.planName || translate(lang, 'newplan.closeout.title'))}</div>
        <div style="font-size:13px;color:#8b93a1;margin-top:6px;">${escapeHtml(range)}</div>
      </div>
      <div style="position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:26px;">
        ${statCell(escapeHtml(data.workoutsLabel), escapeHtml(translate(lang, 'newplan.closeout.workouts')))}
        ${statCell(escapeHtml(data.tonnageLabel), escapeHtml(translate(lang, 'newplan.closeout.tonnage')))}
        ${statCell(escapeHtml(data.attendanceLabel), escapeHtml(translate(lang, 'newplan.closeout.attendance')))}
        ${statCell(String(data.prCount), escapeHtml(translate(lang, 'newplan.closeout.prs')))}
      </div>
      <div style="position:relative;z-index:1;margin-top:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px;text-align:center;">
        <div style="font-size:34px;font-weight:800;color:${accentHex};letter-spacing:-1px;">${escapeHtml(data.timeLabel)}</div>
        <div style="font-size:10px;color:#8b93a1;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(translate(lang, 'cycles.timeAtGym'))}</div>
      </div>
      <div style="position:relative;z-index:1;margin-top:auto;text-align:center;font-size:12px;color:#8b93a1;letter-spacing:1px;">strengthsave.app</div>
    </div>
  `;
}

export async function generateCycleShareImage(
  data: CycleShareData,
  lang: LanguageCode,
): Promise<Blob> {
  // Lazy import jak w share-utils — html2canvas-pro ładuje się przy pierwszym share.
  const { default: html2canvas } = await import('html2canvas-pro');

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:675px;';
  container.innerHTML = buildCycleShareHtml(data, lang, getCurrentAccent().hex);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#07080a',
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        0.85,
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

interface CycleShareDialogProps {
  data: CycleShareData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CycleShareDialog = ({ data, open, onOpenChange }: CycleShareDialogProps) => {
  const { t, lang } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAction, setSavedAction] = useState<'download' | 'share' | null>(null);

  useEffect(() => {
    if (!open) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      setBlob(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsGenerating(true);
    setError(null);
    generateCycleShareImage(data, lang)
      .then((result) => {
        if (cancelled) return;
        setBlob(result);
        setImageUrl(URL.createObjectURL(result));
      })
      .catch(() => { if (!cancelled) setError(t('comp.share.generateError')); })
      .finally(() => { if (!cancelled) setIsGenerating(false); });
    return () => { cancelled = true; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareFile = (): File | null =>
    blob ? new File([blob], `cykl-${data.startDate}.jpg`, { type: 'image/jpeg' }) : null;

  // Wzorzec Z198 (ShareWorkoutDialog): AbortError to nie błąd, zero fałszywego sukcesu.
  const systemShare = async (file: File): Promise<boolean> => {
    try {
      await navigator.share({ title: t('cycles.shareSummary'), files: [file] });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return false;
      setError(t('comp.share.generateError'));
      return false;
    }
  };

  const markSaved = (action: 'download' | 'share') => {
    setSavedAction(action);
    void hapticSuccess();
    window.setTimeout(() => setSavedAction(null), 1800);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    const file = shareFile();
    // Z179: WKWebView ignoruje <a download> — natywnie przez share sheet.
    if (Capacitor.isNativePlatform() && file && navigator.canShare?.({ files: [file] })) {
      if (await systemShare(file)) markSaved('download');
      return;
    }
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `cykl-${data.startDate}.jpg`;
    a.click();
    markSaved('download');
  };

  const handleShare = async () => {
    const file = shareFile();
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      if (await systemShare(file)) markSaved('share');
    } else {
      await handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('cycles.shareSummary')}</DialogTitle>
          <DialogDescription>{t('comp.share.subtitle')}</DialogDescription>
        </DialogHeader>

        {isGenerating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}

        {imageUrl && !isGenerating && (
          <div className="space-y-4">
            <img
              src={imageUrl}
              alt={t('comp.share.imageAlt')}
              className="mx-auto max-h-[42vh] w-auto rounded-lg border"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                {savedAction === 'download' ? (
                  <Check className="h-4 w-4 mr-2 text-fitness-success" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {savedAction === 'download' ? t('comp.share.saved') : t('comp.share.download')}
              </Button>
              <Button className="flex-1" onClick={handleShare}>
                {savedAction === 'share' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {savedAction === 'share' ? t('comp.share.saved') : t('comp.share.share')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
