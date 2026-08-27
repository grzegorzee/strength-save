import { useState } from 'react';
// `?no-inline` keeps the official files as identifiable, unmodified assets in
// the production bundle instead of converting their contents to a data URL.
import connectWithStrava from '@/assets/strava/connect-with-strava-orange.svg?no-inline';
import poweredByStrava from '@/assets/strava/powered-by-strava-horizontal-white.svg?no-inline';
import { useTranslation } from '@/contexts/LanguageContext';

interface StravaConnectButtonProps {
  onConnect: () => Promise<unknown> | unknown;
}

export const StravaConnectButton = ({ onConnect }: StravaConnectButtonProps) => {
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={t('strava.brand.connectAria')}
      aria-busy={isConnecting}
      disabled={isConnecting}
      onClick={handleConnect}
      className="inline-flex h-12 touch-manipulation items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60"
    >
      <img
        src={connectWithStrava}
        alt={t('strava.brand.connectAria')}
        width={237}
        height={48}
        className="h-12 w-auto"
      />
    </button>
  );
};

interface PoweredByStravaProps {
  className?: string;
}

export const PoweredByStrava = ({ className = '' }: PoweredByStravaProps) => {
  const { t } = useTranslation();

  return (
    <img
      src={poweredByStrava}
      alt={t('strava.brand.poweredByAlt')}
      width={365}
      height={37}
      className={`h-[18px] w-auto max-w-full ${className}`}
    />
  );
};
