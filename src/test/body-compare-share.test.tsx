// WP-E (X28): eksport before/after z porownania sylwetki.
// E1: wspolny escapeHtml w src/lib/share-html.ts (trzeci modul share = koniec
// duplikacji share-utils/CycleShareCard). E2: czysty builder HTML (3 szablony
// x 2 formaty). E3: przycisk w BodyPhotoCompare + dialog eksportu (fetch →
// fallback SDK getBlob → downscale → podglad → Pobierz/Udostepnij).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import appIcon from '@/assets/app-icon.png';
import { escapeHtml } from '@/lib/share-html';
import { formatLocalDateLabel } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildCanonicalState } from '@/test/canonical-states';
import { getBlob } from 'firebase/storage';
import type { BodyMeasurement } from '@/types';
import {
  buildBodyCompareHtml,
  type BodyCompareFormat,
  type BodyCompareShareInput,
  type BodyCompareTemplate,
} from '@/components/BodyCompareShareDialog';
import { BodyPhotoCompare } from '@/components/BodyPhotoCompare';

const html2canvasMock = vi.hoisted(() => vi.fn());
const downscaleMock = vi.hoisted(() => vi.fn(async () => 'data:image/jpeg;base64,MOCKPHOTO'));
const toastMock = vi.hoisted(() => vi.fn());
// Zgloszenie iOS build 115: kanal natywny (SDK-first) + telemetria porazek.
const nativePlatformMock = vi.hoisted(() => ({ value: false }));
const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock('html2canvas-pro', () => ({ default: html2canvasMock }));
vi.mock('@/lib/share-utils', () => ({ downscalePhoto: downscaleMock }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => nativePlatformMock.value } }));
vi.mock('@/lib/haptics', () => ({ hapticSuccess: vi.fn(async () => undefined) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: reportErrorMock }));
vi.mock('firebase/storage', () => ({
  getBlob: vi.fn(async () => new Blob(['sdk'], { type: 'image/jpeg' })),
  ref: vi.fn(() => ({})),
}));
vi.mock('@/lib/firebase', () => ({ storage: {} }));

describe('escapeHtml (E1, wspolny modul share-html)', () => {
  it('escapuje < > & (tekst laduje w tresci elementow)', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('cudzyslowy zostawia bez zmian (parytet z dotychczasowa implementacja)', () => {
    expect(escapeHtml('"before" \'after\'')).toBe('"before" \'after\'');
  });

  it('zwykly tekst przechodzi 1:1', () => {
    expect(escapeHtml('Przysiad 100 kg')).toBe('Przysiad 100 kg');
  });
});

// ---------------------------------------------------------------------------
// E2: buildBodyCompareHtml — czysty builder, 3 szablony x 2 formaty.
// ---------------------------------------------------------------------------

const ACCENT = '#cefc22';
const BG_URL = '/share/bg.webp';

const fmtDatePl = (iso: string) =>
  formatLocalDateLabel(iso, dateLocale('pl'), { day: 'numeric', month: 'short', year: 'numeric' });

const buildInput = (over: Partial<BodyCompareShareInput> = {}): BodyCompareShareInput => ({
  before: { dataUrl: 'data:image/jpeg;base64,BEFORE', date: '2026-06-01', weightKg: 84 },
  after: { dataUrl: 'data:image/jpeg;base64,AFTER', date: '2026-08-20', weightKg: 80.5 },
  template: 'classic',
  format: 'square',
  lang: 'pl',
  accentHex: ACCENT,
  fmtWeight: (kg: number) => `${kg.toFixed(1)} kg`,
  bgUrl: BG_URL,
  ...over,
});

const TEMPLATES: BodyCompareTemplate[] = ['classic', 'accent', 'photo'];
const FORMATS: BodyCompareFormat[] = ['square', 'story'];
const CASES = TEMPLATES.flatMap((template) => FORMATS.map((format) => ({ template, format })));

describe('buildBodyCompareHtml (E2)', () => {
  it.each(CASES)('$template/$format: logo, obie daty, wagi, delta, akcent, zero dlugich pauz', ({ template, format }) => {
    const html = buildBodyCompareHtml(buildInput({ template, format }));

    expect(html).toContain(appIcon);
    expect(html).toContain('Strength Save');
    expect(html).toContain(fmtDatePl('2026-06-01'));
    expect(html).toContain(fmtDatePl('2026-08-20'));
    expect(html).toContain('84.0 kg');
    expect(html).toContain('80.5 kg');
    // Delta wagi (po - przed) w kolorze akcentu.
    expect(html).toContain('-3.5 kg');
    expect(html).toContain('Zmiana wagi:');
    expect(html).toContain(ACCENT);
    // Zdjecia wylacznie jako dataURL (tainted canvas), obie etykiety.
    expect(html).toContain('data:image/jpeg;base64,BEFORE');
    expect(html).toContain('data:image/jpeg;base64,AFTER');
    expect(html).toContain('Przed');
    expect(html).toContain('Po');
    expect(html).not.toMatch(/[–—―]/);
  });

  it('format square = 540x540, story = 540x960 (scale 2 → 1080x1080 / 1080x1920)', () => {
    const square = buildBodyCompareHtml(buildInput({ format: 'square' }));
    expect(square).toContain('width:540px');
    expect(square).toContain('height:540px');

    const story = buildBodyCompareHtml(buildInput({ format: 'story' }));
    expect(story).toContain('width:540px');
    expect(story).toContain('height:960px');
  });

  it('szablon photo uzywa bgUrl; classic i accent nie', () => {
    expect(buildBodyCompareHtml(buildInput({ template: 'photo' }))).toContain(BG_URL);
    expect(buildBodyCompareHtml(buildInput({ template: 'classic' }))).not.toContain(BG_URL);
    expect(buildBodyCompareHtml(buildInput({ template: 'accent' }))).not.toContain(BG_URL);
  });

  it('wpis bez wagi: brak wiersza wagi i brak delty (delta tylko przy obu wagach)', () => {
    const html = buildBodyCompareHtml(buildInput({
      before: { dataUrl: 'data:image/jpeg;base64,BEFORE', date: '2026-06-01' },
    }));
    expect(html).not.toContain('84.0 kg');
    expect(html).toContain('80.5 kg');
    expect(html).not.toContain('Zmiana wagi:');
  });

  it('delta dodatnia dostaje prefiks +', () => {
    const html = buildBodyCompareHtml(buildInput({
      before: { dataUrl: 'data:image/jpeg;base64,BEFORE', date: '2026-06-01', weightKg: 80 },
      after: { dataUrl: 'data:image/jpeg;base64,AFTER', date: '2026-08-20', weightKg: 82 },
    }));
    expect(html).toContain('+2.0 kg');
  });

  it('wersja EN: etykiety Before/After i Weight change', () => {
    const html = buildBodyCompareHtml(buildInput({ lang: 'en' }));
    expect(html).toContain('Before');
    expect(html).toContain('After');
    expect(html).toContain('Weight change:');
  });
});

// ---------------------------------------------------------------------------
// E3: przycisk w BodyPhotoCompare + dialog eksportu.
// Fixtury dokumentow przez canonical-states (stan 'photos-before-after').
// ---------------------------------------------------------------------------

const TODAY = '2026-08-21';
const canonicalMeasurements = buildCanonicalState('photos-before-after', TODAY).measurements;

const renderCompare = (measurements: BodyMeasurement[]) =>
  render(
    <LanguageProvider>
      <UnitProvider>
        <BodyPhotoCompare measurements={measurements} />
      </UnitProvider>
    </LanguageProvider>,
  );

const fetchMock = vi.fn();
const shareMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['img'], { type: 'image/jpeg' }) });
  shareMock.mockReset();
  shareMock.mockResolvedValue(undefined);
  toastMock.mockClear();
  // mockReset zamiast mockClear: testy wiszacego downscale podmieniaja
  // implementacje na never-resolving i musi ona wrocic do domyslnej.
  downscaleMock.mockReset();
  downscaleMock.mockResolvedValue('data:image/jpeg;base64,MOCKPHOTO');
  nativePlatformMock.value = false;
  reportErrorMock.mockClear();
  vi.mocked(getBlob).mockClear();
  vi.mocked(getBlob).mockResolvedValue(new Blob(['sdk'], { type: 'image/jpeg' }));
  html2canvasMock.mockReset();
  html2canvasMock.mockImplementation(async () => ({
    toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(['png'], { type: 'image/jpeg' })),
  }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }));
  Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const openShareDialog = async () => {
  fireEvent.click(screen.getByTestId('body-photo-share'));
  await screen.findByText('Udostępnij porównanie');
  await waitFor(() => expect(html2canvasMock).toHaveBeenCalled());
  await screen.findByAltText('Podsumowanie treningu');
};

describe('BodyPhotoCompare: eksport before/after (E3)', () => {
  it('przycisk "Pobierz / udostępnij" widoczny przy dwoch zdjeciach', () => {
    renderCompare(canonicalMeasurements);
    expect(screen.getByTestId('body-photo-share')).toBeTruthy();
    expect(screen.getByText('Pobierz / udostępnij')).toBeTruthy();
  });

  it('jedno zdjecie: bez przycisku eksportu', () => {
    const [firstPhoto, numericOnly] = canonicalMeasurements;
    renderCompare([firstPhoto, numericOnly]);
    expect(screen.queryByTestId('body-photo-share')).toBeNull();
  });

  it('klik: fetch obu zdjec → downscale → dialog z podgladem', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(downscaleMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getBlob)).not.toHaveBeenCalled();
    // Do buildera weszly dataURL-e, nie surowe photoUrl (tainted canvas).
    const element = html2canvasMock.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(element.outerHTML).toContain('data:image/jpeg;base64,MOCKPHOTO');
    expect(element.outerHTML).not.toContain('firebasestorage.googleapis.com');
  });

  it('przelaczenie formatu na 9:16 generuje obraz 540x960', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();
    const callsBefore = html2canvasMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: '9:16' }));
    await waitFor(() => expect(html2canvasMock.mock.calls.length).toBeGreaterThan(callsBefore));

    const element = html2canvasMock.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(element.outerHTML).toContain('height:960px');
  });

  it('przelaczenie szablonu na Foto uzywa tla share/bg.webp', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();
    const callsBefore = html2canvasMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Foto' }));
    await waitFor(() => expect(html2canvasMock.mock.calls.length).toBeGreaterThan(callsBefore));

    const element = html2canvasMock.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(element.outerHTML).toContain('share/bg.webp');
  });

  it('Udostepnij wola navigator.share z plikiem i pokazuje Zapisano', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    fireEvent.click(screen.getByRole('button', { name: /Udostępnij$/ }));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(shareMock.mock.calls[0][0].files).toHaveLength(1);
    await waitFor(() => expect(screen.getByText('Zapisano')).toBeTruthy());
  });

  it('Pobierz na webie klika <a download>', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    fireEvent.click(screen.getByRole('button', { name: /Pobierz$/ }));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('fetch pada → fallback SDK getBlob(photoPath) i dialog sie otwiera', async () => {
    fetchMock.mockRejectedValue(new TypeError('CORS blocked'));
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(vi.mocked(getBlob)).toHaveBeenCalledTimes(2);
    expect(downscaleMock).toHaveBeenCalledTimes(2);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('fetch i fallback SDK padaja → toast bledu, dialog sie nie otwiera, spinner reset', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    vi.mocked(getBlob).mockRejectedValue(new Error('storage/retry-limit-exceeded'));
    renderCompare(canonicalMeasurements);

    fireEvent.click(screen.getByTestId('body-photo-share'));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Udostępnij porównanie')).toBeNull();
    expect(html2canvasMock).not.toHaveBeenCalled();
    // Zasada 6 CLAUDE.md: stan bledu ma wyjscie — przycisk znow klikalny.
    expect((screen.getByTestId('body-photo-share') as HTMLButtonElement).disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zgloszenie iOS build 115 (WKWebView): spinner "Pobierz / udostepnij" wisial
// minutami bez toastu. Root cause: brak twardego limitu czasu na przygotowanie
// zdjecia — fetch w WKWebView potrafi wisiec do systemowego timeoutu, a getBlob
// SDK retry'uje network error az do maxOperationRetryTime (2 min). Fix: kanal
// SDK-first na natywnym + timeout per krok + telemetria + toast w kilkanascie s.
// ---------------------------------------------------------------------------

describe('BodyPhotoCompare: twarde limity czasu i kanal natywny (fix iOS 115)', () => {
  it('fetch zwraca ok=false (fetch NIE rzuca na 4xx/5xx) → fallback SDK getBlob i eksport dziala', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, blob: async () => new Blob([''], { type: 'text/plain' }) });
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(vi.mocked(getBlob)).toHaveBeenCalledTimes(2);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('fetch pada, getBlob wisi (jak retry SDK 2 min) → timeout, toast w kilkanascie sekund, spinner reset, dialog zamkniety', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockRejectedValue(new TypeError('Load failed'));
      vi.mocked(getBlob).mockImplementation(() => new Promise(() => {}));
      renderCompare(canonicalMeasurements);

      fireEvent.click(screen.getByTestId('body-photo-share'));
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });

      expect(toastMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Udostępnij porównanie')).toBeNull();
      expect((screen.getByTestId('body-photo-share') as HTMLButtonElement).disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('downscale wisi (uszkodzone dekodowanie) → timeout, toast, spinner reset, dialog zamkniety', async () => {
    vi.useFakeTimers();
    try {
      downscaleMock.mockImplementation(() => new Promise(() => {}));
      renderCompare(canonicalMeasurements);

      fireEvent.click(screen.getByTestId('body-photo-share'));
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });

      expect(toastMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Udostępnij porównanie')).toBeNull();
      expect((screen.getByTestId('body-photo-share') as HTMLButtonElement).disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('natywna platforma: SDK getBlob jest PIERWSZYM kanalem, fetch w ogole nie startuje', async () => {
    nativePlatformMock.value = true;
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(vi.mocked(getBlob)).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('natywna platforma: getBlob pada → fetch przejmuje i eksport dziala', async () => {
    nativePlatformMock.value = true;
    vi.mocked(getBlob).mockRejectedValue(new Error('storage/object-not-found'));
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('natywna platforma: wpis bez photoPath nie traci eksportu — idzie przez fetch (niezmiennik reguly 5)', async () => {
    nativePlatformMock.value = true;
    const withoutPath = canonicalMeasurements.map((m) => {
      const { photoPath: _photoPath, ...rest } = m;
      return rest as BodyMeasurement;
    });
    renderCompare(withoutPath);
    await openShareDialog();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getBlob)).not.toHaveBeenCalled();
  });

  it('porazka przygotowania → telemetria body-compare-export-load z krokiem, ktory padl', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    vi.mocked(getBlob).mockRejectedValue(new Error('storage/retry-limit-exceeded'));
    renderCompare(canonicalMeasurements);

    fireEvent.click(screen.getByTestId('body-photo-share'));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock).toHaveBeenCalledWith(expect.objectContaining({
      code: 'body-compare-export-load',
      phase: 'other',
      detail: expect.stringContaining('getBlob'),
    }));
  });
});
