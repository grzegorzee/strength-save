import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/TrainingPlan.tsx'), 'utf8');

describe('TrainingPlan: kontrakt mobilnych kontrolek', () => {
  it('miesięczne strzałki mają natywny typ, etykiety, focus ring i co najmniej 44px target', () => {
    const controls = source.match(/<button[^>]*onClick=\{(?:prevMonth|nextMonth)\}[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control).toContain('type="button"');
      expect(control).toContain('aria-label={t(');
      expect(control).toMatch(/min-w-11/);
      expect(control).toMatch(/min-h-11/);
      expect(control).toContain('focus-visible:outline');
    }
  });

  it('nawigacja tygodnia ma 44px target, typ, etykietę i widoczny fokus', () => {
    const controls = source.match(/<button(?:(?!<button)[\s\S])*?aria-label=\{t\('trainingplan\.(?:prevWeek|nextWeek)'\)\}[\s\S]*?<\/button>/g) ?? [];
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control).toContain('type="button"');
      expect(control).toContain('min-w-11');
      expect(control).toContain('min-h-11');
      expect(control).toContain('focus-visible:outline');
    }
  });

  it('akcje trybu pokazują stan aktywny semantycznie i zachowują obrys fokusu', () => {
    const controls = [
      source.match(/<button(?=[^>]*data-testid="plan-reduced-open")[^>]*>[\s\S]*?<\/button>/)?.[0],
      source.match(/<button(?=[^>]*data-testid="plan-vacation-open")[^>]*>[\s\S]*?<\/button>/)?.[0],
    ];
    for (const control of controls) {
      expect(control).toBeDefined();
      expect(control).toContain('aria-pressed=');
      expect(control).toContain('focus-visible:outline');
      expect(control).toMatch(/border(?:-[^ ]+)?/);
    }
  });
});
