import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAds } from "../hooks/useAds.js";
import { X, ExternalLink } from "lucide-react";
import { useMobile } from "../hooks/useMobile.js";

export function BannerAd() {
  const { ads } = useAds();
  const isMobile = useMobile();
  const [orderedAds, setOrderedAds] = useState([]);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const bannerAds = useMemo(() => ads.filter((ad) => ad.adType === "banner"), [ads]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (bannerAds.length === 0) {
        setOrderedAds([]);
        return;
      }

      // Fair rotation logic: sequential starting index stored in localStorage
      const lastIdx = parseInt(localStorage.getItem("stea_last_ad_idx") || "-1");
      const nextIdx = (lastIdx + 1) % bannerAds.length;
      localStorage.setItem("stea_last_ad_idx", nextIdx.toString());

      // Reorder ads starting from nextIdx
      const rotated = [
        ...bannerAds.slice(nextIdx),
        ...bannerAds.slice(0, nextIdx)
      ];
      setOrderedAds(rotated);

      // Show swipe hint if more than 1 ad and first time in session
      if (rotated.length > 1 && !sessionStorage.getItem("stea_swipe_hint_shown")) {
        setShowSwipeHint(true);
        const timer = setTimeout(() => setShowSwipeHint(false), 5000);
        sessionStorage.setItem("stea_swipe_hint_shown", "true");
        return () => clearTimeout(timer);
      }
    });
  }, [bannerAds]);

  if (orderedAds.length === 0) return null;

  return (
    <div style={{ padding: isMobile ? "24px 0" : "32px 0", background: "#05060a", position: "relative", overflow: "hidden" }}>
      {/* Swipe Hint Overlay */}
      <AnimatePresence>
        {showSwipeHint && isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              background: "rgba(0,0,0,0.85)",
              padding: "24px 32px",
              borderRadius: 32,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            <motion.div
              animate={{ x: [0, 40, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              style={{ color: "#F5A623" }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </motion.div>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center" }}>
              Telezesha kuona zaidi
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: isMobile ? "0 12px" : "0 24px",
          gap: 16
        }}
        className="no-scrollbar"
      >
        {orderedAds.map((ad, idx) => (
          <div
            key={ad.id || idx}
            style={{
              minWidth: isMobile ? "calc(100vw - 24px)" : "100%",
              scrollSnapAlign: "center",
              flexShrink: 0
            }}
          >
            <a
              href={ad.ctaLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none" }}
            >
              <div
                style={{
                  background: "linear-gradient(145deg, #141823 0%, #0a0c14 100%)",
                  borderRadius: isMobile ? 24 : 28,
                  overflow: "hidden",
                  border: "1px solid rgba(245, 166, 35, 0.2)",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  padding: isMobile ? 0 : 24,
                  gap: isMobile ? 0 : 24,
                  position: "relative",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Sponsored Label */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(245, 166, 35, 0.95)",
                    color: "#000",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 8,
                    textTransform: "uppercase",
                    fontWeight: 900,
                    zIndex: 10,
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)",
                  }}
                >
                  Sponsored
                </div>

                {/* Ad Image */}
                {(ad.imageUrl || ad.image) && (
                  <div style={{ 
                    width: isMobile ? "100%" : 240, 
                    height: isMobile ? 320 : 180, 
                    flexShrink: 0,
                    overflow: "hidden",
                    position: "relative"
                  }}>
                    <img
                      src={ad.imageUrl || ad.image}
                      alt={ad.title}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        transition: "transform 0.5s ease"
                      }}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* REMOVED DEEP GRADIENT OVERLAY - Prioritizing ad visibility */}
                    {isMobile && (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "20%",
                        background: "linear-gradient(to top, rgba(10, 12, 20, 0.4), transparent)",
                        pointerEvents: "none"
                      }} />
                    )}
                  </div>
                )}

                {/* Ad Content */}
                <div style={{ 
                  flex: 1, 
                  minWidth: 0, 
                  padding: isMobile ? "20px 20px 24px" : 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div style={{ marginBottom: 8 }}>
                    <h3 style={{ 
                      color: "#fff", 
                      fontSize: isMobile ? 24 : 28, 
                      fontWeight: 900,
                      margin: 0,
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      letterSpacing: "-0.5px",
                      lineHeight: 1.2
                    }}>
                      {ad.title}
                    </h3>
                    {ad.clientName && (
                      <div style={{ color: "#F5A623", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 4, letterSpacing: 1 }}>
                        By {ad.clientName}
                      </div>
                    )}
                  </div>
                  
                  <p style={{ 
                    color: "rgba(255,255,255,.7)", 
                    fontSize: isMobile ? 16 : 17, 
                    marginBottom: 24, 
                    lineHeight: 1.6,
                    display: "-webkit-box", 
                    WebkitLineClamp: isMobile ? 4 : 2, 
                    WebkitBoxOrient: "vertical", 
                    overflow: "hidden" 
                  }}>
                    {ad.shortText || ad.description}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "stretch" : "flex-start" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: isMobile ? "16px 24px" : "14px 28px",
                        background: "#F5A623",
                        color: "#111",
                        borderRadius: 16,
                        fontWeight: 900,
                        fontSize: isMobile ? 16 : 15,
                        width: isMobile ? "100%" : "auto",
                        transition: "all 0.3s ease",
                        boxShadow: "0 8px 20px rgba(245, 166, 35, 0.25)",
                      }}
                    >
                      {ad.ctaText || "Learn More"} <ExternalLink size={18} />
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export function InlineAd({ index }) {
  const { ads } = useAds();
  const isMobile = useMobile();
  const inlineAds = ads.filter((ad) => ad.adType === "inline");
  
  const ad = useMemo(() => {
    if (inlineAds.length === 0) return null;
    return inlineAds[index % inlineAds.length];
  }, [inlineAds, index]);

  if (!ad) return null;

  return (
    <div style={{ margin: "24px 0" }}>
      <a
        href={ad.ctaLink || "#"}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none" }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            padding: isMobile ? 0 : 20,
            gap: isMobile ? 0 : 20,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(245, 166, 35, 0.15)",
              color: "#F5A623",
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 6,
              textTransform: "uppercase",
              fontWeight: 800,
              zIndex: 10,
            }}
          >
            Sponsored
          </div>

          {(ad.imageUrl || ad.image) && (
            <div style={{ width: isMobile ? "100%" : 140, height: isMobile ? 200 : 140, flexShrink: 0 }}>
              <img
                src={ad.imageUrl || ad.image}
                alt={ad.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: isMobile ? 0 : 12 }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 16 : 0 }}>
            <h4 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {ad.title}
            </h4>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginBottom: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {ad.shortText || ad.description}
            </p>
            <div style={{ color: "#F5A623", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              {ad.ctaText || "Check it out"} <ExternalLink size={14} />
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

export function PopupAd() {
  const { ads } = useAds();
  const isMobile = useMobile();
  const [show, setShow] = useState(false);

  const [ad, setAd] = useState(null);
  const popupAds = useMemo(() => ads.filter((ad) => ad.adType === "popup"), [ads]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (popupAds.length > 0) {
        setAd(popupAds[Math.floor(Math.random() * popupAds.length)]);
      } else {
        setAd(null);
      }
    });
  }, [popupAds]);

  useEffect(() => {
    if (ad) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 5000); // Show after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [ad]);

  if (!ad) return null;

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              width: "100%",
              maxWidth: 450,
              background: "#141823",
              borderRadius: 32,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
              boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
            }}
          >
            <button
              onClick={() => setShow(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 20,
              }}
            >
              <X size={20} />
            </button>

            <div style={{ position: "relative", height: isMobile ? 300 : 250 }}>
              <img
                src={ad.imageUrl || ad.image}
                alt={ad.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                referrerPolicy="no-referrer"
              />
              <div style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: "#F5A623",
                color: "#000",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 8,
                fontWeight: 900,
                textTransform: "uppercase",
              }}>
                Sponsored
              </div>
            </div>

            <div style={{ padding: 32, textAlign: "center" }}>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 12, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {ad.title}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
                {ad.shortText || ad.description}
              </p>
              <a
                href={ad.ctaLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShow(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  padding: "16px",
                  background: "#F5A623",
                  color: "#000",
                  borderRadius: 16,
                  fontWeight: 900,
                  fontSize: 16,
                  textDecoration: "none",
                  transition: "transform 0.2s",
                }}
              >
                {ad.ctaText || "Get Started"} <ExternalLink size={18} />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
