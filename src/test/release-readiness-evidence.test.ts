import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type AuditEvidence = { checks: Record<string, string> };

const REPORT_PATH = 'docs/RELEASE-READINESS-2026-08-27.md';
const AUDIT_PATH = 'audit/latest.json';

const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as AuditEvidence;
const report = readFileSync(REPORT_PATH, 'utf8');

const results = (value: string | undefined) => value?.match(/\d+\/\d+/g) ?? [];

describe('release-readiness uses one canonical evidence snapshot', () => {
  it('current gate summary mirrors the machine-readable audit', () => {
    for (const value of [audit.checks.vitest, audit.checks.chromium_e2e, audit.checks.webkit_e2e ?? audit.checks.webkit_critical]) {
      for (const result of results(value)) expect(report).toContain(result);
    }
    const backend = audit.checks.functions ?? audit.checks.functions_and_rules;
    for (const result of results(backend)) expect(report).toContain(result);
  });

  it('does not label superseded X65 evidence as the current candidate', () => {
    expect(report).not.toContain('Bieżący Vitest ma\n3791/3791');
    expect(report).not.toContain('Fresh audit X65 ma score 9,3');
    expect(report).not.toContain('kandydatem X63/X64');
  });

  it('names X68 and the manifest boundary for the current candidate', () => {
    expect(report).toContain('Delta X68');
    expect(report).toContain('manifest');
    expect(report).toContain('3822/3822');
  });
});
