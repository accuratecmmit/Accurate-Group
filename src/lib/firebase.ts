import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Custom database ID from firebase-applet-config.json must be passed
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validates connection to the provisioned Firestore database on startup.
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message?: string }> {
  try {
    await getDocFromServer(doc(db, 'system_config', 'init'));
    return { connected: true, message: 'Connected to Firestore' };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('the client is offline')) {
      console.error('Firestore client is offline. Please check your network and Firebase configuration.');
      return { connected: false, message: 'Firestore is offline' };
    }
    // Permission-denied or not-found still proves connectivity to server!
    return { connected: true, message: 'Server reached' };
  }
}

export default app;
