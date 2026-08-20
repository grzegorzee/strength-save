import { cn } from '@/lib/utils';

interface ProfileHeaderChipsProps {
  /** Plan płatny/trial/comp/admin (hasProPlan). Darmowy user bez chipa FREE. */
  showPro: boolean;
  tierLabel: string;
  className?: string;
}

/**
 * Rząd chipów w identity Profilu (fala 2, artboard 1a): [PRO] na tincie akcentu
 * (reguła #8: tło zawsze z przezroczystością) tylko dla planu, [poziom] outline
 * wyciszony, zawsze widoczny, wizualnie podrzędny wobec PRO.
 */
export const ProfileHeaderChips = ({ showPro, tierLabel, className }: ProfileHeaderChipsProps) => (
  <div className={cn('flex items-center justify-center gap-2', className)}>
    {showPro && (
      <span
        data-testid="chip-pro"
        className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary"
      >
        PRO
      </span>
    )}
    <span
      data-testid="chip-tier"
      className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground ring-1 ring-border"
    >
      {tierLabel}
    </span>
  </div>
);
