import { useNavigate } from 'react-router-dom';
import { Crown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useRequiresPaywall } from '@/hooks/useSubscription';

// Baner PRO na dashboardzie: widoczny tylko na natywnym iOS bez aktywnego PRO/trialu.
// Funnel do paywalla — akcje (start treningu, nowy plan) i tak są bramkowane.
export const ProUpsellBanner = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const requiresPaywall = useRequiresPaywall();

  if (!requiresPaywall) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/paywall')}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-primary/[0.08] p-4 text-left transition-colors hover:bg-primary/[0.14]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Crown className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-sm font-bold uppercase tracking-wide">{t('probanner.title')}</span>
        <span className="block text-xs text-muted-foreground">{t('probanner.desc')}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );
};
