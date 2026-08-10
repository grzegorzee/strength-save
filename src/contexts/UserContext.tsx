import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { consumePendingInviteCode, readInviteCodeFromLocation, setPendingInviteCode } from '@/lib/pending-invite';
import { redeemInvite, syncUserProfile, type AppUserProfile } from '@/lib/registration-api';
import {
  mapAppUserProfile,
  mapSubscription,
  resolveProfileLoadFailure,
  type UserProfile,
} from '@/lib/user-profile';

interface UserContextValue {
  uid: string;
  profile: UserProfile | null;
  isAdmin: boolean;
  hasAppAccess: boolean;
  needsEmailVerification: boolean;
  isSuspended: boolean;
  canUseStrava: boolean;
  isNewUser: boolean;
  profileLoaded: boolean;
  profileLoadError: string | null;
}

const UserContext = createContext<UserContextValue | null>(null);

const USERS_COLLECTION = 'users';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const userId = user?.uid;
  const userEmail = user?.email || '';
  const userDisplayName = user?.displayName || '';
  const userPhotoUrl = user?.photoURL || '';

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(false);
      setProfileLoadError(null);
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
      });
      setProfileLoaded(true);
      setProfileLoadError(null);
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
    let unsubscribe: () => void = () => undefined;

    setProfile(null);
    setProfileLoaded(false);
    setProfileLoadError(null);

    const bootstrapUserProfile = async () => {
      try {
        const inviteFromLocation = readInviteCodeFromLocation();
        if (inviteFromLocation) {
          setPendingInviteCode(inviteFromLocation);
        }
        let syncedProfile = await syncUserProfile();
        const pendingInviteCode = consumePendingInviteCode();
        if (pendingInviteCode) {
          try {
            await redeemInvite(pendingInviteCode);
            syncedProfile = await syncUserProfile();
          } catch (inviteError) {
            console.error('Failed to redeem invite after login:', inviteError);
          }
        }

        if (cancelled) return;
        setProfile(mapAppUserProfile(userId, syncedProfile, authProfileSeed));
        setProfileLoadError(null);
        setProfileLoaded(true);

        // Subskrypcja startuje dopiero po idempotentnym utworzeniu profilu.
        // Inaczej pierwszy pusty snapshot montowal bramke kodu przed zakonczeniem
        // syncUserProfile i requestEmailVerificationCode widzial brak users/{uid}.
        unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as AppUserProfile;
            setProfile(mapAppUserProfile(userId, data, authProfileSeed));
            setProfileLoadError(null);
          } else if (snapshot.metadata.fromCache) {
            // Callable wlasnie potwierdzil i zwrocil profil. Pusty pierwszy
            // snapshot z lokalnego cache nie moze nadpisac tego stanu.
            return;
          } else {
            setProfile(null);
            setProfileLoadError('User profile missing after synchronization');
          }
          setProfileLoaded(true);
        }, (err) => {
          console.error('Error fetching user profile:', err);
          setProfile((currentProfile) => resolveProfileLoadFailure(currentProfile));
          setProfileLoadError(err.message || 'Profile load failed');
          setProfileLoaded(true);
        });
      } catch (err) {
        console.error('Error syncing user profile:', err);
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Profile sync failed';
          setProfile(null);
          setProfileLoadError(message);
          setProfileLoaded(true);
        }
      }
    };

    void bootstrapUserProfile();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userDisplayName, userEmail, userId, userPhotoUrl]);

  if (!userId) return null;

  const needsEmailVerification = profileLoaded && profile?.status === 'pending_verification';
  const isSuspended = profileLoaded && profile?.status === 'suspended';
  const isNewUser = profileLoaded && profile !== null && profile.status === 'active' && !profile.onboardingCompleted;
  const hasAppAccess = profile?.role === 'admin' || (
    profile?.status === 'active' && profile?.accessEnabled !== false
  );

  return (
    <UserContext.Provider value={{
      uid: userId,
      profile,
      isAdmin: profile?.role === 'admin',
      hasAppAccess,
      needsEmailVerification,
      isSuspended,
      canUseStrava: hasAppAccess && (profile?.features?.strava ?? profile?.role === 'admin'),
      isNewUser,
      profileLoaded,
      profileLoadError,
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
