// WP-E (X28): eksport before/after z porownania sylwetki.
// E1: wspolny escapeHtml w src/lib/share-html.ts (trzeci modul share = koniec
// duplikacji share-utils/CycleShareCard). E2: czysty builder HTML (3 szablony
// x 2 formaty). E3: przycisk w BodyPhotoCompare + dialog eksportu (na native:
// nativeHttp → getBlob → fetch; na web: fetch → getBlob; potem downscale →
// podglad → Pobierz/Udostepnij).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const downscaleMock = vi.hoisted(() => vi.fn(async (_blob: Blob) => 'data:image/jpeg;base64,MOCKPHOTO'));
const toastMock = vi.hoisted(() => vi.fn());
// Zgloszenie iOS build 115: kanal natywny + telemetria porazek. X29: po
// telemetrii 2026-08-22 (build 116) pierwszym kanalem na native jest
// CapacitorHttp (natywny stos HTTP, poza siecia WKWebView).
const nativePlatformMock = vi.hoisted(() => ({ value: false }));
const reportErrorMock = vi.hoisted(() => vi.fn());
const capacitorHttpGetMock = vi.hoisted(() =>
  vi.fn<(options: { url: string; responseType: string }) => Promise<{
    status: number; data: unknown; headers: Record<string, string>; url: string;
  }>>(),
);

vi.mock('html2canvas-pro', () => ({ default: html2canvasMock }));
vi.mock('@/lib/share-utils', () => ({ downscalePhoto: downscaleMock }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatformMock.value },
  CapacitorHttp: { get: capacitorHttpGetMock },
}));
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
// Strzalka PRZED → PO (2026-09-04): wariant do oceny wlasciciela, dlatego
// WYLACZNIE w szablonie classic (accent i photo bez zmian = punkt odniesienia).
// Inline SVG, bo html2canvas-pro serializuje <svg> do data:image/svg+xml
// (SVGElementContainer); zadnych plikow rastrowych.
// ---------------------------------------------------------------------------

describe('buildBodyCompareHtml: strzalka PRZED → PO tylko w classic', () => {
  it.each(FORMATS)('classic/%s: jeden inline <svg> w kolorze akcentu, bez rastra, miedzy komorkami', (format) => {
    const html = buildBodyCompareHtml(buildInput({ template: 'classic', format }));
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html).toContain(`stroke="${ACCENT}"`);
    expect(html).not.toContain('<image');
    // Kolejnosc w HTML: zdjecie PRZED → strzalka → zdjecie PO.
    const before = html.indexOf('data:image/jpeg;base64,BEFORE');
    const arrow = html.indexOf('<svg');
    const after = html.indexOf('data:image/jpeg;base64,AFTER');
    expect(before).toBeLessThan(arrow);
    expect(arrow).toBeLessThan(after);
  });

  it('kierunek: square = grot w prawo (viewBox poziomy), story = grot w dol (viewBox pionowy)', () => {
    expect(buildBodyCompareHtml(buildInput({ template: 'classic', format: 'square' }))).toContain('viewBox="0 0 36 24"');
    expect(buildBodyCompareHtml(buildInput({ template: 'classic', format: 'story' }))).toContain('viewBox="0 0 24 36"');
  });

  it('square: strzalka wysrodkowana wzgledem pudelka zdjecia (wysokosc = PHOTO_BOX), nie podpisu', () => {
    const html = buildBodyCompareHtml(buildInput({ template: 'classic', format: 'square' }));
    expect(html).toContain('flex:0 0 36px;height:301px;display:flex;align-items:center');
  });

  it.each(
    (['accent', 'photo'] as BodyCompareTemplate[]).flatMap((template) => FORMATS.map((format) => ({ template, format }))),
  )('$template/$format: bez strzalki i bez zmiany paddingu', ({ template, format }) => {
    const html = buildBodyCompareHtml(buildInput({ template, format }));
    expect(html).not.toContain('<svg');
    expect(html).toContain(format === 'square' ? 'padding:22px 28px' : 'padding:40px 32px');
  });

  it('classic: padding ciasniejszy tylko o budzet strzalki (square 20 px w bok, story 24 px w pion), PHOTO_BOX bez zmian', () => {
    const square = buildBodyCompareHtml(buildInput({ template: 'classic', format: 'square' }));
    expect(square).toContain('padding:22px 20px');
    expect(square).toContain('width:226px;height:301px');
    const story = buildBodyCompareHtml(buildInput({ template: 'classic', format: 'story' }));
    expect(story).toContain('padding:24px 32px');
    expect(story).toContain('width:250px;height:333px');
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
  capacitorHttpGetMock.mockReset();
  capacitorHttpGetMock.mockResolvedValue({
    status: 200,
    data: btoa('native'),
    headers: { 'Content-Type': 'image/jpeg' },
    url: '',
  });
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
    // Web bez zmian po X29: kanal natywny (CapacitorHttp) nie startuje.
    expect(capacitorHttpGetMock).not.toHaveBeenCalled();
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

  // Zrzut wlasciciela 2026-09-04 (iPhone 390 px): "KLASYCZNY" uciety przy prawej
  // krawedzi pigulki (flex-1 = rowne trzecie, 12 px + tracking-wide = 104 px
  // tresci w 98.7 px chipa; min-w-11 wylaczal ochrone min-content). Kontrakt klas;
  // pomiar szerokosci tekstu vs chipa robi e2e/body-share-dialog.spec.ts.
  it('chipy formatu i szablonu: basis z tresci, 11 px bez tracking-wide, nowrap, cel 44 px, rzad zawijalny', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    const formatRow = screen.getByTestId('body-share-format-chips');
    const templateRow = screen.getByTestId('body-share-template-chips');
    const chips = [
      ...within(formatRow).getAllByRole('button'),
      ...within(templateRow).getAllByRole('button'),
    ];
    expect(chips.map((chip) => chip.textContent)).toEqual(['1:1', '9:16', 'Klasyczny', 'Akcent', 'Foto']);

    for (const row of [formatRow, templateRow]) {
      expect(row.className.split(/\s+/)).toContain('flex-wrap');
    }
    for (const chip of chips) {
      const classes = chip.className.split(/\s+/);
      expect(classes).toEqual(expect.arrayContaining(['flex-auto', 'whitespace-nowrap', 'px-2', 'text-[11px]', 'min-h-11']));
      expect(classes).not.toContain('flex-1');
      expect(classes).not.toContain('tracking-wide');
      expect(classes).not.toContain('text-xs');
    }

    // Wzorzec kolorow bez zmian: aktywny = pelny akcent + tekst na akcencie,
    // nieaktywny = surface + muted.
    const [square, story] = chips;
    expect(square.getAttribute('aria-pressed')).toBe('true');
    expect(square.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-primary', 'text-primary-foreground']));
    expect(story.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-surface-highest', 'text-muted-foreground']));
  });

  // Przy 320 px min-content obu przyciskow (nowrap + ikona) = 261 px > 240 px
  // tresci arkusza: grid DialogContent rozszerzal tor i arkusz dostawal scroll
  // poziomy tnacy prawe chipy. Rzad zawijalny + basis 8rem: jedna linia od
  // 264 px tresci (min-content obu = 261 px), czyli rowne polowy od 360 px,
  // ponizej stos.
  it('rzad Pobierz/Udostepnij: flex-wrap + basis 8rem (stos zamiast scrolla poziomego przy 320 px)', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    const download = screen.getByRole('button', { name: /Pobierz$/ });
    const share = screen.getByRole('button', { name: /Udostępnij$/ });
    expect(download.parentElement).toBe(share.parentElement);
    expect(download.parentElement?.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex', 'flex-wrap']));
    for (const button of [download, share]) {
      expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex-1', 'basis-32']));
    }
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
// SDK retry'uje network error az do maxOperationRetryTime (2 min). Fix 116:
// kanal SDK-first na natywnym + timeout per krok + telemetria + toast.
// X29: telemetria produkcyjna 2026-08-22 (build 116) pokazala, ze getBlob TEZ
// pada w WKWebView ("photo-load-failed getBlob=getBlob-timeout fetch=Load
// failed") — oba kanaly JS ida przez warstwe sieciowa WKWebView z originu
// capacitor://localhost. Dlatego pierwszym kanalem na native jest nativeHttp
// (CapacitorHttp, natywny stos HTTP): [nativeHttp, getBlob, fetch].
// ---------------------------------------------------------------------------

describe('BodyPhotoCompare: twarde limity czasu i kanal natywny (fix iOS 115 + X29 nativeHttp)', () => {
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

  // X29: hotfix 116 asertowal tu kolejnosc [getBlob, fetch]. Telemetria
  // 2026-08-22 udowodnila, ze getBlob tez pada w WKWebView (getBlob-timeout),
  // wiec nowa kolejnosc na native to [nativeHttp, getBlob, fetch].
  it('natywna platforma: nativeHttp (CapacitorHttp) jest PIERWSZYM kanalem — getBlob i fetch nie startuja', async () => {
    nativePlatformMock.value = true;
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(capacitorHttpGetMock).toHaveBeenCalledTimes(2);
    expect(capacitorHttpGetMock.mock.calls[0][0]).toMatchObject({ responseType: 'blob' });
    expect(vi.mocked(getBlob)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    // base64 z natywnej odpowiedzi zdekodowany do Blobu przed downscale.
    expect(downscaleMock.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  });

  it('natywna platforma: nativeHttp pada → SDK getBlob przejmuje i eksport dziala', async () => {
    nativePlatformMock.value = true;
    capacitorHttpGetMock.mockRejectedValue(new Error('native-http-500'));
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(capacitorHttpGetMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getBlob)).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('natywna platforma: nativeHttp i getBlob padaja → fetch przejmuje i eksport dziala', async () => {
    nativePlatformMock.value = true;
    capacitorHttpGetMock.mockRejectedValue(new Error('native-http-empty'));
    vi.mocked(getBlob).mockRejectedValue(new Error('storage/object-not-found'));
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    expect(capacitorHttpGetMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('natywna platforma: wpis bez photoPath tez ma kanal natywny — nativeHttp z photoUrl, getBlob pominiety', async () => {
    nativePlatformMock.value = true;
    const withoutPath = canonicalMeasurements.map((m) => {
      const { photoPath: _photoPath, ...rest } = m;
      return rest as BodyMeasurement;
    });
    renderCompare(withoutPath);
    await openShareDialog();

    expect(capacitorHttpGetMock).toHaveBeenCalledTimes(2);
    expect(String(capacitorHttpGetMock.mock.calls[0][0].url)).toContain('firebasestorage');
    expect(vi.mocked(getBlob)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('natywna platforma: bez photoPath i nativeHttp pada → fetch przejmuje (niezmiennik reguly 5)', async () => {
    nativePlatformMock.value = true;
    capacitorHttpGetMock.mockRejectedValue(new Error('native-http-403'));
    const withoutPath = canonicalMeasurements.map((m) => {
      const { photoPath: _photoPath, ...rest } = m;
      return rest as BodyMeasurement;
    });
    renderCompare(withoutPath);
    await openShareDialog();

    expect(capacitorHttpGetMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getBlob)).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
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

// ---------------------------------------------------------------------------
// X29 WP-E: telemetria brakujacych faz. Dotad client_errors widzialo tylko
// faze load — porazka html2canvas/toBlob/navigator.share konczyla sie samym
// setError w dialogu, bez sladu w telemetrii. Nowe kody:
// body-compare-export-generate (render html2canvas) i body-compare-export-share
// (serializacja toBlob + systemowy share). Po udanym share error jest czyszczony.
// ---------------------------------------------------------------------------

describe('BodyCompareShareDialog: telemetria generate/share i czyszczenie bledu (X29)', () => {
  it('html2canvas pada → body-compare-export-generate + komunikat w dialogu', async () => {
    html2canvasMock.mockRejectedValue(new Error('canvas boom'));
    renderCompare(canonicalMeasurements);

    fireEvent.click(screen.getByTestId('body-photo-share'));
    await screen.findByText('Udostępnij porównanie');

    await waitFor(() => expect(reportErrorMock).toHaveBeenCalledWith(expect.objectContaining({
      code: 'body-compare-export-generate',
      phase: 'other',
      detail: expect.stringContaining('canvas boom'),
    })));
    // setError zostaje (UX) — telemetria jest dodatkiem, nie podmiana.
    expect(screen.getByText('Nie udało się wygenerować obrazu')).toBeTruthy();
  });

  it('toBlob zwraca null → body-compare-export-share (faza serializacji pliku, plan X29)', async () => {
    html2canvasMock.mockImplementation(async () => ({
      toBlob: (cb: (blob: Blob | null) => void) => cb(null),
    }));
    renderCompare(canonicalMeasurements);

    fireEvent.click(screen.getByTestId('body-photo-share'));
    await screen.findByText('Udostępnij porównanie');

    await waitFor(() => expect(reportErrorMock).toHaveBeenCalledWith(expect.objectContaining({
      code: 'body-compare-export-share',
      phase: 'other',
    })));
  });

  it('navigator.share pada (nie-Abort) → body-compare-export-share + komunikat', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    shareMock.mockRejectedValueOnce(new Error('share broke'));
    fireEvent.click(screen.getByRole('button', { name: /Udostępnij$/ }));

    await waitFor(() => expect(reportErrorMock).toHaveBeenCalledWith(expect.objectContaining({
      code: 'body-compare-export-share',
      phase: 'other',
      detail: expect.stringContaining('share broke'),
    })));
    expect(screen.getByText('Nie udało się wygenerować obrazu')).toBeTruthy();
  });

  it('AbortError (user zamknal share sheet) → zero telemetrii i zero komunikatu', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    const abort = new Error('Share canceled');
    abort.name = 'AbortError';
    shareMock.mockRejectedValueOnce(abort);
    fireEvent.click(screen.getByRole('button', { name: /Udostępnij$/ }));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(reportErrorMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Nie udało się wygenerować obrazu')).toBeNull();
  });

  it('po udanym share wczesniejszy komunikat bledu znika (markSaved czysci error)', async () => {
    renderCompare(canonicalMeasurements);
    await openShareDialog();

    shareMock.mockRejectedValueOnce(new Error('share broke'));
    fireEvent.click(screen.getByRole('button', { name: /Udostępnij$/ }));
    await screen.findByText('Nie udało się wygenerować obrazu');

    shareMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: /Udostępnij$/ }));
    await waitFor(() => expect(screen.queryByText('Nie udało się wygenerować obrazu')).toBeNull());
    expect(screen.getByText('Zapisano')).toBeTruthy();
  });
});
