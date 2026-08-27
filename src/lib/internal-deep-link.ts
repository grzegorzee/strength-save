const containsControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/**
 * Zdarzenia w inboxie mogą zawierać wyłącznie ścieżki wewnątrz aplikacji.
 * Odrzucamy URL-e absolutne, protocol-relative oraz warianty kodowane, które
 * przeglądarka może znormalizować do innego originu.
 */
export const safeInternalDeepLink = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || value.trim() !== value || containsControlCharacter(value)) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  // Inbox nie potrzebuje literalnego, zakodowanego znaku `%`. Odrzucenie `%25`
  // zamyka podwójnie kodowane `%252f`/`%255c`, zanim router lub WebView wykona
  // kolejną normalizację ścieżki.
  if (/%25/i.test(value)) return null;

  try {
    const decoded = decodeURIComponent(value);
    if (
      containsControlCharacter(decoded)
      || !decoded.startsWith('/')
      || decoded.startsWith('//')
      || decoded.includes('\\')
    ) return null;
  } catch {
    return null;
  }

  return value;
};
