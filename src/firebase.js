import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, increment, where, getDocFromServer,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

export const ADMIN_EMAILS = ["isayamasika100@gmail.com", "kukumlangoni@gmail.com", "swahilitecheliteacademy@gmail.com"];
export const isAdminEmail = (email) => email && ADMIN_EMAILS.includes(email.toLowerCase());
export const ADMIN_EMAIL = ADMIN_EMAILS[0]; // Keep for backward compatibility

export const normalizeEmail = (email) => {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return `${trimmed}@gmail.com`;
  return trimmed;
};

// ── Init (safe, runs once) ────────────────────────────
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const storage = getStorage(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Messaging: lazy init to avoid crash on Safari/Firefox
let _messaging = null;
export const getMessagingInstance = async () => {
  if (_messaging) return _messaging;
  try {
    if (!("Notification" in window) || !navigator.serviceWorker) return null;
    const { getMessaging } = await import("firebase/messaging");
    _messaging = getMessaging(app);
    return _messaging;
  } catch { return null; }
};

export { auth, db, storage, analytics, GoogleAuthProvider };
export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail,
};
export {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, increment, where, getDocFromServer,
};
export { ref, uploadBytes, getDownloadURL };

// Compat helpers
export const initFirebase = () => ({ auth, db });
export const getFirebaseAuth = () => auth;
export const getFirebaseDb = () => db;

export const OperationType = {
  CREATE: "create", UPDATE: "update", DELETE: "delete",
  LIST: "list", GET: "get", WRITE: "write",
};

function safeStringify(obj) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) return;
      cache.add(value);
    }
    return value;
  });
}

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email },
    operationType, path,
  };
  console.error("Firestore Error:", safeStringify(errInfo));
  throw new Error(safeStringify(errInfo));
}

// ── Connection Test ──────────────────────────────────
export async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc from server to verify config
    await getDocFromServer(doc(db, "_connection_test_", "ping"));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("CRITICAL: Firestore is offline. Please check your Firebase configuration in firebase-applet-config.json.");
    }
    // Other errors (like permission denied for this test path) are fine, 
    // they still mean we reached the server.
  }
}
testConnection();
