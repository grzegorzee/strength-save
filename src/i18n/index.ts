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

/** Wykrywa język urządzenia, jeśli wspierany; inaczej domyślny. */
export const detectLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === nav) ? (nav as LanguageCode) : DEFAULT_LANGUAGE;
};
