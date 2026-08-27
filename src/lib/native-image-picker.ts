import { Camera, CameraErrorCode, MediaType, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const NATIVE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type NativeImagePickResult =
  | { status: 'unsupported' }
  | { status: 'cancelled' }
  | { status: 'picked'; file: File };

const isCancelled = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === CameraErrorCode.ChooseMediaCancelled
    || (typeof candidate.message === 'string' && /cancel(?:led|ed|owano)/i.test(candidate.message));
};

const extensionFor = (type: string): string => {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
};

/**
 * Natywny wybór pojedynczego obrazu. Web świadomie zostaje przy kontrolowanym
 * `<input type="file">`, dzięki czemu nie potrzebuje PWA Elements ani drugiego UI.
 * Tekst formularza trzyma komponent nadrzędny, więc anulowanie/systemowy powrót
 * z pickera nie może go wyczyścić.
 */
export async function pickSingleNativeImage(): Promise<NativeImagePickResult> {
  if (!Capacitor.isNativePlatform()) return { status: 'unsupported' };

  try {
    const { results } = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      limit: 1,
      // Screenshoty zgłoszeń nie potrzebują EXIF/GPS. Rozmiar jest ponownie
      // sprawdzany po fetchu, więc metadane nie są potrzebne nawet do limitu.
      includeMetadata: false,
      quality: 88,
      targetWidth: 1600,
      targetHeight: 1600,
      correctOrientation: true,
      editable: 'no',
    });
    const selected = results[0];
    if (!selected) return { status: 'cancelled' };
    if (selected.type !== MediaType.Photo) throw new Error('IMAGE_TYPE_UNSUPPORTED');
    if ((selected.metadata?.size ?? 0) > NATIVE_IMAGE_MAX_BYTES) throw new Error('IMAGE_TOO_LARGE');
    if (!selected.webPath) throw new Error('IMAGE_PATH_MISSING');

    const response = await fetch(selected.webPath);
    if (!response.ok) throw new Error('IMAGE_READ_FAILED');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('IMAGE_TYPE_UNSUPPORTED');
    if (blob.size > NATIVE_IMAGE_MAX_BYTES) throw new Error('IMAGE_TOO_LARGE');

    return {
      status: 'picked',
      file: new File([blob], `strength-save-image.${extensionFor(blob.type)}`, {
        type: blob.type,
        lastModified: Date.now(),
      }),
    };
  } catch (error) {
    if (isCancelled(error)) return { status: 'cancelled' };
    throw error;
  }
}
