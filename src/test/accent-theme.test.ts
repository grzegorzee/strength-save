// F-T2: kolor przewodni — kontrakt lib: tokeny CSS, persistencja, fallback.
// Plan I (2026-08-20): nowa paleta 11 kolorów wg wzoru właściciela, aliasy
// starych id (wsteczna kompatybilność localStorage + preferences.accentColor),
// automatyczny foreground per luminancja dla WSZYSTKICH akcentów.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCENTS,
  DEFAULT_ACCENT_ID,
  applyAccent,
  applyStoredAccent,
  getAccentById,
  getCurrentAccent,
  readStoredAccentId,
  storeAccentId,
} from '@/lib/accent-theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
});

describe('accent-theme (F-T2 + plan I)', () => {
  it('paleta: 11 akcentów, limonka domyślna i pierwsza, unikalne id', () => {
    expect(ACCENTS.length).toBe(11);
    expect(ACCENTS[0].id).toBe(DEFAULT_ACCENT_ID);
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(11);
  });

  it('paleta: dokładnie hexy wg wzoru właściciela (kolejność ustalona)', () => {
    expect(ACCENTS.map((a) => [a.id, a.hex])).toEqual([
      ['lime', '#cefc22'],
      ['sky', '#29b6f6'],
      ['indigo', '#5865f2'],
      ['violet', '#8b5cf6'],
      ['lavender', '#b478f1'],
      ['magenta', '#d946ef'],
      ['rose', '#f43f5e'],
      ['amber', '#f5a623'],
      ['emerald', '#10b981'],
      ['slate', '#64748b'],
      ['gray', '#8e8e93'],
    ]);
  });

  it('applyAccent ustawia --primary/--primary-light/--ring/--accent i data-accent', () => {
    // Świadoma zmiana kontraktu palety (plan I): cyan '187 86% 53%' zastąpiony
    // przez sky '199 92% 56%' (#29b6f6 wg wzoru właściciela).
    const sky = applyAccent('sky');
    const root = document.documentElement;
    expect(sky.hsl).toBe('199 92% 56%');
    expect(root.style.getPropertyValue('--primary')).toBe(sky.hsl);
    expect(root.style.getPropertyValue('--primary-light')).toBe(sky.lightHsl);
    expect(root.style.getPropertyValue('--ring')).toBe(sky.hsl);
    // Audyt akcentu (2026-08-20): --accent (chipy filtrów, badge secondary,
    // nagłówki sekcji text-accent) też podąża za kolorem przewodnim.
    expect(root.style.getPropertyValue('--accent')).toBe(sky.hsl);
    expect(root.dataset.accent).toBe('sky');
  });

  it('powrót do limonki zdejmuje nadpisania (czyste tokeny z index.css)', () => {
    applyAccent('sky');
    applyAccent('lime');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('');
    expect(root.style.getPropertyValue('--accent')).toBe('');
    expect(root.style.getPropertyValue('--accent-foreground')).toBe('');
    expect(root.dataset.accent).toBeUndefined();
  });

  // Wsteczna kompatybilność (plan I): userzy mają w localStorage i
  // preferences.accentColor stare id — każdy alias mapuje na nowy kolor.
  it.each([
    ['cyan', 'sky'],
    ['blue', 'sky'],
    ['purple', 'lavender'],
    ['pink', 'magenta'],
    ['red', 'rose'],
    ['orange', 'amber'],
    ['gold', 'amber'],
  ])('alias starego id: %s → %s', (legacy, target) => {
    expect(getAccentById(legacy).id).toBe(target);
    const applied = applyAccent(legacy);
    expect(applied.id).toBe(target);
    expect(document.documentElement.dataset.accent).toBe(target);
  });

  it('nieznany id = fallback do limonki (stary profil po usunięciu koloru z palety)', () => {
    expect(getAccentById('vantablack').id).toBe(DEFAULT_ACCENT_ID);
    const applied = applyAccent('vantablack');
    expect(applied.id).toBe(DEFAULT_ACCENT_ID);
  });

  it('persistencja: store/read round-trip + applyStoredAccent na boot', () => {
    storeAccentId('amber');
    expect(readStoredAccentId()).toBe('amber');
    applyStoredAccent();
    expect(document.documentElement.dataset.accent).toBe('amber');
    expect(getCurrentAccent().id).toBe('amber');
  });

  it('persistencja starego id: zapisany cyan aplikuje sky na boot', () => {
    storeAccentId('cyan');
    applyStoredAccent();
    expect(document.documentElement.dataset.accent).toBe('sky');
    expect(getCurrentAccent().id).toBe('sky');
  });

  // Plan I: foreground per luminancja dla WSZYSTKICH akcentów (nie tylko
  // custom). Ciemne akcenty dostają jasny tekst, jasne zostają z ciemnym.
  it('ciemne akcenty palety (indigo, slate) dostają jasny foreground', () => {
    applyAccent('indigo');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('0 0% 98%');
    expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('0 0% 98%');
    applyAccent('slate');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('0 0% 98%');
  });

  it('jasne akcenty palety (amber, sky, emerald, lavender) zostają z ciemnym tekstem', () => {
    // emerald (lum 0.36) i lavender (lum 0.29): ciemny tekst ma kontrast
    // 7.3:1 / 6.1:1, biały tylko 2.4:1 / 2.9:1 — dlatego próg 0.28, nie per kolor.
    for (const id of ['amber', 'sky', 'emerald', 'lavender']) {
      applyAccent(id);
      expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('');
    }
  });

  it('przejście ciemny → jasny akcent zdejmuje jasny foreground', () => {
    applyAccent('indigo');
    applyAccent('amber');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
  });

  // Rozszerzenie na życzenie właściciela (2026-08-20): dowolny kolor po #.
  it('własny hex: ustawia policzone tokeny HSL i data-accent=custom', () => {
    const applied = applyAccent('#2288ff');
    const root = document.documentElement;
    expect(applied.id).toBe('custom');
    expect(applied.hex).toBe('#2288ff');
    expect(root.dataset.accent).toBe('custom');
    expect(root.style.getPropertyValue('--primary')).toMatch(/^\d+ \d+% \d+%$/);
    expect(root.style.getPropertyValue('--primary-light')).toMatch(/^\d+ \d+% \d+%$/);
  });

  it('ciemny własny kolor dostaje jasny tekst na akcencie; jasny zostaje przy ciemnym', () => {
    applyAccent('#1a2a6c');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('0 0% 98%');
    expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('0 0% 98%');
    applyAccent('#cefc22');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('');
    applyAccent('#ffe066');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
  });

  it('własny hex przeżywa persistencję (getCurrentAccent zwraca custom)', () => {
    storeAccentId('#ff0066');
    expect(getCurrentAccent().id).toBe('custom');
    expect(getCurrentAccent().hex).toBe('#ff0066');
    applyStoredAccent();
    expect(document.documentElement.dataset.accent).toBe('custom');
  });

  it('niepoprawny hex = fallback do limonki', () => {
    expect(applyAccent('#12').id).toBe(DEFAULT_ACCENT_ID);
    expect(applyAccent('#gggggg').id).toBe(DEFAULT_ACCENT_ID);
  });

  it('isCustomAccentHex: walidacja #RRGGBB', async () => {
    const { isCustomAccentHex } = await import('@/lib/accent-theme');
    expect(isCustomAccentHex('#a1B2c3')).toBe(true);
    expect(isCustomAccentHex('a1b2c3')).toBe(false);
    expect(isCustomAccentHex('#abc')).toBe(false);
  });

  it('statusowe kolory nietknięte: apply nie rusza fitness-success/warning', () => {
    applyAccent('rose');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--fitness-success')).toBe('');
    expect(root.style.getPropertyValue('--fitness-warning')).toBe('');
    expect(root.style.getPropertyValue('--destructive')).toBe('');
  });
});
