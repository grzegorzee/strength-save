// Normalizacja tekstu do wyszukiwania: bez wielkości liter i bez polskich znaków
// diakrytycznych (ą→a, ł→l, itd.), żeby "lawce" znajdowało "ławce".

export const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // łączące znaki diakrytyczne (ą, ę, ć, ś, ź, ó, ń)
    .replace(/ł/g, 'l')             // ł nie rozkłada się w NFD — mapujemy ręcznie
    .trim();

/**
 * Czy zapytanie pasuje do któregokolwiek z podanych pól (nazwa PL/EN, kategoria).
 * Puste zapytanie pasuje do wszystkiego.
 */
export const matchesQuery = (query: string, fields: (string | undefined)[]): boolean => {
  const q = normalizeText(query);
  if (!q) return true;
  return fields.some((f) => f != null && normalizeText(f).includes(q));
};
