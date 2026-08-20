import { parseLocalDate } from '@/lib/utils';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import { formatTonnage, type UnitSystem } from '@/lib/units';
import { getCurrentAccent } from '@/lib/accent-theme';
import appIcon from '@/assets/app-icon.png';

export interface ShareData {
  dayName: string;
  date: string;
  exercises: { name: string; sets: string }[];
  tonnage: number;
  duration: string;
  prs: string[];
  streak: number;
  /** Odhaczone serie robocze (szablon story, Runna p.1). */
  completedSets?: number;
  /** Postęp planu do paska "Tydzień N z M" (szablon story). Brak/null = bez paska. */
  week?: { current: number; total: number } | null;
}

// Z180: szablony obrazu podsumowania. 'photo' wymaga zdjęcia usera.
// 'story' (Runna p.1, spec A4): layout wg raportu cz. 2 sekcja 3.2.
export type ShareTemplate = 'gradient' | 'photo' | 'minimal' | 'story';

/** Hero-statystyka szablonu story wybierana przez usera (spec A4). */
export type ShareHero = 'tonnage' | 'pr' | 'duration';

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
    `<div style="font-size:14px;margin-bottom:4px;"><span style="font-weight:800;letter-spacing:0.08em;">PR</span> · ${escapeHtml(pr)}</div>`
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
          <div style="font-size:28px;font-weight:700;">${escapeHtml(data.duration || '—')}</div>
          <div style="font-size:12px;color:#94a3b8;">${escapeHtml(translate(lang, 'share.duration'))}</div>
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

// Runna p.1 (spec A4): szablon story wg raportu cz. 2 sekcja 3.2 — prawie-czerń
// z glow limonki, glass panel 24 px, JEDNA hero-statystyka wybierana przez
// usera (ogromne cyfry w limonce), rząd 3 mniejszych liczb, pasek "Tydzień
// N z M", brand strengthsave.app. Brzeg: hero 'pr' bez rekordów i 'duration'
// bez czasu degradują do tonażu.
const LIME = '#cefc22';

export function buildShareHtmlStory(
  data: ShareData,
  lang: LanguageCode,
  unit: UnitSystem,
  hero: ShareHero = 'tonnage',
  // F-T2: kolor przewodni usera (domyślnie limonka marki).
  accentHex: string = LIME,
): string {
  const accentRgb = (() => {
    const m = /^#?([0-9a-f]{6})$/i.exec(accentHex);
    if (!m) return '206,252,34';
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  })();
  const safeDayName = escapeHtml(data.dayName);
  // E-T2: bez weekday — dayName z planu to często "Czwartek", a data z weekday
  // dawała "Czwartek, czwartek, 20 sierpnia" (screenshot z buildu 107).
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString(dateLocale(lang), {
      day: 'numeric', month: 'long',
    })
  );
  const tonnageStr = escapeHtml(formatTonnage(data.tonnage, unit));

  const effectiveHero: ShareHero =
    (hero === 'pr' && data.prs.length === 0) || (hero === 'duration' && !data.duration)
      ? 'tonnage'
      : hero;

  const heroBlock = (() => {
    if (effectiveHero === 'pr') {
      return `
        <div style="display:inline-block;background:${accentHex};color:#0b0b0f;border-radius:999px;padding:4px 14px;font-size:13px;font-weight:800;letter-spacing:1px;">PR</div>
        <div style="font-size:34px;font-weight:800;color:${accentHex};margin-top:12px;line-height:1.2;">${escapeHtml(data.prs[0])}</div>`;
    }
    if (effectiveHero === 'duration') {
      return `
        <div style="font-size:68px;font-weight:800;color:${accentHex};letter-spacing:-2px;line-height:1;">${escapeHtml(data.duration)}</div>
        <div style="font-size:13px;color:#8b93a1;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.duration'))}</div>`;
    }
    return `
      <div style="font-size:68px;font-weight:800;color:${accentHex};letter-spacing:-2px;line-height:1;">${tonnageStr}</div>
      <div style="font-size:13px;color:#8b93a1;margin-top:10px;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(translate(lang, 'share.tonnage'))}</div>`;
  })();

  const statCell = (value: string, label: string, border: boolean): string => `
    <div style="flex:1;text-align:center;${border ? 'border-left:1px solid rgba(255,255,255,0.12);' : ''}">
      <div style="font-size:22px;font-weight:700;color:#fff;">${value}</div>
      <div style="font-size:11px;color:#8b93a1;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">${label}</div>
    </div>`;

  const weekBar = data.week && data.week.total > 0
    ? `
      <div style="margin-top:26px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#8b93a1;margin-bottom:6px;">
          <span>${escapeHtml(translate(lang, 'share.weekProgress', { current: data.week.current, total: data.week.total }))}</span>
        </div>
        <div style="height:6px;border-radius:999px;background:rgba(255,255,255,0.12);overflow:hidden;">
          <div style="height:100%;width:${Math.max(0, Math.min(100, Math.round((data.week.current / data.week.total) * 100)))}%;background:${accentHex};"></div>
        </div>
      </div>`
    : '';

  return `
    <div style="
      width:540px;height:960px;position:relative;overflow:hidden;
      background:#07080a;color:#fff;font-family:system-ui,-apple-system,sans-serif;
    ">
      <div style="position:absolute;top:-160px;right:-160px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle, rgba(${accentRgb},0.22) 0%, rgba(${accentRgb},0) 70%);"></div>
      <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;padding:88px 32px;">
        <div style="
          background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
          border-radius:24px;padding:30px 28px;display:flex;flex-direction:column;margin:auto 0;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${appIcon}" style="width:22px;height:22px;border-radius:5px;opacity:0.85;" />
              <span style="font-size:12px;color:#8b93a1;">Strength Save</span>
            </div>
            <span style="font-size:12px;color:#8b93a1;">${safeDayName}, ${safeDate}</span>
          </div>

          <div style="text-align:center;margin:44px 0;">
            ${heroBlock}
          </div>

          <div style="display:flex;">
            ${(() => {
              // E-T2: rząd statystyk UZUPEŁNIA hero — tonaż i czas są zawsze
              // widoczne razem (hero pokazuje jedno, rząd resztę).
              const cells = effectiveHero === 'duration'
                ? [
                  [tonnageStr, translate(lang, 'share.tonnage')],
                  [String(data.completedSets ?? 0), translate(lang, 'share.sets')],
                  [String(data.exercises.length), translate(lang, 'share.exercises')],
                ]
                : effectiveHero === 'pr'
                  ? [
                    [tonnageStr, translate(lang, 'share.tonnage')],
                    [escapeHtml(data.duration || '—'), translate(lang, 'share.duration')],
                    [String(data.exercises.length), translate(lang, 'share.exercises')],
                  ]
                  : [
                    [escapeHtml(data.duration || '—'), translate(lang, 'share.duration')],
                    [String(data.completedSets ?? 0), translate(lang, 'share.sets')],
                    [String(data.exercises.length), translate(lang, 'share.exercises')],
                  ];
              return cells.map(([value, label], i) => statCell(value, escapeHtml(label), i > 0)).join('');
            })()}
          </div>

          ${(() => {
            // E-T2: lista ćwiczeń wypełnia ramę treścią (max 3, jak photo).
            if (data.exercises.length === 0) return '';
            const rows = data.exercises.slice(0, 3).map(ex => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:13px;color:#e2e8f0;">${escapeHtml(ex.name)}</span>
              <span style="font-size:13px;color:#8b93a1;">${escapeHtml(ex.sets)}</span>
            </div>`).join('');
            const more = data.exercises.length > 3
              ? `<div style="font-size:12px;color:#8b93a1;padding-top:7px;">${escapeHtml(translate(lang, 'share.more', { n: data.exercises.length - 3 }))}</div>`
              : '';
            return `<div style="margin-top:26px;">${rows}${more}</div>`;
          })()}

          ${weekBar}
        </div>

        <div style="text-align:center;font-size:12px;color:#8b93a1;letter-spacing:1px;">strengthsave.app</div>
      </div>
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
        <div style="display:flex;justify-content:center;gap:24px;margin-top:36px;font-size:15px;color:#cbd5e1;">
          <span>${escapeHtml(data.duration || '—')} · ${escapeHtml(translate(lang, 'share.duration'))}</span>
          <span>${data.exercises.length} · ${escapeHtml(translate(lang, 'share.exercises'))}</span>
          <span>${data.prs.length} · ${escapeHtml(translate(lang, 'share.newPRs'))}</span>
        </div>
      </div>

      ${renderFooter(true)}
    </div>
  `;
}

// Z197: układ photo = nagłówek u góry, JEDEN spacer flex:1, cała treść
// (statystyki + lista + stopka) sklejona w dolnej ~1/3 — dwa auto-marginesy
// (nagłówek + stopka) dzieliły wolną przestrzeń po równo i centrowały liczby
// dokładnie na wysokości twarzy na selfie. Scrim strefowy: przezroczysty do
// ~45% wysokości, ciemny pas dopiero pod tekstem.
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
    `<span style="background:rgba(245,158,11,0.3);border:1px solid rgba(245,158,11,0.5);border-radius:6px;padding:2px 8px;font-size:11px;white-space:nowrap;"><span style="font-weight:800;">PR</span> · ${escapeHtml(pr)}</span>`
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
        <div style="flex:1"></div>

        ${(() => {
          // E-T2: tonaż I czas zawsze razem; zero PR-ów nie jest chwałą — wtedy serie.
          const glass = 'background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:12px 8px;text-align:center;border:1px solid rgba(255,255,255,0.1);';
          const cell = (value: string, label: string): string => `
          <div style="${glass}">
            <div style="font-size:21px;font-weight:700;white-space:nowrap;">${value}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">${label}</div>
          </div>`;
          const lastCell = data.prs.length > 0
            ? cell(String(data.prs.length), escapeHtml(translate(lang, 'share.prs')))
            : cell(String(data.completedSets ?? 0), escapeHtml(translate(lang, 'share.sets')));
          return `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin:24px 0;">
          ${cell(tonnageStr, escapeHtml(translate(lang, 'share.tonnage')))}
          ${cell(escapeHtml(data.duration || '—'), escapeHtml(translate(lang, 'share.duration')))}
          ${cell(String(data.exercises.length), escapeHtml(translate(lang, 'share.exercises')))}
          ${lastCell}
        </div>`;
        })()}

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
  hero: ShareHero = 'tonnage',
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
    : template === 'story'
      ? buildShareHtmlStory(data, lang, unit, hero, getCurrentAccent().hex)
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
