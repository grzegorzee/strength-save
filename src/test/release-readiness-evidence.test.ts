import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type AuditEvidence = {
  checks: {
    vitest: string;
    functions: string;
    firestore_storage_rules: string;
    chromium_e2e: string;
    webkit_e2e: string;
  };
};

const REPORT_PATH = 'docs/RELEASE-READINESS-2026-08-27.md';
const AUDIT_PATH = 'audit/latest.json';

const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8')) as AuditEvidence;
const report = readFileSync(REPORT_PATH, 'utf8');

const leadingResult = (value: string) => value.match(/\d+\/\d+/)?.[0] ?? '';
const passAndSkip = (value: string) => value.match(/\d+/g)?.slice(0, 2) ?? [];

describe('release-readiness uses one canonical evidence snapshot', () => {
  it('current gate summary mirrors the machine-readable audit', () => {
    for (const value of [
      audit.checks.vitest,
      audit.checks.firestore_storage_rules,
      audit.checks.chromium_e2e,
      audit.checks.webkit_e2e,
    ]) {
      expect(report).toContain(leadingResult(value));
    }

    for (const count of passAndSkip(audit.checks.functions)) {
      expect(report).toContain(count);
    }
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
