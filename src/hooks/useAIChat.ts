import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { sendChatMessage, type ChatConversation, type ChatMessage } from '@/lib/ai-chat';

const COLLECTION = 'chat_conversations';

export const useAIChat = (userId: string) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { workouts, measurements } = useFirebaseWorkouts(userId);
  const { plan } = useTrainingPlan(userId);

  // Subscribe to conversations (per-user isolation)
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, COLLECTION), where('userId', '==', userId), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: ChatConversation[] = [];
        snapshot.forEach((d) => {
          data.push({ id: d.id, ...d.data() } as ChatConversation);
        });
        setConversations(data);
      },
      (err) => {
        console.error('Error fetching conversations:', err);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const createConversation = useCallback(async () => {
    const id = `chat-${Date.now()}`;
    const now = new Date().toISOString();
    const conv: ChatConversation & { userId: string } = {
      id,
      userId,
      title: 'Nowa rozmowa',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    await setDoc(doc(db, COLLECTION, id), conv);
    setActiveConversation(id);
    setError(null);
    return id;
  }, [userId]);

  const deleteConversation = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
    if (activeConversationId === id) {
      setActiveConversation(null);
    }
  }, [activeConversationId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    let convId = activeConversationId;

    // Auto-create conversation if none active
    if (!convId) {
      convId = await createConversation();
    }

    const conv = conversations.find(c => c.id === convId);
    const existingMessages = conv ? conv.messages : [];

    const userMessage: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...existingMessages, userMessage];

    // Auto-title from first user message
    const isFirstMessage = existingMessages.length === 0;
    const title = isFirstMessage
      ? text.trim().slice(0, 50) + (text.trim().length > 50 ? '...' : '')
      : (conv?.title || 'Nowa rozmowa');

    // Save user message immediately
    const now = new Date().toISOString();
    await setDoc(doc(db, COLLECTION, convId), {
      id: convId,
      userId,
      title,
      createdAt: conv?.createdAt || now,
      updatedAt: now,
      messages: updatedMessages,
    });

    // Call AI
    setIsTyping(true);
    setError(null);

    try {
      const aiResponse = await sendChatMessage(updatedMessages, workouts, measurements, plan);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalNow = new Date().toISOString();

      await setDoc(doc(db, COLLECTION, convId), {
        id: convId,
        userId,
        title,
        createdAt: conv?.createdAt || now,
        updatedAt: finalNow,
        messages: finalMessages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd komunikacji z AI';
      setError(message);
    } finally {
      setIsTyping(false);
    }
  }, [activeConversationId, conversations, workouts, measurements, plan, createConversation]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isTyping,
    error,
    createConversation,
    deleteConversation,
    sendMessage,
    setActiveConversation,
  };
};
