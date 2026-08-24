// WP-L (X29): jedna ścieżka "podziel się albo pobierz" dla obrazków share
// i eksportów plikowych. Z179: WKWebView ignoruje <a download>, więc na native
// plik MUSI iść w systemowy share sheet; web zostaje przy <a download>.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadFile } from '@/lib/share-export';

const nativePlatformMock = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatformMock.value },
}));

const shareMock = vi.fn();
const canShareMock = vi.fn();
let clickSpy: ReturnType<typeof vi.spyOn>;

const file = new File(['dane'], 'test-export.csv', { type: 'text/csv' });

beforeEach(() => {
  nativePlatformMock.value = false;
  shareMock.mockReset().mockResolvedValue(undefined);
  canShareMock.mockReset().mockReturnValue(true);
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
  it('native + canShare: navigator.share z plikiem, wynik shared', async () => {
    nativePlatformMock.value = true;
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('shared');
    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock.mock.calls[0][0].files).toEqual([file]);
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

  it('native + AbortError (zamknięty sheet): wynik aborted, nie failed', async () => {
    nativePlatformMock.value = true;
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    shareMock.mockRejectedValue(abort);
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('aborted');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('native + inny błąd share: wynik failed', async () => {
    nativePlatformMock.value = true;
    shareMock.mockRejectedValue(new Error('NotAllowedError'));
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('failed');
  });

  it('native bez canShare: fallback <a download>, wynik downloaded', async () => {
    nativePlatformMock.value = true;
    canShareMock.mockReturnValue(false);
    const result = await shareOrDownloadFile(file);
    expect(result).toBe('downloaded');
    expect(shareMock).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('domyślny title share sheeta = nazwa pliku; opcja title nadpisuje', async () => {
    nativePlatformMock.value = true;
    await shareOrDownloadFile(file);
    expect(shareMock.mock.calls[0][0].title).toBe('test-export.csv');
    await shareOrDownloadFile(file, { title: 'Mój trening' });
    expect(shareMock.mock.calls[1][0].title).toBe('Mój trening');
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
