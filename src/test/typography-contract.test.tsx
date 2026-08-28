import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider, useTranslation } from '@/contexts/LanguageContext';

const LanguageProbe = () => {
  const { lang, setLang } = useTranslation();
  return <button onClick={() => setLang(lang === 'pl' ? 'en' : 'pl')}>{lang}</button>;
};

describe('kontrakt typografii i języka dokumentu', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    document.documentElement.lang = 'pl';
  });

  it('zmiana języka UI aktualizuje html.lang dla VoiceOver/TalkBack', () => {
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);
    expect(document.documentElement.lang).toBe('pl');
    fireEvent.click(screen.getByRole('button', { name: 'pl' }));
    expect(document.documentElement.lang).toBe('en');
  });

  it('fonty są self-hosted i cold start nie zależy od Google Fonts', () => {
    const html = readFileSync('index.html', 'utf8');
    const main = readFileSync('src/main.tsx', 'utf8');
    const fonts = readFileSync('src/fonts.css', 'utf8');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(main).toContain('./fonts.css');
    expect(fonts).toContain('@fontsource-variable/inter');
    expect(fonts).toContain('@fontsource-variable/space-grotesk');
    expect(fonts).not.toMatch(/cyrillic|greek|vietnamese/);
  });

  it('body używa dokładnej nazwy osadzonego Inter Variable zamiast niezaładowanego Inter', () => {
    const styles = readFileSync('src/index.css', 'utf8');
    const fonts = readFileSync('src/fonts.css', 'utf8');
    expect(fonts).toContain("font-family: 'Inter Variable'");
    expect(styles).toMatch(/body\s*\{[^}]*font-family:\s*'Inter Variable'/s);
    expect(styles).not.toMatch(/body\s*\{[^}]*font-family:\s*'Inter',/s);
  });

  it('krytyczne etykiety treningu i analityki mają minimum 11 px bez przygaszania kontrastu', () => {
    for (const path of [
      'src/components/ExerciseCard.tsx',
      'src/components/RzaMetricsCard.tsx',
      'src/components/HybridWeekStrip.tsx',
      'src/pages/Profile.tsx',
      'src/components/AppNavigation.tsx',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|9|10)px\][^"']*text-muted-foreground\/(?:40|50|60|70)/);
    }
  });

  it('krytyczne etykiety sesji i historii nie schodzą poniżej 11 px', () => {
    const criticalSurfaces = [
      'src/pages/WorkoutDay.tsx',
      'src/components/ExerciseCard.tsx',
      'src/components/history/CycleTile.tsx',
      'src/components/history/HistorySessionRow.tsx',
    ];

    for (const path of criticalSurfaces) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/);
    }
  });

  it('telefon landscape zachowuje mobilną powłokę i input 16 px', () => {
    expect(readFileSync('src/components/AppNavigation.tsx', 'utf8')).not.toContain('md:');
    expect(readFileSync('src/components/Layout.tsx', 'utf8')).not.toContain('md:');
    expect(readFileSync('src/components/ui/input.tsx', 'utf8')).not.toContain('md:text-sm');
  });

  it('Postępy mają tylko tytuł AppHeader i bez faux headingu w treści', () => {
    const source = readFileSync('src/pages/Achievements.tsx', 'utf8');
    expect(source).not.toContain('<h1 className="text-2xl font-heading font-bold uppercase italic');
    expect(source).not.toContain('<h2 className="text-xl font-heading font-bold uppercase tracking-tight">');
  });

  it('Space Grotesk nie używa syntetycznych italic ani wag ponad 700', () => {
    for (const path of [
      'src/pages/Analytics.tsx', 'src/pages/Cycles.tsx', 'src/pages/Paywall.tsx',
      'src/components/PlanWizard.tsx', 'src/components/LivePRCelebration.tsx',
      'src/components/analytics/MonthlyOverviewCard.tsx',
      'src/pages/admin/AdminDashboard.tsx', 'src/pages/admin/AdminUserDetail.tsx',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/className="[^"]*font-heading[^"]*(?:italic|font-black|font-extrabold)/);
    }

    const wizard = readFileSync('src/components/PlanWizard.tsx', 'utf8');
    expect(wizard).not.toMatch(/font-heading[\s\S]{0,180}className="[^"]*\bitalic\b/);
  });
});
