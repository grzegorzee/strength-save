// Awaryjny unmount otwartego Radix Sheet/Dialog zostawia body z
// pointer-events:none i scroll-lockiem (regresja b.92 — "czarny ekran").
// ErrorBoundary woła to przy każdym złapanym błędzie.
export const releaseBodyLocks = (): void => {
  try {
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');
    // Osierocone overlaye portali Radix (bez Reacta nikt ich nie zdejmie).
    document.querySelectorAll('[data-radix-popper-content-wrapper], [data-state="open"][data-aria-hidden]')
      .forEach((el) => el.remove());
  } catch {
    // brak DOM / środowisko testowe — nic do sprzątania
  }
};
