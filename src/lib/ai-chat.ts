import { callOpenAI, prepareCoachData } from '@/lib/ai-coach';
import type { WorkoutSession, BodyMeasurement } from '@/types';
import type { TrainingDay } from '@/data/trainingPlan';

// --- Types ---

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// --- System prompt ---

const CHAT_SYSTEM_PROMPT = `Jesteś osobistym trenerem siłowym i asystentem. Użytkownik pyta Cię o treningi,
ćwiczenia, progresję i dietę. Masz dostęp do jego danych treningowych (poniżej).
Mów po polsku, konkretnie, bez zbędnych wstępów. Używaj liczb z danych.
Odpowiadaj w zwykłym tekście. Formatuj markdown jeśli potrzebne (bold, listy).`;

// --- Chat function ---

export async function sendChatMessage(
  history: ChatMessage[],
  workouts: WorkoutSession[],
  measurements: BodyMeasurement[],
  plan: TrainingDay[],
): Promise<string> {
  const coachData = prepareCoachData(workouts, measurements, plan);

  const systemContent = `${CHAT_SYSTEM_PROMPT}

DANE TRENINGOWE UŻYTKOWNIKA:
${JSON.stringify(coachData, null, 2)}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemContent },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  return callOpenAI(messages);
}
