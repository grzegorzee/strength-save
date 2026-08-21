import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Dumbbell, ArrowRightLeft, Play, Plus, ChevronRight } from 'lucide-react';
import { exerciseLibrary, type LibraryExercise } from '@/data/exerciseLibrary';
import { getExerciseAnimationUrl, getGroupImageUrl, slugifyExercise } from '@/lib/exercise-media';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName, localizeCategory } from '@/data/exercise-i18n';
import { useCurrentUser } from '@/contexts/UserContext';
import { useCustomExercises, type CustomExercise } from '@/hooks/useCustomExercises';
import { ExercisePicker } from '@/components/ExercisePicker';
import { GroupTile } from '@/components/exercises/GroupTile';
import { GroupHeader } from '@/components/exercises/GroupHeader';
import { ExerciseListRow } from '@/components/exercises/ExerciseListRow';

const categoryOrder: LibraryExercise['category'][] = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves',
];
const VALID_CATEGORIES = new Set<string>(categoryOrder);
// Dodatkowa grupa na customy z kategoria spoza taksonomii (edge case 4).
const CUSTOM_GROUP_ID = 'custom';

type TypeFilter = 'all' | 'compound' | 'isolation' | 'bodyweight';

const ExerciseVideoPreview = ({ animationUrl, active }: { animationUrl: string | null; active: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { rootMargin: '120px' });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const shouldPlay = Boolean(animationUrl && active && isVisible);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {shouldPlay && animationUrl ? (
        <video src={animationUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline preload="none" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {animationUrl ? (
            <Play className="h-5 w-5 text-muted-foreground/50" />
          ) : (
            <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
      )}
    </div>
  );
};

// Wiersz wynikow wyszukiwania: miniatura + nazwa uppercase + chip kategorii + typ.
// Z176: podglad startuje z TAPNIECIA w miniature (hover na dotyku nie istnieje);
// stan podgladu zyje u rodzica — max 1 aktywne wideo naraz (limit dekoderow iOS).
const ExerciseRow = ({ ex, onOpen, previewActive, onTogglePreview }: {
  ex: LibraryExercise;
  onOpen: (ex: LibraryExercise) => void;
  previewActive: boolean;
  onTogglePreview: (ex: LibraryExercise) => void;
}) => {
  const { t, lang } = useTranslation();
  const typeLabel = ex.isBodyweight
    ? t('exercises.type.bodyweight')
    : ex.type === 'compound' ? t('exercises.type.compound') : t('exercises.type.isolation');
  const animationUrl = getExerciseAnimationUrl(ex.name);
  return (
    <button
      type="button"
      onClick={() => onOpen(ex)}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-low p-3 text-left transition-colors hover:bg-surface-high"
    >
      <div
        data-testid="exercise-preview-thumb"
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-lowest"
        onClick={(e) => {
          // Tap w miniature przelacza podglad, nie otwiera szczegolow.
          if (!animationUrl) return;
          e.stopPropagation();
          onTogglePreview(ex);
        }}
      >
        <ExerciseVideoPreview animationUrl={animationUrl} active={previewActive} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-base font-bold uppercase leading-tight tracking-tight">{localizeExerciseName(ex.name, lang)}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
            {localizeCategory(ex.category, lang)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{typeLabel}</span>
        </div>
      </div>
      <ArrowRightLeft className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );
};

const matchesSearch = (ex: LibraryExercise, q: string): boolean =>
  ex.name.toLowerCase().includes(q) || localizeExerciseName(ex.name, 'en').toLowerCase().includes(q);

const typeLabelKey = (ex: LibraryExercise) => (
  ex.isBodyweight
    ? 'exercises.type.bodyweight' as const
    : ex.type === 'compound' ? 'exercises.type.compound' as const : 'exercises.type.isolation' as const
);

// X27 WP-E: dwupoziomowa nawigacja "grupy miesniowe najpierw" (design-exercises-tab.md).
// Poziom 1: siatka kafli grup + search globalny + wiersz nowego wlasnego cwiczenia.
// Poziom 2 (?group=<id>, ta sama trasa — bottom nav zostaje): hero + filtry + lista.
const ExerciseLibrary = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { uid } = useCurrentUser();
  const { customExercises, addCustomExercise } = useCustomExercises(uid);
  const [searchQuery, setSearchQuery] = useState('');
  // Z176: max 1 aktywny podglad naraz (limit dekoderow wideo iOS); tap w te sama
  // miniature wylacza podglad.
  const [activePreviewName, setActivePreviewName] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Customy z kategoria z taksonomii licza sie do swoich grup; reszta do grupy Wlasne.
  const customInGroups = useMemo(
    () => customExercises.filter((ex) => VALID_CATEGORIES.has(ex.category)),
    [customExercises],
  );
  const customOutsideTaxonomy = useMemo(
    () => customExercises.filter((ex) => !VALID_CATEGORIES.has(ex.category)),
    [customExercises],
  );

  const rawGroup = searchParams.get('group');
  const activeGroup = rawGroup && (VALID_CATEGORIES.has(rawGroup) || (rawGroup === CUSTOM_GROUP_ID && customOutsideTaxonomy.length > 0))
    ? rawGroup
    : null;

  // Wejscie do grupy zaczyna od gory; filtr typu resetuje sie per grupa (edge case 2/3).
  useEffect(() => {
    setTypeFilter('all');
    if (activeGroup) window.scrollTo(0, 0);
  }, [activeGroup]);

  const totalCount = exerciseLibrary.length + customExercises.length;

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categoryOrder.forEach((cat) => counts.set(cat, 0));
    exerciseLibrary.forEach((ex) => counts.set(ex.category, (counts.get(ex.category) ?? 0) + 1));
    customInGroups.forEach((ex) => counts.set(ex.category, (counts.get(ex.category) ?? 0) + 1));
    if (customOutsideTaxonomy.length > 0) counts.set(CUSTOM_GROUP_ID, customOutsideTaxonomy.length);
    return counts;
  }, [customInGroups, customOutsideTaxonomy]);

  const q = searchQuery.toLowerCase().trim();
  const searchResults = useMemo(
    () => (q ? exerciseLibrary.filter((ex) => matchesSearch(ex, q)) : []),
    [q],
  );
  const customSearchResults = useMemo(
    () => (q ? customExercises.filter((ex) => matchesSearch(ex, q)) : []),
    [q, customExercises],
  );

  // ===== Poziom 2: widok grupy =====
  if (activeGroup) {
    const isCustomGroup = activeGroup === CUSTOM_GROUP_ID;
    const groupLibrary = isCustomGroup ? [] : exerciseLibrary.filter((ex) => ex.category === activeGroup);
    const groupCustom: CustomExercise[] = isCustomGroup
      ? customOutsideTaxonomy
      : customInGroups.filter((ex) => ex.category === activeGroup);
    const groupAll: (LibraryExercise & { id?: string })[] = [...groupLibrary, ...groupCustom];

    const byFilter = (ex: LibraryExercise) => (
      typeFilter === 'all' ? true
        : typeFilter === 'bodyweight' ? ex.isBodyweight === true
          : ex.type === typeFilter
    );
    const visible = groupAll.filter(byFilter);

    const title = isCustomGroup ? t('exercises.customGroup') : localizeCategory(activeGroup, lang);

    const filterChips: { id: TypeFilter; label: string }[] = [
      { id: 'all', label: `${t('exercises.all')} ${groupAll.length}` },
      { id: 'compound', label: t('exercises.type.compound') },
      { id: 'isolation', label: t('exercises.type.isolation') },
      { id: 'bodyweight', label: t('exercises.type.bodyweight') },
    ];

    return (
      <div className="space-y-5">
        <GroupHeader
          title={title}
          countLabel={t('exercises.groupCount', { n: groupAll.length })}
          imageUrl={isCustomGroup ? null : getGroupImageUrl(activeGroup)}
          onBack={() => setSearchParams({})}
          backLabel={t('common.back')}
        />

        {/* Filtry typu — rozlaczne, jeden aktywny naraz (edge case 3) */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.id)}
              className={cn('chip-mono shrink-0', typeFilter === chip.id && 'bg-primary text-primary-foreground')}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Lista grupy; custom bez podstrony /exercise/:slug — wiersz bez nawigacji */}
        <div className="overflow-hidden rounded-[20px] bg-surface-low">
          <div className="divide-y divide-surface-high">
            {visible.map((ex) => (
              <ExerciseListRow
                key={ex.id ?? ex.name}
                name={localizeExerciseName(ex.name, lang)}
                typeLabel={t(typeLabelKey(ex))}
                onOpen={ex.id ? undefined : () => navigate(`/exercise/${slugifyExercise(ex.name)}`)}
              />
            ))}
          </div>
          {visible.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('exercises.noResults')}</p>
          )}
        </div>
      </div>
    );
  }

  // ===== Poziom 1: search + siatka grup =====
  return (
    <div className="space-y-6">
      {/* Search globalny */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="exercise-search"
          placeholder={t('exercises.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-full border-0 bg-surface-lowest pl-11"
        />
      </div>

      {/* Eyebrow + licznik calej biblioteki (edge case 6: suma kafli) */}
      <div className="flex items-end justify-between gap-3">
        <p className="text-label-md font-bold uppercase tracking-[0.12em] text-primary">
          {q ? t('exercises.title') : t('exercises.muscleGroups')}
        </p>
        <span data-testid="library-count" className="eyebrow-mono shrink-0 font-bold text-muted-foreground">
          {t('exercises.inLibrary', { n: totalCount })}
        </span>
      </div>

      {q ? (
        // Niepusta fraza → plaska lista wynikow z podgladem wideo (edge case 1)
        <div className="space-y-2">
          {customSearchResults.map((ex) => (
            <div key={ex.id} className="rounded-xl bg-surface-low">
              <ExerciseListRow name={localizeExerciseName(ex.name, lang)} typeLabel={t(typeLabelKey(ex))} />
            </div>
          ))}
          {searchResults.map((ex) => (
            <ExerciseRow
              key={ex.name}
              ex={ex}
              onOpen={(e) => navigate(`/exercise/${slugifyExercise(e.name)}`)}
              previewActive={activePreviewName === ex.name}
              onTogglePreview={(e) => setActivePreviewName((prev) => (prev === e.name ? null : e.name))}
            />
          ))}
          {searchResults.length === 0 && customSearchResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('exercises.noResultsFor', { query: searchQuery })}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Siatka 2 kolumny kafli grup */}
          <div className="grid grid-cols-2 gap-2.5">
            {categoryOrder.map((cat) => (
              <GroupTile
                key={cat}
                label={localizeCategory(cat, lang)}
                count={groupCounts.get(cat) ?? 0}
                imageUrl={getGroupImageUrl(cat)}
                onClick={() => setSearchParams({ group: cat })}
              />
            ))}
            {customOutsideTaxonomy.length > 0 && (
              <GroupTile
                label={t('exercises.customGroup')}
                count={customOutsideTaxonomy.length}
                imageUrl={null}
                onClick={() => setSearchParams({ group: CUSTOM_GROUP_ID })}
              />
            )}
          </div>

          {/* Nowe wlasne cwiczenie — ten sam dialog tworzenia co w ExercisePicker */}
          <button
            type="button"
            data-testid="new-custom-exercise"
            onClick={() => setCreateOpen(true)}
            className="flex min-h-[50px] w-full items-center gap-3 rounded-[18px] bg-surface-low px-4 py-3 text-left transition-colors hover:bg-surface-high"
          >
            <Plus className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-sm font-medium">{t('exercises.newCustom')}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          </button>
        </>
      )}

      <ExercisePicker
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('exercises.newCustom')}
        customExercises={customExercises}
        onCreateCustomExercise={addCustomExercise}
      />
    </div>
  );
};

export default ExerciseLibrary;
