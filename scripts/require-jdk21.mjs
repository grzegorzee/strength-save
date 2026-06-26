import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
const result = spawnSync(java, ['--version'], { encoding: 'utf8' });
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
const match = output.match(/(?:openjdk|java)\s+(\d+)/i);
const major = match ? Number(match[1]) : NaN;

if (result.error || result.status !== 0 || !Number.isInteger(major) || major < 21) {
  const found = output || result.error?.message || 'nie znaleziono Java runtime';
  console.error(`Precondition failed: Firebase emulator Rules/E2E require JDK >= 21. Found: ${found}`);
  console.error('Set JAVA_HOME/PATH to JDK 21+ and retry.');
  process.exit(1);
}

console.log(`JDK preflight passed: ${major}`);
