import { beforeEach, describe, expect, it, vi } from 'vitest';

// Z147 (X18C): gong przez WebAudio (AudioContext + AudioBuffer) zamiast
// HTMLAudioElement — media element WKWebView rejestrował apkę w Now Playing
// (widget odtwarzacza na lock screenie). Czysty WebAudio nie tworzy wpisu.

// Z177: timer-sound raportuje błędy syntezy przez global-error-telemetry —
// moduł ciągnie Firestore, a resetModules powodowałby re-init Firebase.
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));

type FakeSource = {
  buffer: unknown;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};

type FakeGain = {
  connect: ReturnType<typeof vi.fn>;
  gain: {
    value: number;
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
};

const createdSources: FakeSource[] = [];
const createdOscillators: Array<Record<string, unknown>> = [];
const createdGains: FakeGain[] = [];
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
  createGain(): FakeGain {
    const gain: FakeGain = {
      connect: vi.fn(),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
    createdGains.push(gain);
    return gain;
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
  createdGains.length = 0;
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

// Z177: media sessions wideo (Z176 wprowadziło <video> na ekran treningu) wpychają
// współdzielony AudioContext w stan 'interrupted', a bywa że system go zamyka.
// Kod obsługiwał tylko 'suspended' → cisza gongów do restartu apki.
describe('Z177: AudioContext odporny na iOS (interrupted/closed)', () => {
  it('ctx w stanie interrupted → playTimerSound wznawia (resume) i gra', async () => {
    vi.stubGlobal('AudioContext', class extends FakeAudioContext { state = 'interrupted'; });
    const { playTimerSound } = await importTimerSound();

    playTimerSound('finish');
    await flushAsync();

    expect(resume).toHaveBeenCalled();
    expect(createdSources).toHaveLength(1);
  });

  it('ctx closed → moduł tworzy NOWY kontekst i gra', async () => {
    const instances: FakeAudioContext[] = [];
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      constructor() {
        super();
        instances.push(this);
      }
    });
    const mod = await importTimerSound();

    mod.unlockTimerSound(); // tworzy ctx #1
    await flushAsync();
    instances[0].state = 'closed'; // system ubił kontekst (np. przez media wideo)

    mod.playTimerSound('finish');
    await flushAsync();

    expect(instances).toHaveLength(2);
    expect(createdSources.length).toBeGreaterThan(0);
  });

  it('playSynth z rzucającym ctx NIE propaguje wyjątku', async () => {
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      createOscillator(): never {
        throw new Error('boom');
      }
    });
    const { playTimerSound } = await importTimerSound();

    expect(() => playTimerSound('tick')).not.toThrow();
  });
});

// Z201: regulacja głośności z Ustawień (zgłoszenie usera 2026-08-06: „głośność
// na full a ledwo co było słychać") — mnożnik idzie w gain pliku i szczyt syntezy.
describe('Z201: głośność sygnałów na ścieżce WebAudio', () => {
  it('głośność z ustawień idzie w gain odtwarzanego pliku', async () => {
    localStorage.setItem('fittracker_timer_volume_v1', '0.5');
    const { playTimerSound } = await importTimerSound();

    playTimerSound('finish');
    await flushAsync();

    expect(createdGains.at(-1)?.gain.value).toBe(0.5);
  });

  it('głośność skaluje szczyt syntezy (tick: 0.85 × 0.5)', async () => {
    localStorage.setItem('fittracker_timer_volume_v1', '0.5');
    const { playTimerSound } = await importTimerSound();

    playTimerSound('tick');
    await flushAsync();

    const ramps = createdGains.at(-1)?.gain.exponentialRampToValueAtTime.mock.calls ?? [];
    expect(ramps[0]?.[0]).toBeCloseTo(0.425);
  });
});

// Z200: na iOS sygnały grają NATYWNIE (AVAudioPlayer przez plugin TimerSound) —
// WebAudio w WKWebView gra ledwo słyszalnie na fizycznym urządzeniu (osobna sesja
// audio WebView w kategorii ambient; GainNode na iOS nie działa). Ten describe
// jest OSTATNI w pliku: doMock @capacitor/core nie może zatruć wcześniejszych.
describe('Z200: natywna ścieżka sygnałów na iOS', () => {
  const playMock = vi.fn(async (_o: { file: string; volume: number }) => undefined);

  const importNative = async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true },
      registerPlugin: () => ({ play: playMock }),
    }));
    return import('@/lib/timer-sound');
  };

  beforeEach(() => {
    playMock.mockClear();
    playMock.mockImplementation(async () => undefined);
  });

  it('finish gra wybrany plik przez plugin z głośnością z ustawień (zero WebAudio)', async () => {
    localStorage.setItem('fittracker_timer_volume_v1', '0.6');
    const { playTimerSound } = await importNative();

    playTimerSound('finish');
    await flushAsync();

    expect(playMock).toHaveBeenCalledWith({ file: 'rest_bell.wav', volume: 0.6 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createdOscillators).toHaveLength(0);
  });

  it('tick i complete grają pliki sygnałów z bundla', async () => {
    const { playTimerSound } = await importNative();

    playTimerSound('tick');
    playTimerSound('complete');
    await flushAsync();

    expect(playMock).toHaveBeenCalledWith(expect.objectContaining({ file: 'timer_tick.wav' }));
    expect(playMock).toHaveBeenCalledWith(expect.objectContaining({ file: 'timer_complete.wav' }));
  });

  it('plugin pada → fallback WebAudio gra plik jak dotąd', async () => {
    playMock.mockImplementation(async () => { throw new Error('plugin unavailable'); });
    const { playTimerSound } = await importNative();

    playTimerSound('finish');
    await flushAsync();

    expect(createdSources).toHaveLength(1);
    expect(createdSources[0].start).toHaveBeenCalledTimes(1);
  });

  it('previewRestSound z Ustawień idzie tą samą natywną ścieżką', async () => {
    const { previewRestSound } = await importNative();

    previewRestSound('rest_horn.wav');
    await flushAsync();

    expect(playMock).toHaveBeenCalledWith(expect.objectContaining({ file: 'rest_horn.wav' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
