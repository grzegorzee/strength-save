export const BUG_REPORT_SCREENSHOT_MAX_BYTES = 1_500_000;
const BUG_REPORT_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

const renderJpeg = async (
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<Blob> => {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no-2d-context');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob || blob.type !== 'image/jpeg') throw new Error('jpeg-encode-failed');
  return blob;
};

/**
 * Fail-closed sanitizer: obraz jest dekodowany i ponownie kodowany do JPEG,
 * więc EXIF/GPS oraz nazwa oryginału nie trafiają do Storage. Nigdy nie zwraca
 * wejściowego pliku jako fallbacku.
 */
export async function sanitizeBugReportScreenshot(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size > BUG_REPORT_SOURCE_MAX_BYTES) {
    throw new Error('SCREENSHOT_INVALID');
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    let result = await renderJpeg(bitmap, 1600, 0.8);
    if (result.size > BUG_REPORT_SCREENSHOT_MAX_BYTES) {
      result = await renderJpeg(bitmap, 1280, 0.65);
    }
    if (result.size > BUG_REPORT_SCREENSHOT_MAX_BYTES) throw new Error('encoded-too-large');
    return result;
  } catch {
    throw new Error('SCREENSHOT_SANITIZE_FAILED');
  } finally {
    bitmap?.close();
  }
}
