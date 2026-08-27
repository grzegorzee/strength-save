import { beforeEach, describe, expect, it, vi } from 'vitest';

const chooseFromGallery = vi.hoisted(() => vi.fn());
const isNativePlatform = vi.hoisted(() => vi.fn(() => true));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform } }));
vi.mock('@capacitor/camera', () => ({
  Camera: { chooseFromGallery },
  CameraErrorCode: { ChooseMediaCancelled: 'OS-PLUG-CAMR-0020' },
  MediaType: { Photo: 0 },
  MediaTypeSelection: { Photo: 0 },
}));

import { pickSingleNativeImage } from '@/lib/native-image-picker';

describe('pickSingleNativeImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    chooseFromGallery.mockReset();
    isNativePlatform.mockReturnValue(true);
  });

  it('na webie zostawia wybór ukrytemu inputowi', async () => {
    isNativePlatform.mockReturnValue(false);
    await expect(pickSingleNativeImage()).resolves.toEqual({ status: 'unsupported' });
    expect(chooseFromGallery).not.toHaveBeenCalled();
  });

  it('native wybiera pojedyncze zdjęcie i zwraca File', async () => {
    chooseFromGallery.mockResolvedValue({
      results: [{ type: 0, webPath: 'capacitor://picked/screenshot.jpg', metadata: { size: 4, format: 'jpg' } }],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      new Blob(['test'], { type: 'image/jpeg' }),
      { headers: { 'content-type': 'image/jpeg' } },
    ));

    const result = await pickSingleNativeImage();

    expect(chooseFromGallery).toHaveBeenCalledWith(expect.objectContaining({
      mediaType: 0,
      allowMultipleSelection: false,
      limit: 1,
    }));
    expect(result.status).toBe('picked');
    if (result.status === 'picked') {
      expect(result.file).toBeInstanceOf(File);
      expect(result.file.type).toBe('image/jpeg');
      expect(result.file.size).toBeGreaterThan(0);
    }
  });

  it('anulowanie jest neutralnym wynikiem', async () => {
    chooseFromGallery.mockRejectedValue({ code: 'OS-PLUG-CAMR-0020', message: 'cancelled' });
    await expect(pickSingleNativeImage()).resolves.toEqual({ status: 'cancelled' });
  });

  it('odrzuca nie-obraz i plik większy niż 5 MB', async () => {
    chooseFromGallery.mockResolvedValue({
      results: [{ type: 0, webPath: 'capacitor://picked/file.bin', metadata: { size: 10, format: 'bin' } }],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(new Blob(['not-image'], { type: 'application/octet-stream' })));
    await expect(pickSingleNativeImage()).rejects.toThrow('IMAGE_TYPE_UNSUPPORTED');

    chooseFromGallery.mockResolvedValue({
      results: [{ type: 0, webPath: 'capacitor://picked/huge.jpg', metadata: { size: 6 * 1024 * 1024, format: 'jpg' } }],
    });
    await expect(pickSingleNativeImage()).rejects.toThrow('IMAGE_TOO_LARGE');
  });
});
