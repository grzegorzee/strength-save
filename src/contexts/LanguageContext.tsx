import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  locales, detectLanguage, translate,
  type LanguageCode, type TranslationKey, type TParams,
} from '@/i18n';

const STORAGE_KEY = 'app-language';

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  /**
   * Tłumaczy klucz na tekst w bieżącym języku (fallback: PL, potem sam klucz).
   * Obsługuje interpolację: t('key.weekOf', { current: 4, total: 8 }) podstawia za {current}/{total}.
   */
  t: (key: TranslationKey, params?: TParams) => string;
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
    (key: TranslationKey, params?: TParams) => translate(lang, key, params),
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
