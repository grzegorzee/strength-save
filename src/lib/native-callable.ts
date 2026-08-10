import type { FirebaseAppCheckPlugin } from '@capacitor-firebase/app-check';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth, firebaseConfig } from '@/lib/firebase';

// Import pakietu runtime dolacza webowy Firebase App Check do krytycznego chunka,
// mimo ze ta sciezka dziala tylko na iOS. Natywny plugin rejestrujemy bezposrednio,
// a z paczki bierzemy wylacznie wymazywany przez TS typ kontraktu.
const FirebaseAppCheck = registerPlugin<FirebaseAppCheckPlugin>('FirebaseAppCheck');

interface CallableErrorBody {
  status?: string;
  message?: string;
  details?: unknown;
}

interface CallableEnvelope<T> {
  result?: T;
  error?: CallableErrorBody;
}

export class CallableProtocolError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CallableProtocolError';
    this.code = code;
    this.details = details;
  }
}

const normalizeCallableCode = (status: string | undefined): string =>
  (status || 'INTERNAL').toLowerCase().replace(/_/g, '-');

export async function invokeCallableProtocol<RequestData, ResponseData>(input: {
  functionName: string;
  data: RequestData;
  projectId: string;
  region: string;
  authToken: string;
  appCheckToken: string;
  fetchImpl?: typeof fetch;
}): Promise<ResponseData> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `https://${input.region}-${input.projectId}.cloudfunctions.net/${input.functionName}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.authToken}`,
      'Content-Type': 'application/json',
      'X-Firebase-AppCheck': input.appCheckToken,
    },
    body: JSON.stringify({ data: input.data }),
  });

  let envelope: CallableEnvelope<ResponseData>;
  try {
    envelope = await response.json() as CallableEnvelope<ResponseData>;
  } catch {
    throw new CallableProtocolError('internal', 'Invalid callable response');
  }

  if (envelope.error) {
    throw new CallableProtocolError(
      normalizeCallableCode(envelope.error.status),
      envelope.error.message || 'Callable request failed',
      envelope.error.details,
    );
  }

  if (!response.ok || !Object.prototype.hasOwnProperty.call(envelope, 'result')) {
    throw new CallableProtocolError('internal', 'Invalid callable response');
  }

  return envelope.result as ResponseData;
}

let appCheckInitialization: Promise<void> | null = null;

const ensureNativeAppCheck = async (): Promise<void> => {
  if (!appCheckInitialization) {
    appCheckInitialization = FirebaseAppCheck.initialize({
      isTokenAutoRefreshEnabled: true,
    }).catch((error) => {
      appCheckInitialization = null;
      throw error;
    });
  }
  await appCheckInitialization;
};

export async function callNativeAttestedFunction<RequestData, ResponseData>(
  functionName: string,
  data: RequestData,
): Promise<ResponseData> {
  if (Capacitor.getPlatform() !== 'ios') {
    throw new CallableProtocolError('failed-precondition', 'Native attestation is available only on iOS.');
  }
  if (!firebaseConfig.projectId) {
    throw new CallableProtocolError('failed-precondition', 'Firebase project is not configured.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new CallableProtocolError('unauthenticated', 'Must be logged in');
  }

  await ensureNativeAppCheck();
  const [authToken, appCheck] = await Promise.all([
    currentUser.getIdToken(),
    FirebaseAppCheck.getToken({ forceRefresh: false }),
  ]);

  return invokeCallableProtocol<RequestData, ResponseData>({
    functionName,
    data,
    projectId: firebaseConfig.projectId,
    region: 'us-central1',
    authToken,
    appCheckToken: appCheck.token,
  });
}
