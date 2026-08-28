import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof badgeVariants> {
  pressed: boolean;
}

/**
 * Visual and keyboard contract for controls that select one option or toggle a
 * binary state. A constant one-pixel border keeps dimensions stable between
 * states; only its token changes.
 */
const toggleButtonClasses = (pressed: boolean) => cn(
  'min-h-11 min-w-11 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  pressed ? 'border-primary' : 'border-muted-foreground',
);

const ChipButton = React.forwardRef<HTMLButtonElement, ChipButtonProps>(
  ({ className, variant, pressed, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(
        badgeVariants({ variant }),
        toggleButtonClasses(pressed),
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
ChipButton.displayName = 'ChipButton';

export { ChipButton, toggleButtonClasses };
