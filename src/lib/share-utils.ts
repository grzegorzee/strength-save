import html2canvas from 'html2canvas-pro';
import { parseLocalDate } from '@/lib/utils';

export interface ShareData {
  dayName: string;
  date: string;
  exercises: { name: string; sets: string }[];
  tonnage: number;
  duration: string;
  prs: string[];
  streak: number;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildShareHtml(data: ShareData): string {
  const safeDayName = escapeHtml(data.dayName);
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString('pl-PL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );
  const tonnageStr = (data.tonnage / 1000).toFixed(1);

  const exerciseRows = data.exercises.slice(0, 6).map(ex => {
    const safeName = escapeHtml(ex.name);
    const safeSets = escapeHtml(ex.sets);
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <span style="font-size:14px;">${safeName}</span>
      <span style="font-size:14px;color:#94a3b8;">${safeSets}</span>
    </div>`;
  }).join('');

  const moreText = data.exercises.length > 6
    ? `<div style="font-size:13px;color:#94a3b8;padding-top:8px;">+${data.exercises.length - 6} więcej...</div>`
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
        <div style="font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">Trening ukończony</div>
        <div style="font-size:32px;font-weight:800;margin-top:8px;">${safeDayName}</div>
        <div style="font-size:16px;color:#94a3b8;margin-top:4px;">${safeDate}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${tonnageStr}t</div>
          <div style="font-size:12px;color:#94a3b8;">Tonaż</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.exercises.length}</div>
          <div style="font-size:12px;color:#94a3b8;">Ćwiczeń</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.streak}</div>
          <div style="font-size:12px;color:#94a3b8;">Seria (tyg.)</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${data.prs.length}</div>
          <div style="font-size:12px;color:#94a3b8;">Nowe PRy</div>
        </div>
      </div>

      <div style="margin-bottom:auto;">
        ${exerciseRows}
        ${moreText}
      </div>

      ${prSection}

      <div style="margin-top:auto;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:#94a3b8;">Strength Save</span>
        <span style="font-size:13px;color:#94a3b8;">💪</span>
      </div>
    </div>
  `;
}

function buildShareHtmlWithPhoto(data: ShareData, photoDataUrl: string): string {
  const safeDayName = escapeHtml(data.dayName);
  const safeDate = escapeHtml(
    parseLocalDate(data.date).toLocaleDateString('pl-PL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );
  const tonnageStr = (data.tonnage / 1000).toFixed(1);

  const exerciseRows = data.exercises.slice(0, 4).map(ex => {
    const safeName = escapeHtml(ex.name);
    const safeSets = escapeHtml(ex.sets);
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
      <span style="font-size:13px;">${safeName}</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.7);">${safeSets}</span>
    </div>`;
  }).join('');

  const moreText = data.exercises.length > 4
    ? `<div style="font-size:12px;color:rgba(255,255,255,0.6);padding-top:6px;">+${data.exercises.length - 4} więcej...</div>`
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
        object-fit:cover;filter:brightness(0.4);
      " />
      <div style="
        position:absolute;top:0;left:0;width:100%;height:100%;
        background:linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%);
      "></div>
      <div style="
        position:relative;z-index:1;
        padding:48px 36px;display:flex;flex-direction:column;height:100%;
      ">
        <div style="margin-bottom:auto;">
          <div style="font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">Trening ukończony</div>
          <div style="font-size:32px;font-weight:800;margin-top:8px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">${safeDayName}</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-top:4px;">${safeDate}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:24px 0;">
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${tonnageStr}t</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">Tonaż</div>
          </div>
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${data.exercises.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">Ćwiczeń</div>
          </div>
          <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:26px;font-weight:700;">${data.prs.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">PRy</div>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.3);backdrop-filter:blur(8px);border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.1);">
          ${exerciseRows}
          ${moreText}
        </div>

        ${prBadges ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">${prBadges}</div>` : ''}

        <div style="margin-top:auto;padding-top:20px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:700;">SS</span>
            </div>
            <span style="font-size:12px;color:rgba(255,255,255,0.5);">Strength Save</span>
          </div>
          <span style="font-size:20px;">💪</span>
        </div>
      </div>
    </div>
  `;
}

export async function generateWorkoutImage(data: ShareData, photoDataUrl?: string): Promise<Blob> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;';
  // All user-provided text is escaped via escapeHtml; photoDataUrl is a base64 data URI from FileReader
  container.innerHTML = photoDataUrl
    ? buildShareHtmlWithPhoto(data, photoDataUrl)
    : buildShareHtml(data);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/png',
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}
