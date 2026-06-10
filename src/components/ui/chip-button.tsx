import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChipButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof badgeVariants> {
  pressed: boolean;
}

const ChipButton = React.forwardRef<HTMLButtonElement, ChipButtonProps>(
  ({ className, variant, pressed, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(badgeVariants({ variant }), 'cursor-pointer', className)}
      {...props}
    />
  ),
);
ChipButton.displayName = 'ChipButton';

export { ChipButton };
