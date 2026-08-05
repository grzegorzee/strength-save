import { parseLocalDate } from '@/lib/utils';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import { formatTonnage, type UnitSystem } from '@/lib/units';
import appIcon from '@/assets/app-icon.png';

export interface ShareData {
  dayName: string;
  date: string;
  exercises: { name: string; sets: string }[];
  tonnage: number;
  duration: string;
  prs: string[];
  streak: number;
}

// Z180: trzy szablony obrazu podsumowania. 'photo' wymaga zdjęcia usera.
export type ShareTemplate = 'gradient' | 'photo' | 'minimal';

// Z179: maksymalne wymiary zdjęcia usera (format IG Story przy scale 2).
const SHARE_PHOTO_MAX = { width: 1080, height: 1920 };

/**
 * Z179: zdjęcie z aparatu (12 MP) bez downscale to kilka kopii base64 w pamięci
 * WKWebView (FileReader + innerHTML + html2canvas) → crash "Dodaj zdjęcie".
 * Zwraca JPEG dataURL o wymiarach ≤1080×1920 (proporcje zachowane).
 */
export async function downscalePhoto(file: Blob): Promise<string> {
  const draw = (w: number, h: number, source: CanvasImageSource): string => {
    const scale = Math.min(1, SHARE_PHOTO_MAX.width / w, SHARE_PHOTO_MAX.height / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas-2d-unavailable');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  if (typeof createImageBitmap === 'function') {
    // from-image: EXIF decyduje o orientacji — zdjęcie z aparatu nie leży na boku.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      return draw(bitmap.width, bitmap.height, bitmap);
    } finally {
      bitmap.close();
    }
  }

  // Fallback (Safari < 16.4 / brak opcji): dekodowanie przez <img>.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return draw(img.naturalWidth, img.naturalHeight, img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Z180: wspólna stopka z realnym logo (import z bundla) zamiast tekstowego "SS".
function renderFooter(withTopBorder: boolean): string {
  return `
      <div style="margin-top:auto;padding-top:20px;${withTopBorder ? 'border-top:1px solid rgba(255,255,255,0.1);' : ''}display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${appIcon}" style="width:28px;height:28px;border-radius:6px;" />
          <span style="font-size:13px;color:#94a3b8;">Strength Save</span>
        </div>
        <span style="font-size:20px;">💪</span>
      </div>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function buildShareHtml(
  data: ShareData,
  lang: LanguageCode,
  unit: UnitSystem,
  template: Exclude<ShareTemplate, 'photo'> = 'gradient',
): string {
  if (template === 'minimal') return buildShareHtmlMinimal(data, lang, unit);
  const safeDayName = escapeHtml(data.dayName);
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString(dateLocale(lang), {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );
  const tonnageStr = formatTonnage(data.tonnage, unit);

  const exerciseRows = data.exercises.slice(0, 6).map(ex => {
    const safeName = escapeHtml(ex.name);
    const safeSets = escapeHtml(ex.sets);
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <span style="font-size:14px;">${safeName}</span>
      <span style="font-size:14px;color:#94a3b8;">${safeSets}</span>
    </div>`;
  }).join('');

  const moreText = data.exercises.length > 6
    ? `<div style="font-size:13px;color:#94a3b8;padding-top:8px;">${escapeHtml(translate(lang, 'share.more', { n: data.exercises.length - 6 }))}</div>`
    : '';

  const prRows = data.prs.map(pr =>
    `<div style="font-size:14px;margin-bottom:4px;">🏆 ${escapeHtml(pr)}</div>`
  ).join('');

  const prSection = data.prs.length > 0
    ? `<div style="margin-top:16px;">${prRows}</div>`
    : '';

  return `
    <div style="
      width:540px;height:960px;
      background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:48px 36px;display:flex;flex-direction:column;
    ">
      <div style="margin-bottom:auto;">
        <div style="font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.workoutDone'))}</div>
        <div style="font-size:32px;font-weight:800;margin-top:8px;">${safeDayName}</div>
        <div style="font-size:16px;color:#94a3b8;margin-top:4px;">${safeDate}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${tonnageStr}</div>
          <div style="font-size:12px;color:#94a3b8;">${escapeHtml(translate(lang, 'share.tonnage'))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.exercises.length}</div>
          <div style="font-size:12px;color:#94a3b8;">${escapeHtml(translate(lang, 'share.exercises'))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.streak}</div>
          <div style="font-size:12px;color:#94a3b8;">${escapeHtml(translate(lang, 'share.streakWeeks'))}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.prs.length}</div>
          <div style="font-size:12px;color:#94a3b8;">${escapeHtml(translate(lang, 'share.newPRs'))}</div>
        </div>
      </div>

      <div style="margin-bottom:auto;">
        ${exerciseRows}
        ${moreText}
      </div>

      ${prSection}

      ${renderFooter(true)}
    </div>
  `;
}

// Z180: wariant minimal — ciemne tło, duży tonaż, logo. Bez nowej logiki danych.
function buildShareHtmlMinimal(data: ShareData, lang: LanguageCode, unit: UnitSystem): string {
  const safeDayName = escapeHtml(data.dayName);
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString(dateLocale(lang), {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );
  const tonnageStr = formatTonnage(data.tonnage, unit);

  return `
    <div style="
      width:540px;height:960px;
      background:#0b0b0f;
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      padding:48px 36px;display:flex;flex-direction:column;
    ">
      <div>
        <div style="font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.workoutDone'))}</div>
        <div style="font-size:30px;font-weight:800;margin-top:8px;">${safeDayName}</div>
        <div style="font-size:15px;color:#94a3b8;margin-top:4px;">${safeDate}</div>
      </div>

      <div style="margin:auto 0;text-align:center;">
        <div style="font-size:76px;font-weight:800;letter-spacing:-2px;line-height:1;">${tonnageStr}</div>
        <div style="font-size:14px;color:#94a3b8;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.tonnage'))}</div>
        <div style="display:flex;justify-content:center;gap:28px;margin-top:36px;font-size:15px;color:#cbd5e1;">
          <span>${data.exercises.length} · ${escapeHtml(translate(lang, 'share.exercises'))}</span>
          <span>${data.prs.length} · ${escapeHtml(translate(lang, 'share.newPRs'))}</span>
          <span>${data.streak} · ${escapeHtml(translate(lang, 'share.streakWeeks'))}</span>
        </div>
      </div>

      ${renderFooter(true)}
    </div>
  `;
}

export function buildShareHtmlWithPhoto(
  data: ShareData,
  photoDataUrl: string,
  lang: LanguageCode,
  unit: UnitSystem,
  // Z197: 0.6 dawało brightness(0.40) na CAŁYM zdjęciu — twarz była zabita,
  // a tekst i tak leży na ciemnym pasie scrimu. 0.35 = brightness(0.65).
  dim = 0.35,
): string {
  const safeDayName = escapeHtml(data.dayName);
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString(dateLocale(lang), {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );
  const tonnageStr = formatTonnage(data.tonnage, unit);

  // Z197: max 3 pozycje — dolny pas z treścią nie może urosnąć ponad 1/3 wysokości.
  const exerciseRows = data.exercises.slice(0, 3).map(ex => {
    const safeName = escapeHtml(ex.name);
    const safeSets = escapeHtml(ex.sets);
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
      <span style="font-size:13px;">${safeName}</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.7);">${safeSets}</span>
    </div>`;
  }).join('');

  const moreText = data.exercises.length > 3
    ? `<div style="font-size:12px;color:rgba(255,255,255,0.6);padding-top:6px;">${escapeHtml(translate(lang, 'share.more', { n: data.exercises.length - 3 }))}</div>`
    : '';

  const prBadges = data.prs.slice(0, 3).map(pr =>
    `<span style="background:rgba(245,158,11,0.3);border:1px solid rgba(245,158,11,0.5);border-radius:6px;padding:2px 8px;font-size:11px;white-space:nowrap;">🏆 ${escapeHtml(pr)}</span>`
  ).join(' ');

  return `
    <div style="
      width:540px;height:960px;
      position:relative;
      color:#fff;font-family:system-ui,-apple-system,sans-serif;
      overflow:hidden;
    ">
      <img src="${photoDataUrl}" style="
        position:absolute;top:0;left:0;width:100%;height:100%;
        object-fit:cover;filter:brightness(${(1 - Math.min(0.7, Math.max(0.3, dim))).toFixed(2)});
      " />
      <div style="
        position:absolute;top:0;left:0;width:100%;height:100%;
        background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.75) 68%, rgba(0,0,0,0.92) 100%);
      "></div>
      <div style="
        position:relative;z-index:1;
        padding:48px 36px;display:flex;flex-direction:column;height:100%;
      ">
        <div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.workoutDone'))}</div>
          <div style="font-size:32px;font-weight:800;margin-top:8px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">${safeDayName}</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-top:4px;">${safeDate}</div>
        </div>
        <!-- Z197: JEDEN spacer — cała treść (statystyki + lista) klei się do dołu,
             pas ~dolna 1/3, twarz na selfie zostaje czysta. Dwa auto-marginesy
             (nagłówek + stopka) dzieliły wolną przestrzeń po równo i centrowały
             liczby dokładnie na wysokości twarzy. -->
        <div style="flex:1"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:24px 0;">
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${tonnageStr}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">${escapeHtml(translate(lang, 'share.tonnage'))}</div>
          </div>
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${data.exercises.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">${escapeHtml(translate(lang, 'share.exercises'))}</div>
          </div>
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${data.prs.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">${escapeHtml(translate(lang, 'share.prs'))}</div>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.3);backdrop-filter:blur(8px);border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.1);">
          ${exerciseRows}
          ${moreText}
        </div>

        ${prBadges ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">${prBadges}</div>` : ''}

        ${renderFooter(false)}
      </div>
    </div>
  `;
}

export async function generateWorkoutImage(
  data: ShareData,
  photoDataUrl?: string,
  lang: LanguageCode = 'pl',
  unit: UnitSystem = 'kg',
  template: ShareTemplate = 'gradient',
): Promise<Blob> {
  // Z179: lazy import — html2canvas-pro (~150 KB) schodzi z chunka WorkoutDay,
  // ładuje się dopiero przy pierwszym otwarciu dialogu share.
  const { default: html2canvas } = await import('html2canvas-pro');

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;';
  // All user-provided text is escaped via escapeHtml; photoDataUrl is a base64 data URI (downscalePhoto)
  const usePhoto = template === 'photo' && photoDataUrl;
  container.innerHTML = usePhoto
    ? buildShareHtmlWithPhoto(data, photoDataUrl, lang, unit)
    : buildShareHtml(data, lang, unit, template === 'minimal' ? 'minimal' : 'gradient');

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      // Z179: JPEG nie ma kanału alfa — bez tła piksele przezroczyste robią
      // czarne artefakty. Tło spójne z gradientem apki.
      backgroundColor: '#0f172a',
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
