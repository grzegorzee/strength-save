import type { FirebaseAppCheckPlugin } from '@capacitor-firebase/app-check';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth, firebaseConfig } from '@/lib/firebase';

// Import pakietu runtime dolacza webowy Firebase App Check do krytycznego chunka,
// mimo ze ta sciezka dziala tylko natywnie. Plugin rejestrujemy bezposrednio,
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

export const supportsNativeAttestation = (platform: string): boolean =>
  platform === 'ios' || platform === 'android';

export const NATIVE_CALLABLE_TIMEOUT_MS = 10_000;

export async function invokeCallableProtocol<RequestData, ResponseData>(input: {
  functionName: string;
  data: RequestData;
  projectId: string;
  region: string;
  authToken: string;
  appCheckToken?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ResponseData> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `https://${input.region}-${input.projectId}.cloudfunctions.net/${input.functionName}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.authToken}`,
    'Content-Type': 'application/json',
  };
  if (input.appCheckToken) {
    headers['X-Firebase-AppCheck'] = input.appCheckToken;
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data: input.data }),
    signal: input.signal,
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
  if (!supportsNativeAttestation(Capacitor.getPlatform())) {
    throw new CallableProtocolError(
      'failed-precondition',
      'Native attestation is available only on iOS and Android.',
    );
  }
  if (!firebaseConfig.projectId) {
    throw new CallableProtocolError('failed-precondition', 'Firebase project is not configured.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new CallableProtocolError('unauthenticated', 'Must be logged in');
  }

  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      reject(new CallableProtocolError('deadline-exceeded', 'Native callable timed out'));
    }, NATIVE_CALLABLE_TIMEOUT_MS);
  });
  const request = (async () => {
    const [authToken, appCheckToken] = await Promise.all([
      currentUser.getIdToken(),
      fetchAppCheckTokenBestEffort(),
    ]);
    if (abortController.signal.aborted) {
      throw new CallableProtocolError('deadline-exceeded', 'Native callable timed out');
    }
    return invokeCallableProtocol<RequestData, ResponseData>({
      functionName,
      data,
      projectId: firebaseConfig.projectId,
      region: 'us-central1',
      authToken,
      appCheckToken,
      signal: abortController.signal,
    });
  })();

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

// Attestacja to zależność zewnętrzna (Secure Enclave, serwery Apple, wymiana
// w Firebase). Jej awaria nie może odcinać logowania: backend nie wymusza
// App Check na callables, więc przy braku tokenu wysyłamy request bez nagłówka
// (incydent 2026-08-11: DeviceCheck zamiast App Attest blokował każde konto).
async function fetchAppCheckTokenBestEffort(): Promise<string | undefined> {
  try {
    await ensureNativeAppCheck();
    const appCheck = await FirebaseAppCheck.getToken({ forceRefresh: false });
    return appCheck.token || undefined;
  } catch (error) {
    console.warn('[native-callable] App Check unavailable, calling without attestation:', error);
    return undefined;
  }
}
