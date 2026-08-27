import { describe, expect, it } from 'vitest';
// @ts-expect-error — moduł .mjs bez typów (skrypt release), importowany dla testu czystej logiki.
import { extractBuildNumbers, findBuildNumberMismatch } from '../../scripts/release-ios-preflight-checks.mjs';

// #10/Z12: preflight nie sprawdzał spójności CURRENT_PROJECT_VERSION (build number).
// Bump ręczny może rozjechać 6 wystąpień; bramka ma to wyłapać przed archiwizacją.
const pbxproj = (a: number | string, b: number | string) => `
  buildSettings = {
    CURRENT_PROJECT_VERSION = ${a};
    MARKETING_VERSION = 6.13.0;
  };
  buildSettings = {
    CURRENT_PROJECT_VERSION = ${b};
    MARKETING_VERSION = 6.13.0;
  };
`;

const projectWithBuilds = (...values: Array<number | string>) =>
  values
    .map((value) => `buildSettings = { CURRENT_PROJECT_VERSION = ${value}; MARKETING_VERSION = 1.0.0; };`)
    .join('\n');

const completePbxproj = (value: number | string) => projectWithBuilds(...Array(6).fill(value));

describe('release-ios-preflight — spójność CURRENT_PROJECT_VERSION (#10 Z12)', () => {
  it('wyłuskuje wszystkie wystąpienia build numbera', () => {
    expect(extractBuildNumbers(pbxproj(46, 46))).toEqual(['46', '46']);
  });

  it('przechodzi przy spójnych build numberach', () => {
    expect(findBuildNumberMismatch(completePbxproj(46))).toEqual({
      ok: true,
      reason: 'consistent',
      values: ['46'],
    });
  });

  it('faila gdy liczba wystąpień nie jest równa sześciu', () => {
    expect(findBuildNumberMismatch(pbxproj(46, 46))).toEqual({
      ok: false,
      reason: 'unexpected-count',
      values: ['46'],
    });
  });

  it('faila przy rozjeździe build numberów', () => {
    const res = findBuildNumberMismatch(projectWithBuilds(46, 46, 46, 46, 46, 45));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('mismatch');
    expect([...res.values].sort()).toEqual(['45', '46']);
  });

  it('faila gdy brak CURRENT_PROJECT_VERSION', () => {
    expect(findBuildNumberMismatch('brak build numberów').ok).toBe(false);
  });
});
