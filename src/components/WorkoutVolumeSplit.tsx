import { useTranslation } from '@/contexts/LanguageContext';
import { localizeCategory } from '@/data/exercise-i18n';
import { VOLUME_SPLIT_OTHER, type VolumeSplitBucket } from '@/lib/volume-split';
import { cn } from '@/lib/utils';

// Fala 2 (2026-08-20, plan/summary.md par. 2.4): "Gdzie poszedł tonaż" — pasek
// składany + legenda. Odcienie JEDNEGO akcentu wg malejącego udziału (tokens.md
// par. 2.3); kubełek "Inne" zawsze neutralny. STATYCZNA lista klas (Tailwind purge).
const SEGMENT_CLASSES = [
  'bg-primary',
  'bg-primary/75',
  'bg-primary/55',
  'bg-primary/35',
  'bg-primary/20',
] as const;

const OTHER_CLASS = 'bg-surface-highest';

const segmentClass = (bucket: VolumeSplitBucket, index: number): string =>
  bucket.key === VOLUME_SPLIT_OTHER
    ? OTHER_CLASS
    : SEGMENT_CLASSES[Math.min(index, SEGMENT_CLASSES.length - 1)];

export const WorkoutVolumeSplit = ({ buckets }: { buckets: VolumeSplitBucket[] }) => {
  const { t, lang } = useTranslation();
  if (buckets.length < 2) return null;

  const label = (bucket: VolumeSplitBucket): string =>
    bucket.key === VOLUME_SPLIT_OTHER
      ? t('workout.summary.volumeSplitOther')
      : localizeCategory(bucket.key, lang);

  return (
    <div className="flex flex-col gap-3" data-testid="volume-split">
      <span className="eyebrow-mono text-muted-foreground">
        {t('workout.summary.volumeSplitTitle')}
      </span>
      <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-full">
        {buckets.map((bucket, index) => (
          <div
            key={bucket.key}
            className={segmentClass(bucket, index)}
            style={{ width: `${bucket.pct}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2.5">
        {buckets.map((bucket, index) => (
          <div key={bucket.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('h-2 w-2 rounded-[2px]', segmentClass(bucket, index))}
            />
            <span className="text-xs text-foreground/80">{label(bucket)}</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {Math.round(bucket.pct)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
