import type { ComponentType, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ProfileAccordionSectionProps {
  /** Kotwica `profile-<id>` (deep linki ?section=) i testidy `profile-toggle-<id>`. */
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Bieżąca wartość w wierszu (np. przerwa, plan, język) — widoczna także po zwinięciu. */
  value?: ReactNode;
  valueAccent?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true = treść to zwarte wiersze SettingRow w jednym kontenerze; false = karty z własnym tłem. */
  rows?: boolean;
  children: ReactNode;
}

/**
 * X36 (głosówka właściciela po buildzie 124): każda sekcja ustawień Profilu to
 * JEDEN wiersz z „ptaszkiem" — zwinięty zajmuje jedną linię, rozwinięty pokazuje
 * treść pod spodem. Nagłówek h2 obejmuje przycisk (wzorzec Radix Accordion:
 * heading > trigger), więc testy i czytniki ekranu dalej widzą listę sekcji.
 * Treść zwiniętej sekcji NIE jest zamontowana (karty z hookami sieciowymi:
 * urządzenia, Strava, powiadomienia — nie odpytują backendu, dopóki user
 * nie otworzy sekcji).
 */
export const ProfileAccordionSection = ({
  id, label, icon: Icon, value, valueAccent, open, onOpenChange, rows = false, children,
}: ProfileAccordionSectionProps) => (
  <section
    id={`profile-${id}`}
    data-testid={`profile-section-${id}`}
    data-state={open ? 'open' : 'closed'}
    className="scroll-mt-20"
  >
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <h2 className="m-0">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-testid={`profile-toggle-${id}`}
            className="flex min-h-[50px] w-full touch-manipulation items-center gap-3 rounded-2xl bg-surface-low px-3.5 py-2 text-left transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span data-section-label className="min-w-0 flex-1 whitespace-normal break-words text-[13.5px] font-semibold leading-snug">
              {label}
            </span>
            {value != null && value !== '' && (
              <span
                data-section-value
                className={cn(
                  'max-w-[46%] shrink-0 break-words text-right font-mono text-[11px] leading-tight',
                  valueAccent ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {value}
              </span>
            )}
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="pt-2">
        {rows
          ? <div className="rounded-2xl bg-surface-container px-3.5 py-1">{children}</div>
          : <div className="space-y-3">{children}</div>}
      </CollapsibleContent>
    </Collapsible>
  </section>
);
