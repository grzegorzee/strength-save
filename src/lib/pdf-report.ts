import { aggregateMonthlyStats, formatDurationHM, type MonthlyStat } from '@/lib/monthly-stats';
import { formatTonnage, type UnitSystem } from '@/lib/units';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import { parseLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

// M20: raport treningowy PDF. Strategia bez wbudowywania fontów TTF: raport
// renderowany jako HTML (pełne polskie znaki z fontów przeglądarki), zdjęty
// przez html2canvas i osadzony w jsPDF jako obraz A4. jsPDF + html2canvas są
// ładowane dynamicznie (lazy chunk) — nie obciążają initial bundle.

export interface TrainingReportModel {
  monthly: MonthlyStat[];
  totals: {
    workoutCount: number;
    workoutsWithDuration: number;
    totalDurationSec: number;
    totalTonnageKg: number;
  };
}

export const buildTrainingReportModel = (
  workouts: WorkoutSession[],
  now: Date,
): TrainingReportModel => {
  const monthly = aggregateMonthlyStats(workouts, 12, now);
  const totals = monthly.reduce(
    (acc, month) => ({
      workoutCount: acc.workoutCount + month.workoutCount,
      workoutsWithDuration: acc.workoutsWithDuration + month.workoutsWithDuration,
      totalDurationSec: acc.totalDurationSec + month.totalDurationSec,
      totalTonnageKg: acc.totalTonnageKg + month.totalTonnageKg,
    }),
    { workoutCount: 0, workoutsWithDuration: 0, totalDurationSec: 0, totalTonnageKg: 0 },
  );
  return { monthly, totals };
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] as string));

const monthLabel = (monthKey: string, lang: LanguageCode): string => {
  const label = parseLocalDate(`${monthKey}-01`)
    .toLocaleDateString(dateLocale(lang), { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// Dokument jest drukowany: jasne tło, czarny tekst, akcent lime tylko w nagłówku.
export const buildReportHtml = (
  model: TrainingReportModel,
  lang: LanguageCode,
  unit: UnitSystem,
  displayName: string,
  generatedAt: Date,
): string => {
  const tr = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(lang, key, params);
  const rows = model.monthly.map((month) => {
    const missing = month.workoutCount - month.workoutsWithDuration;
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${escapeHtml(monthLabel(month.monthKey, lang))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${month.workoutCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatDurationHM(month.totalDurationSec)}${missing > 0 ? `<div style="font-size:9px;color:#777;">${escapeHtml(tr('analytics.months.noTime', { n: missing }))}</div>` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${escapeHtml(formatTonnage(month.totalTonnageKg, unit))}</td>
      </tr>`;
  }).join('');

  return `
  <div style="width:794px;background:#ffffff;color:#111111;font-family:'Inter',-apple-system,sans-serif;padding:48px;box-sizing:border-box;">
    <div style="border-left:6px solid #cefc22;padding-left:16px;margin-bottom:8px;">
      <div style="font-size:26px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(tr('report.title'))}</div>
      <div style="font-size:12px;color:#555;">Strength Save · ${escapeHtml(displayName)} · ${escapeHtml(generatedAt.toLocaleDateString(dateLocale(lang)))}</div>
    </div>
    <div style="display:flex;gap:24px;margin:24px 0;">
      <div><div style="font-size:22px;font-weight:700;">${model.totals.workoutCount}</div><div style="font-size:11px;color:#555;">${escapeHtml(tr('report.totalWorkouts'))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${formatDurationHM(model.totals.totalDurationSec)}</div><div style="font-size:11px;color:#555;">${escapeHtml(tr('report.totalTime'))}</div></div>
      <div><div style="font-size:22px;font-weight:700;">${escapeHtml(formatTonnage(model.totals.totalTonnageKg, unit))}</div><div style="font-size:11px;color:#555;">${escapeHtml(tr('report.totalTonnage'))}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:8px 12px;border-bottom:2px solid #111;">${escapeHtml(tr('analytics.months.title'))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${escapeHtml(tr('report.colWorkouts'))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${escapeHtml(tr('report.colTime'))}</th>
          <th style="padding:8px 12px;border-bottom:2px solid #111;text-align:right;">${escapeHtml(tr('report.colTonnage'))}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
};

// Render HTML poza ekranem -> canvas -> strony A4 w jsPDF. Zwraca Blob PDF.
export const generateTrainingReportPdf = async (
  model: TrainingReportModel,
  lang: LanguageCode,
  unit: UnitSystem,
  displayName: string,
  generatedAt: Date,
): Promise<Blob> => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;';
  // Wzorzec share-utils: każdy tekst wejściowy przechodzi przez escapeHtml,
  // liczby są interpolowane jako number — brak nieescapowanego wejścia usera.
  container.innerHTML = buildReportHtml(model, lang, unit, displayName, generatedAt);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageHeightPx = Math.floor((canvas.width / pageWidth) * pageHeight);

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL('image/png'),
        'PNG',
        0,
        0,
        pageWidth,
        (sliceHeight / canvas.width) * pageWidth,
      );
      offsetY += sliceHeight;
      pageIndex += 1;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};
