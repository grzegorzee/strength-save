import { CapacitorHttp } from '@capacitor/core';

// X29 WP-E: natywny kanal pobierania zdjec — poza siecia WKWebView.
// Dowod z telemetrii produkcyjnej (client_errors 2026-08-22, iOS build 116):
// "body-compare-export-load: photo-load-failed getBlob=getBlob-timeout
// fetch=Load failed" — na urzadzeniu padaja OBA kanaly JS (SDK getBlob i
// fetch), bo oba przechodza przez warstwe sieciowa WKWebView z originu
// capacitor://localhost. CapacitorHttp wykonuje request natywnym stosem HTTP
// (URLSession/OkHttp), wiec nie podlega WKWebView ani CORS.

/** Pobiera obraz przez natywny stos HTTP (poza siecia WKWebView). */
export const nativeHttpBlob = async (url: string): Promise<Blob> => {
  const res = await CapacitorHttp.get({ url, responseType: 'blob' });
  if (res.status < 200 || res.status >= 300) throw new Error(`native-http-${res.status}`);
  // responseType 'blob' zwraca dane jako base64 string.
  const base64 = typeof res.data === 'string' ? res.data : '';
  if (!base64) throw new Error('native-http-empty');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const type = (res.headers?.['Content-Type'] ?? res.headers?.['content-type'] ?? 'image/jpeg') as string;
  return new Blob([bytes], { type });
};
