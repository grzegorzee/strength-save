import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { nativeHttpBlob } from '@/lib/native-photo-fetch';

const CACHE_ROOT = 'strength-save/avatar-cache';
const MANIFEST_NAME = 'manifest.json';
const CACHE_VERSION = 1;
const THUMBNAIL_SIZE = 256;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;
const DECODE_TIMEOUT_MS = 5_000;

interface AvatarManifest {
  version: 1;
  sourceHash: string;
  file: string;
  mime: string;
}

const safeUid = (uid: string): string | null => (
  /^[A-Za-z0-9_-]{1,180}$/.test(uid) ? uid : null
);

const userDir = (uid: string): string => CACHE_ROOT + '/' + uid;
const manifestPath = (uid: string): string => userDir(uid) + '/' + MANIFEST_NAME;

const sha256 = async (value: string): Promise<string> => {
  if (globalThis.crypto?.subtle) {
    const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Wyłącznie fallback dla starych/web-testowych środowisk bez WebCrypto.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'fallback-' + (hash >>> 0).toString(16);
};

export const isTrustedAvatarCacheUrl = (uid: string, sourceUrl: string): boolean => {
  const normalizedUid = safeUid(uid);
  if (!normalizedUid) return false;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')) {
      return true;
    }
    if (url.hostname !== 'firebasestorage.googleapis.com') return false;
    const decodedPath = decodeURIComponent(url.pathname);
    return decodedPath.includes('/o/avatars/' + normalizedUid + '/avatar');
  } catch {
    return false;
  }
};

const parseDataUrl = (dataUrl: string): { mime: string; base64: string } => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('AVATAR_CACHE_INVALID_DATA');
  return { mime: match[1].toLowerCase(), base64: match[2] };
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('AVATAR_CACHE_READ_FAILED'));
  reader.onerror = () => reject(reader.error ?? new Error('AVATAR_CACHE_READ_FAILED'));
  reader.readAsDataURL(blob);
});

const renderThumbnail = (
  source: CanvasImageSource,
  width: number,
  height: number,
): string => {
  const side = Math.max(1, Math.min(width, height));
  const sourceX = Math.max(0, Math.floor((width - side) / 2));
  const sourceY = Math.max(0, Math.floor((height - side) / 2));
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('AVATAR_CACHE_NO_CANVAS');
  context.drawImage(
    source,
    sourceX,
    sourceY,
    side,
    side,
    0,
    0,
    THUMBNAIL_SIZE,
    THUMBNAIL_SIZE,
  );
  return canvas.toDataURL('image/jpeg', 0.82);
};

const imageElementFromBlob = (blob: Blob): Promise<{ image: HTMLImageElement; objectUrl: string }> => (
  new Promise((resolve, reject) => {
    if (typeof URL.createObjectURL !== 'function') {
      reject(new Error('AVATAR_CACHE_OBJECT_URL_UNAVAILABLE'));
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(objectUrl);
      reject(new Error('AVATAR_CACHE_DECODE_TIMEOUT'));
    }, DECODE_TIMEOUT_MS);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({ image, objectUrl });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('AVATAR_CACHE_DECODE_FAILED'));
    };
    image.src = objectUrl;
  })
);

const thumbnailDataUrl = async (blob: Blob): Promise<string> => {
  if (!blob.type.toLowerCase().startsWith('image/') || blob.size > MAX_SOURCE_BYTES) {
    throw new Error('AVATAR_CACHE_INVALID_SOURCE');
  }
  if (typeof createImageBitmap !== 'function') {
    const { image, objectUrl } = await imageElementFromBlob(blob);
    try {
      return renderThumbnail(image, image.naturalWidth, image.naturalHeight);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  const bitmap = await createImageBitmap(blob);
  try {
    return renderThumbnail(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
};

const readManifest = async (uid: string): Promise<AvatarManifest | null> => {
  try {
    const result = await Filesystem.readFile({
      path: manifestPath(uid),
      directory: Directory.LibraryNoCloud,
      encoding: Encoding.UTF8,
    });
    if (typeof result.data !== 'string') return null;
    const parsed = JSON.parse(result.data) as Partial<AvatarManifest>;
    if (parsed.version !== CACHE_VERSION
      || typeof parsed.sourceHash !== 'string'
      || !/^[A-Za-z0-9-]+$/.test(parsed.sourceHash)
      || typeof parsed.file !== 'string'
      || !/^[A-Za-z0-9-]+\.(?:jpg|png|webp)$/.test(parsed.file)
      || typeof parsed.mime !== 'string'
      || !/^image\/(?:jpeg|png|webp)$/.test(parsed.mime)) return null;
    return parsed as AvatarManifest;
  } catch {
    return null;
  }
};

export const writeAvatarDataUrl = async (
  uid: string,
  sourceUrl: string,
  dataUrl: string,
): Promise<string> => {
  const normalizedUid = safeUid(uid);
  if (!normalizedUid || !isTrustedAvatarCacheUrl(normalizedUid, sourceUrl)) {
    throw new Error('AVATAR_CACHE_UNTRUSTED_SOURCE');
  }
  const { mime, base64 } = parseDataUrl(dataUrl);
  const sourceHash = await sha256(sourceUrl);
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const file = sourceHash + '.' + extension;
  const previous = await readManifest(normalizedUid);

  await Filesystem.mkdir({
    path: userDir(normalizedUid),
    directory: Directory.LibraryNoCloud,
    recursive: true,
  }).catch(() => undefined);
  // Nowy plik ma nazwę content-addressed. Manifest jest zapisywany dopiero po
  // pełnym pliku, więc brak miejsca nie odcina działającej poprzedniej kopii.
  await Filesystem.writeFile({
    path: userDir(normalizedUid) + '/' + file,
    directory: Directory.LibraryNoCloud,
    data: base64,
    recursive: true,
  });
  const manifest: AvatarManifest = { version: CACHE_VERSION, sourceHash, file, mime };
  await Filesystem.writeFile({
    path: manifestPath(normalizedUid),
    directory: Directory.LibraryNoCloud,
    data: JSON.stringify(manifest),
    encoding: Encoding.UTF8,
    recursive: true,
  });

  if (previous && previous.file !== file) {
    void Filesystem.deleteFile({
      path: userDir(normalizedUid) + '/' + previous.file,
      directory: Directory.LibraryNoCloud,
    }).catch(() => undefined);
  }
  return dataUrl;
};

export const readCachedAvatar = async (uid: string, sourceUrl: string): Promise<string | null> => {
  const normalizedUid = safeUid(uid);
  if (!normalizedUid || !isTrustedAvatarCacheUrl(normalizedUid, sourceUrl)) return null;
  const manifest = await readManifest(normalizedUid);
  if (!manifest || manifest.sourceHash !== await sha256(sourceUrl)) return null;
  try {
    const result = await Filesystem.readFile({
      path: userDir(normalizedUid) + '/' + manifest.file,
      directory: Directory.LibraryNoCloud,
    });
    if (result.data instanceof Blob) return blobToDataUrl(result.data);
    return 'data:' + manifest.mime + ';base64,' + result.data;
  } catch {
    return null;
  }
};

export const cacheAvatarBlob = async (
  uid: string,
  sourceUrl: string,
  blob: Blob,
): Promise<string> => writeAvatarDataUrl(uid, sourceUrl, await thumbnailDataUrl(blob));

export const refreshCachedAvatar = async (uid: string, sourceUrl: string): Promise<string> => {
  if (!isTrustedAvatarCacheUrl(uid, sourceUrl)) throw new Error('AVATAR_CACHE_UNTRUSTED_SOURCE');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const blob = Capacitor.isNativePlatform()
      ? await nativeHttpBlob(sourceUrl, { maxBytes: MAX_SOURCE_BYTES })
      : await (async () => {
        const response = await fetch(sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('AVATAR_CACHE_FETCH_' + response.status);
        return response.blob();
      })();
    return await cacheAvatarBlob(uid, sourceUrl, blob);
  } finally {
    window.clearTimeout(timeout);
  }
};

export const purgeAvatarCache = async (uid: string): Promise<void> => {
  const normalizedUid = safeUid(uid);
  if (!normalizedUid) return;
  await Filesystem.rmdir({
    path: userDir(normalizedUid),
    directory: Directory.LibraryNoCloud,
    recursive: true,
  }).catch(() => undefined);
};
