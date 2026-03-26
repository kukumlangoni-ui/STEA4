import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, increment, where,
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import firebaseConfig from "../firebase-applet-config.json";

// ── Admin emails (all admin accounts) ────────────────
const ADMIN_EMAILS = [
  "swahilitecheliteacademy@gmail.com",
  "swahilitechacademy@gmail.com",
  "isayamasika100@gmail.com",
  "kukumlangoni@gmail.com",
  "isayahans@gmail.com",
];

// Keep ADMIN_EMAIL for backward compat (primary admin)
const ADMIN_EMAIL = "isayamasika100@gmail.com";

export const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase().trim());
};

// Helper to normalize email input
export const normalizeEmail = (email) => {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return `${trimmed}@gmail.com`;
  return trimmed;
};

// ── Firebase Init (safe, runs once) ──────────────────
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// FCM Messaging — safe init (browser only)
let messaging = null;
try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("[FCM] Messaging init skipped:", e.message);
}

// ── VAPID Key ─────────────────────────────────────────
const VAPID_KEY = "BDlsejpFbn27TWmAFQLFCd72CncssIQbthLbEBe3h5al81IDX9LsOiQ2xt6AFirzUCbEg_eaiK3kE7L4hrnTqsE";

// ── FCM: Request permission + save token ─────────────
export async function requestNotificationPermission() {
  if (!messaging || !VAPID_KEY) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await setDoc(doc(db, "fcm_tokens", token), {
        token, createdAt: serverTimestamp(), platform: navigator.userAgent,
      }, { merge: true });
    }
    return token;
  } catch (e) {
    console.warn("[FCM] Token error:", e.message);
    return null;
  }
}

// ── FCM: Queue notification (Cloud Function delivers) ─
export async function sendPushNotification({ title, body, url }) {
  try {
    await addDoc(collection(db, "notification_queue"), {
      title, body, url, icon: "/stea-icon.png",
      createdAt: serverTimestamp(), status: "pending",
    });
    console.log("[FCM] Notification queued:", title);
  } catch (e) {
    console.warn("[FCM] Queue error (non-blocking):", e.message);
  }
}

// ── Exports ───────────────────────────────────────────
export { auth, db, messaging, ADMIN_EMAIL, ADMIN_EMAILS, VAPID_KEY, GoogleAuthProvider, onMessage };
export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail,
};
export {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, increment, where, getToken,
};

// Backward compatibility
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
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType, path,
  };
  const errorJson = safeStringify(errInfo);
  console.error("Firestore Error:", errorJson);
  throw new Error(errorJson);
}
