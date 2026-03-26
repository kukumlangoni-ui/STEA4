import { useState, useEffect } from "react";
import { requestNotificationPermission } from "../firebase.js";

const G = "#F5A623", G2 = "#FFD17C";

export const NotificationManager = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("stea-notif-dismissed")) return;
    const t = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    const token = await requestNotificationPermission();
    setLoading(false);
    if (token) {
      setDone(true);
      setTimeout(() => setShow(false), 2500);
    } else {
      setShow(false);
      localStorage.setItem("stea-notif-dismissed", "1");
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("stea-notif-dismissed", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", top: 80, right: 16, zIndex: 7500,
      width: "min(320px, calc(100vw - 32px))",
      background: "rgba(14,16,26,0.97)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 18, padding: "16px",
      display: "flex", gap: 12, alignItems: "flex-start",
      boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
      backdropFilter: "blur(20px)",
      animation: "slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      fontFamily: "'Instrument Sans', system-ui, sans-serif",
      color: "#fff",
    }}>
      <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>🔔</div>
      <div style={{ flex: 1 }}>
        {done ? (
          <div style={{ fontWeight: 800, color: G, fontSize: 14 }}>✅ Umewasha notifications!</div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>Pata notifications za STEA</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 12 }}>
              Pokea tech tips, habari mpya na deals mara zinapotoka.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAllow} disabled={loading} style={{
                border: "none", borderRadius: 9, padding: "7px 14px", fontWeight: 900,
                fontSize: 12, cursor: loading ? "wait" : "pointer",
                background: `linear-gradient(135deg,${G},${G2})`, color: "#111", opacity: loading ? 0.7 : 1,
              }}>{loading ? "..." : "Ruhusu"}</button>
              <button onClick={dismiss} style={{
                border: "none", borderRadius: 9, padding: "7px 12px", fontWeight: 700,
                fontSize: 12, cursor: "pointer", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)",
              }}>Hapana</button>
            </div>
          </>
        )}
      </div>
      <button onClick={dismiss} style={{
        position: "absolute", top: 10, right: 10, width: 22, height: 22,
        border: "none", background: "transparent", color: "rgba(255,255,255,0.3)",
        cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center", borderRadius: 4,
      }}>✕</button>
    </div>
  );
};
