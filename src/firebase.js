import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  deleteDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDMnbqLZBo-FpI1uL6mWf1pfLpKVKlHF9A",
  authDomain: "swahilitecheliteacademy.firebaseapp.com",
  projectId: "swahilitecheliteacademy",
  storageBucket: "swahilitecheliteacademy.firebasestorage.app",
  messagingSenderId: "869558429488",
  appId: "1:869558429488:web:b6d6614c1c40cb75ed4af5",
  measurementId: "G-9CBGRJPLT4",
};

let appInstance = null;
let analyticsInstance = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;
let googleProviderInstance = null;

export const ADMIN_EMAIL = "swahilitecheliteacademy@gmail.com";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  return [
    "swahilitecheliteacademy@gmail.com",
    "isayamasika100@gmail.com",
    "kukumlangoni@gmail.com",
    "isayahans100@gmail.com",
  ].includes(normalized);
}

export function initFirebase() {
  if (appInstance) {
    return {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      storage: storageInstance,
      analytics: analyticsInstance,
    };
  }

  appInstance = initializeApp(firebaseConfig);
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);
  googleProviderInstance = new GoogleAuthProvider();

  if (typeof window !== "undefined") {
    isSupported()
      .then((supported) => {
        if (supported) {
          analyticsInstance = getAnalytics(appInstance);
        }
      })
      .catch((error) => {
        console.warn("Analytics not supported:", error);
      });
  }

  return {
    app: appInstance,
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance,
    analytics: analyticsInstance,
  };
}

export function getFirebaseApp() {
  if (!appInstance) initFirebase();
  return appInstance;
}

export function getFirebaseAuth() {
  if (!authInstance) initFirebase();
  return authInstance;
}

export function getFirebaseDb() {
  if (!dbInstance) initFirebase();
  return dbInstance;
}

export function getFirebaseStorage() {
  if (!storageInstance) initFirebase();
  return storageInstance;
}

export function getGoogleProvider() {
  if (!googleProviderInstance) initFirebase();
  return googleProviderInstance;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn("Notification permission request failed:", error);
    return "denied";
  }
}

export async function sendPushNotification({ title, body, icon } = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    new Notification(title || "STEA", {
      body: body || "Una taarifa mpya kutoka STEA",
      icon: icon || "/stea-icon.jpg",
    });
    return true;
  } catch (error) {
    console.warn("Local notification failed:", error);
    return false;
  }
}

export const OperationType = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
};

export function handleFirestoreError(error, operation = "unknown", target = "") {
  console.error(`[Firestore ${operation}] ${target}`, error);

  const code = error?.code || "";
  const message = error?.message || "Unknown Firestore error";

  if (code.includes("permission-denied")) {
    return {
      ok: false,
      code,
      message: "Permission denied. Check Firestore rules or admin access.",
    };
  }

  if (code.includes("unavailable")) {
    return {
      ok: false,
      code,
      message: "Firestore unavailable. Check internet or Firebase status.",
    };
  }

  if (code.includes("not-found")) {
    return {
      ok: false,
      code,
      message: "Requested document not found.",
    };
  }

  return {
    ok: false,
    code,
    message,
  };
}

initFirebase();

export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();
export const storage = getFirebaseStorage();
export const analytics = analyticsInstance;

export {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  deleteDoc,
  increment,
  serverTimestamp,
};

export default app;
