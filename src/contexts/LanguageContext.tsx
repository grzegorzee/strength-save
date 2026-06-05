import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  locales, detectLanguage, DEFAULT_LANGUAGE,
  type LanguageCode, type TranslationKey,
} from '@/i18n';

const STORAGE_KEY = 'app-language';

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  /** Tłumaczy klucz na tekst w bieżącym języku (fallback: PL, potem sam klucz). */
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && locales[saved]) return saved;
    } catch { /* ignore */ }
    return detectLanguage();
  });

  const setLang = useCallback((l: LanguageCode) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => locales[lang][key] ?? locales[DEFAULT_LANGUAGE][key] ?? key,
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
};
