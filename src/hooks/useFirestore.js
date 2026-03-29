import { useState, useEffect } from "react";
import {
  getFirebaseDb,
  collection,
  onSnapshot,
  query,
  limit,
  doc,
  updateDoc,
  increment,
  handleFirestoreError,
  OperationType,
  orderBy,
} from "../firebase.js";

export function useCollection(colName, orderField = "createdAt", limitCount = 50) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    // 6s safety timeout — never stuck on "loading"
    const timer = setTimeout(() => setLoading(false), 6000);
    let unsubFallback = null;

    const q = query(
      collection(db, colName),
      orderBy(orderField, "desc"),
      limit(limitCount)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(timer);

        if (snap.empty) {
          // Fallback: collection exists but has no orderField — fetch without orderBy
          if (!unsubFallback) {
            const fallbackQ = query(collection(db, colName), limit(limitCount));
            unsubFallback = onSnapshot(
              fallbackQ,
              (fallbackSnap) => {
                setDocs(fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
              },
              () => setLoading(false)
            );
          }
          return;
        }

        if (unsubFallback) {
          unsubFallback();
          unsubFallback = null;
        }

        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Client-side sort to handle null serverTimestamp on optimistic writes
        fetched.sort((a, b) => {
          const getTime = (item) => {
            const f = item.updatedAt || item[orderField];
            if (!f) return Date.now() + 10000;
            if (f?.toDate) return f.toDate().getTime();
            if (typeof f === "number") return f;
            return new Date(f).getTime() || 0;
          };
          return getTime(b) - getTime(a);
        });

        setDocs(fetched);
        setLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        console.error(`Error fetching ${colName}:`, err.message);
        if (err.message.includes("insufficient permissions")) {
          handleFirestoreError(err, OperationType.LIST, colName);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsub();
      if (unsubFallback) unsubFallback();
    };
  }, [colName, orderField, limitCount]);

  return { docs, loading };
}

export async function incrementViews(colName, docId) {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await updateDoc(doc(db, colName, docId), { views: increment(1) });
  } catch (e) {
    console.warn("Error incrementing views:", e.message);
  }
}

export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [s, label] of intervals) {
    const n = Math.floor(seconds / s);
    if (n > 1) return `${n} ${label}s ago`;
    if (n === 1) return `1 ${label} ago`;
  }
  return "just now";
}

export function fmtViews(v) {
  if (!v) return "0";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return v.toString();
}
