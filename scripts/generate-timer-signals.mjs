// Generator sygnałów timera dla natywnego odtwarzania (Z200).
//
// Synteza WebAudio (tick/complete) nie ma odpowiednika plikowego, a natywny
// AVAudioPlayer gra wyłącznie pliki z bundla. Ten skrypt odtwarza charakter
// dotychczasowych sygnałów (fala trójkątna, te same częstotliwości i timing
// co playSynth w src/lib/timer-sound.ts), z kompresją tanh podnoszącą poziom
// ŚREDNI — jak przy rest_{bell,horn,alarm}.wav (DECYZJE.md 2026-07-20: o
// słyszalności decyduje RMS, nie szczyt).
//
// Uruchomienie: node scripts/generate-timer-signals.mjs
// Wyjście: ios/App/App/timer_tick.wav, ios/App/App/timer_complete.wav
// (tylko bundle iOS — web zostaje przy syntezie WebAudio jako fallbacku).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SAMPLE_RATE = 44100;
const DRIVE = 2.8; // zakres 2.6-3.4 z generatora rest_*.wav

const triangle = (phase) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * phase));

/** Beep trójkątny: atak 12 ms, wykładnicze wybrzmienie do końca trwania. */
const renderBeep = (samples, startSec, freq, durSec) => {
  const start = Math.round(startSec * SAMPLE_RATE);
  const length = Math.round(durSec * SAMPLE_RATE);
  const attack = Math.round(0.012 * SAMPLE_RATE);
  for (let i = 0; i < length && start + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = i < attack ? i / attack : Math.exp(-3 * ((i - attack) / (length - attack)));
    samples[start + i] += env * triangle(freq * t);
  }
};

const compressAndNormalize = (samples) => {
  const driven = samples.map((s) => Math.tanh(s * DRIVE) / Math.tanh(DRIVE));
  const peak = driven.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  const gain = peak > 0 ? 0.98 / peak : 1;
  return driven.map((s) => s * gain);
};

const toWav = (samples) => {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2);
  });
  return buf;
};

const render = (durSec, beeps) => {
  const samples = new Float64Array(Math.round(durSec * SAMPLE_RATE));
  beeps.forEach(([start, freq, dur]) => renderBeep(samples, start, freq, dur));
  return toWav(compressAndNormalize(Array.from(samples)));
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'ios', 'App', 'App');

// Timing i częstotliwości 1:1 z playSynth (timer-sound.ts).
const files = {
  'timer_tick.wav': render(0.2, [[0, 880, 0.12]]),
  'timer_complete.wav': render(0.6, [
    [0, 880, 0.12],
    [0.15, 1175, 0.12],
    [0.3, 1568, 0.2],
  ]),
};

for (const [name, buf] of Object.entries(files)) {
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log(`${name}: ${buf.length} B`);
}
