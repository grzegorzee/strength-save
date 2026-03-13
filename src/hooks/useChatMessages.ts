import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, getDocs, writeBatch, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CHAT_CACHE_KEY = 'fittracker-ai-chat';

export interface FirestoreChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Timestamp;
}

export function useChatMessages(userId: string) {
  const [messages, setMessages] = useState<FirestoreChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const migrationDone = useRef(false);

  // Subscribe to Firestore
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'chat_messages'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: FirestoreChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          userId: data.userId,
          role: data.role,
          content: data.content,
          createdAt: data.createdAt,
        });
      });
      setMessages(msgs);
      setIsLoaded(true);

      // One-time migration from localStorage
      if (!migrationDone.current) {
        migrationDone.current = true;
        migrateFromLocalStorage(userId, msgs.length);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const addMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!userId) return;
    await addDoc(collection(db, 'chat_messages'), {
      userId,
      role,
      content,
      createdAt: Timestamp.now(),
    });
  }, [userId]);

  const clearMessages = useCallback(async () => {
    if (!userId) return;
    const q = query(
      collection(db, 'chat_messages'),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }, [userId]);

  return { messages, isLoaded, addMessage, clearMessages };
}

async function migrateFromLocalStorage(userId: string, firestoreCount: number) {
  // If Firestore already has messages, skip migration and clean localStorage
  if (firestoreCount > 0) {
    localStorage.removeItem(CHAT_CACHE_KEY);
    return;
  }

  try {
    const raw = localStorage.getItem(CHAT_CACHE_KEY);
    if (!raw) return;

    const localMessages: { role: 'user' | 'assistant'; content: string; timestamp: number }[] = JSON.parse(raw);
    if (!Array.isArray(localMessages) || localMessages.length === 0) return;

    const colRef = collection(db, 'chat_messages');
    const batch = writeBatch(db);
    for (const msg of localMessages) {
      const docRef = doc(colRef);
      batch.set(docRef, {
        userId,
        role: msg.role,
        content: msg.content,
        createdAt: Timestamp.fromMillis(msg.timestamp),
      });
    }
    await batch.commit();

    localStorage.removeItem(CHAT_CACHE_KEY);
  } catch {
    // Migration is best-effort
  }
}
