import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Connect IQ Store: uprawnienia z manifestu, uzasadnienia w listingu i wersja
// paczki .iq muszą mówić to samo (App Review Guidelines 3c/4a: minimalizacja
// danych i dokładny opis). Uprawnienie bez użycia modułu w kodzie = fałszywe
// uzasadnienie w Store.
const read = (path: string): string => readFileSync(path, 'utf8');
const manifest = read('garmin/manifest.xml');
const permissions = [...manifest.matchAll(/<iq:uses-permission id="([A-Za-z]+)"\/>/g)].map((m) => m[1]);
const appVersion = manifest.match(/<iq:application[^>]*\sversion="(\d+\.\d+\.\d+)"/)?.[1];
const monkeyC = ['Api', 'AppSettings', 'Brand', 'DayView', 'EventQueue', 'ExerciseView', 'PairView',
  'SessionRecorder', 'SessionView', 'StrengthSaveApp', 'WorkoutState']
  .map((name) => read(`garmin/source/${name}.mc`))
  .join('\n');

// Moduły Toybox objęte uprawnieniem (docs SDK 9.2.0, Manifest_and_Permissions).
const MODULE_BY_PERMISSION: Record<string, RegExp> = {
  Communications: /Toybox\.Communications|Communications\.makeWebRequest/,
  Fit: /Toybox\.ActivityRecording|Toybox\.FitContributor/,
  Sensor: /Toybox\.Sensor\b|Sensor\.setEnabledSensors|Sensor\.enableSensorEvents/,
  UserProfile: /Toybox\.UserProfile|UserProfile\.getProfile/,
};

describe('Garmin Connect IQ release contract', () => {
  it('declares an explicit SemVer app version that matches the recorded artifact', () => {
    expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    const artifact = JSON.parse(read('garmin/release/artifact.json')) as { appVersion?: string };
    expect(artifact.appVersion).toBe(appVersion);
  });

  it('requests only permissions whose Toybox module the watch code actually uses', () => {
    expect(permissions.length).toBeGreaterThan(0);
    for (const permission of permissions) {
      expect(MODULE_BY_PERMISSION[permission], `unknown permission ${permission}`).toBeDefined();
      expect(monkeyC, `${permission} declared but unused`).toMatch(MODULE_BY_PERMISSION[permission]);
    }
  });

  it('points the pairing screen at the real phone location of the pairing code', () => {
    // Kod parowania żyje w Profil > Urządzenia i połączenia (Profile.tsx, sekcja devices).
    // Recenzent Store zaczyna od tego ekranu, więc stara ścieżka "Ustawienia" = ślepy zaułek.
    for (const [strings, locale] of [
      ['garmin/resources/strings/strings.xml', 'src/i18n/locales/en.ts'],
      ['garmin/resources-pol/strings/strings.xml', 'src/i18n/locales/pl.ts'],
    ]) {
      const hint = read(strings).match(/<string id="PairHint">([^<]+)<\/string>/)?.[1] ?? '';
      const phone = read(locale);
      const profile = phone.match(/'nav\.profile': '([^']+)'/)?.[1] ?? '';
      const devices = phone.match(/'profile\.section\.devicesConnections': '([^']+)'/)?.[1] ?? '';
      expect(profile.length).toBeGreaterThan(0);
      expect(hint, strings).toBe(`${profile} &gt; ${devices.split(/ (?:i|&) /)[0]}`);
    }
  });

  it('justifies exactly the manifest permissions in both Store listings', () => {
    for (const listing of ['garmin/release/listing-pl.md', 'garmin/release/listing-en.md']) {
      const text = read(listing);
      const section = text.split(/^## (?:Uprawnienia|Permissions)$/m)[1]?.split(/^## /m)[0] ?? '';
      const justified = [...section.matchAll(/^- \*\*([A-Za-z]+)\*\*/gm)].map((m) => m[1]);
      expect(justified.sort(), listing).toEqual([...permissions].sort());
    }
  });

  // Zakaz właściciela (2026-09-30): nigdzie nie promujemy wersji webowej.
  it('Store listings never mention a web or browser version', () => {
    for (const listing of ['garmin/release/listing-pl.md', 'garmin/release/listing-en.md']) {
      const text = read(listing);
      expect(text, listing).not.toMatch(/app\.strengthsave\.app|\bweb\b|przeglądar|browser/i);
    }
  });
});
