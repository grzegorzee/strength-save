import type { RestoredListenerEvent } from '@capacitor/app';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NATIVE_IMAGE_MAX_BYTES } from '@/lib/native-image-picker';
import {
  clearPendingBugReportCameraBinding,
  consumeStoredBugReportCameraRecovery,
  finalizeBugReportCameraRecovery,
  readPendingBugReportCameraBinding,
  readStoredBugReportCameraRecovery,
  storePendingBugReportCameraBinding,
  type BugReportCameraBinding,
  type BugReportCameraRecoveryErrorCode,
  type StoredBugReportCameraRecovery,
} from '@/lib/bug-report-attachment-db';

type RestoreHandlingResult = 'ignored' | 'recovered' | 'failed';

const getRestoredWebPath = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results) || !results[0] || typeof results[0] !== 'object') return null;
  const webPath = (results[0] as { webPath?: unknown }).webPath;
  return typeof webPath === 'string' && webPath.length > 0 ? webPath : null;
};

const fileExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
};

const recordError = async (
  binding: BugReportCameraBinding,
  code: BugReportCameraRecoveryErrorCode,
): Promise<RestoreHandlingResult> => {
  await finalizeBugReportCameraRecovery(binding, { status: 'error', code });
  return 'failed';
};

/**
 * Arms durable ownership immediately before opening Camera.chooseFromGallery.
 * `false` means IndexedDB is unavailable; callers must still allow a text-only
 * report and must not fall back to localStorage/base64 for a private image.
 */
export const prepareBugReportCameraRecovery = (
  binding: BugReportCameraBinding,
): Promise<boolean> => storePendingBugReportCameraBinding(binding);

/** Clears only the exact picker operation, so a stale promise cannot disarm a newer report. */
export const clearPendingBugReportCameraRecovery = (
  binding: BugReportCameraBinding,
): Promise<boolean> => clearPendingBugReportCameraBinding(binding);

export const readRecoveredBugReportAttachment = (
  binding: BugReportCameraBinding,
): Promise<StoredBugReportCameraRecovery> => readStoredBugReportCameraRecovery(binding);

/** Destructive only by explicit caller action, normally after the dialog adopted the file. */
export const consumeRecoveredBugReportAttachment = (
  binding: BugReportCameraBinding,
): Promise<StoredBugReportCameraRecovery> => consumeStoredBugReportCameraRecovery(binding);

export const handleBugReportCameraRestoredResult = async (
  result: Pick<RestoredListenerEvent, 'pluginId' | 'methodName' | 'success' | 'data' | 'error'>,
): Promise<RestoreHandlingResult> => {
  if (result.pluginId !== 'Camera' || result.methodName !== 'chooseFromGallery') return 'ignored';

  const pending = await readPendingBugReportCameraBinding();
  if (!pending) return 'ignored';
  if (!result.success) return recordError(pending, 'camera-restore-failed');

  const webPath = getRestoredWebPath(result.data);
  if (!webPath) return recordError(pending, 'camera-restore-invalid-result');

  let blob: Blob;
  try {
    const response = await fetch(webPath);
    if (!response.ok) return recordError(pending, 'camera-restore-read-failed');
    blob = await response.blob();
  } catch {
    return recordError(pending, 'camera-restore-read-failed');
  }

  if (!blob.type.startsWith('image/')) return recordError(pending, 'camera-restore-unsupported-image');
  if (blob.size > NATIVE_IMAGE_MAX_BYTES) return recordError(pending, 'camera-restore-image-too-large');

  const stored = await finalizeBugReportCameraRecovery(pending, {
    status: 'ready',
    blob,
    mimeType: blob.type,
    fileName: `bug-report-screenshot.${fileExtension(blob.type)}`,
  });
  return stored ? 'recovered' : 'ignored';
};

interface SharedListener {
  references: number;
  handle: { remove: () => Promise<void> } | null;
  removeWhenReady: boolean;
}

let sharedListener: SharedListener | null = null;

/** Installs at most one native appRestoredResult listener, including React StrictMode remounts. */
export const addBugReportCameraRestoreListener = (): (() => void) => {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const state = sharedListener ?? { references: 0, handle: null, removeWhenReady: false };
  state.references += 1;
  state.removeWhenReady = false;

  if (!sharedListener) {
    sharedListener = state;
    void App.addListener('appRestoredResult', result => {
      void handleBugReportCameraRestoredResult(result);
    }).then(handle => {
      state.handle = handle;
      if (state.removeWhenReady && state.references === 0) {
        void handle.remove();
        if (sharedListener === state) sharedListener = null;
      }
    }).catch(() => {
      // A build without a synced App plugin must not block text-only bug reports.
      if (sharedListener === state) sharedListener = null;
    });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.references = Math.max(0, state.references - 1);
    if (state.references > 0) return;

    queueMicrotask(() => {
      if (state.references > 0) return;
      if (!state.handle) {
        state.removeWhenReady = true;
        return;
      }
      void state.handle.remove();
      if (sharedListener === state) sharedListener = null;
    });
  };
};
