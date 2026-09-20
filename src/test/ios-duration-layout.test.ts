import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/ios.css', 'utf8');

describe('iOS plank layout', () => {
  it('pins duration and all three actions to one grid row instead of arbitrary flex wrapping', () => {
    const prefix = ':root[data-platform="ios"] [data-tracking="duration"]';
    expect(css).toContain(`${prefix} .exercise-set-row {`);
    const rowRule = css.split(`${prefix} .exercise-set-row {`)[1]?.split('}')[0];
    expect(rowRule).toContain('display: grid');
    expect(rowRule).toContain('grid-template-columns:');
    expect(css).toContain(`${prefix} .exercise-set-row > .flex`);
    expect(css).toContain(`${prefix} .exercise-set-row > [role="timer"]`);
  });
});
