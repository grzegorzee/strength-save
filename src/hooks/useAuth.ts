import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

// TWÓJ EMAIL - tylko ten email może się zalogować
const ALLOWED_EMAIL = "g.jasionowicz@gmail.com";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email !== ALLOWED_EMAIL) {
        // Użytkownik zalogowany ale nie autoryzowany - wyloguj
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
      // Ustaw persystencję na localStorage - przetrwa zamknięcie przeglądarki/PWA
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user.email !== ALLOWED_EMAIL) {
        await signOut(auth);
        setError("Brak dostępu. Tylko autoryzowane konta mogą korzystać z aplikacji.");
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "Błąd logowania");
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user && user.email === ALLOWED_EMAIL,
    signInWithGoogle,
    logout,
  };
};
