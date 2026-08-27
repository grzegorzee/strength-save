// WP-L (X29): jedna ścieżka "podziel się albo pobierz" dla obrazków share
// i eksportów plikowych. Z179: WKWebView ignoruje <a download>, więc na native
// plik MUSI iść w systemowy share sheet; web zostaje przy <a download>.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadFile } from '@/lib/share-export';

const nativePlatformMock = vi.hoisted(() => ({ value: false }));
const nativeMocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  readdir: vi.fn(),
  deleteFile: vi.fn(),
  share: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatformMock.value },
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF8' },
  Filesystem: {
    writeFile: nativeMocks.writeFile,
    readdir: nativeMocks.readdir,
    deleteFile: nativeMocks.deleteFile,
  },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: nativeMocks.share },
}));

const shareMock = vi.fn();
const canShareMock = vi.fn();
let clickSpy: ReturnType<typeof vi.spyOn>;

const file = new File(['dane'], 'test-export.csv', { type: 'text/csv' });

beforeEach(() => {
  nativePlatformMock.value = false;
  shareMock.mockReset().mockResolvedValue(undefined);
  canShareMock.mockReset().mockReturnValue(true);
  nativeMocks.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/test-export.csv' });
  nativeMocks.readdir.mockReset().mockResolvedValue({ files: [{ name: 'old.csv', type: 'file' }] });
  nativeMocks.deleteFile.mockReset().mockResolvedValue(undefined);
  nativeMocks.share.mockReset().mockResolvedValue({ activityType: 'test' });
  Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShareMock });
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }));
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shareOrDownloadFile', () => {
  it('native: sprząta poprzednie eksporty, zapisuje nowy w Cache i udostępnia file:// pluginem', async () => {
    nativePlatformMock.value = true;
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('shared');
    expect(nativeMocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: expect.stringMatching(/^strength-save-exports\/\d+-test-export\.csv$/),
      directory: 'CACHE',
      data: 'dane',
      encoding: 'UTF8',
    }));
    expect(nativeMocks.deleteFile).toHaveBeenCalledWith({
      path: 'strength-save-exports/old.csv',
      directory: 'CACHE',
    });
    expect(nativeMocks.share).toHaveBeenCalledWith({
      title: 'test-export.csv',
      files: ['file:///cache/test-export.csv'],
    });
    expect(shareMock).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('web: <a download> z objectURL + revoke, wynik downloaded, zero share', async () => {
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('downloaded');
    expect(shareMock).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('native + komunikat anulowania pluginu: wynik aborted, bez fałszywego błędu', async () => {
    nativePlatformMock.value = true;
    nativeMocks.share.mockRejectedValue(new Error('Share canceled'));
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('aborted');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('native + błąd zapisu/share: wynik failed i telemetria, bez martwego downloadu', async () => {
    nativePlatformMock.value = true;
    const error = new Error('disk-full');
    const onShareError = vi.fn();
    nativeMocks.writeFile.mockRejectedValue(error);
    const result = await shareOrDownloadFile(file, { onShareError });
    expect(result).toBe('failed');
    expect(onShareError).toHaveBeenCalledWith(error);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('native bez Web Share API nadal używa pluginów, nigdy <a download>', async () => {
    nativePlatformMock.value = true;
    canShareMock.mockReturnValue(false);
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('shared');
    expect(shareMock).not.toHaveBeenCalled();
    expect(nativeMocks.share).toHaveBeenCalledTimes(1);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('native zachowuje pliki binarne jako base64 bez Encoding.UTF8', async () => {
    nativePlatformMock.value = true;
    const pdf = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
    await shareOrDownloadFile(pdf);
    expect(nativeMocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      data: 'JVBERi0xLjc=',
    }));
    expect(nativeMocks.writeFile.mock.calls[0][0]).not.toHaveProperty('encoding');
  });

  it('domyślny title share sheeta = nazwa pliku; opcja title nadpisuje', async () => {
    nativePlatformMock.value = true;
    await shareOrDownloadFile(file);
    expect(nativeMocks.share.mock.calls[0][0].title).toBe('test-export.csv');
    await shareOrDownloadFile(file, { title: 'Mój trening' });
    expect(nativeMocks.share.mock.calls[1][0].title).toBe('Mój trening');
  });

  it('preferShare (przycisk Udostępnij): share sheet też na webie z canShare', async () => {
    const result = await shareOrDownloadFile(file, { preferShare: true });
    expect(result).toBe('shared');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('preferShare na webie bez canShare: degradacja do pobrania', async () => {
    canShareMock.mockReturnValue(false);
    const result = await shareOrDownloadFile(file, { preferShare: true });
    expect(result).toBe('downloaded');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
