// ─── Firebase initialization for DMEAST ─────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// Anything that needs `auth`, `db`, `storage`, or the sandbox/production flag
// imports them from this module. The actual Firebase SDK helpers (doc, getDoc,
// onAuthStateChanged, etc.) are still imported directly in the consumer file
// so this module stays minimal and tree-shakeable.
//
// Original location: App.jsx lines ~301–328 (pre-refactor).

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";

// v16.9: Firebase config now read from environment variables (Vite exposes VITE_* to client)
// Falls back to production config if env vars missing (e.g., legacy deploys)
// This allows production + sandbox to share the same code with different env values
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAV30NWtnxAnj8jIjN4f5Pa6je43oM4rrw",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "dmeast-516cc.firebaseapp.com",
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || "https://dmeast-516cc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "dmeast-516cc",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "dmeast-516cc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| "805825630764",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:805825630764:web:9aa00bf55ece3b3f37b789",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-904XX7S1HY",
};

// v16.9: Detect environment (sandbox vs production) for visual indicator + behavior
export const IS_SANDBOX = (
  // Explicit env flag (set in Vercel for sandbox deploy)
  import.meta.env.VITE_ENVIRONMENT === "sandbox" ||
  // Auto-detect by hostname (fallback if env var not set)
  (typeof window !== "undefined" && window.location.hostname.includes("sandbox.")) ||
  // Vercel preview deployments are also non-production
  (typeof window !== "undefined" && window.location.hostname.includes(".vercel.app"))
);

export const firebaseApp = initializeApp(firebaseConfig);
export const auth    = getAuth(firebaseApp);
export const db      = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
