import { Capacitor } from '@capacitor/core';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { callProtectedFunction } from '@/lib/protected-callable';
import { sanitizeBugReportScreenshot } from '@/lib/bug-report-screenshot';
import type { BugReportCategory } from '@/lib/bug-report-draft';

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
}

interface FinalizeBugReportResponse {
  ok: true;
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

  let useScreenshot = false;
  if (input.attachment) {
    const safeJpeg = await sanitizeBugReportScreenshot(input.attachment);
    await uploadBytes(ref(storage, expectedPath), safeJpeg, {
      contentType: 'image/jpeg',
      cacheControl: 'private,max-age=0,no-store',
      customMetadata: { reportId: created.reportId },
    });
    useScreenshot = true;
  }

  return callProtectedFunction<Record<string, unknown>, FinalizeBugReportResponse>(
    'finalizeBugReport',
    { clientRequestId: input.reportId, useScreenshot },
  );
}
