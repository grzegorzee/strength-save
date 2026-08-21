import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Naprawa r2 (2026-08-21, sędzia struktury): artboardy dają per ekran WŁASNE
// akcje w rzędzie headera (History: kafle lupy i filtrów obok tytułu), a header
// renderuje Layout — ekran nie ma go w swoim drzewie. Ten moduł to minimalny
// slot: AppHeader wystawia <HeaderActionsOutlet/>, ekran portaluje w niego
// swoje przyciski przez <HeaderActions>. Poza Layoutem (unit testy stron)
// outlet nie istnieje — dzieci renderują się inline, więc funkcje nie znikają.

const HeaderActionsContext = createContext<{
  el: HTMLElement | null;
  setEl: (el: HTMLElement | null) => void;
}>({ el: null, setEl: () => {} });

export const HeaderActionsProvider = ({ children }: { children: ReactNode }) => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <HeaderActionsContext.Provider value={{ el, setEl }}>
      {children}
    </HeaderActionsContext.Provider>
  );
};

/** Cel portalu — renderowany w prawym klastrze AppHeadera. */
export const HeaderActionsOutlet = () => {
  const { setEl } = useContext(HeaderActionsContext);
  return <div ref={setEl} className="flex items-center gap-2 empty:hidden" />;
};

/** Akcje ekranu trafiające do rzędu headera (fallback: inline, gdy brak outletu). */
export const HeaderActions = ({ children }: { children: ReactNode }) => {
  const { el } = useContext(HeaderActionsContext);
  return el ? createPortal(children, el) : <>{children}</>;
};
