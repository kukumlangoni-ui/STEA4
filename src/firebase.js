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

// ── VAPID Key — Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Generate key pair
const VAPID_KEY = "BDlsejpFbn27TWmAFQLFCd72CncssIQbthLbEBe3h5al81IDX9LsOiQ2xt6AFirzUCbEg_eaiK3kE7L4hrnTqsE";

const ADMIN_EMAILS = [
  "swahilitechacademy@gmail.com",
  "isayamasika100@gmail.com",
  "kukumlangoni@gmail.com",
  "isayahans@gmail.com"
];

const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
};

// Helper to normalize email input (appends @gmail.com if domain is missing)
export const normalizeEmail = (email) => {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return `${trimmed}@gmail.com`;
  }
  return trimmed;
};

// ── Init (safe, runs once) ────────────────────────────
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// FCM Messaging — safe init (browser only, won't crash in SSR or SW)
let messaging = null;
try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("[FCM] Messaging init skipped:", e.message);
}

// Request notification permission + save FCM token to Firestore
export async function requestNotificationPermission() {
  if (!messaging || !VAPID_KEY || VAPID_KEY === "YOUR_VAPID_KEY_HERE") return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      try {
        await setDoc(doc(db, "fcm_tokens", token), {
          token,
          createdAt: serverTimestamp(),
          platform: navigator.userAgent,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "fcm_tokens");
      }
    }
    return token;
  } catch (e) {
    console.warn("[FCM] Token error:", e.message);
    return null;
  }
}

// Queue notification — Cloud Function picks this up and sends via FCM HTTP v1
// Does NOT require legacy server key
export async function sendPushNotification({ title, body, url }) {
  try {
    await addDoc(collection(db, "notification_queue"), {
      title,
      body,
      url,
      icon: "/stea-icon.png",
      createdAt: serverTimestamp(),
      status: "pending",
    });
    console.log("[FCM] Notification queued:", title);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, "notification_queue");
    console.warn("[FCM] Queue error (non-blocking):", err.message);
  }
}

export { auth, db, messaging, ADMIN_EMAILS, isAdminEmail, GoogleAuthProvider, onMessage, VAPID_KEY };
export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail,
};
export {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, increment, where,
};

// For backward compatibility with existing code
export const initFirebase = () => ({ auth, db });
export const getFirebaseAuth = () => auth;
export const getFirebaseDb = () => db;

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function safeStringify(obj) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return; // Discard circular reference
      }
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
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  const errorJson = safeStringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  throw new Error(errorJson);
}
