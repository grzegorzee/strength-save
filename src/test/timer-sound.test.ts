import { beforeEach, describe, expect, it, vi } from 'vitest';

// Z147 (X18C): gong przez WebAudio (AudioContext + AudioBuffer) zamiast
// HTMLAudioElement — media element WKWebView rejestrował apkę w Now Playing
// (widget odtwarzacza na lock screenie). Czysty WebAudio nie tworzy wpisu.

type FakeSource = {
  buffer: unknown;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};

const createdSources: FakeSource[] = [];
const createdOscillators: Array<Record<string, unknown>> = [];
const decodeAudioData = vi.fn(async () => ({ duration: 2.1 }));
const resume = vi.fn(async () => undefined);

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = resume;
  decodeAudioData = decodeAudioData;
  createBufferSource(): FakeSource {
    const source: FakeSource = { buffer: null, connect: vi.fn(), start: vi.fn() };
    createdSources.push(source);
    return source;
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    createdOscillators.push(osc);
    return osc;
  }
}

const fetchMock = vi.fn(async (_url: string) => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
}));

const importTimerSound = async () => import('@/lib/timer-sound');

beforeEach(() => {
  vi.resetModules();
  createdSources.length = 0;
  createdOscillators.length = 0;
  decodeAudioData.mockClear();
  resume.mockClear();
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (_url: string) => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  localStorage.clear();
});

const flushAsync = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('playTimerSound(finish) przez WebAudio (Z147)', () => {
  it('dekoduje wybrany plik do AudioBuffer i gra przez bufferSource (zero new Audio)', async () => {
    const { playTimerSound } = await importTimerSound();

    playTimerSound('finish');
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('rest_bell.wav'); // default = gong/bell wybrany w rest-sound
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(createdSources).toHaveLength(1);
    expect(createdSources[0].start).toHaveBeenCalledTimes(1);
    expect(createdOscillators).toHaveLength(0); // bez syntezy, bez media elementu
  });

  it('drugie odtworzenie używa cache bufora (fetch raz)', async () => {
    const { playTimerSound } = await importTimerSound();

    playTimerSound('finish');
    await flushAsync();
    playTimerSound('finish');
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createdSources).toHaveLength(2);
  });

  it('fetch/decode pada → fallback na dotychczasową syntezę WebAudio', async () => {
    fetchMock.mockImplementation(async (_url: string) => { throw new Error('offline'); });
    const { playTimerSound } = await importTimerSound();

    playTimerSound('finish');
    await flushAsync();

    expect(createdSources).toHaveLength(0);
    expect(createdOscillators.length).toBeGreaterThan(0); // synteza zagrała
  });

  it('previewRestSound gra wskazany plik tą samą ścieżką WebAudio', async () => {
    const { previewRestSound } = await importTimerSound();

    previewRestSound('rest_horn.wav');
    await flushAsync();

    expect(String(fetchMock.mock.calls[0][0])).toContain('rest_horn.wav');
    expect(createdSources).toHaveLength(1);
    expect(createdSources[0].start).toHaveBeenCalledTimes(1);
  });

  it('unlockTimerSound wznawia zawieszony AudioContext (kontrakt bez zmian)', async () => {
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { state = 'suspended'; });
    const { unlockTimerSound } = await importTimerSound();

    unlockTimerSound();
    await flushAsync();

    expect(resume).toHaveBeenCalled();
  });
});
