export const BUG_REPORT_SCREENSHOT_MAX_BYTES = 1_500_000;
const BUG_REPORT_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

const decodeImage = async (file: File): Promise<DecodedImage> => {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    // WebKit's image element can decode formats (including HEIC on iOS)
    // that its ImageBitmap implementation rejects. Still re-encode via canvas.
    const url = URL.createObjectURL(file);
    const image = new Image();
    return new Promise<DecodedImage>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        URL.revokeObjectURL(url);
      };
      const fail = () => { cleanup(); reject(new Error('image-decode-failed')); };
      const timer = setTimeout(fail, 10_000);
      image.onerror = fail;
      image.onload = () => {
        clearTimeout(timer);
        resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, close: cleanup });
      };
      image.src = url;
    });
  }
};

const renderJpeg = async (
  bitmap: DecodedImage,
  maxDimension: number,
  quality: number,
): Promise<Blob> => {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no-2d-context');
  context.drawImage(bitmap.source, 0, 0, canvas.width, canvas.height);
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

  let bitmap: DecodedImage | null = null;
  try {
    bitmap = await decodeImage(file);
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
