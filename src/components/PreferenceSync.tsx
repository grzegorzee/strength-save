import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { applyAccent, hasStoredAccent, storeAccentId } from '@/lib/accent-theme';
import { deriveAccentFromAvatar, shouldAutoDeriveAccent } from '@/lib/avatar-accent';
import { normalizeRestSettings, saveRestSettings } from '@/lib/rest-timer';
import { buildMigratedRestSettings, toRestPreference } from '@/lib/rest-preferences';

// Synchronizacja preferencji (jednostki, język, przerwy, dźwięk) z users/{uid}.preferences.
// localStorage zostaje cache per urządzenie; chmura jest źródłem prawdy między web i iOS.
// Cloud → local: raz po załadowaniu profilu. Local → cloud: przy każdej zmianie unit/lang.
// X35b: przerwy = preferences.rest (obiekt RestSettings); zapis local → cloud robi
// persistRestSettings (RestSettingsCard / WorkoutSettingsSheet), nie ten komponent.
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
      if (typeof prefs?.timerSound === 'boolean') localStorage.setItem('timer-sound-enabled', String(prefs.timerSound));
    } catch {
      // localStorage niedostępny — preferencje i tak działają w tej sesji
    }
    // X35b: przerwy. Chmura ma preferences.rest -> cache. Brak pola -> migracja
    // RAZ z legacy restTimerSec albo z cache tego urządzenia (custom: true, żeby
    // start cyklu nie nadpisał świadomego wyboru); świeży user bez zapisów = nic.
    if (prefs?.rest && typeof prefs.rest === 'object') {
      saveRestSettings(normalizeRestSettings(prefs.rest));
    } else if (uid) {
      const migrated = buildMigratedRestSettings(prefs);
      if (migrated) {
        saveRestSettings(migrated);
        updateDoc(doc(db, 'users', uid), { 'preferences.rest': toRestPreference(migrated) }).catch(() => {
          // offline — cache wystarczy, następny zapis przerw dosynchronizuje
        });
      }
    }
    // X29 WP-H: automat akcentu z avatara — TYLKO gdy user nie ma ŻADNEGO
    // wyboru (brak mirroru w profilu ORAZ brak wpisu w localStorage). Fire &
    // forget: nie blokuje reszty efektu, każdy problem = cichy fail (limonka).
    if (uid && shouldAutoDeriveAccent(prefs, hasStoredAccent(), profile.photoURL)) {
      deriveAccentFromAvatar(profile.photoURL)
        .then((accentId) => {
          // Re-check: user mógł wybrać kolor, zanim avatar się pobrał.
          if (!accentId || hasStoredAccent()) return;
          applyAccent(accentId);
          storeAccentId(accentId);
          return updateDoc(doc(db, 'users', uid), { 'preferences.accentColor': accentId });
        })
        .catch(() => {
          // Cichy fail (sieć/uprawnienia) — zostaje limonka.
        });
    }
    // Zapisy do chmury dopiero PO zastosowaniu wartości z chmury (bez pętli i nadpisania defaultami).
    queueMicrotask(() => { writeEnabledRef.current = true; });
  }, [profile, uid, unit, lang, setUnit, setLang]);

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
