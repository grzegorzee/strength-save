import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';

// Synchronizacja preferencji (jednostki, język, timer, dźwięk) z users/{uid}.preferences.
// localStorage zostaje cache per urządzenie; chmura jest źródłem prawdy między web i iOS.
// Cloud → local: raz po załadowaniu profilu. Local → cloud: przy każdej zmianie unit/lang.
export const PreferenceSync = () => {
  const { uid, profile } = useCurrentUser();
  const { unit, setUnit } = useUnit();
  const { lang, setLang } = useTranslation();
  const appliedRef = useRef(false);
  const writeEnabledRef = useRef(false);

  useEffect(() => {
    if (!profile || appliedRef.current) return;
    appliedRef.current = true;
    const prefs = profile.preferences;
    if (prefs?.unit && prefs.unit !== unit) setUnit(prefs.unit);
    if (prefs?.language && prefs.language !== lang) setLang(prefs.language);
    try {
      if (typeof prefs?.restTimerSec === 'number') localStorage.setItem('rest-timer-default', String(prefs.restTimerSec));
      if (typeof prefs?.timerSound === 'boolean') localStorage.setItem('timer-sound-enabled', String(prefs.timerSound));
    } catch {
      // localStorage niedostępny — preferencje i tak działają w tej sesji
    }
    // Zapisy do chmury dopiero PO zastosowaniu wartości z chmury (bez pętli i nadpisania defaultami).
    queueMicrotask(() => { writeEnabledRef.current = true; });
  }, [profile, unit, lang, setUnit, setLang]);

  useEffect(() => {
    if (!uid || !writeEnabledRef.current) return;
    // Top-level language też — czyta go komunikacja serwerowa (push, digest).
    updateDoc(doc(db, 'users', uid), {
      'preferences.unit': unit,
      'preferences.language': lang,
      language: lang,
    }).catch(() => {
      // Brak sieci — następna zmiana albo następna sesja dosynchronizuje.
    });
  }, [uid, unit, lang]);

  return null;
};
