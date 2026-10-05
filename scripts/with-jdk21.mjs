// Uruchamia komendę z JDK >= 21 (emulatory Firebase). Domyślny `java` na maszynie
// bywa starszy (Temurin 20), a JDK 21 z Homebrew nie jest zarejestrowany w
// /usr/libexec/java_home, więc bez tego e2e:emulator lokalnie w ogóle nie rusza
// i bramka deployu żyje tylko w CI. Brak JDK 21 = komenda i tak startuje,
// a preflight:jdk21 w środku zgłasza czytelny błąd.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const majorOf = (java) => {
  const result = spawnSync(java, ['--version'], { encoding: 'utf8' });
  const match = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.match(/(?:openjdk|java)\s+(\d+)/i);
  return result.status === 0 && match ? Number(match[1]) : NaN;
};

const current = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
const env = { ...process.env };

if (!(majorOf(current) >= 21)) {
  const candidates = [
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  ];
  const javaHome = candidates.find((home) => existsSync(join(home, 'bin', 'java')) && majorOf(join(home, 'bin', 'java')) >= 21);
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${join(javaHome, 'bin')}:${env.PATH ?? ''}`;
    console.log(`with-jdk21: JAVA_HOME=${javaHome}`);
  }
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, { stdio: 'inherit', env });
process.exit(result.status ?? 1);
