// WP-L (X29): JEDNA implementacja "podziel się albo pobierz" dla obrazków
// share (ShareWorkoutDialog, CycleShareCard, BodyCompareShareDialog) i
// eksportów plikowych CSV/JSON. Z179: WKWebView ignoruje <a download>, więc
// na native plik idzie w systemowy share sheet (iOS ma tam "Zapisz obraz" /
// "Zapisz do plików"); web zostaje przy <a download>.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ShareExportResult = 'shared' | 'downloaded' | 'aborted' | 'failed';

export interface ShareOrDownloadOptions {
  /** Tytuł share sheeta; domyślnie nazwa pliku. */
  title?: string;
  /**
   * true = przycisk "Udostępnij": share sheet wszędzie, gdzie canShare
   * (także web), z degradacją do pobrania. false/brak = przycisk "Pobierz"
   * albo eksport pliku: share sheet TYLKO na native (Z179), web pobiera wprost.
   */
  preferShare?: boolean;
  /**
   * WP-E (X29): callback dla telemetrii — dostaje surowy błąd navigator.share
   * (poza AbortError), zanim wynik spadnie do 'failed'.
   */
  onShareError?: (err: unknown) => void;
}

const canShareFile = (file: File): boolean => {
  try {
    return navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
};

// Wzorzec Z198: AbortError (zamknięty sheet) to nie błąd, ale też ZERO
// fałszywego sukcesu — caller nie pokazuje "Zapisano" po 'aborted'.
const systemShare = async (
  file: File,
  title: string,
  onShareError?: (err: unknown) => void,
): Promise<ShareExportResult> => {
  try {
    await navigator.share({ title, files: [file] });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'aborted';
    onShareError?.(err);
    return 'failed';
  }
};

const downloadFile = (file: File): ShareExportResult => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
};

const NATIVE_EXPORT_DIR = 'strength-save-exports';

const isShareCancellation = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return true;
  const message = err.message.toLowerCase();
  return message.includes('share canceled') || message.includes('share cancelled');
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error ?? new Error('file-read-failed'));
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== 'string') {
      reject(new Error('file-read-failed'));
      return;
    }
    resolve(result.slice(result.indexOf(',') + 1));
  };
  reader.readAsDataURL(file);
});

const fileToText = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error ?? new Error('file-read-failed'));
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('file-read-failed'));
  };
  reader.readAsText(file, 'UTF-8');
});

const isTextFile = (file: File): boolean => (
  file.type.startsWith('text/')
  || file.type.includes('json')
  || file.type.includes('xml')
);

const cleanupPreviousNativeExports = async (): Promise<void> => {
  try {
    const { files } = await Filesystem.readdir({ path: NATIVE_EXPORT_DIR, directory: Directory.Cache });
    await Promise.all(files
      .filter((entry) => entry.type === 'file')
      .map((entry) => Filesystem.deleteFile({
        path: `${NATIVE_EXPORT_DIR}/${entry.name}`,
        directory: Directory.Cache,
      }).catch(() => undefined)));
  } catch {
    // Katalog nie istnieje przy pierwszym eksporcie; cleanup jest best-effort.
  }
};

const nativeShare = async (
  file: File,
  title: string,
  onShareError?: (err: unknown) => void,
): Promise<ShareExportResult> => {
  try {
    await cleanupPreviousNativeExports();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `${NATIVE_EXPORT_DIR}/${Date.now()}-${safeName}`;
    const textFile = isTextFile(file);
    const { uri } = await Filesystem.writeFile({
      path,
      data: textFile ? await fileToText(file) : await fileToBase64(file),
      directory: Directory.Cache,
      ...(textFile ? { encoding: Encoding.UTF8 } : {}),
      recursive: true,
    });
    await Share.share({ title, files: [uri] });
    return 'shared';
  } catch (err) {
    if (isShareCancellation(err)) return 'aborted';
    onShareError?.(err);
    return 'failed';
  }
};

export const shareOrDownloadFile = async (
  file: File,
  options?: ShareOrDownloadOptions,
): Promise<ShareExportResult> => {
  if (Capacitor.isNativePlatform()) {
    return nativeShare(file, options?.title ?? file.name, options?.onShareError);
  }
  const wantsShare = options?.preferShare === true || Capacitor.isNativePlatform();
  if (wantsShare && canShareFile(file)) {
    return systemShare(file, options?.title ?? file.name, options?.onShareError);
  }
  return downloadFile(file);
};
