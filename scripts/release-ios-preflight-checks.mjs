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
  return distinct.length > 1
    ? { ok: false, reason: 'mismatch', values: distinct }
    : { ok: true, reason: 'consistent', values: distinct };
};
