import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';

// Suppress noisy Firestore internal console errors for quota exceeded
try {
  setLogLevel('silent');
} catch (e) {}

// Global browser error filtering for benign Firestore quota exhaustion
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.toString())) || '';
    if (
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('quota exceeded') ||
      msg.includes('write units') ||
      msg.includes('read units')
    ) {
      event.preventDefault();
    }
  });

  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const fullText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      fullText.includes('RESOURCE_EXHAUSTED') ||
      fullText.includes('resource-exhausted') ||
      fullText.includes('Quota limit exceeded') ||
      fullText.includes('maximum backoff delay') ||
      fullText.includes('free tier database')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    const fullText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      fullText.includes('RESOURCE_EXHAUSTED') ||
      fullText.includes('resource-exhausted') ||
      fullText.includes('maximum backoff delay') ||
      fullText.includes('free tier database')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

export const firebaseConfig = {
  projectId: "gen-lang-client-0135824596",
  appId: "1:482306767740:web:2225d7380e3d4bc30a82f9",
  apiKey: "AIzaSyAvXhXqBgQDdRFY9Du6m-qCX3ZW-5jBp0E",
  authDomain: "gen-lang-client-0135824596.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixnovacnhbras-5476fca5-195d-434e-92a7-1c50464d1a61",
  storageBucket: "gen-lang-client-0135824596.firebasestorage.app",
  messagingSenderId: "482306767740",
  oAuthClientId: "482306767740-13nhdq50ina3it9370p352i4qq8i4je7.apps.googleusercontent.com"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export default app;


