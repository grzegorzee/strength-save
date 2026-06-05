import { pl } from './locales/pl';
import { en } from './locales/en';

// Rejestr języków. Aby dodać kolejny język: utwórz ./locales/<code>.ts z tymi
// samymi kluczami co pl.ts, zaimportuj go i dopisz wpis tutaj. Reszta apki
// (przełącznik w Profilu, t()) zadziała automatycznie.
export const LANGUAGES = [
  { code: 'pl', label: 'Polski' },
  { code: 'en', label: 'English' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type TranslationKey = keyof typeof pl;

export const DEFAULT_LANGUAGE: LanguageCode = 'pl';

export const locales: Record<LanguageCode, Record<TranslationKey, string>> = { pl, en };

/** Wartości podstawiane za {placeholder} w tłumaczeniu. */
export type TParams = Record<string, string | number>;

/**
 * Czysta funkcja tłumacząca (bez Reacta) — używana zarówno przez LanguageContext.t,
 * jak i przez warstwę lib/ (która nie ma dostępu do hooka). Obsługuje interpolację {placeholder}.
 */
export const translate = (lang: LanguageCode, key: TranslationKey, params?: TParams): string => {
  const template = locales[lang]?.[key] ?? locales[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{${name}}`,
  );
};

/** Locale do formatowania dat/liczb wg języka UI. */
export const dateLocale = (lang: LanguageCode): string => (lang === 'en' ? 'en-US' : 'pl-PL');

/** Wykrywa język urządzenia, jeśli wspierany; inaczej domyślny. */
export const detectLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === nav) ? (nav as LanguageCode) : DEFAULT_LANGUAGE;
};
