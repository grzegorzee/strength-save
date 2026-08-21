import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// WP-D D3: PhotoCropDialog — dialog kadrowania na prymitywie Dialog.
// react-easy-crop zamockowany (gesty pinch/zoom to teren testu na urządzeniu);
// testujemy NASZ kontrakt: otwarcie po pliku, anulowanie, potwierdzenie z
// blobem z canvas cropu, fallback bez kadru gdy normalizacja HEIC padnie.

const cropperProps = vi.hoisted(() => ({
  latest: null as null | {
    image: string;
    aspect?: number;
    onCropComplete?: (area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void;
  },
}));

vi.mock('react-easy-crop', () => {
  // STABILNY typ komponentu (definicja raz, w fabryce) — komponent definiowany
  // w renderze remountowałby się przy każdym setState i zapętlił useEffect.
  const MockCropper = (props: NonNullable<typeof cropperProps.latest>) => {
    cropperProps.latest = props;
    const { onCropComplete } = props;
    // Symulacja croppera: po zamontowaniu raportuje wyliczony kadr w pikselach.
    useEffect(() => {
      onCropComplete?.({}, { x: 10, y: 20, width: 300, height: 400 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="mock-cropper" />;
  };
  return { default: MockCropper };
});

const normalizeMock = vi.hoisted(() => vi.fn(async () => 'data:image/jpeg;base64,AAA'));
vi.mock('@/lib/image-compress', () => ({
  normalizeToJpegDataUrl: normalizeMock,
}));

import { PhotoCropDialog } from '@/components/PhotoCropDialog';

const drawImage = vi.fn();
const croppedBlob = new Blob(['cropped'], { type: 'image/jpeg' });

class FakeImage {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  set src(_value: string) {
    queueMicrotask(() => this.onload());
  }
}

const renderDialog = (overrides: Partial<Parameters<typeof PhotoCropDialog>[0]> = {}) => {
  const onCancel = vi.fn();
  const onCropped = vi.fn();
  const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });
  const view = render(
    <LanguageProvider>
      <PhotoCropDialog open file={file} onCancel={onCancel} onCropped={onCropped} {...overrides} />
    </LanguageProvider>,
  );
  return { onCancel, onCropped, file, view };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  cropperProps.latest = null;
  drawImage.mockClear();
  normalizeMock.mockReset();
  normalizeMock.mockResolvedValue('data:image/jpeg;base64,AAA');
  vi.stubGlobal('Image', FakeImage);
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
        toBlob: (cb: (blob: Blob | null) => void) => cb(croppedBlob),
      } as unknown as HTMLCanvasElement;
    }
    return origCreate(tag);
  });
});

describe('PhotoCropDialog (WP-D D3)', () => {
  it('otwarty z plikiem: normalizuje do dataURL i renderuje cropper z aspect 3/4', async () => {
    renderDialog();

    expect(await screen.findByTestId('mock-cropper')).toBeInTheDocument();
    expect(normalizeMock).toHaveBeenCalledTimes(1);
    expect(cropperProps.latest?.image).toBe('data:image/jpeg;base64,AAA');
    expect(cropperProps.latest?.aspect).toBeCloseTo(3 / 4);
    expect(screen.getByText('Kadruj zdjęcie')).toBeInTheDocument();
  });

  it('anulowanie woła onCancel (stan czyści rodzic przez open=false)', async () => {
    const { onCancel, onCropped } = renderDialog();
    await screen.findByTestId('mock-cropper');

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCropped).not.toHaveBeenCalled();
  });

  it('potwierdzenie kadru woła onCropped z blobem z canvas cropu', async () => {
    const { onCropped } = renderDialog();
    await screen.findByTestId('mock-cropper');

    const confirm = screen.getByTestId('photo-crop-confirm');
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(onCropped).toHaveBeenCalledTimes(1));
    expect(onCropped.mock.calls[0][0]).toBe(croppedBlob);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 10, 20, 300, 400, 0, 0, 300, 400);
  });

  it('padnięta normalizacja (egzotyczny format): zdjęcie idzie dalej BEZ kadru', async () => {
    normalizeMock.mockRejectedValue(new Error('heic-decode-failed'));
    const { onCropped, file } = renderDialog();

    await waitFor(() => expect(onCropped).toHaveBeenCalledTimes(1));
    expect(onCropped.mock.calls[0][0]).toBe(file);
  });
});
