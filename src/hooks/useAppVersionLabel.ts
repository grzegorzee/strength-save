import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  currentOtaBundleId,
  formatAppVersionLabel,
  getCachedNativeAppInfo,
  getNativeAppInfo,
  type NativeAppInfo,
} from '@/lib/live-update-version';

/** „1.0.1 (153) · aktualizacja 3” natywnie, sama wersja na webie. */
export const useAppVersionLabel = (): string => {
  const { t } = useTranslation();
  const [native, setNative] = useState<NativeAppInfo | null>(() => getCachedNativeAppInfo());

  useEffect(() => {
    let active = true;
    void getNativeAppInfo().then((info) => {
      if (active && info) setNative(info);
    });
    return () => { active = false; };
  }, []);

  return formatAppVersionLabel(
    { version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '', native, otaBundleId: currentOtaBundleId() },
    (n) => t('liveUpdate.versionSuffix', { n }),
  );
};
