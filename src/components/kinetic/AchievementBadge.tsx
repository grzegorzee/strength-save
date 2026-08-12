// Odznaka systemu (PRO-D): jeden kształt (heksagon), tier przez materiał,
// niezdobyta = ghost (ten sam kształt, 8% krycia, przerywany kontur).
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_GRADIENTS: Record<BadgeTier, string> = {
  bronze: 'linear-gradient(160deg,#c98d5f 0%,#8a5a35 55%,#6e4527 100%)',
  silver: 'linear-gradient(160deg,#e8eaea 0%,#a9adad 55%,#7e8282 100%)',
  gold: 'linear-gradient(160deg,#f4de7d 0%,#d4af37 55%,#a8842a 100%)',
  platinum: 'linear-gradient(160deg,#dfe8ef 0%,#9fb2c4 55%,#6d7f92 100%)',
};

const TIER_INK: Record<BadgeTier, string> = {
  bronze: '#2b1a0e',
  silver: '#24262a',
  gold: '#2e2405',
  platinum: '#1c2430',
};

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

interface AchievementBadgeProps {
  label: string;
  sublabel?: string;
  earned: boolean;
  tier: BadgeTier;
  icon: LucideIcon;
  size?: 'sm' | 'md';
  progress?: number;
}

export const AchievementBadge = ({
  label, sublabel, earned, tier, icon: Icon, size = 'md', progress,
}: AchievementBadgeProps) => {
  const hexSize = size === 'md' ? 'h-[76px] w-[68px]' : 'h-[52px] w-[46px]';
  const iconSize = size === 'md' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <div className={cn('flex flex-col items-center text-center', size === 'md' ? 'w-24' : 'w-16')}>
      <div
        data-testid="badge-hex"
        data-tier={tier}
        data-earned={String(earned)}
        className={cn('flex items-center justify-center', hexSize)}
        style={earned
          ? { clipPath: HEX_CLIP, background: TIER_GRADIENTS[tier] }
          : { clipPath: HEX_CLIP, background: 'rgba(255,255,255,0.05)' }}
      >
        <Icon
          className={iconSize}
          style={{ color: earned ? TIER_INK[tier] : 'hsl(var(--muted-foreground) / 0.5)' }}
          aria-hidden
        />
      </div>
      <p className={cn(
        'mt-2 font-bold leading-tight',
        size === 'md' ? 'text-xs' : 'text-[10px]',
        earned ? 'text-foreground' : 'text-muted-foreground',
      )}>
        {label}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/70">{sublabel}</p>
      )}
      {!earned && typeof progress === 'number' && (
        <div className="mt-1.5 h-1 w-12 overflow-hidden rounded-full bg-surface-highest">
          <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
};
