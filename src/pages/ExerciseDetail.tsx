import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';
import { slugifyExercise, getExerciseAnimationUrl, getMuscleImageUrl } from '@/lib/exercise-media';
import { getExerciseDetails, preloadExerciseDetailsEn, categoryToPrimaryMuscle } from '@/data/exercise-details';
import { localizeExerciseName, localizeExerciseInstruction, localizeCategory } from '@/data/exercise-i18n';
import { MuscleMap } from '@/components/MuscleMap';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useExerciseNotes } from '@/hooks/useExerciseNotes';
import { PinnedNoteSection } from '@/components/PinnedNoteSection';
import { ArrowLeft, Play, Dumbbell } from 'lucide-react';

const ExerciseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  // Przypięta notatka per ćwiczenie (Z103) — ta sama sekcja co w karcie treningu.
  const { getPinnedNote, savePinnedNote } = useExerciseNotes(uid);
  // Z176: fallback hero — odmowa autoplay pokazuje natywne controls (reguła 6).
  const [heroControls, setHeroControls] = useState(false);
  // X37 WP-G: obraz partii miesniowej; blad ladowania = fallback do MuscleMap.
  const [muscleImageFailed, setMuscleImageFailed] = useState(false);

  const exercise = useMemo(
    () => exerciseLibrary.find((e) => slugifyExercise(e.name) === slug),
    [slug],
  );

  const planEx = useMemo(
    () => trainingPlan.flatMap((d) => d.exercises).find((e) => e.name === exercise?.name),
    [exercise],
  );

  // Z54: słownik EN dociągany dynamicznie; bump stanu wymusza rerender po załadowaniu
  // (do tego czasu getExerciseDetails zwraca fallback PL).
  const [, setEnDetailsReady] = useState(false);
  useEffect(() => {
    if (lang !== 'en') return;
    void preloadExerciseDetailsEn().then(() => setEnDetailsReady(true));
  }, [lang]);

  if (!exercise) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{t('detail.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/exercises')}>{t('detail.backToLibrary')}</Button>
      </div>
    );
  }

  const details = getExerciseDetails(exercise.name, lang);
  const animationUrl = getExerciseAnimationUrl(exercise.name);

  // Fallback: kroki z instrukcji planu, grupa z kategorii. Wskazowki lokalizujemy do jezyka UI.
  const steps = details?.steps ?? (planEx?.instructions ?? exercise.instructions ?? []).map((i) => localizeExerciseInstruction(exercise.name, i.content, lang));
  const proTip = details?.proTip;
  const targetMuscles = details?.targetMuscles ?? [localizeCategory(exercise.category, lang)];
  const primaryMuscle = details?.primaryMuscle ?? categoryToPrimaryMuscle[exercise.category] ?? 'fullbody';
  const equipment = details?.equipment;
  const typeText = exercise.isBodyweight
    ? t('exercises.type.bodyweight')
    : exercise.type === 'compound' ? t('exercises.type.compound') : t('exercises.type.isolation');

  return (
    <div className="-mx-5 -mt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      {/* Hero */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-highest">
        {animationUrl ? (
          <video
            src={animationUrl}
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted
            playsInline
            controls={heroControls}
            // Z176: twardy start jak w dialogu karty — odmowa autoplay (Low Power
            // Mode) daje natywne controls zamiast martwej pierwszej klatki.
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.muted = true;
              v.play().catch(() => setHeroControls(true));
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Dumbbell className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            // T23-2: deep link / odświeżenie PWA = idx 0, navigate(-1) nie ma dokąd
            // cofnąć, a ekran nie ma AppHeadera — wracamy do biblioteki (wzorzec Layout.tsx).
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
            if (idx > 0) {
              navigate(-1);
            } else {
              navigate('/exercises');
            }
          }}
          className="absolute left-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-surface/70 backdrop-blur-md"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {animationUrl && !heroControls && (
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/90 text-primary-foreground pointer-events-none">
            <Play className="h-6 w-6 fill-current" />
          </span>
        )}
      </div>

      {/* Z202: tytuł POD animacją, nie na niej — blok display-md z gradientem
          zakrywał dolną część wideo 4:3 (nogi/stopy ćwiczącego), a przy długich
          nazwach potrafił zasłonić połowę ruchu (zgłoszenie usera 2026-08-06). */}
      <div className="px-5 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{typeText} / {localizeCategory(exercise.category, lang)}</p>
        <h1 className="mt-1 font-heading text-display-md font-bold uppercase leading-[0.95] tracking-tight">{localizeExerciseName(exercise.name, lang)}</h1>
      </div>

      <div className="space-y-8 px-5 pt-6">
        {/* Pinned note (Z103) */}
        <PinnedNoteSection
          exerciseName={exercise.name}
          pinnedNote={getPinnedNote(exercise.name)}
          onSave={savePinnedNote}
        />

        {/* Instructions */}
        {steps.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-3 font-heading text-headline-lg font-bold">
              <span className="h-0.5 w-6 bg-primary" /> {t('detail.instructions')}
            </h2>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-heading text-lg font-bold text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Pro tip */}
        {proTip && (
          <div className="rounded-xl bg-surface-low p-4 ring-1 ring-accent/20">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{t('detail.proTip')}</p>
            <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">{proTip}</p>
          </div>
        )}

        {/* Target muscles */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase tracking-tight">{t('detail.muscles')}</h2>
          <div className="flex flex-wrap gap-2">
            {targetMuscles.map((m) => (
              <span key={m} className="rounded-full bg-surface-highest px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{m}</span>
            ))}
          </div>
          {/* X37 WP-G (decyzja wlasciciela): zdjecie partii zamiast ludzika; ludzik
              zostaje jako fallback, gdy plik nie wczyta sie (offline bez cache, brak pliku). */}
          {muscleImageFailed ? (
            <MuscleMap primary={primaryMuscle} />
          ) : (
            <figure className="overflow-hidden rounded-xl bg-surface-low" data-testid="muscle-image">
              <img
                src={getMuscleImageUrl(primaryMuscle)}
                alt={t('muscle.mapLabel', { muscle: t(`muscle.${primaryMuscle}` as Parameters<typeof t>[0]) })}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
                onError={() => setMuscleImageFailed(true)}
              />
              <figcaption className="px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                {t('muscle.primary')}: {t(`muscle.${primaryMuscle}` as Parameters<typeof t>[0])}
              </figcaption>
            </figure>
          )}
        </section>

        {/* Equipment */}
        {equipment && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold uppercase tracking-tight">{t('detail.equipment')}</h2>
            <div className="flex items-center gap-3 rounded-xl bg-surface-low p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-highest">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="font-semibold">{equipment}</span>
            </div>
          </section>
        )}
      </div>

    </div>
  );
};

export default ExerciseDetail;
