import html2canvas from 'html2canvas-pro';

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
    new Date(data.date).toLocaleDateString('pl-PL', {
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

export async function generateWorkoutImage(data: ShareData): Promise<Blob> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;';
  // All data is escaped via escapeHtml before insertion
  container.innerHTML = buildShareHtml(data);

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
