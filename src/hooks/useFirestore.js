import { useState, useEffect } from "react";
import { getFirebaseDb, collection, onSnapshot, query, limit, doc, updateDoc, increment, handleFirestoreError, OperationType, orderBy } from "../firebase.js";

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

    let unsubFallback = null;

    // Use orderBy to let Firestore handle sorting and limit to reduce reads
    const q = query(collection(db, colName), orderBy(orderField, "desc"), limit(limitCount));
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timer);
      
      if (snap.empty) {
        // Fallback: if no documents have the orderField, fetch without orderBy
        console.log(`No docs with ${orderField} in ${colName}, trying fallback...`);
        if (!unsubFallback) {
          const fallbackQ = query(collection(db, colName), limit(limitCount));
          unsubFallback = onSnapshot(fallbackQ, (fallbackSnap) => {
            console.log(`Fetched ${fallbackSnap.size} fallback docs from ${colName}`);
            const fetchedDocs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDocs(fetchedDocs);
            setLoading(false);
          }, (err) => {
            console.error(`Error fetching fallback ${colName}:`, err);
            setLoading(false);
          });
        }
        return;
      }

      // If we have documents, and we previously subscribed to fallback, unsubscribe
      if (unsubFallback) {
        unsubFallback();
        unsubFallback = null;
      }

      console.log(`Fetched ${snap.size} docs from ${colName}`);
      const fetchedDocs = snap.docs.map(d => {
        const data = d.data();
        console.log(`Doc ${d.id}:`, data);
        return { id: d.id, ...data };
      });
      
      // We still sort in memory to handle the case where a local write has a null serverTimestamp
      // and we want it to immediately appear at the top.
      fetchedDocs.sort((a, b) => {
        const fieldA = a.updatedAt || a[orderField];
        const fieldB = b.updatedAt || b[orderField];
        
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        
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
      if (unsubFallback) unsubFallback();
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
