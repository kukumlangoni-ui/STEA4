import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, limit, getFirebaseDb } from "../firebase.js";
import { motion } from "motion/react";

export function SponsoredAdsSection() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "sponsored_ads"),
      where("status", "==", "active"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAds(fetchedAds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || ads.length === 0) return null;

  return (
    <section style={{ padding: "40px 20px", background: "#05060a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".15em",
          color: "rgba(255,255,255,.35)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 4, padding: "2px 7px",
        }}>Sponsored</span>
        <h2 style={{ color: "#fff", fontSize: 18, fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>
          Matangazo ya STEA
        </h2>
      </div>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {ads.map((ad) => (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#141823",
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            {(ad.image || ad.imageUrl) && (
              <img
                src={ad.image || ad.imageUrl}
                alt={ad.title}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            )}
            <div style={{ padding: 20 }}>
              <h3 style={{ color: "#fff", fontSize: 18, marginBottom: 10 }}>{ad.title}</h3>
              <p style={{ color: "rgba(255,255,255,.7)", fontSize: 14, marginBottom: 20 }}>{ad.description || ad.shortText}</p>
              <a
                href={ad.ctaLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "#F5A623",
                  color: "#111",
                  borderRadius: 10,
                  fontWeight: 800,
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                {ad.ctaText || "Learn More"}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
