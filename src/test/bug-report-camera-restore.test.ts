import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorMocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  addListener: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: capacitorMocks.isNativePlatform },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: capacitorMocks.addListener },
}));

const DB_NAME = 'strength-save-bug-report-attachments';
const owner = { uid: 'user-1', clientRequestId: '0f2a75eb-8494-4e69-b01a-1a7d1aecb326' };

const deleteDatabase = async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('database-delete-blocked'));
  });
};

describe('bug report Camera appRestoredResult recovery', () => {
  beforeEach(async () => {
    vi.resetModules();
    capacitorMocks.isNativePlatform.mockReturnValue(true);
    capacitorMocks.remove.mockReset();
    capacitorMocks.addListener.mockReset();
    capacitorMocks.addListener.mockResolvedValue({ remove: capacitorMocks.remove });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      new Blob(['private-image'], { type: 'image/png' }),
      { status: 200, headers: { 'Content-Type': 'image/png' } },
    )));
    await deleteDatabase();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores only the pending report image and keeps it until explicit consumption', async () => {
    const recovery = await import('@/lib/bug-report-camera-restore');
    expect(await recovery.prepareBugReportCameraRecovery(owner)).toBe(true);

    expect(await recovery.handleBugReportCameraRestoredResult({
      pluginId: 'Camera',
      methodName: 'chooseFromGallery',
      success: true,
      data: { results: [{ webPath: 'content://restored/screenshot' }] },
    })).toBe('recovered');

    const firstRead = await recovery.readRecoveredBugReportAttachment(owner);
    expect(firstRead.status).toBe('ready');
    if (firstRead.status === 'ready') {
      expect(firstRead.file.type).toBe('image/png');
      expect(firstRead.file.size).toBeGreaterThan(0);
    }

    expect((await recovery.readRecoveredBugReportAttachment(owner)).status).toBe('ready');
    expect((await recovery.consumeRecoveredBugReportAttachment(owner)).status).toBe('ready');
    expect((await recovery.readRecoveredBugReportAttachment(owner)).status).toBe('none');
  });

  it('persists pending ownership and recovered Blob across a JavaScript restart', async () => {
    const beforeRestart = await import('@/lib/bug-report-camera-restore');
    expect(await beforeRestart.prepareBugReportCameraRecovery(owner)).toBe(true);

    vi.resetModules();
    const afterActivityRestart = await import('@/lib/bug-report-camera-restore');
    await afterActivityRestart.handleBugReportCameraRestoredResult({
      pluginId: 'Camera',
      methodName: 'chooseFromGallery',
      success: true,
      data: { results: [{ webPath: 'content://restored/after-process-death' }] },
    });

    vi.resetModules();
    const afterSecondRestart = await import('@/lib/bug-report-camera-restore');
    expect((await afterSecondRestart.readRecoveredBugReportAttachment(owner)).status).toBe('ready');
  });

  it('ignores foreign results without consuming the pending report binding', async () => {
    const recovery = await import('@/lib/bug-report-camera-restore');
    await recovery.prepareBugReportCameraRecovery(owner);

    expect(await recovery.handleBugReportCameraRestoredResult({
      pluginId: 'Filesystem',
      methodName: 'chooseFromGallery',
      success: true,
      data: { results: [{ webPath: 'content://foreign' }] },
    })).toBe('ignored');
    expect(fetch).not.toHaveBeenCalled();

    expect(await recovery.handleBugReportCameraRestoredResult({
      pluginId: 'Camera',
      methodName: 'chooseFromGallery',
      success: true,
      data: { results: [{ webPath: 'content://owned' }] },
    })).toBe('recovered');
  });

  it('records a readable recovery error for a failed matching Camera result', async () => {
    const recovery = await import('@/lib/bug-report-camera-restore');
    await recovery.prepareBugReportCameraRecovery(owner);

    expect(await recovery.handleBugReportCameraRestoredResult({
      pluginId: 'Camera',
      methodName: 'chooseFromGallery',
      success: false,
      error: { message: 'Android activity was killed' },
    })).toBe('failed');

    expect(await recovery.readRecoveredBugReportAttachment(owner)).toEqual({
      status: 'error',
      code: 'camera-restore-failed',
    });
  });

  it('installs one native listener, shares it between mounts, and never installs it on web', async () => {
    const recovery = await import('@/lib/bug-report-camera-restore');
    const releaseFirst = recovery.addBugReportCameraRestoreListener();
    const releaseSecond = recovery.addBugReportCameraRestoreListener();
    await vi.waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));
    expect(capacitorMocks.addListener).toHaveBeenCalledWith('appRestoredResult', expect.any(Function));

    releaseFirst();
    expect(capacitorMocks.remove).not.toHaveBeenCalled();
    releaseSecond();
    await vi.waitFor(() => expect(capacitorMocks.remove).toHaveBeenCalledTimes(1));

    capacitorMocks.isNativePlatform.mockReturnValue(false);
    recovery.addBugReportCameraRestoreListener()();
    expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1);
  });

  it('does not throw when IndexedDB is unavailable, so report text can continue', async () => {
    const recovery = await import('@/lib/bug-report-camera-restore');
    const original = globalThis.indexedDB;
    // @ts-expect-error deliberate platform-fallback test
    delete globalThis.indexedDB;
    await expect(recovery.prepareBugReportCameraRecovery(owner)).resolves.toBe(false);
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: original });
  });
});
