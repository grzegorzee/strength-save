// WP-F (X28): integracja grafik pro-look (dark-gym-v1) — empty states z
// ilustracjami (Historia, Pomiary, brak planu, Strava), hero kart szablonów w
// Browse plans, hero paywalla PRO i kafel grupy "Własne" w /exercises.
// Obrazy są DEKORACYJNE: alt="" + aria-hidden + loading="lazy", a błąd pliku
// (onError) przywraca dotychczasowy wygląd — żaden ekran nie może się zepsuć
// od brakującego webp. Scaffolding mocków wg wzorca route-smoke (canonical-states).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { History } from 'lucide-react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import {
  getEmptyStateImageUrl,
  getGroupImageUrl,
  getPaywallHeroUrl,
  getPlanTemplateImageUrl,
} from '@/lib/exercise-media';
import {
  buildCanonicalState,
  type CanonicalState,
} from '@/test/canonical-states';
import type { CustomExercise } from '@/hooks/useCustomExercises';
import { EmptyState } from '@/components/EmptyState';

const smoke = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocFromServer: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  getDocsFromServer: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => 0),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }), now: () => ({ toMillis: () => Date.now() }) },
  addDoc: vi.fn(async () => ({})),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => 'https://example.invalid/photo.jpg'),
  deleteObject: vi.fn(async () => {}),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => async () => ({ data: {} })),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({
  reportClientError: vi.fn(async () => {}),
  __resetErrorTelemetryForTests: vi.fn(),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/workout-read-store', () => ({ fetchWorkoutRange: vi.fn(async () => []) }));
vi.mock('@/lib/workout-delete', () => ({ deleteWorkoutEverywhere: vi.fn(async () => ({ success: true })) }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadActiveDraft: vi.fn(async () => null),
    listDrafts: vi.fn(async () => []),
    loadDraftForDay: vi.fn(async () => null),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));
vi.mock('@/contexts/UserContext', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(smoke.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useTrainingPlan: () => helpers.buildUseTrainingPlanResult(smoke.state) };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(smoke.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(smoke.state) };
});
vi.mock('@/hooks/useActivities', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useActivities: () => helpers.buildUseActivitiesResult() };
});
vi.mock('@/hooks/useWorkoutHistoryPage', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useWorkoutHistoryPage: () => helpers.buildUseWorkoutHistoryPageResult(smoke.state) };
});
vi.mock('@/hooks/useSubscription', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    useSubscription: () => helpers.buildUseSubscriptionResult(),
    useRequiresPaywall: () => false,
    isPaywallPlatform: () => false,
  };
});
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  toast: vi.fn(),
}));
vi.mock('@/components/MeasurementTrendChart', () => ({ default: () => null }));
// PlanWizard: PlanBuilder ciągnie firebase — tryb "own" poza zakresem testu.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
// Paywall: hardStatus 'off' = zwykły ekran cennika (web note w jsdom).
vi.mock('@/hooks/useHardPaywall', () => ({ useHardPaywall: () => 'off' }));
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: { getOfferings: vi.fn() } }));
// StravaTab: mutowalny stan połączenia (kontekst "Strava niepołączona").
const stravaFixture = vi.hoisted(() => ({ connected: false }));
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({
    activities: [],
    isLoaded: true,
    connection: { connected: stravaFixture.connected },
    isSyncing: false,
    error: null,
    connectStrava: vi.fn(),
    syncActivities: vi.fn(),
    saveMaxHR: vi.fn(),
    disconnectStrava: vi.fn(),
    nextSyncAvailableAt: null,
  }),
}));
vi.mock('@/hooks/useManualActivities', () => ({
  useManualActivities: () => ({
    activities: [],
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    isLoaded: true,
  }),
}));
// ExerciseLibrary: customy spoza taksonomii tworzą kafel "Własne".
const customFixture = vi.hoisted(() => ({ list: [] as CustomExercise[] }));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({
    customExercises: customFixture.list,
    addCustomExercise: vi.fn(),
    removeCustomExercise: vi.fn(),
    isLoaded: true,
  }),
}));

import WorkoutHistory from '@/pages/WorkoutHistory';
import Measurements from '@/pages/Measurements';
import TrainingPlan from '@/pages/TrainingPlan';
import ExerciseLibrary from '@/pages/ExerciseLibrary';
import Paywall from '@/pages/Paywall';
import { StravaTab } from '@/components/strava/StravaTab';
import { PlanWizard } from '@/components/PlanWizard';

const TODAY_ISO = '2026-08-20';

const renderPage = (page: React.ReactElement, entry = '/') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider>
        <UnitProvider>{page}</UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const findDecorImg = (container: HTMLElement, srcPart: string): HTMLImageElement | null =>
  container.querySelector(`img[src*="${srcPart}"]`);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app-language', 'pl');
  smoke.state = buildCanonicalState('fresh-user', TODAY_ISO);
  stravaFixture.connected = false;
  customFixture.list = [];
});

// ── F1: kompletność assetów w public/ ──────────────────────────────────────

describe('F1: assety pro-look skopiowane do public/', () => {
  // DECYZJA planu: hard-fail z PUSTĄ listą wyjątków — nowy szablon bez grafiki
  // musi albo dostać hero, albo świadomy wpis tutaj.
  const KNOWN_TEMPLATES_WITHOUT_HERO: string[] = [];

  it('każdy szablon planu ma hero public/plan-templates/<id>.webp', () => {
    const dir = join(process.cwd(), 'public', 'plan-templates');
    const missing = planTemplates
      .filter((tpl) => !KNOWN_TEMPLATES_WITHOUT_HERO.includes(tpl.id))
      .filter((tpl) => !existsSync(join(dir, `${tpl.id}.webp`)))
      .map((tpl) => tpl.id);
    expect(missing).toEqual([]);
  });

  it('empty states, paywall hero i kafel custom istnieją w public/', () => {
    const pub = join(process.cwd(), 'public');
    for (const name of ['history', 'measurements', 'no-plan', 'strava']) {
      expect(existsSync(join(pub, 'empty-states', `${name}.webp`)), `empty-states/${name}.webp`).toBe(true);
    }
    expect(existsSync(join(pub, 'paywall', 'hero.webp'))).toBe(true);
    expect(existsSync(join(pub, 'exercise-groups', 'custom.webp'))).toBe(true);
  });

  it('helpery URL wskazują na public/ (BASE_URL)', () => {
    expect(getPlanTemplateImageUrl('tpl-ppl-3')).toBe('/plan-templates/tpl-ppl-3.webp');
    expect(getEmptyStateImageUrl('history')).toBe('/empty-states/history.webp');
    expect(getPaywallHeroUrl()).toBe('/paywall/hero.webp');
  });
});

// ── F2: EmptyState z ilustracją ────────────────────────────────────────────

describe('F2: komponent EmptyState z imageUrl', () => {
  it('z imageUrl renderuje dekoracyjny obraz (alt="", lazy, aria-hidden) zamiast ikony', () => {
    const { container } = render(
      <EmptyState icon={History} title="Pusto" imageUrl="/empty-states/history.webp" />,
    );
    const img = findDecorImg(container, '/empty-states/history.webp');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('alt')).toBe('');
    expect(img!.getAttribute('loading')).toBe('lazy');
    expect(img!.getAttribute('aria-hidden')).toBe('true');
    // Ikona schowana, dopóki obraz żyje (bez dublowania wizualnego).
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Pusto')).toBeInTheDocument();
  });

  it('bez imageUrl wygląda jak dotąd (ikona, zero <img>)', () => {
    const { container } = render(<EmptyState icon={History} title="Pusto" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('onError chowa obraz i przywraca ikonę; tekst i CTA nietknięte', () => {
    const onCta = vi.fn();
    const { container } = render(
      <EmptyState icon={History} title="Pusto" hint="Wskazówka" ctaLabel="Start" onCta={onCta} imageUrl="/empty-states/history.webp" />,
    );
    fireEvent.error(findDecorImg(container, '/empty-states/history.webp')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Pusto')).toBeInTheDocument();
    expect(screen.getByText('Wskazówka')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});

describe('F2: kontekst Historia pusta', () => {
  it('pusta Historia pokazuje ilustrację history.webp nad zaproszeniem', async () => {
    const { container } = renderPage(<WorkoutHistory />, '/history');
    await waitFor(() => expect(findDecorImg(container, '/empty-states/history.webp')).not.toBeNull());
  });

  it('onError: ilustracja znika, zaproszenie z CTA zostaje', async () => {
    const { container } = renderPage(<WorkoutHistory />, '/history');
    await waitFor(() => expect(findDecorImg(container, '/empty-states/history.webp')).not.toBeNull());
    fireEvent.error(findDecorImg(container, '/empty-states/history.webp')!);
    expect(findDecorImg(container, '/empty-states/history.webp')).toBeNull();
    expect(screen.getByText('Zacznij pierwszy trening')).toBeInTheDocument();
  });
});

describe('F2: kontekst Pomiary puste', () => {
  it('bez pomiarów pokazuje ilustrację measurements.webp', async () => {
    const { container } = renderPage(<Measurements />, '/measurements');
    await waitFor(() => expect(findDecorImg(container, '/empty-states/measurements.webp')).not.toBeNull());
  });

  it('onError: ilustracja znika, empty state zostaje', async () => {
    const { container } = renderPage(<Measurements />, '/measurements');
    await waitFor(() => expect(findDecorImg(container, '/empty-states/measurements.webp')).not.toBeNull());
    fireEvent.error(findDecorImg(container, '/empty-states/measurements.webp')!);
    expect(findDecorImg(container, '/empty-states/measurements.webp')).toBeNull();
  });
});

describe('F2: kontekst brak planu (/plan po zakończeniu planu)', () => {
  it('pusty stan planu pokazuje ilustrację no-plan.webp nad kartą decyzji', () => {
    smoke.state = buildCanonicalState('plan-ended', TODAY_ISO);
    const { container } = renderPage(<TrainingPlan />, '/plan');
    expect(screen.getByTestId('plan-ended-empty')).toBeInTheDocument();
    expect(findDecorImg(container, '/empty-states/no-plan.webp')).not.toBeNull();
  });

  it('onError: ilustracja znika, karta decyzji (CTA nowego planu) zostaje', () => {
    smoke.state = buildCanonicalState('plan-ended', TODAY_ISO);
    const { container } = renderPage(<TrainingPlan />, '/plan');
    fireEvent.error(findDecorImg(container, '/empty-states/no-plan.webp')!);
    expect(findDecorImg(container, '/empty-states/no-plan.webp')).toBeNull();
    expect(screen.getByTestId('plan-next-step')).toBeInTheDocument();
  });
});

describe('F2: kontekst Strava niepołączona', () => {
  it('ekran zachęty do połączenia pokazuje ilustrację strava.webp', () => {
    const { container } = renderPage(<StravaTab />);
    expect(screen.getByText('Połącz ze Stravą')).toBeInTheDocument();
    expect(findDecorImg(container, '/empty-states/strava.webp')).not.toBeNull();
  });

  it('onError: ilustracja znika, tytuł i CTA połączenia zostają', () => {
    const { container } = renderPage(<StravaTab />);
    fireEvent.error(findDecorImg(container, '/empty-states/strava.webp')!);
    expect(findDecorImg(container, '/empty-states/strava.webp')).toBeNull();
    expect(screen.getByText('Połącz ze Stravą')).toBeInTheDocument();
  });

  it('po połączeniu ilustracji nie ma (nie jest to empty state)', () => {
    stravaFixture.connected = true;
    const { container } = renderPage(<StravaTab />);
    expect(findDecorImg(container, '/empty-states/strava.webp')).toBeNull();
  });
});

// ── F3: hero kart szablonów w Browse plans ─────────────────────────────────

describe('F3: karty szablonów z hero (PlanWizard, Browse plans)', () => {
  // X32: kreator bez Welcome startuje od kroku 2 (startAtPrecision usuniete),
  // a Browse pokazuje tylko szablony o liczbie dni z kroku 4 (domyślnie 4).
  const visibleTemplates = planTemplates.filter((tpl) => tpl.daysPerWeek === 4);
  const openBrowse = () => {
    renderPage(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: /Przeglądaj plany/ }));
  };

  it('każda karta szablonu renderuje hero z public/plan-templates/<id>.webp', () => {
    openBrowse();
    expect(visibleTemplates.length).toBeGreaterThan(0);
    for (const tpl of visibleTemplates) {
      expect(
        document.querySelector(`img[src="${getPlanTemplateImageUrl(tpl.id)}"]`),
        `hero ${tpl.id}`,
      ).not.toBeNull();
    }
    // Obrazy dekoracyjne: alt="" + lazy.
    const first = document.querySelector(`img[src="${getPlanTemplateImageUrl(visibleTemplates[0].id)}"]`)!;
    expect(first.getAttribute('alt')).toBe('');
    expect(first.getAttribute('loading')).toBe('lazy');
  });

  it('onError: karta wraca do dotychczasowego wyglądu (bez zepsutego img), treść zostaje', () => {
    openBrowse();
    const tpl = visibleTemplates[0];
    const img = document.querySelector(`img[src="${getPlanTemplateImageUrl(tpl.id)}"]`)!;
    fireEvent.error(img);
    expect(document.querySelector(`img[src="${getPlanTemplateImageUrl(tpl.id)}"]`)).toBeNull();
    // Opis i metadane karty nadal widoczne (PL nazwa z localizePlanName).
    expect(screen.getAllByText(new RegExp(String(tpl.daysPerWeek))).length).toBeGreaterThan(0);
  });
});

// ── F4: hero paywalla + kafel grupy "Własne" ───────────────────────────────

describe('F4: hero paywalla PRO', () => {
  it('ekran cennika ma dekoracyjny hero /paywall/hero.webp nad treścią', () => {
    const { container } = renderPage(<Paywall onLogout={async () => {}} />);
    const img = findDecorImg(container, '/paywall/hero.webp');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('alt')).toBe('');
    expect(img!.getAttribute('aria-hidden')).toBe('true');
    // Treść paywalla bez zmian.
    expect(screen.getByText('Strength Save PRO')).toBeInTheDocument();
  });

  it('onError: hero znika, paywall działa jak dotąd', () => {
    const { container } = renderPage(<Paywall onLogout={async () => {}} />);
    fireEvent.error(findDecorImg(container, '/paywall/hero.webp')!);
    expect(findDecorImg(container, '/paywall/hero.webp')).toBeNull();
    expect(screen.getByText('Strength Save PRO')).toBeInTheDocument();
  });
});

describe('F4: kafel grupy Własne w /exercises', () => {
  const customOutside: CustomExercise = {
    id: 'custom-1',
    name: 'Ćwiczenie widmo',
    category: 'nieznana-kategoria' as CustomExercise['category'],
    type: 'compound',
    isBodyweight: false,
    instructions: [],
  };

  it('kafel Własne ma obraz custom.webp zamiast fallbacku gradientowego', () => {
    customFixture.list = [customOutside];
    renderPage(<ExerciseLibrary />, '/exercises');
    const tiles = screen.getAllByTestId('exercise-group-tile');
    const customTile = tiles.find((t) => within(t).queryByText('Własne'))!;
    expect(customTile).toBeTruthy();
    const img = within(customTile).getByRole('presentation') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(getGroupImageUrl('custom'));
    expect(within(customTile).queryByTestId('group-tile-fallback')).toBeNull();
  });

  it('onError na kaflu Własne wraca do gradientu (kontrakt GroupTile)', () => {
    customFixture.list = [customOutside];
    renderPage(<ExerciseLibrary />, '/exercises');
    const tiles = screen.getAllByTestId('exercise-group-tile');
    const customTile = tiles.find((t) => within(t).queryByText('Własne'))!;
    fireEvent.error(within(customTile).getByRole('presentation'));
    expect(within(customTile).getByTestId('group-tile-fallback')).toBeInTheDocument();
  });

  it('hero widoku grupy Własne (?group=custom) używa tej samej grafiki', () => {
    customFixture.list = [customOutside];
    const { container } = renderPage(<ExerciseLibrary />, '/exercises?group=custom');
    expect(screen.getByTestId('group-hero')).toBeInTheDocument();
    expect(findDecorImg(container, '/exercise-groups/custom.webp')).not.toBeNull();
  });
});
