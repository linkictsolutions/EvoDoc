import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, initializeFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function parsePrivateKey(value?: string): string | undefined {
  return value?.replace(/\\n/g, "\n");
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  // Prefer explicit service-account credentials when provided, but never hard-fail
  // local/dev flows when the private key is missing or malformed.
  if (projectId && clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch {
      // Fall back to non-cert initialization (works with emulators or ADC).
    }
  }

  // If a projectId is available, pass it explicitly to make emulator/local usage easier.
  if (projectId) {
    return initializeApp({ projectId });
  }

  return initializeApp();
}

type FirebaseAdminCache = {
  app?: ReturnType<typeof getAdminApp>;
  auth?: ReturnType<typeof getAuth>;
  db?: ReturnType<typeof getFirestore>;
  storage?: ReturnType<typeof getStorage>;
};

const globalCache = globalThis as typeof globalThis & {
  __evodocFirebaseAdmin?: FirebaseAdminCache;
};

const cache = globalCache.__evodocFirebaseAdmin ?? {};
const app = cache.app ?? getAdminApp();
const adminAuth = cache.auth ?? getAuth(app);
const adminDb =
  cache.db ??
  initializeFirestore(
    app,
    {
      ignoreUndefinedProperties: true,
    } as Parameters<typeof initializeFirestore>[1],
  );
const adminStorage = cache.storage ?? getStorage(app);

globalCache.__evodocFirebaseAdmin = {
  app,
  auth: adminAuth,
  db: adminDb,
  storage: adminStorage,
};

export { adminAuth, adminDb, adminStorage };
