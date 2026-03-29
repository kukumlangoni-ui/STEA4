import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, db, collection, doc, setDoc } from '../firebase';

export const NotificationManager = () => {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // IMPORTANT: Replace 'YOUR_VAPID_KEY' with your actual VAPID key from Firebase Console
          // Project Settings -> Cloud Messaging -> Web Push Certificates
          const vapidKey = 'BDlsejpFbn27TWmAFQLFCd72CncssIQbthLbEBe3h5al81IDX9LsOiQ2xt6AFirzUCbEg_eaiK3kE7L4hrnTqsE';
          if (vapidKey === 'YOUR_VAPID_KEY') {
            console.warn('VAPID key is not configured. Push notifications will not work.');
            return;
          }
          const token = await getToken(messaging, { vapidKey });
          if (token) {
            await setDoc(doc(collection(db, 'fcm_tokens'), token), {
              token,
              createdAt: new Date()
            });
            console.log('FCM token saved successfully.');
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };
    requestPermission();
  }, []);

  return null;
};
