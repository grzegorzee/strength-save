import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || import.meta.env.VITE_ALLOWED_EMAIL || "")
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

const isEmailAllowed = (email: string | null): boolean => {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isEmailAllowed(user.email)) {
        signOut(auth);
        setError("Brak dostępu. Tylko autoryzowane konta mogą korzystać z aplikacji.");
        setUser(null);
      } else {
        setUser(user);
        setError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);

      if (!isEmailAllowed(result.user.email)) {
        await signOut(auth);
        setError("Brak dostępu. Tylko autoryzowane konta mogą korzystać z aplikacji.");
        return false;
      }

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
    isAuthenticated: !!user && isEmailAllowed(user.email),
    signInWithGoogle,
    logout,
  };
};
