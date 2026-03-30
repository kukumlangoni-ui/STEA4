import { useState, useEffect, useRef, useCallback } from "react";
import { 
  getFirebaseDb, 
  collection, 
  onSnapshot, 
  query, 
  limit, 
  doc, 
  updateDoc, 
  addDoc,
  increment, 
  orderBy, 
  serverTimestamp 
} from "../firebase.js";

// Hook for real-time collection data
export function useCollection(colName, orderField = "createdAt", limitCount = 50) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const queryRef = useRef(null);
  
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      queryRef.current = query(
        collection(db, colName), 
        orderBy(orderField, "desc"), 
        limit(limitCount)
      );
    } catch (error) {
      console.error(`Failed to create query for collection '${colName}'.`, error);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(queryRef.current, (snap) => {
      if (snap.empty) {
        setDocs([]);
      } else {
        const fetchedDocs = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date()
        }));
        setDocs(fetchedDocs);
      }
      setLoading(false);
    }, (err) => {
      console.error(`Error listening to collection '${colName}':`, err);
      setLoading(false);
    });

    return () => unsub();
  }, [colName, orderField, limitCount]);

  return { docs, loading };
}

// Hook for real-time single document data
export function useDocument(colName, docId) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, colName, docId);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDocData({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.warn(`Document '${docId}' not found in collection '${colName}'.`);
        setDocData(null);
      }
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching document '${colName}/${docId}':`, err);
      setLoading(false);
    });

    return () => unsub();
  }, [colName, docId]);

  return { docData, loading };
}

// Generic function to update a document
export const updateDocument = async (colName, docId, data) => {
  const db = getFirebaseDb();
  if (!db || !colName || !docId) return;

  try {
    const docRef = doc(db, colName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating document ${colName}/${docId}:`, error);
    throw error; // Re-throw to be caught in the component
  }
};

// Function to add a document
export const addDocument = async (colName, data) => {
  const db = getFirebaseDb();
  if (!db) return null;
  
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, colName), docData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    return null;
  }
};


export async function incrementViews(colName, docId) {
  const db = getFirebaseDb();
  if (!db || !colName || !docId) return;
  try {
    const ref = doc(db, colName, docId);
    await updateDoc(ref, { views: increment(1) });
  } catch (e) {
    console.warn(`Could not increment views for ${colName}/${docId}:`, e.message);
  }
}

export function timeAgo(timestamp) {
  if (!timestamp) return "just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);

  if (isNaN(seconds) || seconds < 0) {
    return "just now";
  }

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval)_owner + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");

  if (seconds < 10) return "just now";

  return Math.floor(seconds) + " seconds ago";
}

export function fmtViews(v) {
  if (v === null || v === undefined) return "0";
  if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "K";
  return v.toString();
}
