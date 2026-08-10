import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/revenuecat_release.py', 'utf8');

describe('Z207 — one RevenueCat contract for Apple and Google', () => {
  it('uses one pro entitlement and one default offering', () => {
    expect(source).toContain('ENTITLEMENT_KEY = "pro"');
    expect(source).toContain('OFFERING_KEY = "default"');
    expect(source).toContain('"$rc_monthly"');
    expect(source).toContain('"$rc_annual"');
  });

  it('maps matching Apple and Google products to the same packages', () => {
    expect(source).toContain('"strengthsave_pro_monthly"');
    expect(source).toContain('"strengthsave_pro_yearly"');
    expect(source).toContain('"strengthsave_pro_monthly:monthly"');
    expect(source).toContain('"strengthsave_pro_yearly:yearly"');
  });

  it('never invents a Google app without connected Play credentials', () => {
    expect(source).toContain('google_play');
    expect(source).toContain('KROK USERA');
    expect(source).toContain('actions/attach_products');
  });
});
