// T13a: kompresja zdjęcia sylwetki przed uploadem do Storage.
// Canvas downscale (max 1280 px dłuższy bok) + re-encode do JPEG 0.8 — zbija
// 4-10 MB z aparatu iPhone'a poniżej limitu 5 MB z rules i przy okazji
// normalizuje HEIC do JPEG. Przy błędzie kompresji: oryginał tylko gdy < 5 MB,
// inaczej twardy błąd (nie podnosimy limitu w rules).

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const compressImage = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no-2d-context');
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
      if (!blob) throw new Error('to-blob-failed');
      return blob;
    } finally {
      bitmap.close();
    }
  } catch {
    if (file.size < MAX_UPLOAD_BYTES) return file;
    throw new Error('IMAGE_TOO_LARGE');
  }
};
