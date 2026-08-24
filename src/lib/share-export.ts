// WP-L (X29): JEDNA implementacja "podziel się albo pobierz" dla obrazków
// share (ShareWorkoutDialog, CycleShareCard, BodyCompareShareDialog) i
// eksportów plikowych CSV/JSON. Z179: WKWebView ignoruje <a download>, więc
// na native plik idzie w systemowy share sheet (iOS ma tam "Zapisz obraz" /
// "Zapisz do plików"); web zostaje przy <a download>.
import { Capacitor } from '@capacitor/core';

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
const systemShare = async (file: File, title: string): Promise<ShareExportResult> => {
  try {
    await navigator.share({ title, files: [file] });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'aborted';
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

export const shareOrDownloadFile = async (
  file: File,
  options?: ShareOrDownloadOptions,
): Promise<ShareExportResult> => {
  const wantsShare = options?.preferShare === true || Capacitor.isNativePlatform();
  if (wantsShare && canShareFile(file)) {
    return systemShare(file, options?.title ?? file.name);
  }
  return downloadFile(file);
};
