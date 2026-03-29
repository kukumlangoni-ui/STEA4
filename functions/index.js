/**
 * STEA Cloud Function — Push Notifications via FCM HTTP v1
 *
 * SETUP (one time):
 * 1. npm install -g firebase-tools
 * 2. firebase login
 * 3. firebase init functions  (choose existing project: swahilitecheliteacademy)
 * 4. Copy this file into functions/index.js
 * 5. firebase deploy --only functions
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendNewPostNotification = onDocumentCreated(
  "notification_queue/{docId}",
  async (event) => {
    const db = getFirestore();
    const messaging = getMessaging();
    const data = event.data?.data();
    if (!data || data.status !== "pending") return;

    const docRef = event.data.ref;

    try {
      // Mark as processing
      await docRef.update({ status: "processing" });

      // Get all FCM tokens
      const tokensSnap = await db.collection("fcm_tokens").get();
      const tokens = tokensSnap.docs
        .map((d) => d.data().token)
        .filter(Boolean);

      if (!tokens.length) {
        await docRef.update({ status: "done_no_tokens" });
        return;
      }

      // Send in batches of 500
      const batches = [];
      for (let i = 0; i < tokens.length; i += 500) {
        batches.push(tokens.slice(i, i + 500));
      }

      let successCount = 0;
      let failCount = 0;

      for (const batch of batches) {
        const result = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: {
            title: data.title || "New on STEA 🔥",
            body: data.body || "Post mpya ipo live!",
            imageUrl: data.icon || undefined,
          },
          webpush: {
            notification: {
              icon: data.icon || "/stea-icon.png",
              badge: "/stea-icon.png",
              requireInteraction: false,
            },
            fcmOptions: {
              link: data.url || "https://stea.africa",
            },
          },
          data: { url: data.url || "https://stea.africa" },
        });

        successCount += result.successCount;
        failCount += result.failureCount;

        // Remove invalid tokens from Firestore
        const invalidTokenPromises = [];
        result.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            if (
              code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered"
            ) {
              invalidTokenPromises.push(
                db.collection("fcm_tokens").doc(batch[idx]).delete()
              );
            }
          }
        });
        await Promise.allSettled(invalidTokenPromises);
      }

      // Mark as done
      await docRef.update({
        status: "sent",
        successCount,
        failCount,
        sentAt: new Date(),
      });

      console.log(
        `[STEA] Notifications sent: ${successCount} ok, ${failCount} failed`
      );
    } catch (err) {
      console.error("[STEA] Notification error:", err);
      await docRef.update({ status: "error", error: err.message }).catch(() => {});
    }
  }
);
