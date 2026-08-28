import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import { useExclusiveOverlayState } from "@/hooks/useExclusiveOverlay";

const Dialog = ({ open: controlledOpen, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const [open, setOpen] = useExclusiveOverlayState(controlledOpen, defaultOpen, onOpenChange);
  return <DialogPrimitive.Root {...props} open={open} onOpenChange={setOpen} />;
};

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-app-overlay
    data-radix-overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { t } = useTranslation();

  // Z192: pas bezpieczeństwa na osieroconą blokadę interakcji. Modalna warstwa
  // (np. DropdownMenu) zdejmowana RÓWNOLEGLE z otwarciem dialogu potrafi zostawić
  // body z pointer-events: none — wtedy X i overlay są martwe, a na iOS nie ma
  // Escape. Po czasie animacji menu (350 ms), jeśli blokada wisi a żadna otwarta
  // warstwa menu nie żyje w DOM, zdejmujemy ją. Nie zastępuje sekwencji Z191 —
  // chroni przed każdą PRZYSZŁĄ kombinacją warstw.
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      if (
        document.body.style.pointerEvents === "none"
        && !document.querySelector('[data-state="open"][role="menu"]')
      ) {
        document.body.style.pointerEvents = "";
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Z159: centrowanie względem WIDOCZNEGO viewportu — klawiatura iOS nie zmienia
        // 100dvh, więc odejmujemy --keyboard-inset (ustawiany w keyboard-inset.ts).
        // Z170: BEZ animacji top — przy chowaniu klawiatury dialog zjeżdżał ~150px
        // pod palcem przez 200ms i tap lądował w overlayu (skok natychmiastowy jest OK).
        "fixed left-[50%] top-[calc((100dvh-var(--keyboard-inset,0px))/2)] z-[51] grid w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh_-_var(--keyboard-inset,0px)_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background p-6 shadow-lg data-[state=closed]:pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      {/* Z192: pole dotyku 44 px (HIG); rośnie POLE, nie glif. */}
      <DialogPrimitive.Close className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">{t("a11y.close")}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    // Z192: pr-8 — tytuł nie wjeżdża pod 44-pikselowy X w prawym górnym rogu.
    className={cn("pr-8 text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
