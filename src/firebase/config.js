import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// These values come from your Firebase project settings (see README.md ->
// "Firebase setup"). For local dev, put them in a `.env.local` file at the
// project root using the VITE_FIREBASE_* names below. For GitHub Pages
// deploys, they're injected as repository secrets in the GitHub Actions
// workflow (see .github/workflows/deploy.yml).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let db = null;
let auth = null;

if (firebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    'Firebase is not configured - Online mode will be unavailable. ' +
      'See README.md "Firebase setup" and create a .env.local file.'
  );
}

export { db, auth };

let authReadyResolve;
export const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

export function initAnonymousAuth() {
  if (!auth) {
    authReadyResolve(null);
    return;
  }
  onAuthStateChanged(auth, (user) => {
    if (user) {
      authReadyResolve(user);
    } else {
      signInAnonymously(auth).catch((err) => {
        console.error('Anonymous sign-in failed', err);
        authReadyResolve(null);
      });
    }
  });
}
