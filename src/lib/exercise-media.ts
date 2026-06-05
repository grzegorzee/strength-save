/**
 * Warstwa mediów ćwiczeń.
 *
 * Wcześniej osadzaliśmy filmy z YouTube, ale w natywnym WebView (Capacitor iOS)
 * odtwarzacz YouTube rzuca "Error 153" i nie działa. Przeszliśmy na własne
 * animacje hostowane na CDN.
 *
 * Konwencja: pliki nazywamy slugiem ćwiczenia, np.
 *   "Przysiad ze sztangą (Low Bar)" -> przysiad-ze-sztanga-low-bar.mp4
 * i wrzucamy do katalogu `exercises/` na CDN. Po wrzuceniu pliku dodajemy jego
 * slug do mapy `ANIMATION_FILES` poniżej (jedna linia). Dopóki ćwiczenie nie ma
 * animacji, funkcja zwraca null i UI pokazuje placeholder + opis.
 */

const CDN_BASE = 'https://store.gjasionowicz.pl/exercises';

const POLISH_CHARS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/**
 * Slugi ćwiczeń, dla których wgrano animację na CDN (klucz = slug, wartość =
 * nazwa pliku). Pusta na start — uzupełniana w miarę dodawania plików.
 * Przykład: 'przysiad-ze-sztanga-low-bar': 'przysiad-ze-sztanga-low-bar.mp4'
 */
const ANIMATION_FILES: Record<string, string> = {};

/** Zamienia nazwę ćwiczenia na slug (bez polskich znaków, spacje -> myślniki). */
export const slugifyExercise = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => POLISH_CHARS[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/** Zwraca URL animacji ćwiczenia z CDN albo null, jeśli pliku jeszcze nie ma. */
export const getExerciseAnimationUrl = (name?: string): string | null => {
  const slug = slugifyExercise(name);
  const file = slug ? ANIMATION_FILES[slug] : undefined;
  return file ? `${CDN_BASE}/${file}` : null;
};
