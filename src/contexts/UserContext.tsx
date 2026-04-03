import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { consumePendingInviteCode, readInviteCodeFromLocation, setPendingInviteCode } from '@/lib/pending-invite';
import { redeemInvite, syncUserProfile, type AppUserProfile } from '@/lib/registration-api';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  accessEnabled: boolean;
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted';
  stravaConnected: boolean;
  onboardingCompleted: boolean;
  primaryProvider: 'google' | 'password';
  registrationSource: string;
  emailVerifiedAt: string | null;
  cohorts: string[];
  features?: Record<string, boolean>;
}

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
}

const UserContext = createContext<UserContextValue | null>(null);

const USERS_COLLECTION = 'users';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const userId = user?.uid;
  const userEmail = user?.email || '';
  const userDisplayName = user?.displayName || '';
  const userPhotoUrl = user?.photoURL || '';

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(false);
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
      });
      setProfileLoaded(true);
      return;
    }

    const docRef = doc(db, USERS_COLLECTION, userId);

    let cancelled = false;

    const ensureUserDoc = async () => {
      try {
        const inviteFromLocation = readInviteCodeFromLocation();
        if (inviteFromLocation) {
          setPendingInviteCode(inviteFromLocation);
        }
        await syncUserProfile();
        const pendingInviteCode = consumePendingInviteCode();
        if (pendingInviteCode) {
          try {
            await redeemInvite(pendingInviteCode);
            await syncUserProfile();
          } catch (inviteError) {
            console.error('Failed to redeem invite after login:', inviteError);
          }
        }
      } catch (err) {
        console.error('Error syncing user profile:', err);
        if (!cancelled) {
          setProfileLoaded(true);
        }
      }
    };

    void ensureUserDoc();

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUserProfile;
        setProfile({
          uid: userId,
          email: data.email || userEmail,
          displayName: data.displayName || userDisplayName,
          photoURL: data.photoURL || userPhotoUrl,
          role: data.role || 'user',
          accessEnabled: data.access?.enabled !== false,
          status: data.status || 'active',
          stravaConnected: data.stravaConnected || false,
          onboardingCompleted: data.onboardingCompleted || false,
          primaryProvider: data.auth?.primaryProvider || 'google',
          registrationSource: data.registration?.source || data.auth?.primaryProvider || 'google',
          emailVerifiedAt: data.verification?.emailVerifiedAt || null,
          cohorts: data.cohorts || [],
          features: data.features || undefined,
        });
      } else {
        // Doc not yet created, use auth data
        setProfile({
          uid: userId,
          email: userEmail,
          displayName: userDisplayName,
          photoURL: userPhotoUrl,
          role: 'user',
          accessEnabled: false,
          status: 'pending_verification',
          stravaConnected: false,
          onboardingCompleted: false,
          primaryProvider: 'password',
          registrationSource: 'email',
          emailVerifiedAt: null,
          cohorts: [],
        });
      }
      setProfileLoaded(true);
    }, (err) => {
      console.error('Error fetching user profile:', err);
      // Fallback to auth data
      setProfile({
        uid: userId,
        email: userEmail,
        displayName: userDisplayName,
        photoURL: userPhotoUrl,
        role: 'user',
        accessEnabled: false,
        status: 'pending_verification',
        stravaConnected: false,
        onboardingCompleted: false,
        primaryProvider: 'password',
        registrationSource: 'email',
        emailVerifiedAt: null,
        cohorts: [],
      });
      setProfileLoaded(true);
    });

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
