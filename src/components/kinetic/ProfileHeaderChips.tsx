import { cn } from '@/lib/utils';

interface ProfileHeaderChipsProps {
  /** Plan płatny/trial/comp/admin (hasProPlan). Darmowy user bez chipa FREE. */
  showPro: boolean;
  tierLabel: string;
  className?: string;
}

/**
 * Rząd chipów pod nickiem i emailem (spec 2026-08-11): [PRO] wypełniony primary
 * tylko dla planu, [poziom] outline wyciszony, zawsze widoczny, wizualnie
 * podrzędny wobec PRO.
 */
export const ProfileHeaderChips = ({ showPro, tierLabel, className }: ProfileHeaderChipsProps) => (
  <div className={cn('flex items-center justify-center gap-2', className)}>
    {showPro && (
      <span
        data-testid="chip-pro"
        className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground"
      >
        PRO
      </span>
    )}
    <span
      data-testid="chip-tier"
      className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground ring-1 ring-border"
    >
      {tierLabel}
    </span>
  </div>
);
