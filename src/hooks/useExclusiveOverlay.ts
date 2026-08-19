import * as React from 'react';
import { releaseBodyLocksAfterOverlayUnmount } from '@/lib/release-body-locks';

const EXCLUSIVE_OVERLAY_EVENT = 'strength-save:exclusive-overlay-open';

/**
 * Jeden kontrakt dla pełnoekranowych warstw: otwarcie nowej prosi poprzednią
 * o zamknięcie. Stan nadal należy do wywołującego komponentu — event tylko
 * koordynuje niezależne Radix Rooty i celebracje renderowane poza nimi.
 */
export const useExclusiveOverlay = (open: boolean, onRequestClose: () => void): void => {
  const id = React.useId();
  const closeRef = React.useRef(onRequestClose);
  closeRef.current = onRequestClose;

  React.useEffect(() => {
    if (!open) return;

    const closeWhenAnotherOpens = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) closeRef.current();
    };
    window.addEventListener(EXCLUSIVE_OVERLAY_EVENT, closeWhenAnotherOpens);
    window.dispatchEvent(new CustomEvent(EXCLUSIVE_OVERLAY_EVENT, { detail: id }));

    return () => {
      window.removeEventListener(EXCLUSIVE_OVERLAY_EVENT, closeWhenAnotherOpens);
      releaseBodyLocksAfterOverlayUnmount();
    };
  }, [id, open]);
};

export const useExclusiveOverlayState = (
  controlledOpen: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): readonly [boolean, (open: boolean) => void] => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  useExclusiveOverlay(open, () => setOpen(false));
  return [open, setOpen] as const;
};
