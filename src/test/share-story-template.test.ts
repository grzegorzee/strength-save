import { describe, expect, it } from 'vitest';
import { buildShareHtmlStory, type ShareData } from '@/lib/share-utils';

// Runna pakiet 1, krok 5 (spec A4): szablon story 1080x1920 wg raportu cz. 2
// sekcja 3.2 — hero-statystyka WYBIERANA przez usera (tonaż / PR / czas),
// rząd 3 liczb, pasek "Tydzień N z M", brand. Brzeg: brak PR = hero tonaż.

const data = (overrides: Partial<ShareData> = {}): ShareData => ({
  dayName: 'Push',
  date: '2026-08-12',
  exercises: [{ name: 'Wyciskanie', sets: '3x 100' }],
  tonnage: 4300,
  duration: '58:30',
  prs: ['Wyciskanie 102,5 kg'],
  streak: 4,
  completedSets: 18,
  week: { current: 6, total: 12 },
  ...overrides,
});

describe('buildShareHtmlStory', () => {
  it('hero tonaż: wielka liczba tonażu w limonce', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'tonnage');
    expect(html).toContain('4.3 t');
    expect(html).toContain('#cefc22');
  });

  it('hero PR: pokazuje pierwszy rekord sesji', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'pr');
    expect(html).toContain('Wyciskanie 102,5 kg');
  });

  it('brzeg: hero PR bez rekordów degraduje do tonażu', () => {
    const html = buildShareHtmlStory(data({ prs: [] }), 'pl', 'kg', 'pr');
    expect(html).toContain('4.3 t');
  });

  it('hero czas: pokazuje duration sesji', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'duration');
    expect(html).toContain('58:30');
  });

  it('pasek postępu planu "Tydzień N z M" gdy dane tygodnia są, brak = bez paska', () => {
    expect(buildShareHtmlStory(data(), 'pl', 'kg', 'tonnage')).toContain('Tydzień 6 z 12');
    expect(buildShareHtmlStory(data({ week: null }), 'pl', 'kg', 'tonnage')).not.toContain('Tydzień');
  });

  it('rząd 3 statystyk (czas / serie / ćwiczenia) i brand', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'tonnage');
    expect(html).toContain('18');
    expect(html).toContain('strengthsave.app');
  });

  it('escapuje treści usera', () => {
    const html = buildShareHtmlStory(data({ dayName: '<img src=x>' }), 'pl', 'kg', 'tonnage');
    expect(html).not.toContain('<img src=x>');
  });

  // E-T2 (zgłoszenie z buildu 107): tonaż i czas widoczne RAZEM przy każdym hero.
  it('hero czas: tonaż nadal widoczny w rzędzie statystyk', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'duration');
    expect(html).toContain('58:30');
    expect(html).toContain('4.3 t');
  });

  it('hero PR: tonaż i czas oba widoczne w rzędzie statystyk', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'pr');
    expect(html).toContain('4.3 t');
    expect(html).toContain('58:30');
  });

  it('nagłówek bez zdublowanego dnia tygodnia (Czwartek, czwartek...)', () => {
    // 2026-08-20 to czwartek; dayName z planu też 'Czwartek'.
    const html = buildShareHtmlStory(data({ dayName: 'Czwartek', date: '2026-08-20' }), 'pl', 'kg', 'tonnage');
    expect(html).not.toMatch(/Czwartek, czwartek/i);
    expect(html).toContain('Czwartek, 20 sierpnia');
  });

  it('karta story zawiera listę ćwiczeń (wypełnia ramę treścią)', () => {
    const html = buildShareHtmlStory(data(), 'pl', 'kg', 'tonnage');
    expect(html).toContain('Wyciskanie');
    expect(html).toContain('3x 100');
  });
});
