import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error shared release CLI helper
import { collectArtifactFingerprints } from '../../scripts/release-artifact-fingerprints.mjs';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('release artifact provenance', () => {
  it('detects a changed JS asset even when index.html remains unchanged', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'strength-artifacts-')); roots.push(root);
    await mkdir(path.join(root, 'dist/assets'), { recursive: true });
    await writeFile(path.join(root, 'dist/index.html'), '<script src="assets/main.js"></script>');
    await writeFile(path.join(root, 'dist/assets/main.js'), 'first');
    const before = await collectArtifactFingerprints(root);
    await writeFile(path.join(root, 'dist/assets/main.js'), 'other');
    const after = await collectArtifactFingerprints(root);
    expect(after.find((item: {name: string}) => item.name === 'dist/tree')).not.toEqual(before.find((item: {name: string}) => item.name === 'dist/tree'));
  });
  it('binds signed release AAB and IPA bytes and notices removal', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'strength-artifacts-')); roots.push(root);
    const aab = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
    const ipa = path.join(root, 'build/ios/export/App.ipa');
    await mkdir(path.dirname(aab), { recursive: true }); await mkdir(path.dirname(ipa), { recursive: true });
    await writeFile(aab, 'signed-aab'); await writeFile(ipa, 'signed-ipa');
    const before = await collectArtifactFingerprints(root);
    expect(before.map((item: {name: string}) => item.name)).toEqual(expect.arrayContaining(['android/app-release.aab', 'ios/export/App.ipa']));
    await writeFile(aab, 'changed-aab'); await writeFile(ipa, 'changed-ipa');
    const after = await collectArtifactFingerprints(root);
    expect(after).not.toEqual(before);
    for (const name of ['android/app-release.aab', 'ios/export/App.ipa']) {
      expect(after.find((item: {name: string}) => item.name === name)).not.toEqual(before.find((item: {name: string}) => item.name === name));
    }
    await rm(ipa);
    expect((await collectArtifactFingerprints(root)).some((item: {name: string}) => item.name === 'ios/export/App.ipa')).toBe(false);
  });
});
