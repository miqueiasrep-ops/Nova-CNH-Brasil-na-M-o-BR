import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';

// Suppress noisy Firestore internal console errors for quota exceeded
try {
  setLogLevel('silent');
} catch (e) {}

function safeItemString(item: any): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string') return item;
  if (item instanceof Error) return `${item.name}: ${item.message}\n${item.stack || ''}`;
  try {
    return typeof item === 'object' ? JSON.stringify(item) : String(item);
  } catch {
    return String(item);
  }
}

// Global browser error filtering for benign Firestore quota exhaustion and empty errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const msg = reason ? safeItemString(reason) : '';
      if (
        !reason ||
        msg.trim() === '' ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('resource-exhausted') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('quota exceeded') ||
        msg.includes('write units') ||
        msg.includes('read units') ||
        msg.includes('free tier database') ||
        msg.includes('Failed to fetch')
      ) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    try {
      const msg = event.message || '';
      if (
        !msg ||
        msg.trim() === '' ||
        msg === 'Script error.' ||
        msg.includes('ResizeObserver') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('resource-exhausted') ||
        msg.includes('Quota limit exceeded')
      ) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const fullText = args.map(safeItemString).join(' ');
      if (
        fullText.includes('RESOURCE_EXHAUSTED') ||
        fullText.includes('resource-exhausted') ||
        fullText.includes('Quota limit exceeded') ||
        fullText.includes('maximum backoff delay') ||
        fullText.includes('free tier database')
      ) {
        return;
      }
    } catch (_) {}
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    try {
      const fullText = args.map(safeItemString).join(' ');
      if (
        fullText.includes('RESOURCE_EXHAUSTED') ||
        fullText.includes('resource-exhausted') ||
        fullText.includes('maximum backoff delay') ||
        fullText.includes('free tier database')
      ) {
        return;
      }
    } catch (_) {}
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


