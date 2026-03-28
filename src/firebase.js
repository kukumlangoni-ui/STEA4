import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, storage, analytics };
export default app;

