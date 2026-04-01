import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "../firebase.js";

export function useAds() {
  const [ads, setAds] = useState(() => {
    const cached = localStorage.getItem("stea_ads_cache");
    if (cached) return JSON.parse(cached);
    return [];
  });
  const [loading, setLoading] = useState(ads.length === 0);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const q = query(
      collection(db, "sponsored_ads"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAds(fetchedAds);
      setLoading(false);
      try {
        localStorage.setItem("stea_ads_cache", JSON.stringify(fetchedAds));
      } catch (e) {
        console.warn("Failed to cache ads to localStorage:", e);
        localStorage.removeItem("stea_ads_cache");
      }
    });

    return () => unsubscribe();
  }, []);

  return { ads, loading };
}
