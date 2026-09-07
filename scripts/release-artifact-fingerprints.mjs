import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const existingStat = async (filePath) => {
  try { return await lstat(filePath); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

export const fingerprintFile = async (name, filePath) => {
  const info = await existingStat(filePath);
  if (!info) return null;
  if (!info.isFile()) throw new Error(`ARTIFACT_NOT_FILE:${name}`);
  return { name, size: info.size, sha256: await hashFile(filePath) };
};

// Hash every file, including assets whose contents can change without changing HTML.
export const fingerprintTree = async (name, directory) => {
  const info = await existingStat(directory);
  if (!info) return null;
  if (!info.isDirectory()) throw new Error(`ARTIFACT_NOT_DIRECTORY:${name}`);
  const files = [];
  const walk = async (relative = '') => {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(child);
      else files.push(await fingerprintFile(child, path.join(directory, child)));
    }
  };
  await walk();
  return {
    name,
    size: files.reduce((total, file) => total + file.size, 0),
    sha256: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
  };
};

export const collectArtifactFingerprints = async (root) => {
  const files = [
    ['dist/index.html', 'dist/index.html'],
    ['android/public/index.html', 'android/app/src/main/assets/public/index.html'],
    ['ios/public/index.html', 'ios/App/App/public/index.html'],
    ['android/app-debug.apk', 'android/app/build/outputs/apk/debug/app-debug.apk'],
    ['android/app-release.aab', 'android/app/build/outputs/bundle/release/app-release.aab'],
  ];
  const exportDirectory = path.join(root, 'build/ios/export');
  if ((await existingStat(exportDirectory))?.isDirectory()) {
    for (const entry of await readdir(exportDirectory)) {
      if (entry.endsWith('.ipa')) files.push([`ios/export/${entry}`, `build/ios/export/${entry}`]);
    }
  }
  const trees = [
    ['dist/tree', 'dist'],
    ['android/public/tree', 'android/app/src/main/assets/public'],
    ['ios/public/tree', 'ios/App/App/public'],
  ];
  return (await Promise.all([
    ...files.map(([name, file]) => fingerprintFile(name, path.join(root, file))),
    ...trees.map(([name, directory]) => fingerprintTree(name, path.join(root, directory))),
  ])).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
};
