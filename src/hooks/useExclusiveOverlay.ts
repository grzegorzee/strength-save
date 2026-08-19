import * as React from 'react';
import { releaseBodyLocksAfterOverlayUnmount } from '@/lib/release-body-locks';

const EXCLUSIVE_OVERLAY_EVENT = 'strength-save:exclusive-overlay-open';

export interface ExclusiveOverlayOptions {
  /**
   * false = warstwa NAD bieżącą (potwierdzenia/alerty): nie ogłasza otwarcia,
   * więc nie eksmituje rodzica, w którym jest zagnieżdżona (regresja e2e cardio
   * Z112: ConfirmDialog w DialogContent zamykał własnego rodzica i odczepiał
   * przycisk "Usuń" w trakcie kliku). Nadal słucha — nowy pełnoekranowy
   * overlay zamknie także potwierdzenie.
   */
  announce?: boolean;
}

/**
 * Jeden kontrakt dla pełnoekranowych warstw: otwarcie nowej prosi poprzednią
 * o zamknięcie. Stan nadal należy do wywołującego komponentu — event tylko
 * koordynuje niezależne Radix Rooty i celebracje renderowane poza nimi.
 */
export const useExclusiveOverlay = (
  open: boolean,
  onRequestClose: () => void,
  options?: ExclusiveOverlayOptions,
): void => {
  const id = React.useId();
  const closeRef = React.useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const announce = options?.announce ?? true;

  React.useEffect(() => {
    if (!open) return;

    const closeWhenAnotherOpens = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) closeRef.current();
    };
    window.addEventListener(EXCLUSIVE_OVERLAY_EVENT, closeWhenAnotherOpens);
    if (announce) {
      window.dispatchEvent(new CustomEvent(EXCLUSIVE_OVERLAY_EVENT, { detail: id }));
    }

    return () => {
      window.removeEventListener(EXCLUSIVE_OVERLAY_EVENT, closeWhenAnotherOpens);
      releaseBodyLocksAfterOverlayUnmount();
    };
  }, [announce, id, open]);
};

export const useExclusiveOverlayState = (
  controlledOpen: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  options?: ExclusiveOverlayOptions,
): readonly [boolean, (open: boolean) => void] => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  useExclusiveOverlay(open, () => setOpen(false), options);
  return [open, setOpen] as const;
};
