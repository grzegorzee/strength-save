import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  stravaConnected: boolean;
  onboardingCompleted: boolean;
}

interface UserContextValue {
  uid: string;
  profile: UserProfile | null;
  isAdmin: boolean;
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

    // Create/update user document on login
    const ensureUserDoc = async () => {
      try {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || '',
          lastLogin: new Date().toISOString(),
        }, { merge: true });
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
          role: data.role || 'user',
          stravaConnected: data.stravaConnected || false,
          onboardingCompleted: data.onboardingCompleted || false,
        });
      } else {
        // Doc not yet created, use auth data
        setProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
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
