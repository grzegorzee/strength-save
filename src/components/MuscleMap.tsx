import type { PrimaryMuscle } from '@/data/exercise-details';
import { cn } from '@/lib/utils';

const MUSCLE_LABELS: Record<PrimaryMuscle, string> = {
  chest: 'Klatka piersiowa',
  back: 'Plecy',
  shoulders: 'Barki',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Przedramiona',
  quads: 'Czworogłowe ud',
  hamstrings: 'Dwugłowe ud',
  glutes: 'Pośladki',
  calves: 'Łydki',
  core: 'Brzuch / core',
  fullbody: 'Całe ciało',
};

// Które regiony schematu podświetlić dla danej grupy głównej.
const ACTIVE_REGIONS: Record<PrimaryMuscle, string[]> = {
  chest: ['chest'],
  back: ['back', 'core'],
  shoulders: ['shoulderL', 'shoulderR'],
  biceps: ['armL', 'armR'],
  triceps: ['armL', 'armR'],
  forearms: ['forearmL', 'forearmR'],
  quads: ['thighL', 'thighR'],
  hamstrings: ['thighL', 'thighR'],
  glutes: ['hips'],
  calves: ['calfL', 'calfR'],
  core: ['core'],
  fullbody: ['chest', 'core', 'shoulderL', 'shoulderR', 'armL', 'armR', 'thighL', 'thighR'],
};

export const MuscleMap = ({ primary, className }: { primary: PrimaryMuscle; className?: string }) => {
  const active = new Set(ACTIVE_REGIONS[primary] ?? []);
  const fill = (id: string) => (active.has(id) ? 'hsl(var(--accent))' : 'hsl(var(--surface-highest))');

  return (
    <div className={cn('rounded-xl bg-surface-low p-6', className)}>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 200 360" className="h-64 w-auto" role="img" aria-label={`Mapa mięśni: ${MUSCLE_LABELS[primary]}`}>
          {/* head */}
          <circle cx="100" cy="28" r="18" fill="hsl(var(--surface-highest))" />
          {/* neck */}
          <rect x="92" y="44" width="16" height="14" rx="4" fill="hsl(var(--surface-highest))" />
          {/* shoulders */}
          <ellipse cx="64" cy="74" rx="20" ry="13" fill={fill('shoulderL')} />
          <ellipse cx="136" cy="74" rx="20" ry="13" fill={fill('shoulderR')} />
          {/* chest */}
          <rect x="70" y="64" width="60" height="42" rx="12" fill={fill('chest')} />
          {/* back marker (subtelny pasek z tyłu, pokazany gdy plecy) */}
          <rect x="74" y="70" width="52" height="8" rx="4" fill={fill('back')} opacity="0.6" />
          {/* core */}
          <rect x="76" y="110" width="48" height="56" rx="12" fill={fill('core')} />
          {/* upper arms */}
          <rect x="40" y="70" width="18" height="56" rx="9" fill={fill('armL')} />
          <rect x="142" y="70" width="18" height="56" rx="9" fill={fill('armR')} />
          {/* forearms */}
          <rect x="38" y="128" width="16" height="50" rx="8" fill={fill('forearmL')} />
          <rect x="146" y="128" width="16" height="50" rx="8" fill={fill('forearmR')} />
          {/* hips/glutes */}
          <rect x="74" y="168" width="52" height="26" rx="10" fill={fill('hips')} />
          {/* thighs */}
          <rect x="74" y="196" width="24" height="74" rx="11" fill={fill('thighL')} />
          <rect x="102" y="196" width="24" height="74" rx="11" fill={fill('thighR')} />
          {/* calves */}
          <rect x="76" y="274" width="20" height="60" rx="9" fill={fill('calfL')} />
          <rect x="104" y="274" width="20" height="60" rx="9" fill={fill('calfR')} />
        </svg>
      </div>
      <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Główne: {MUSCLE_LABELS[primary]}
      </p>
    </div>
  );
};
