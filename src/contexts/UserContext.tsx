import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { trainingPlan as defaultTrainingPlan } from '@/data/trainingPlan';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  accessEnabled: boolean;
  stravaConnected: boolean;
  onboardingCompleted: boolean;
  features?: Record<string, boolean>;
}

interface UserContextValue {
  uid: string;
  profile: UserProfile | null;
  isAdmin: boolean;
  hasAppAccess: boolean;
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
      setProfile({
        uid: userId,
        email: 'e2e@test.com',
        displayName: 'E2E Tester',
        photoURL: '',
        role: 'admin',
        accessEnabled: true,
        stravaConnected: false,
        onboardingCompleted: true,
      });
      setProfileLoaded(true);
      return;
    }

    const docRef = doc(db, USERS_COLLECTION, userId);

    // Create/update user document on login — auto-detect existing users
    const ensureUserDoc = async () => {
      try {
        const userSnap = await getDoc(docRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const accessEnabled = userData?.access?.enabled !== false;
        const hadOnboarding = userData?.onboardingCompleted === true;

        await setDoc(docRef, {
          uid: userId,
          email: userEmail,
          displayName: userDisplayName || userEmail.split('@')[0] || '',
          photoURL: userPhotoUrl,
          lastLogin: new Date().toISOString(),
          ...(!userSnap.exists() && { access: { enabled: false } }),
        }, { merge: true });

        if (!userSnap.exists() || !accessEnabled || hadOnboarding) {
          return;
        }

        // Existing user migration path: if workouts exist but onboarding flag is missing, restore it.
        const workoutsSnap = await getDocs(
          query(collection(db, 'workouts'), where('userId', '==', userId), limit(1))
        );
        const isExistingUser = !workoutsSnap.empty;

        // If existing user was NOT previously marked as onboarded, reset plan to default
        // (v5.0 bug may have overwritten their plan via onboarding)
        if (isExistingUser) {
          await setDoc(docRef, { onboardingCompleted: true }, { merge: true });
          await setDoc(doc(db, 'training_plans', userId), {
            days: defaultTrainingPlan,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error creating user doc:', err);
      }
    };

    ensureUserDoc();

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfile({
          uid: userId,
          email: data.email || userEmail,
          displayName: data.displayName || userDisplayName,
          photoURL: data.photoURL || userPhotoUrl,
          role: data.role || 'user',
          accessEnabled: data.access?.enabled !== false,
          stravaConnected: data.stravaConnected || false,
          onboardingCompleted: data.onboardingCompleted || false,
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
          stravaConnected: false,
          onboardingCompleted: false,
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
        stravaConnected: false,
        onboardingCompleted: false,
      });
      setProfileLoaded(true);
    });

    return () => unsubscribe();
  }, [userDisplayName, userEmail, userId, userPhotoUrl]);

  if (!userId) return null;

  const isNewUser = profileLoaded && profile !== null && !profile.onboardingCompleted;
  const hasAppAccess = profile?.role === 'admin' || profile?.accessEnabled !== false;

  return (
    <UserContext.Provider value={{
      uid: userId,
      profile,
      isAdmin: profile?.role === 'admin',
      hasAppAccess,
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
