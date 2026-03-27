import { useState, useEffect } from "react";
import { getFirebaseDb, collection, onSnapshot, query, limit, doc, updateDoc, increment, handleFirestoreError, OperationType } from "../firebase.js";

export function useCollection(colName, orderField = "createdAt", limitCount = 100) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    // Fast timeout — 4s max
    const timer = setTimeout(() => setLoading(false), 4000);

    // NO orderBy — avoids index requirement, fetch all then sort in memory
    const q = query(collection(db, colName), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timer);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort in memory — newest first, pending serverTimestamp at top
      fetched.sort((a, b) => {
        const getTime = (doc) => {
          const val = doc.updatedAt || doc[orderField];
          if (!val) return Date.now() + 9999999; // pending = top
          if (val?.toDate) return val.toDate().getTime();
          if (typeof val === "number") return val;
          return new Date(val).getTime() || 0;
        };
        return getTime(b) - getTime(a);
      });

      setDocs(fetched);
      setLoading(false);
    }, (err) => {
      clearTimeout(timer);
      console.error(`[useCollection] ${colName}:`, err.message);
      if (err.message.includes("insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, colName);
      }
      setLoading(false);
    });

    return () => { clearTimeout(timer); unsub(); };
  }, [colName, orderField]);

  return { docs, loading };
}

export async function incrementViews(colName, docId) {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await updateDoc(doc(db, colName, docId), { views: increment(1) });
  } catch (e) {
    console.warn("incrementViews error:", e.message);
  }
}

export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const intervals = [
    [31536000, "year"], [2592000, "month"], [86400, "day"],
    [3600, "hour"], [60, "minute"],
  ];
  for (const [div, label] of intervals) {
    const n = Math.floor(seconds / div);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function fmtViews(v) {
  if (!v) return "0";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return v.toString();
}
