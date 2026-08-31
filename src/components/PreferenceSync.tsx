import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { normalizeRestSettings, saveRestSettings } from '@/lib/rest-timer';
import { buildMigratedRestSettings, toRestPreference } from '@/lib/rest-preferences';
import { setWarmupPromptEnabled } from '@/lib/warmup-prompt';
import { applyAccent, claimStoredThemeOwner, storeAccentId } from '@/lib/accent-theme';
import { applyPaletteTheme, storePaletteTheme } from '@/lib/palette-theme';
import { resolvePalettePreference } from '@/lib/palette-preference-resolver';
import {
  flushPalettePreferenceOutbox,
  readPalettePreferenceOutbox,
} from '@/lib/palette-preference-outbox';
import { writePalettePreference } from '@/lib/palette-preference-cloud';

// Synchronizacja preferencji (jednostki, język, akcent, przerwy, dźwięk) z users/{uid}.preferences.
// localStorage zostaje cache per urządzenie; chmura jest źródłem prawdy między web i iOS.
// Cloud → local: raz po załadowaniu profilu. Local → cloud: przy każdej zmianie unit/lang.
// X35b: przerwy = preferences.rest (obiekt RestSettings); zapis local → cloud robi
// persistRestSettings (RestSettingsCard / WorkoutSettingsSheet), nie ten komponent.
export const PreferenceSync = () => {
  const { uid, profile } = useCurrentUser();
  const { unit, setUnit } = useUnit();
  const { lang, setLang } = useTranslation();
  const appliedUidRef = useRef<string | null>(null);
  const writeEnabledRef = useRef(false);

  useEffect(() => {
    if (!profile || !uid || appliedUidRef.current === uid) return;
    writeEnabledRef.current = false;
    claimStoredThemeOwner(uid);
    appliedUidRef.current = uid;
    const prefs = profile.preferences;
    if (prefs?.unit && prefs.unit !== unit) setUnit(prefs.unit);
    if (prefs?.language && prefs.language !== lang) setLang(prefs.language);
    // Kolor musi działać od pierwszego ekranu na świeżym urządzeniu, nie dopiero
    // po wejściu w Profil. Chmura jest źródłem prawdy; zapisujemy też cache,
    // żeby następny cold start/offline wyrenderował ten sam theme przed Reactem.
    const resolvedTheme = resolvePalettePreference(
      readPalettePreferenceOutbox(uid)?.palette,
      prefs?.paletteTheme,
      prefs?.accentColor,
    );
    if (resolvedTheme.kind === 'palette') {
      applyPaletteTheme(resolvedTheme.palette);
      storePaletteTheme(resolvedTheme.palette);
    } else if (resolvedTheme.kind === 'legacy') {
      applyAccent(resolvedTheme.accent);
      storeAccentId(resolvedTheme.accent);
    }
    try {
      if (typeof prefs?.timerSound === 'boolean') localStorage.setItem('timer-sound-enabled', String(prefs.timerSound));
    } catch {
      // localStorage niedostępny — preferencje i tak działają w tej sesji
    }
    // X37 WP-B: proponowanie rozgrzewki. Chmura -> cache (arkusz przed startem
    // czyta cache synchronicznie); brak pola = włączone, cache bez zmian.
    if (typeof prefs?.warmupPrompt === 'boolean') setWarmupPromptEnabled(prefs.warmupPrompt);
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
    // Zapisy do chmury dopiero PO zastosowaniu wartości z chmury (bez pętli i nadpisania defaultami).
    queueMicrotask(() => { writeEnabledRef.current = true; });
  }, [profile, uid, unit, lang, setUnit, setLang]);

  useEffect(() => {
    if (!uid) return;
    const retryPalettePreference = () => {
      void flushPalettePreferenceOutbox(uid, (patch, entry) => writePalettePreference(uid, patch, entry))
        .then((result) => {
          if (result !== 'stale') return;
          const cloudTheme = resolvePalettePreference(null, profile?.preferences?.paletteTheme, profile?.preferences?.accentColor);
          if (cloudTheme.kind === 'palette') {
            applyPaletteTheme(cloudTheme.palette);
            storePaletteTheme(cloudTheme.palette);
          } else if (cloudTheme.kind === 'legacy') {
            applyAccent(cloudTheme.accent);
            storeAccentId(cloudTheme.accent);
          }
        });
    };
    if (typeof navigator === 'undefined' || navigator.onLine !== false) retryPalettePreference();
    window.addEventListener('online', retryPalettePreference);
    return () => window.removeEventListener('online', retryPalettePreference);
  }, [profile?.preferences?.accentColor, profile?.preferences?.paletteTheme, uid]);

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
