import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/asc_subscriptions.py', 'utf8');

describe('Z207 — App Store subscription source of truth', () => {
  it('uses the approved monthly price and seven-day trial', () => {
    expect(source).toMatch(/"monthly":\s*\{[\s\S]*?"trial": "ONE_WEEK"/);
    expect(source).toMatch(/"monthly":\s*\{[\s\S]*?"price_pl": "14\.99"/);
    expect(source).toMatch(/"monthly":\s*\{[\s\S]*?"price_us": "3\.99"/);
  });

  it('uses the approved yearly price and fourteen-day trial', () => {
    expect(source).toMatch(/"yearly":\s*\{[\s\S]*?"trial": "TWO_WEEKS"/);
    expect(source).toMatch(/"yearly":\s*\{[\s\S]*?"price_pl": "119\.99"/);
    expect(source).toMatch(/"yearly":\s*\{[\s\S]*?"price_us": "31\.99"/);
    expect(source).not.toMatch(/5 months free|5 miesięcy gratis/i);
  });

  it('requires a dry-run and replaces immutable introductory offers safely', () => {
    expect(source).toContain('"dry-run": cmd_dry_run');
    expect(source).toContain('"apply": cmd_apply');
    expect(source).toContain('DELETE", f"/v1/subscriptionIntroductoryOffers/');
    expect(source).toContain('preserveCurrentPrice');
  });
});
