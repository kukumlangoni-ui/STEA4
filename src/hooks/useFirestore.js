import { useState, useEffect } from "react";
import { getFirebaseDb, collection, onSnapshot, query, limit, doc, updateDoc, increment, handleFirestoreError, OperationType } from "../firebase.js";

export function useCollection(colName, orderField = "createdAt", limitCount = 50) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    // Timeout to prevent infinite loading state if network is slow
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);

    // Fetch without orderBy to ensure documents missing the orderField are included
    // We increase the limit significantly to ensure we get all/most records for in-memory sorting
    const q = query(collection(db, colName), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timer);
      console.log(`Fetched ${snap.size} docs from ${colName}`);
      const fetchedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort in memory by orderField desc
      fetchedDocs.sort((a, b) => {
        const valA = a[orderField]?.toDate ? a[orderField].toDate() : (a[orderField] || 0);
        const valB = b[orderField]?.toDate ? b[orderField].toDate() : (b[orderField] || 0);
        
        // Handle cases where values might be strings or missing
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
        
        return timeB - timeA;
      });

      setDocs(fetchedDocs);
      setLoading(false);
    }, (err) => {
      clearTimeout(timer);
      console.error(`Error fetching ${colName}:`, err);
      if (err.message.includes("insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, colName);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [colName, orderField, limitCount]);

  return { docs, loading };
}

export async function incrementViews(colName, docId) {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    const ref = doc(db, colName, docId);
    await updateDoc(ref, { views: increment(1) });
  } catch (e) {
    console.warn("Error incrementing views:", e.message);
    if (e.message.includes("insufficient permissions")) {
      handleFirestoreError(e, OperationType.UPDATE, `${colName}/${docId}`);
    }
  }
}

export function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export function fmtViews(v) {
  if (!v) return "0";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return v.toString();
}
