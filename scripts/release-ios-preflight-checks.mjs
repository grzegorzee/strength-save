// Czyste helpery preflightu iOS — wydzielone ze skryptu, by były testowalne bez side-effectów
// (readFileSync/throw/env). Używane przez release-ios-preflight.mjs i src/test.

/** Wszystkie wartości CURRENT_PROJECT_VERSION (build number) z treści project.pbxproj. */
export const extractBuildNumbers = (projectText) =>
  [...projectText.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((match) => match[1].trim());

/**
 * Sprawdza, czy wszystkie wystąpienia CURRENT_PROJECT_VERSION są obecne i równe sobie.
 * Zwraca { ok, reason, values } — values to lista RÓŻNYCH znalezionych wartości.
 */
export const findBuildNumberMismatch = (projectText) => {
  const values = extractBuildNumbers(projectText);
  if (values.length === 0) return { ok: false, reason: 'none', values: [] };
  const distinct = [...new Set(values)];
  if (values.length !== 6) return { ok: false, reason: 'unexpected-count', values: distinct };
  return distinct.length > 1
    ? { ok: false, reason: 'mismatch', values: distinct }
    : { ok: true, reason: 'consistent', values: distinct };
};

/**
 * Archiwum iOS może dostać wyłącznie publiczny, app-specific klucz Apple.
 * Odrzucamy klucze innej platformy, Test Store i sekretne API keys, zanim trafią
 * do nieodwracalnego artefaktu podpisanego.
 */
export const validateRevenueCatAppleApiKey = (candidate) => {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return { ok: false, reason: 'missing' };
  }
  if (candidate.startsWith('sk_')) return { ok: false, reason: 'secret-key' };
  if (candidate.startsWith('test_')) return { ok: false, reason: 'test-store' };
  if (candidate.startsWith('goog_')) return { ok: false, reason: 'wrong-platform' };
  if (!/^appl_[A-Za-z0-9]{12,}$/.test(candidate)) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, reason: 'valid' };
};
