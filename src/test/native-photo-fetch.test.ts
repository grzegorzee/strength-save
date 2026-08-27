// X29 WP-E: natywny kanal pobierania zdjec (CapacitorHttp) — poza siecia
// WKWebView. Dowod z telemetrii produkcyjnej (client_errors 2026-08-22, iOS
// build 116): "body-compare-export-load: photo-load-failed
// getBlob=getBlob-timeout fetch=Load failed" — na urzadzeniu padaja OBA kanaly
// JS (SDK getBlob i fetch), bo oba ida przez warstwe sieciowa WKWebView z
// originu capacitor://localhost. nativeHttpBlob pobiera bajty natywnym stosem
// HTTP i dekoduje base64 → Blob.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorHttpGetMock = vi.hoisted(() => vi.fn());
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get: capacitorHttpGetMock } }));

import { nativeHttpBlob } from '@/lib/native-photo-fetch';

const PHOTO_URL = 'https://firebasestorage.googleapis.com/v0/b/app/o/photo.jpg?alt=media';

const okResponse = (over: Record<string, unknown> = {}) => ({
  status: 200,
  data: btoa('native'),
  headers: { 'Content-Type': 'image/png' } as Record<string, string>,
  url: PHOTO_URL,
  ...over,
});

beforeEach(() => {
  capacitorHttpGetMock.mockReset();
});

// jsdom Blob nie ma .text() — odczyt przez FileReader.
const readBlobText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe('nativeHttpBlob (X29 WP-E)', () => {
  it('wola CapacitorHttp.get z url i responseType blob', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse());
    await nativeHttpBlob(PHOTO_URL);
    expect(capacitorHttpGetMock).toHaveBeenCalledWith({ url: PHOTO_URL, responseType: 'blob' });
  });

  it('dekoduje base64 do Blobu z typem z naglowka Content-Type', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse());
    const blob = await nativeHttpBlob(PHOTO_URL);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(6);
    expect(await readBlobText(blob)).toBe('native');
  });

  it('honoruje naglowek content-type pisany malymi literami', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse({ headers: { 'content-type': 'image/webp' } }));
    const blob = await nativeHttpBlob(PHOTO_URL);
    expect(blob.type).toBe('image/webp');
  });

  it('brak naglowka Content-Type → fallback image/jpeg', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse({ headers: {} }));
    const blob = await nativeHttpBlob(PHOTO_URL);
    expect(blob.type).toBe('image/jpeg');
  });

  it('status poza 2xx → Error native-http-<status> (fallback przejmuje u rodzica)', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse({ status: 404 }));
    await expect(nativeHttpBlob(PHOTO_URL)).rejects.toThrow('native-http-404');

    capacitorHttpGetMock.mockResolvedValue(okResponse({ status: 500 }));
    await expect(nativeHttpBlob(PHOTO_URL)).rejects.toThrow('native-http-500');
  });

  it('pusta odpowiedz (data pusty string lub nie-string) → native-http-empty', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse({ data: '' }));
    await expect(nativeHttpBlob(PHOTO_URL)).rejects.toThrow('native-http-empty');

    capacitorHttpGetMock.mockResolvedValue(okResponse({ data: { not: 'a-string' } }));
    await expect(nativeHttpBlob(PHOTO_URL)).rejects.toThrow('native-http-empty');
  });

  it('limit bajtów odrzuca odpowiedź przed dekodowaniem base64', async () => {
    capacitorHttpGetMock.mockResolvedValue(okResponse({
      data: btoa('123456'),
      headers: { 'Content-Type': 'image/png', 'Content-Length': '6' },
    }));
    await expect(nativeHttpBlob(PHOTO_URL, { maxBytes: 5 })).rejects.toThrow('native-http-too-large');
  });
});
