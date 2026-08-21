// X27 WP-E: redesign zakładki Ćwiczenia — dwupoziomowa nawigacja "grupy najpierw".
// Poziom 1: siatka kafli grup mięśniowych (zdjęcie + licznik), search globalny,
// wiersz "Nowe własne ćwiczenie". Poziom 2 (?group=<id>): hero + filtry + lista.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getGroupImageUrl, slugifyExercise } from '@/lib/exercise-media';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import type { CustomExercise } from '@/hooks/useCustomExercises';
import ExerciseLibrary from '@/pages/ExerciseLibrary';

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: null, isAdmin: false }),
}));

const customFixture = vi.hoisted(() => ({ list: [] as CustomExercise[] }));
const addCustomSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({
    customExercises: customFixture.list,
    addCustomExercise: addCustomSpy,
    removeCustomExercise: vi.fn(),
    isLoaded: true,
  }),
}));

const makeCustom = (
  name: string,
  category: string,
  type: 'compound' | 'isolation' = 'compound',
): CustomExercise => ({
  id: `custom-${name}`,
  name,
  category: category as LibraryExercise['category'],
  type,
  isBodyweight: false,
  instructions: [],
});

const CATEGORIES: LibraryExercise['category'][] = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves',
];

const renderPage = (initialEntry = '/exercises') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <LanguageProvider>
      <ExerciseLibrary />
    </LanguageProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  customFixture.list = [];
  navigateSpy.mockReset();
  addCustomSpy.mockReset();
});

describe('E1: helper obrazków grup', () => {
  it('getGroupImageUrl zwraca ścieżkę /exercise-groups/<id>.webp', () => {
    expect(getGroupImageUrl('chest')).toBe('/exercise-groups/chest.webp');
    expect(getGroupImageUrl('calves')).toBe('/exercise-groups/calves.webp');
  });
});

describe('E2: poziom 1 — siatka grup', () => {
  it('bez frazy renderuje kafel każdej kategorii z licznikiem, licznik nagłówka = suma', () => {
    renderPage();

    const tiles = screen.getAllByTestId('exercise-group-tile');
    expect(tiles).toHaveLength(CATEGORIES.length);

    // Każdy kafel: nazwa grupy + licznik równy liczbie ćwiczeń w danych.
    CATEGORIES.forEach((cat) => {
      const count = exerciseLibrary.filter((e) => e.category === cat).length;
      const tile = tiles.find((t) => within(t).queryByText(categoryLabels[cat]));
      expect(tile, `kafel ${cat}`).toBeTruthy();
      expect(within(tile!).getByText(String(count))).toBeInTheDocument();
    });

    // Licznik nagłówka == suma kafli (edge case 6).
    expect(screen.getByTestId('library-count').textContent).toContain(String(exerciseLibrary.length));
  });

  it('custom exercise z kategorią z biblioteki podbija licznik swojej grupy i sumę, bez kafla Własne', () => {
    customFixture.list = [makeCustom('Moje wyciskanie', 'chest')];
    renderPage();

    const chestCount = exerciseLibrary.filter((e) => e.category === 'chest').length + 1;
    const tiles = screen.getAllByTestId('exercise-group-tile');
    expect(tiles).toHaveLength(CATEGORIES.length); // bez dodatkowego kafla
    const chestTile = tiles.find((t) => within(t).queryByText(categoryLabels.chest));
    expect(within(chestTile!).getByText(String(chestCount))).toBeInTheDocument();
    expect(screen.getByTestId('library-count').textContent).toContain(String(exerciseLibrary.length + 1));
  });

  it('custom exercise z kategorią spoza taksonomii ląduje w dodatkowym kaflu Własne', () => {
    customFixture.list = [makeCustom('Ćwiczenie widmo', 'nieznana-kategoria')];
    renderPage();

    const tiles = screen.getAllByTestId('exercise-group-tile');
    expect(tiles).toHaveLength(CATEGORIES.length + 1);
    const customTile = tiles.find((t) => within(t).queryByText('Własne'));
    expect(customTile, 'kafel Własne').toBeTruthy();
    expect(within(customTile!).getByText('1')).toBeInTheDocument();
  });

  it('fraza w search przełącza na płaską listę wyników (siatka znika), pusta wraca do siatki', () => {
    renderPage();

    const input = screen.getByTestId('exercise-search');
    fireEvent.change(input, { target: { value: 'Przysiad ze sztangą' } });

    expect(screen.queryAllByTestId('exercise-group-tile')).toHaveLength(0);
    const thumbs = screen.getAllByTestId('exercise-preview-thumb');
    expect(thumbs.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Przysiad ze sztangą (High Bar)')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getAllByTestId('exercise-group-tile')).toHaveLength(CATEGORIES.length);
  });

  it('wiersz "Nowe własne ćwiczenie" otwiera kompaktowy dialog-formularz (X28 WP-A, bez listy pickera)', async () => {
    renderPage();

    fireEvent.click(screen.getByTestId('new-custom-exercise'));
    // Dialog to formularz od razu: pola widoczne, ZERO listy istniejących ćwiczeń.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-category')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-type')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-tracking')).toBeInTheDocument();
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
    expect(screen.queryByText('Dodaj własne ćwiczenie')).toBeNull();

    // Zapis jednym tapem po wpisaniu nazwy — onCreate = addCustomExercise z hooka.
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: 'Moje nowe ćwiczenie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(addCustomSpy).toHaveBeenCalledTimes(1));
    expect(addCustomSpy).toHaveBeenCalledWith({
      name: 'Moje nowe ćwiczenie',
      category: 'chest',
      isBodyweight: false,
      type: 'compound',
    });
  });
});

describe('E3: poziom 2 — widok grupy', () => {
  it('z ?group=chest pokazuje hero z tytułem grupy, chipsy filtrów i pełną listę grupy', () => {
    renderPage('/exercises?group=chest');

    expect(screen.getByTestId('group-hero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: categoryLabels.chest })).toBeInTheDocument();

    const chest = exerciseLibrary.filter((e) => e.category === 'chest');
    expect(screen.getAllByTestId('group-exercise-row')).toHaveLength(chest.length);

    // Chipsy: ALL z licznikiem grupy + typy.
    expect(screen.getByRole('button', { name: `Wszystkie ${chest.length}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wielostawowe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Izolacja' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masa ciała' })).toBeInTheDocument();
  });

  it('filtr COMPOUND zawęża listę do wielostawowych, BODYWEIGHT do masy ciała', () => {
    renderPage('/exercises?group=chest');

    const chest = exerciseLibrary.filter((e) => e.category === 'chest');
    fireEvent.click(screen.getByRole('button', { name: 'Wielostawowe' }));
    expect(screen.getAllByTestId('group-exercise-row'))
      .toHaveLength(chest.filter((e) => e.type === 'compound').length);

    fireEvent.click(screen.getByRole('button', { name: 'Masa ciała' }));
    expect(screen.getAllByTestId('group-exercise-row'))
      .toHaveLength(chest.filter((e) => e.isBodyweight === true).length);
  });

  it('klik wstecz w hero wraca do siatki (searchParam znika)', () => {
    renderPage('/exercises?group=chest');

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.queryByTestId('group-hero')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('exercise-group-tile')).toHaveLength(CATEGORIES.length);
  });

  it('klik wiersza nawiguje do /exercise/:slug', () => {
    renderPage('/exercises?group=chest');

    const first = exerciseLibrary.filter((e) => e.category === 'chest')[0];
    fireEvent.click(screen.getAllByTestId('group-exercise-row')[0]);
    expect(navigateSpy).toHaveBeenCalledWith(`/exercise/${slugifyExercise(first.name)}`);
  });

  it('custom exercise widoczny w swojej grupie jako wiersz bez nawigacji', () => {
    customFixture.list = [makeCustom('Moje wyciskanie', 'chest')];
    renderPage('/exercises?group=chest');

    const chest = exerciseLibrary.filter((e) => e.category === 'chest');
    expect(screen.getAllByTestId('group-exercise-row')).toHaveLength(chest.length + 1);
    expect(screen.getByText('Moje wyciskanie')).toBeInTheDocument();
  });

  it('nieznane id grupy renderuje poziom 1 (bez pustego widoku-pułapki)', () => {
    renderPage('/exercises?group=nie-ma-takiej');
    expect(screen.queryByTestId('group-hero')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('exercise-group-tile')).toHaveLength(CATEGORIES.length);
  });
});

describe('E5: fallback zdjęć grup (WP-IMG może jeszcze nie dostarczyć plików)', () => {
  it('błąd ładowania obrazka kafla podmienia go na gradient — zero zepsutych imgów', () => {
    renderPage();

    const tiles = screen.getAllByTestId('exercise-group-tile');
    const img = within(tiles[0]).getByRole('presentation');
    fireEvent.error(img);

    expect(within(tiles[0]).queryByRole('presentation')).not.toBeInTheDocument();
    expect(within(tiles[0]).getByTestId('group-tile-fallback')).toBeInTheDocument();
  });
});
