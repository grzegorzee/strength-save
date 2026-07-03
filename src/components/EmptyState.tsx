import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

// Pusty stan z zaproszeniem (Z82) — wzorzec z Cycles: ikona, 1 zdanie, CTA.
export const EmptyState = ({ icon: Icon, title, hint, ctaLabel, onCta }: EmptyStateProps) => (
  <div className="text-center py-14 text-muted-foreground">
    <Icon className="h-12 w-12 mx-auto mb-4 opacity-30" />
    <p className="text-sm">{title}</p>
    {hint && <p className="text-xs mt-1">{hint}</p>}
    {ctaLabel && onCta && (
      <Button variant="outline" size="sm" className="mt-4" onClick={onCta}>
        {ctaLabel}
      </Button>
    )}
  </div>
);
