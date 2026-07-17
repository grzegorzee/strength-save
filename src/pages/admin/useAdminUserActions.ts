import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateUserAccess } from '@/lib/registration-api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { logAdminAction } from '@/lib/admin-audit';
import type { FeatureKey } from './admin-user-types';

// Z99: wspólne akcje uprawnień na koncie usera (AdminDashboard + AdminUserDetail).
// Logika 1:1 z dotychczasowych handlerów AdminDashboard; caller aktualizuje swój
// stan przez onPatched (lista ma tablicę users, szczegół pojedynczego usera).

export interface AdminUserPatch {
  accessEnabled?: boolean;
  status?: 'active' | 'suspended';
  feature?: { key: FeatureKey; enabled: boolean };
}

export const useAdminUserActions = (opts: {
  getUserMeta: (uid: string) => { displayName?: string; status?: string; accessEnabled?: boolean } | undefined;
  onPatched: (uid: string, patch: AdminUserPatch) => void;
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { uid: adminUid } = useCurrentUser();

  const toggleFeature = async (uid: string, feature: FeatureKey, enabled: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { [`features.${feature}`]: enabled });
      opts.onPatched(uid, { feature: { key: feature, enabled } });
      void logAdminAction(adminUid, { action: `feature:${feature}:${enabled ? 'on' : 'off'}`, targetUid: uid });
      const userName = opts.getUserMeta(uid)?.displayName || uid;
      toast({ title: enabled ? t('admin.toggleEnabled') : t('admin.toggleDisabled'), description: `${feature} — ${userName}` });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.saveFailed'), variant: 'destructive' });
    }
  };

  const toggleAccess = async (uid: string, enabled: boolean) => {
    try {
      const meta = opts.getUserMeta(uid);
      await updateUserAccess({
        uid,
        accessEnabled: enabled,
        suspended: meta?.status === 'suspended',
      });
      opts.onPatched(uid, { accessEnabled: enabled });
      void logAdminAction(adminUid, { action: `access:${enabled ? 'on' : 'off'}`, targetUid: uid });
      toast({
        title: enabled ? t('admin.accessEnabledTitle') : t('admin.accessDisabledTitle'),
        description: `${meta?.displayName || uid}`,
      });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.accessChangeFailed'), variant: 'destructive' });
    }
  };

  const applySuspended = async (uid: string, suspended: boolean, reason?: string) => {
    try {
      const meta = opts.getUserMeta(uid);
      await updateUserAccess({
        uid,
        accessEnabled: suspended ? false : (meta?.accessEnabled ?? true),
        suspended,
        reason,
      });
      opts.onPatched(uid, {
        status: suspended ? 'suspended' : 'active',
        ...(suspended ? { accessEnabled: false } : {}),
      });
      void logAdminAction(adminUid, { action: suspended ? 'suspend' : 'restore', targetUid: uid, detail: reason });
      toast({
        title: suspended ? t('admin.accountSuspended') : t('admin.accountRestored'),
        description: meta?.displayName || uid,
      });
    } catch {
      toast({ title: t('admin.error'), description: t('admin.statusChangeFailed'), variant: 'destructive' });
    }
  };

  return { toggleFeature, toggleAccess, applySuspended };
};
