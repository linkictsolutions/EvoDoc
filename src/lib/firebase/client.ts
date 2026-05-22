import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function shouldUseEmulators(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
}

function getFirestoreEmulatorPort(): number {
  const raw = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 8080;
}

function getAuthEmulatorPort(): number {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 9099;
}

export function getFirebaseClientApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (shouldUseEmulators()) {
    return initializeApp({
      ...config,
      // Provide safe defaults so the client can boot without real Firebase credentials.
      apiKey: config.apiKey || "fake-api-key",
      authDomain: config.authDomain || "localhost",
      projectId: config.projectId || "demo-evodoc",
      appId: config.appId || "demo-app-id",
    });
  }

  return initializeApp(config);
}

export function getFirebaseAuthClient(): Auth {
  const auth = getAuth(getFirebaseClientApp());
  if (shouldUseEmulators() && typeof window !== "undefined") {
    // Avoid duplicate connections during HMR.
    const alreadyConnected = (auth as unknown as { __evodocEmulatorConnected?: boolean })
      .__evodocEmulatorConnected;
    if (!alreadyConnected) {
      connectAuthEmulator(auth, `http://127.0.0.1:${getAuthEmulatorPort()}`, {
        disableWarnings: true,
      });
      (auth as unknown as { __evodocEmulatorConnected?: boolean }).__evodocEmulatorConnected = true;
    }
  }
  return auth;
}

export function getFirebaseFirestoreClient(): Firestore {
  const db = getFirestore(getFirebaseClientApp());
  if (shouldUseEmulators() && typeof window !== "undefined") {
    const alreadyConnected = (db as unknown as { __evodocEmulatorConnected?: boolean })
      .__evodocEmulatorConnected;
    if (!alreadyConnected) {
      connectFirestoreEmulator(db, "127.0.0.1", getFirestoreEmulatorPort());
      (db as unknown as { __evodocEmulatorConnected?: boolean }).__evodocEmulatorConnected = true;
    }
  }
  return db;
}
