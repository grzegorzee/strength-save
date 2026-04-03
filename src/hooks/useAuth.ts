import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // E2E test mode — bypass Firebase auth
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setUser({ uid: 'e2e-test-user', email: 'e2e@test.com', displayName: 'E2E Tester', photoURL: '' } as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setError(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd logowania';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err instanceof Error ? err.message : err);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout,
  };
};
