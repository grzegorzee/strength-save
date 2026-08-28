const deactivateOrphanedPortalNode = (element: Element): void => {
  // Portal pozostaje własnością React/Radix Presence. Fizyczne `remove()` tutaj
  // ściga się z ich późniejszym removeChild i kończy NotFoundError + ErrorBoundary.
  // Ukrycie natychmiast usuwa blackout i hit testing, a właściciel może bezpiecznie
  // dokończyć własny unmount po resume WKWebView.
  if (element instanceof HTMLElement) {
    element.hidden = true;
    element.style.pointerEvents = 'none';
    element.setAttribute('aria-hidden', 'true');
  }
};

// Awaryjny unmount otwartego Radix Sheet/Dialog zostawia body z
// pointer-events:none i scroll-lockiem (regresja b.92 — "czarny ekran").
// ErrorBoundary woła to przy każdym złapanym błędzie.
export const releaseBodyLocks = (): void => {
  try {
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');
    // Osierocone overlaye portali Radix (bez Reacta nikt ich nie zdejmie).
    document.querySelectorAll('[data-radix-overlay], [data-radix-popper-content-wrapper]')
      .forEach(deactivateOrphanedPortalNode);
  } catch {
    // brak DOM / środowisko testowe — nic do sprzątania
  }
};

// Sheet ma najdłuższą animację wejścia/wyjścia (500 ms). Watchdog działa po jej
// budżecie: normalny portal zdąży się odmontować, a Presence zawieszone przez
// suspend WKWebView nie zostawi czarnego backdropu na zawsze.
export const RADIX_OVERLAY_EXIT_WATCHDOG_MS = 650;

const releaseOrPreserveLiveOverlay = (afterExitBudget = false): void => {
  try {
    const liveRadixContent = document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    );
    if (afterExitBudget) {
      // Zamknięty overlay nie może należeć do żywego (data-state=open) contentu.
      // Dezaktywujemy tylko wygasłe warstwy; nowy otwarty Dialog/Sheet zostaje
      // nietknięty. Nie usuwamy węzłów należących jeszcze do React Presence.
      document.querySelectorAll('[data-radix-overlay]:not([data-state="open"])')
        .forEach(deactivateOrphanedPortalNode);
    }
    if (!liveRadixContent) {
      // Overlay ma jawny marker z naszych wrapperów. Jeżeli nie ma już
      // odpowiadającego mu contentu, jest osieroconym portalem, a nie żywym
      // właścicielem blokady body.
      document.querySelectorAll(afterExitBudget
        ? '[data-radix-overlay]'
        : '[data-radix-overlay][data-state="open"]')
        .forEach(deactivateOrphanedPortalNode);
    }

    const liveCustomOverlay = document.querySelector(
      '[data-app-overlay][data-state="open"]:not([data-radix-overlay])',
    );
    if (liveRadixContent || liveCustomOverlay) return;

    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');
  } catch {
    // brak DOM / środowisko testowe
  }
};

// Radix zdejmuje portal i własne blokady w tej samej kolejce Reacta co cleanup
// wrappera. Czekamy do microtaska, żeby nie skasować locka należącego do kolejnej,
// właśnie otwartej warstwy. Brak otwartego overlayu oznacza, że body ma wrócić do
// stanu aplikacji — także po awaryjnym unmountcie WebView.
export const releaseBodyLocksAfterOverlayUnmount = (): void => {
  // Pierwsza próba po kolejce cleanupów Reacta; druga po macrotasku zabezpiecza
  // WKWebView, gdzie portal Radixa potrafi zniknąć chwilę po cleanupie Roota.
  queueMicrotask(releaseOrPreserveLiveOverlay);
  window.setTimeout(releaseOrPreserveLiveOverlay, 0);
  window.setTimeout(() => releaseOrPreserveLiveOverlay(true), RADIX_OVERLAY_EXIT_WATCHDOG_MS);
};
