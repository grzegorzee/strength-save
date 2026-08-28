import { beforeEach, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
const writeFile = vi.hoisted(() => vi.fn(async ({ path, data }: { path: string; data: string | Blob }) => {
  files.set(path, typeof data === 'string' ? data : 'blob');
  return { uri: path };
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { LibraryNoCloud: 'LIBRARY_NO_CLOUD' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    mkdir: vi.fn(async () => undefined),
    writeFile,
    readFile: vi.fn(async ({ path }: { path: string }) => {
      const data = files.get(path);
      if (data === undefined) throw new Error('missing');
      return { data };
    }),
    deleteFile: vi.fn(async ({ path }: { path: string }) => { files.delete(path); }),
    rmdir: vi.fn(async () => undefined),
  },
}));

import {
  cacheAvatarBlob,
  isTrustedAvatarCacheUrl,
  readCachedAvatar,
  writeAvatarDataUrl,
} from '@/lib/avatar-cache';

beforeEach(() => {
  files.clear();
  writeFile.mockClear();
  vi.unstubAllGlobals();
});

describe('lokalny cache avatara', () => {
  const uid = 'user-1';
  const googleUrl = 'https://lh3.googleusercontent.com/a/photo=s96-c';
  const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fuser-1%2Favatar?alt=media&token=secret';

  it('dopuszcza tylko Google albo własną ścieżkę avatara danego UID', () => {
    expect(isTrustedAvatarCacheUrl(uid, googleUrl)).toBe(true);
    expect(isTrustedAvatarCacheUrl(uid, firebaseUrl)).toBe(true);
    expect(isTrustedAvatarCacheUrl('other-user', firebaseUrl)).toBe(false);
    expect(isTrustedAvatarCacheUrl(uid, 'https://evil.example/avatar.jpg')).toBe(false);
  });

  it('po zapisie odczytuje lokalny data URL tylko dla tej samej wersji źródła', async () => {
    const dataUrl = 'data:image/jpeg;base64,AAECAw==';
    await writeAvatarDataUrl(uid, googleUrl, dataUrl);

    expect(await readCachedAvatar(uid, googleUrl)).toBe(dataUrl);
    expect(await readCachedAvatar(uid, googleUrl + '&new=1')).toBeNull();
  });

  it('nie niszczy poprzedniego manifestu, gdy zapis nowego pliku się nie uda', async () => {
    const oldData = 'data:image/jpeg;base64,T0xE';
    await writeAvatarDataUrl(uid, googleUrl, oldData);
    writeFile.mockImplementationOnce(async () => { throw new Error('disk-full'); });

    await expect(writeAvatarDataUrl(uid, googleUrl + '&v=2', 'data:image/jpeg;base64,TkVX'))
      .rejects.toThrow('disk-full');
    expect(await readCachedAvatar(uid, googleUrl)).toBe(oldData);
  });

  it('bez createImageBitmap zapisuje miniaturę 256 px, a nie pełny plik źródłowy', async () => {
    const drawImage = vi.fn();
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,VEhVTUI=');
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    const revokeObjectURL = vi.fn();
    class FakeUrl extends URL {
      static createObjectURL = vi.fn(() => 'blob:avatar-source');
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', FakeUrl);
    class FakeImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('createImageBitmap', undefined);

    const result = await cacheAvatarBlob(
      uid,
      googleUrl,
      new Blob(['full-resolution-avatar'], { type: 'image/jpeg' }),
    );

    expect(result).toBe('data:image/jpeg;base64,VEhVTUI=');
    expect(drawImage).toHaveBeenCalledWith(expect.any(FakeImage), 200, 0, 800, 800, 0, 0, 256, 256);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.82);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-source');
    expect([...files.values()]).not.toContain(expect.stringContaining('full-resolution-avatar'));
  });
});
