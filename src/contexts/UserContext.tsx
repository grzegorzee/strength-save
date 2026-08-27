import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, FUNNEL_REGISTERED_KEY } from '@/hooks/useAuth';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { getPendingInviteCode, isPermanentInviteRedeemError, readInviteCodeFromLocation, setPendingInviteCode } from '@/lib/pending-invite';
import { reportClientError } from '@/lib/error-telemetry';
import { redeemInvite, syncUserProfile, type AppUserProfile } from '@/lib/registration-api';
import {
  mapAppUserProfile,
  mapSubscription,
  resolveProfileLoadFailure,
  type UserProfile,
} from '@/lib/user-profile';
import { markStartup } from '@/lib/startup-performance';
import {
  getProtectedCallableRejectionReason,
  type ProtectedCallableRejectionReason,
} from '@/lib/protected-callable';

interface UserContextValue {
  uid: string;
  profile: UserProfile | null;
  isAdmin: boolean;
  hasAppAccess: boolean;
  needsEmailVerification: boolean;
  isSuspended: boolean;
  canUseStrava: boolean;
  canUseBodyPhotos: boolean;
  isNewUser: boolean;
  profileLoaded: boolean;
  profileLoadError: string | null;
  profileSyncBlockReason: ProtectedCallableRejectionReason | null;
  profileSyncPending: boolean;
  retryProfileSync: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

const USERS_COLLECTION = 'users';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileSyncBlockReason, setProfileSyncBlockReason] = useState<ProtectedCallableRejectionReason | null>(null);
  const [profileSyncPending, setProfileSyncPending] = useState(false);
  const retryProfileSyncRef = useRef<(() => Promise<void>) | null>(null);
  const userId = user?.uid;
  const userEmail = user?.email || '';
  const userDisplayName = user?.displayName || '';
  const userPhotoUrl = user?.photoURL || '';
  const retryProfileSync = useCallback(
    () => retryProfileSyncRef.current?.() ?? Promise.resolve(),
    [],
  );

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(false);
      setProfileLoadError(null);
      setProfileSyncBlockReason(null);
      setProfileSyncPending(false);
      retryProfileSyncRef.current = null;
      return;
    }

    // E2E test mode — skip Firestore, use mock profile
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      const e2eState = readE2EAuthState();
      const status = e2eState.scenario === 'pending-verification'
        ? 'pending_verification'
        : e2eState.scenario === 'suspended'
          ? 'suspended'
          : 'active';
      const role = e2eState.scenario === 'active-admin' ? 'admin' : 'user';
      const accessEnabled = e2eState.scenario !== 'suspended' && e2eState.scenario !== 'pending-verification';
      const onboardingCompleted = !['new-user', 'new-invited-user'].includes(e2eState.scenario);
      const registrationSource = e2eState.scenario === 'new-invited-user'
        ? 'invite-google'
        : e2eState.scenario === 'pending-verification'
          ? 'email'
          : 'google';
      setProfile({
        uid: userId,
        email: e2eState.email || 'e2e@test.com',
        displayName: e2eState.displayName || 'E2E Tester',
        photoURL: '',
        role,
        accessEnabled,
        status,
        stravaConnected: false,
        onboardingCompleted,
        primaryProvider: e2eState.scenario === 'pending-verification' ? 'password' : 'google',
        registrationSource,
        emailVerifiedAt: status === 'active' ? new Date().toISOString() : null,
        cohorts: e2eState.scenario === 'active-admin' ? ['internal'] : [],
        subscription: mapSubscription(e2eState.subscription ?? undefined),
        trainingProfile: e2eState.trainingProfile,
      });
      setProfileLoaded(true);
      setProfileLoadError(null);
      setProfileSyncBlockReason(null);
      setProfileSyncPending(false);
      markStartup('profile-cache-ready', 'e2e');
      return;
    }

    const docRef = doc(db, USERS_COLLECTION, userId);
    const authProfileSeed = {
      userId,
      email: userEmail,
      displayName: userDisplayName,
      photoURL: userPhotoUrl,
    };

    let cancelled = false;
    let initialSyncSettled = false;
    let syncInFlight: Promise<void> | null = null;

    setProfile(null);
    setProfileLoaded(false);
    setProfileLoadError(null);
    setProfileSyncBlockReason(null);
    setProfileSyncPending(false);

    // Persistent Firestore cache jest pierwszym źródłem cold/offline. Listener
    // musi powstać PRZED callable; pusty cache nie tworzy profilu ani dostępu.
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (snapshot) => {
      if (cancelled) return;
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUserProfile;
        setProfile(mapAppUserProfile(userId, data, authProfileSeed));
        setProfileLoadError(null);
        if (!snapshot.metadata.fromCache) setProfileSyncBlockReason(null);
        setProfileLoaded(true);
        markStartup('profile-cache-ready', snapshot.metadata.fromCache ? 'cache' : 'server');
      } else if (snapshot.metadata.fromCache || !initialSyncSettled) {
        return;
      } else {
        setProfile(null);
        setProfileLoadError('User profile missing after synchronization');
        setProfileLoaded(true);
      }
    }, (err) => {
      if (cancelled) return;
      console.error('Error fetching user profile:', err);
      setProfile((currentProfile) => resolveProfileLoadFailure(currentProfile));
      setProfileLoadError(err.message || 'Profile load failed');
      setProfileLoaded(true);
    });

    const runProfileSync = () => {
      if (syncInFlight) return syncInFlight;
      setProfileSyncPending(true);
      const attempt = (async () => {
        try {
          const inviteFromLocation = readInviteCodeFromLocation();
          if (inviteFromLocation) {
            setPendingInviteCode(inviteFromLocation);
          }
          let syncedProfile = await syncUserProfile();
          // Bug 33: kod konsumujemy dopiero PO udanym redeem. Wcześniejsze
          // consume gubiło zaproszenie cicho przy przejściowej porażce
          // (timeout 10 s na słabym zasięgu) — retry 'online' nie miał już
          // czego ponowić, a przypadek nie zostawiał śladu w telemetrii.
          const pendingInviteCode = getPendingInviteCode();
          if (pendingInviteCode) {
            try {
              await redeemInvite(pendingInviteCode);
              setPendingInviteCode(null);
              syncedProfile = await syncUserProfile();
            } catch (inviteError) {
              console.error('Failed to redeem invite after login:', inviteError);
              if (isPermanentInviteRedeemError(inviteError)) setPendingInviteCode(null);
              void reportClientError(userId, {
                code: 'invite-redeem-failed',
                phase: 'other',
                detail: inviteError instanceof Error ? inviteError.message : String(inviteError),
              });
            }
          }

          if (cancelled) return;
          // Z222: para do register_started — pierwszy udany sync profilu po
          // rejestracji w tej sesji przeglądarki = profil utworzony.
          try {
            if (sessionStorage.getItem(FUNNEL_REGISTERED_KEY) === userId) {
              sessionStorage.removeItem(FUNNEL_REGISTERED_KEY);
              trackTelemetryEvent(userId, 'profile_created');
            }
          } catch { /* brak storage — pomijamy parę */ }
          setProfile(mapAppUserProfile(userId, syncedProfile, authProfileSeed));
          setProfileLoadError(null);
          setProfileSyncBlockReason(null);
          setProfileLoaded(true);
          markStartup('profile-cache-ready', 'sync');
        } catch (err) {
          console.error('Error syncing user profile:', err);
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Profile sync failed';
            setProfile((currentProfile) => resolveProfileLoadFailure(currentProfile));
            setProfileLoadError(message);
            setProfileSyncBlockReason(getProtectedCallableRejectionReason(err));
            setProfileLoaded(true);
          }
        } finally {
          initialSyncSettled = true;
        }
      })();
      syncInFlight = attempt;
      void attempt.finally(() => {
        if (syncInFlight === attempt) {
          syncInFlight = null;
          if (!cancelled) setProfileSyncPending(false);
        }
      });
      return attempt;
    };

    retryProfileSyncRef.current = runProfileSync;

    void runProfileSync();
    const handleOnline = () => void runProfileSync();
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      if (retryProfileSyncRef.current === runProfileSync) retryProfileSyncRef.current = null;
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [userDisplayName, userEmail, userId, userPhotoUrl]);

  if (!userId) return null;

  // Auth może zmienić uid o render wcześniej niż cleanup efektu. Nigdy nie
  // wystawiamy profilu poprzedniego konta pod nowym uid nawet przez jedną klatkę.
  const currentProfile = profile?.uid === userId ? profile : null;
  const needsEmailVerification = profileLoaded && currentProfile?.status === 'pending_verification';
  const isSuspended = profileLoaded && currentProfile?.status === 'suspended';
  const isNewUser = profileLoaded && currentProfile !== null && currentProfile.status === 'active' && !currentProfile.onboardingCompleted;
  const hasAppAccess = currentProfile?.role === 'admin' || (
    currentProfile?.status === 'active' && currentProfile?.accessEnabled !== false
  );

  return (
    <UserContext.Provider value={{
      uid: userId,
      profile: currentProfile,
      isAdmin: currentProfile?.role === 'admin',
      hasAppAccess,
      needsEmailVerification,
      isSuspended,
      canUseStrava: hasAppAccess && (currentProfile?.features?.strava ?? currentProfile?.role === 'admin'),
      // WP-D D1: zdjęcia sylwetki domyślnie dla każdego z dostępem; admin może
      // jawnie wyłączyć per user (features.bodyPhotos === false).
      canUseBodyPhotos: hasAppAccess && (currentProfile?.features?.bodyPhotos ?? true),
      isNewUser,
      profileLoaded,
      profileLoadError,
      profileSyncBlockReason,
      profileSyncPending,
      retryProfileSync,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useCurrentUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return context;
};
