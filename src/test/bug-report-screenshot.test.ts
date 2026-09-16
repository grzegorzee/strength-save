import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUG_REPORT_SCREENSHOT_MAX_BYTES, sanitizeBugReportScreenshot } from '@/lib/bug-report-screenshot';

describe('sanitizeBugReportScreenshot', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('decodes an iOS HEIC through the image element when ImageBitmap rejects it, then strips metadata via JPEG', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('unsupported HEIC bitmap'); }));
    const createObjectURL = vi.fn(() => 'blob:heic');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement) {
      Object.defineProperties(this, { naturalWidth: { value: 2400 }, naturalHeight: { value: 1200 } });
      queueMicrotask(() => this.onload?.(new Event('load')));
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['safe'], { type: 'image/jpeg' })));
    const source = new File(['raw-exif'], 'photo.heic', { type: 'image/heic' });
    const result = await sanitizeBugReportScreenshot(source);
    expect(result.type).toBe('image/jpeg');
    expect(result).not.toBe(source);
    expect(drawImage).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:heic');
  });

  it('przepisuje obraz do JPEG bez fallbacku do oryginału z metadanymi', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2400, height: 1200, close })));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['safe'], { type: type ?? 'image/jpeg' })));

    const result = await sanitizeBugReportScreenshot(new File(['raw-exif'], 'screen.png', { type: 'image/png' }));

    expect(result.type).toBe('image/jpeg');
    expect(result.size).toBeLessThanOrEqual(BUG_REPORT_SCREENSHOT_MAX_BYTES);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('fail-closed: błąd canvas nie zwraca niesanitowanego oryginału', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode'); }));
    const source = new File(['raw-exif'], 'screen.jpg', { type: 'image/jpeg' });
    await expect(sanitizeBugReportScreenshot(source)).rejects.toThrow('SCREENSHOT_SANITIZE_FAILED');
  });
});
