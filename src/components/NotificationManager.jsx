import { useEffect } from "react";
import { getMessagingInstance, db, collection, doc, setDoc } from "../firebase";

const VAPID_KEY =
  "BDlsejpFbn27TWmAFQLFCd72CncssIQbthLbEBe3h5al81IDX9LsOiQ2xt6AFirzUCbEg_eaiK3kE7L4hrnTqsE";

export const NotificationManager = () => {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (!("Notification" in window)) return;
        if (Notification.permission === "denied") return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const { getToken } = await import("firebase/messaging");
        const messaging = await getMessagingInstance();
        if (!messaging) return;

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await setDoc(doc(collection(db, "fcm_tokens"), token), {
            token,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        // Silent fail — notifications are non-critical
        console.warn("Push notification setup failed:", error.message);
      }
    };

    // Small delay so it doesn't block initial render
    const t = setTimeout(requestPermission, 3000);
    return () => clearTimeout(t);
  }, []);

  return null;
};
