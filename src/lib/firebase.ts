import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
