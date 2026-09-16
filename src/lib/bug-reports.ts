import { Capacitor } from '@capacitor/core';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { callProtectedFunction } from '@/lib/protected-callable';
import { sanitizeBugReportScreenshot } from '@/lib/bug-report-screenshot';
import type { BugReportCategory } from '@/lib/bug-report-draft';
import { withTimeout } from '@/lib/promise-timeout';

export interface SubmitBugReportInput {
  reportId: string;
  message: string;
  category?: BugReportCategory;
  attachment?: File;
}

interface CreateBugReportResponse {
  ok: true;
  reportId: string;
  uploadPath: string;
  finalized?: boolean;
  screenshotAttached?: boolean;
}

interface FinalizeBugReportResponse {
  ok: true;
  screenshotAttached?: boolean;
  screenshotOmitted?: boolean;
}

const safeRoute = (): string => {
  const raw = window.location.hash.replace(/^#/, '') || window.location.pathname;
  return raw.split(/[?#]/, 1)[0].slice(0, 160);
};

export async function submitBugReport(
  uid: string,
  input: SubmitBugReportInput,
): Promise<FinalizeBugReportResponse> {
  const message = input.message.trim();
  const created = await callProtectedFunction<Record<string, unknown>, CreateBugReportResponse>(
    'createBugReport',
    {
      clientRequestId: input.reportId,
      message,
      category: input.category ?? 'other',
      context: {
        appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
        platform: Capacitor.getPlatform(),
        locale: document.documentElement.lang === 'en' ? 'en' : 'pl',
        route: safeRoute(),
        online: navigator.onLine,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    },
  );

  const expectedPath = `bug-reports/${uid}/${created.reportId}/screenshot.jpg`;
  if (created.uploadPath !== expectedPath) throw new Error('BUG_REPORT_UPLOAD_PATH_INVALID');
  if (created.finalized) {
    return { ok: true, ...(input.attachment && !created.screenshotAttached ? { screenshotOmitted: true } : {}) };
  }

  let useScreenshot = false;
  if (input.attachment) {
    let stage = 'sanitize';
    let upload: ReturnType<typeof uploadBytesResumable> | undefined;
    try {
      const safeJpeg = await withTimeout(sanitizeBugReportScreenshot(input.attachment), 15_000, 'Screenshot processing');
      stage = 'upload';
      upload = uploadBytesResumable(ref(storage, expectedPath), safeJpeg, {
        contentType: 'image/jpeg',
        cacheControl: 'private,max-age=0,no-store',
        customMetadata: { reportId: created.reportId },
      });
      await withTimeout(Promise.resolve(upload), 30_000, 'Screenshot upload');
      useScreenshot = true;
    } catch {
      upload?.cancel();
      // Stage only: no report text, original filename or image in diagnostics.
      console.warn('bug_report_screenshot_omitted', { stage });
    }
  }

  const result = await callProtectedFunction<Record<string, unknown>, FinalizeBugReportResponse>(
    'finalizeBugReport',
    { clientRequestId: input.reportId, useScreenshot },
  );
  return {
    ...result,
    ...(input.attachment && !(result.screenshotAttached ?? useScreenshot) ? { screenshotOmitted: true } : {}),
  };
}
