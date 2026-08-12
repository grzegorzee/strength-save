import { describe, expect, it } from 'vitest';
import { recoveryTipKeys } from '@/lib/recovery-tips';

// Runna pakiet 1, krok 8 (spec B2): dzień wolny to karta z treścią, nie pusty
// ekran. Tipy statyczne (zero mechaniki): jeden ogólny + jeden pod partię
// z WCZORAJSZEJ sesji. Deterministyczne (stabilny render).

describe('recoveryTipKeys', () => {
  it('wczorajszy push: tip rozciągania klatki/barków + tip ogólny', () => {
    expect(recoveryTipKeys('Klatka i barki')).toEqual([
      'dash.recovery.tipSleep',
      'dash.recovery.tipStretchPush',
    ]);
    expect(recoveryTipKeys('Push')).toContain('dash.recovery.tipStretchPush');
  });

  it('wczorajszy pull: tip pleców', () => {
    expect(recoveryTipKeys('Plecy i biceps')).toContain('dash.recovery.tipStretchPull');
    expect(recoveryTipKeys('Pull day')).toContain('dash.recovery.tipStretchPull');
  });

  it('wczorajsze nogi: tip ud/pośladków (martwy ciąg liczy się jako nogi)', () => {
    expect(recoveryTipKeys('Nogi')).toContain('dash.recovery.tipStretchLegs');
    expect(recoveryTipKeys('Martwy ciąg i plecy')).toContain('dash.recovery.tipStretchLegs');
  });

  it('brak wczorajszej sesji albo nierozpoznana partia: tip ogólny ruchu', () => {
    expect(recoveryTipKeys(null)).toEqual([
      'dash.recovery.tipSleep',
      'dash.recovery.tipStretchGeneric',
    ]);
    expect(recoveryTipKeys('Full body mix')).toContain('dash.recovery.tipStretchGeneric');
  });
});
