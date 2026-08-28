import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group peer relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-surface-highest transition-colors group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
    />
    {/* ON: kciuk kontrastuje z akcentem przez --primary-foreground. OFF: używa
        --foreground, bo --primary-foreground dla jasnych akcentów jest ciemny i
        znikał na ciemnym torze. */}
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-0.5 top-1/2 z-10 block h-5 w-5 -translate-y-1/2 rounded-full shadow-lg ring-0 transition-[transform,background-color] data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-foreground",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
