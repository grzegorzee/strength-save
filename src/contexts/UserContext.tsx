import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  stravaConnected: boolean;
  onboardingCompleted: boolean;
  features?: Record<string, boolean>;
}

interface UserContextValue {
  uid: string;
  profile: UserProfile | null;
  isAdmin: boolean;
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

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setProfileLoaded(false);
      return;
    }

    const docRef = doc(db, USERS_COLLECTION, user.uid);

    // Create/update user document on login — auto-detect existing users
    const ensureUserDoc = async () => {
      try {
        // Check if user has existing workouts (= existing user from before onboarding)
        const workoutsSnap = await getDocs(
          query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
        );
        const isExistingUser = !workoutsSnap.empty;

        // Check if user already had onboardingCompleted set
        const userSnap = await getDoc(docRef);
        const hadOnboarding = userSnap.exists() && userSnap.data()?.onboardingCompleted === true;

        await setDoc(docRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || '',
          photoURL: user.photoURL || '',
          lastLogin: new Date().toISOString(),
          ...(isExistingUser && { onboardingCompleted: true }),
        }, { merge: true });

        // If existing user was NOT previously marked as onboarded, reset plan to default
        // (v5.0 bug may have overwritten their plan via onboarding)
        if (isExistingUser && !hadOnboarding) {
          const { trainingPlan: defaultPlan } = await import('@/data/trainingPlan');
          await setDoc(doc(db, 'training_plans', user.uid), {
            days: defaultPlan,
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
          uid: user.uid,
          email: data.email || user.email || '',
          displayName: data.displayName || user.displayName || '',
          photoURL: data.photoURL || user.photoURL || '',
          role: data.role || 'user',
          stravaConnected: data.stravaConnected || false,
          onboardingCompleted: data.onboardingCompleted || false,
          features: data.features || undefined,
        });
      } else {
        // Doc not yet created, use auth data
        setProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'user',
          stravaConnected: false,
          onboardingCompleted: false,
        });
      }
      setProfileLoaded(true);
    }, (err) => {
      console.error('Error fetching user profile:', err);
      // Fallback to auth data
      setProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'user',
        stravaConnected: false,
        onboardingCompleted: false,
      });
      setProfileLoaded(true);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (!user?.uid) return null;

  const isNewUser = profileLoaded && profile !== null && !profile.onboardingCompleted;

  return (
    <UserContext.Provider value={{
      uid: user.uid,
      profile,
      isAdmin: profile?.role === 'admin',
      canUseStrava: profile?.features?.strava ?? profile?.role === 'admin',
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
