// Jeden slot komunikatów stanu (PRO-E): user widzi najważniejszy baner,
// pozostałe rozwija świadomie. Koniec ze ścianą 4 banerów nad treningiem.
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export interface StatusEntry {
  id: string;
  priority: number;
  node: ReactNode;
}

export const DashboardStatusSlot = ({ entries }: { entries: StatusEntry[] }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b.priority - a.priority);
  const [top, ...rest] = sorted;

  return (
    <div className="space-y-3" data-testid="dash-status-slot">
      <div key={top.id}>{top.node}</div>
      {rest.length > 0 && (
        <>
          {expanded && rest.map((e) => <div key={e.id}>{e.node}</div>)}
          <button
            type="button"
            data-testid="status-slot-toggle"
            onClick={() => setExpanded((p) => !p)}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-surface-low py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? t('dash.status.less') : t('dash.status.more', { n: rest.length })}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </>
      )}
    </div>
  );
};
