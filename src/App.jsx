import { useState, useEffect, useRef, useCallback, Component } from "react";
import { createPortal } from "react-dom";
import { NotificationManager } from "./components/NotificationManager";
import { InstallPrompt } from "./components/InstallPrompt";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Check,
  Send,
  ChevronRight,
  Zap,
  BookOpen,
  Star,
  Users,
  Clock,
  Award,
  HelpCircle,
  ShieldCheck,
  MessageCircle,
  Bot,
  X,
  User,
  Shield,
  LogOut,
  Globe,
} from "lucide-react";
import EmptyState from "./components/EmptyState";
import { jsPDF } from "jspdf";
import confetti from "canvas-confetti";
import {
  initFirebase,
  getFirebaseAuth,
  getFirebaseDb,
  db,
  GoogleAuthProvider,
  ADMIN_EMAIL,
  isAdminEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  collection,
  orderBy,
  serverTimestamp,
  normalizeEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "./firebase.js";
import {
  useCollection,
  incrementViews,
  timeAgo,
  fmtViews,
} from "./hooks/useFirestore.js";
import AdminPanel from "./admin/AdminPanel.jsx";
import { CategoryTabs } from "./components/CategoryTabs.jsx";
import ProfilePictureUpload from "./components/ProfilePictureUpload.jsx";
import AIChat from "./components/AIChat.jsx";
import { BannerAd, PopupAd, InlineAd } from "./components/SponsoredAdsSection.jsx";

// ── Hooks ────────────────────────────────────────────────
import { useMobile } from "./hooks/useMobile.js";

// ── Error Boundary ───────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      let errorMsg = "Samahani, kuna tatizo limetokea kwenye mfumo.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMsg =
            "Huna ruhusa ya kufanya kitendo hiki. Tafadhali wasiliana na admin.";
        }
      } catch {
        // Not a JSON error
      }
      return (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "#05060a",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <AlertCircle size={64} color="#ff4444" style={{ marginBottom: 20 }} />
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            Opps! Kuna Hitilafu
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,.6)",
              maxWidth: 500,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            {errorMsg}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                background: "#F5A623",
                color: "#111",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Jaribu Tena
            </button>
            <button
              onClick={async () => {
                try {
                  const auth = getFirebaseAuth();
                  if (auth) await signOut(auth);
                  window.location.href = "/";
                } catch {
                  window.location.href = "/";
                }
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.2)",
                background: "transparent",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Logout & Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Tokens ────────────────────────────────────────────
const G = "#F5A623",
  G2 = "#FFD17C",
  CB = "#141823";

// ── Portal Component ──────────────────────────────────
const Portal = ({ children }) => {
  return createPortal(children, document.body);
};

// ── Earth Hero Component ──────────────────────────────
function EarthHero() {
  return (
    <div
      style={{
        position: "absolute",
        right: -180,
        top: "50%",
        transform: "translateY(-50%)",
        width: "clamp(500px, 60vw, 950px)",
        height: "clamp(500px, 60vw, 950px)",
        zIndex: 1,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Atmosphere Glow - Outer */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(86,183,255,0.2) 0%, transparent 70%)",
          filter: "blur(60px)",
          zIndex: -1,
        }}
      />

      {/* Earth Body */}
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 300, repeat: Infinity, ease: "linear" }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background:
            "url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=1000') center/cover no-repeat",
          boxShadow:
            "inset -80px -80px 160px rgba(0,0,0,0.9), inset 20px 20px 60px rgba(86,183,255,0.2), 0 0 100px rgba(86,183,255,0.1)",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Clouds Layer Overlay - Moving independently */}
        <motion.div
          animate={{ x: ["-5%", "5%"], y: ["-2%", "2%"], rotate: [0, 3, 0] }}
          transition={{
            duration: 60,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: "-10%",
            background:
              "url('https://www.transparenttextures.com/patterns/clouds.png')",
            opacity: 0.35,
            mixBlendMode: "screen",
            filter: "brightness(1.5) contrast(1.2)",
            zIndex: 2,
          }}
        />

        {/* Night Lights Glow / City Lights */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 75% 75%, rgba(245,166,35,0.15), transparent 50%)",
            mixBlendMode: "overlay",
            zIndex: 1,
          }}
        />
      </motion.div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────
const NAV = [
  { id: "home", label: "Home" },
  { id: "tips", label: "Tech Tips" },
  { id: "prompts", label: "Prompt Lab" },
  { id: "deals", label: "Deals" },
  { id: "courses", label: "Courses" },
  { id: "duka", label: "Duka" },
  { id: "websites", label: "Websites Solutions" },
];

const TYPED = [
  "Tech Tips kwa Kiswahili 💡",
  "Courses za Kisasa 🎓",
  "Tanzania Electronics Hub 🛍️",
  "Websites Bora Bure 🌐",
  "AI & ChatGPT Mastery 🤖",
];

// ── Static fallbacks (shown when Firestore is empty) ──
const BS = {
  gold: {
    background: "rgba(245,166,35,.2)",
    color: G,
    border: "1px solid rgba(245,166,35,.3)",
  },
  blue: {
    background: "rgba(59,130,246,.2)",
    color: "#93c5fd",
    border: "1px solid rgba(59,130,246,.3)",
  },
  red: {
    background: "rgba(239,68,68,.2)",
    color: "#fca5a5",
    border: "1px solid rgba(239,68,68,.3)",
  },
  purple: {
    background: "rgba(99,102,241,.2)",
    color: "#a5b4fc",
    border: "1px solid rgba(99,102,241,.3)",
  },
  gray: {
    background: "rgba(255,255,255,.1)",
    color: "rgba(255,255,255,.8)",
    border: "1px solid rgba(255,255,255,.2)",
  },
};

// ════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════

function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let stars = [],
      raf,
      shootingStars = [];
    const resize = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
      stars = Array.from({ length: 180 }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.55 + 0.2,
        s: Math.random() * 0.17 + 0.04,
      }));
    };
    const createShootingStar = () => {
      shootingStars.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height * 0.5,
        len: Math.random() * 120 + 40,
        speed: Math.random() * 15 + 8,
        opacity: 1,
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      stars.forEach((s) => {
        s.y += s.s;
        if (s.y > c.height) {
          s.y = -4;
          s.x = Math.random() * c.width;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      });

      if (Math.random() < 0.015) createShootingStar();

      shootingStars.forEach((s, i) => {
        s.x += s.speed;
        s.y += s.speed * 0.4;
        s.opacity -= 0.015;
        if (s.opacity <= 0) {
          shootingStars.splice(i, 1);
          return;
        }
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len, s.y - s.len * 0.4);
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.45,
        pointerEvents: "none",
      }}
    />
  );
}

function TypedText({ strings }) {
  const [txt, setTxt] = useState("");
  const st = useRef({ pi: 0, ci: 0, del: false });
  const list = strings && strings.length > 0 ? strings : TYPED;
  useEffect(() => {
    let t;
    const tick = () => {
      const { pi, ci, del } = st.current;
      const cur = list[pi % list.length];
      if (!del) {
        setTxt(cur.slice(0, ci + 1));
        st.current.ci++;
        if (ci + 1 === cur.length) {
          st.current.del = true;
          t = setTimeout(tick, 1900);
        } else t = setTimeout(tick, 65);
      } else {
        setTxt(cur.slice(0, ci - 1));
        st.current.ci--;
        if (ci - 1 === 0) {
          st.current.del = false;
          st.current.pi = (pi + 1) % list.length;
          t = setTimeout(tick, 320);
        } else t = setTimeout(tick, 38);
      }
    };
    t = setTimeout(tick, 1400);
    return () => clearTimeout(t);
  }, [list]);
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: "#FFD17C",
        minHeight: "1.6em",
        margin: "4px 0 16px",
      }}
    >
      {txt}
      <span
        style={{
          display: "inline-block",
          width: 2,
          height: "1em",
          background: G,
          marginLeft: 2,
          verticalAlign: "middle",
          animation: "blink .8s step-end infinite",
        }}
      />
    </div>
  );
}

function TiltCard({ children, style = {}, className = "", onClick }) {
  const ref = useRef(null);
  const apply = useCallback((x, y) => {
    if (window.innerWidth < 768) return;
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const px = (x - r.left) / r.width,
      py = (y - r.top) / r.height;
    c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-6px)`;
    c.style.boxShadow = "0 22px 54px rgba(0,0,0,.4)";
    c.style.borderColor = "rgba(245,166,35,.25)";
  }, []);
  const reset = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
    ref.current.style.boxShadow = "0 12px 36px rgba(0,0,0,.2)";
    ref.current.style.borderColor = "rgba(255,255,255,.08)";
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={(e) => apply(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchStart={(e) => {
        const t = e.touches[0];
        apply(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        apply(t.clientX, t.clientY);
      }}
      onTouchEnd={() => setTimeout(reset, 300)}
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,.08)",
        background: CB,
        overflow: "hidden",
        transition: "border-color .3s,box-shadow .3s",
        boxShadow: "0 12px 36px rgba(0,0,0,.2)",
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Thumb({ bg, iconUrl, name, domain, badge, bt, imageUrl, fit = "cover" }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = imageUrl && !imgError;
  const [iconError, setIconError] = useState(false);
  const hasIcon = iconUrl && !iconError;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16/9",
        background: "rgba(255,255,255,.03)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "36px 20px 20px",
        overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}
    >
      {hasImage ? (
        <img
          loading="lazy"
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            position: "absolute",
            inset: 0,
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: bg,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 30% 30%,rgba(255,255,255,.12),transparent 60%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 900,
            zIndex: 5,
            ...(BS[bt] || BS.gray),
          }}
        >
          {badge}
        </div>
      )}
      {!hasImage && (
        <>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.1)",
              zIndex: 2,
              backdropFilter: "blur(10px)",
            }}
          >
            {hasIcon && (
              <img
                src={iconUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                referrerPolicy="no-referrer"
                onError={() => setIconError(true)}
              />
            )}
          </div>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: 15,
              fontWeight: 800,
              color: "rgba(255,255,255,.92)",
              zIndex: 2,
              textAlign: "center",
            }}
          >
            {name}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 99,
              background: "rgba(255,255,255,.15)",
              color: "#fff",
              zIndex: 2,
            }}
          >
            {domain}
          </span>
        </>
      )}
    </div>
  );
}

function PushBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.querySelector(".ps").style.transform =
          "translateY(4px)";
        e.currentTarget.querySelector(".pf").style.transform =
          "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.querySelector(".ps").style.transform =
          "translateY(2px)";
        e.currentTarget.querySelector(".pf").style.transform =
          "translateY(-2px)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.querySelector(".ps").style.transform =
          "translateY(0px)";
        e.currentTarget.querySelector(".pf").style.transform =
          "translateY(0px)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.querySelector(".ps").style.transform =
          "translateY(4px)";
        e.currentTarget.querySelector(".pf").style.transform =
          "translateY(-4px)";
      }}
      style={{
        position: "relative",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      <span
        className="ps"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: 16,
          background: "rgba(0,0,0,.3)",
          transform: "translateY(2px)",
          transition: "transform .2s cubic-bezier(.3,.7,.4,1)",
          display: "block",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: 16,
          background:
            "linear-gradient(to left,hsl(37,60%,25%),hsl(37,60%,40%),hsl(37,60%,25%))",
          display: "block",
        }}
      />
      <span
        className="pf"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 26px",
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 900,
          color: "#111",
          background: `linear-gradient(135deg,${G},${G2})`,
          transform: "translateY(-2px)",
          transition: "transform .2s cubic-bezier(.3,.7,.4,1)",
        }}
      >
        {children}
      </span>
    </button>
  );
}

function GoldBtn({ children, onClick, style = {}, className = "" }) {
  return (
    <button
      className={className}
      onClick={onClick}
      style={{
        border: "none",
        cursor: "pointer",
        borderRadius: 14,
        padding: "11px 20px",
        fontWeight: 900,
        color: "#111",
        background: `linear-gradient(135deg,${G},${G2})`,
        fontSize: 14,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.05)";
        e.currentTarget.style.boxShadow = `0 16px 32px rgba(245,166,35,.4)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {children}
    </button>
  );
}

function CopyBtn({ code }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(code).then(() => {
          setC(true);
          setTimeout(() => setC(false), 2000);
        })
      }
      style={{
        background: c ? G : "rgba(255,255,255,.1)",
        color: c ? "#111" : "#fff",
        border: `1px solid ${c ? G : "rgba(255,255,255,.15)"}`,
        padding: "6px 14px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        transition: "all .2s",
      }}
    >
      {c ? "✅ Copied!" : "📋 Copy"}
    </button>
  );
}

function SHead({ title, hi, copy }) {
  const isMobile = useMobile();
  return (
    <div style={{ marginBottom: isMobile ? 16 : 24 }}>
      <h2
        style={{
          fontFamily: "'Bricolage Grotesque',sans-serif",
          fontSize: isMobile ? 24 : "clamp(28px,3vw,40px)",
          letterSpacing: "-.04em",
          margin: "0 0 4px",
          lineHeight: 1.1,
          fontWeight: 900,
        }}
      >
        {title} <span style={{ color: G }}>{hi}</span>
      </h2>
      {copy && (
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,.45)",
            lineHeight: isMobile ? 1.5 : 1.8,
            maxWidth: 680,
            fontSize: isMobile ? 12 : 15,
          }}
        >
          {copy}
        </p>
      )}
    </div>
  );
}

const W = ({ children }) => {
  return (
    <div className="main-container">
      {children}
    </div>
  );
};

// ── Skeleton loader ───────────────────────────────────
function Skeleton({ type = "card" }) {
  if (type === "prompt") {
    return (
      <div
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,.06)",
          background: CB,
          overflow: "hidden",
          height: 320,
        }}
      >
        <div
          style={{
            height: "100%",
            background:
              "linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.02) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
          }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,.06)",
        background: CB,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 160,
          background:
            "linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.03) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.8s infinite",
        }}
      />
      <div style={{ padding: 20 }}>
        <div
          style={{
            height: 18,
            borderRadius: 9,
            background: "rgba(255,255,255,.05)",
            marginBottom: 12,
            width: "80%",
          }}
        />
        <div
          style={{
            height: 12,
            borderRadius: 6,
            background: "rgba(255,255,255,.03)",
            width: "100%",
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 12,
            borderRadius: 6,
            background: "rgba(255,255,255,.03)",
            width: "60%",
          }}
        />
      </div>
    </div>
  );
}

// ── Article modal ─────────────────────────────────────
function ArticleModal({ article, onClose }) {
  const [imgError, setImgError] = useState(false);
  const [content, setContent] = useState(article.content || "");
  const [loadingContent, setLoadingContent] = useState(!!article.contentFileUrl && !article.content);
  const hasImage = article.imageUrl && !imgError;

  useEffect(() => {
    if (article.contentFileUrl && !article.content) {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => setLoadingContent(true));
      fetch(article.contentFileUrl)
        .then(res => res.json())
        .then(data => {
            setContent(data);
            setLoadingContent(false);
        })
        .catch(err => {
            console.error("Error fetching content:", err);
            setLoadingContent(false);
        });
    }
  }, [article]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  });
  return (
    <Portal>
      <div
        style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px 16px" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#040509]/95 backdrop-blur-2xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-[800px] bg-[#0e101a] rounded-[40px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between p-7 bg-[#0e101a]/80 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-[10px] font-black uppercase tracking-wider">
                {article.badge}
              </span>
              {article.readTime && (
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  {article.readTime} read
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            >
              <X size={22} />
            </button>
          </div>

          <div className="overflow-y-auto scrollbar-hide">
            {hasImage && (
              <div className="w-full aspect-video overflow-hidden bg-white/5 border-b border-white/5">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              </div>
            )}

            <div className="p-8 sm:p-12 space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-[1.1]">
                  {article.title}
                </h2>
                <div className="flex items-center gap-4 text-white/30 text-xs font-bold">
                  <span>{timeAgo(article.createdAt)}</span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span>{fmtViews(article.views)} views</span>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div className="prose prose-invert max-w-none">
                <div className="text-white/70 leading-relaxed text-lg sm:text-xl space-y-6 font-medium">
                  {loadingContent ? (
                    <p>Inapakia maudhui...</p>
                  ) : (
                    content?.split("\n").map((p, i) => (
                      <p key={i}>{p}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

// ── Video modal ───────────────────────────────────────
function VideoModal({ video, onClose }) {
  
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const getEmbedUrl = (url, platform) => {
    if (!url) return "";
    if (platform === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      if (url.includes("embed/")) return url;
      const id = url.includes("v=") ? url.split("v=")[1]?.split("&")[0] : url.split("be/")[1]?.split("?")[0] || url.split("/").pop()?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (platform === "tiktok" || url.includes("tiktok.com")) {
      if (url.includes("/video/")) {
        const id = url.split("/video/")[1]?.split("?")[0];
        return `https://www.tiktok.com/embed/v2/${id}`;
      }
      return url;
    }
    if (platform === "instagram" || url.includes("instagram.com")) {
      const id = url.split("/p/")[1]?.split("/")[0] || url.split("/reels/")[1]?.split("/")[0] || url.split("/reel/")[1]?.split("/")[0];
      if (id) return `https://www.instagram.com/p/${id}/embed`;
      return url;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(video.embedUrl || video.url, video.platform);
  const isVertical = video.platform === "tiktok" || (video.platform === "instagram" && (video.url?.includes("/reels/") || video.url?.includes("/reel/"))) || (video.platform === "youtube" && (video.url?.includes("/shorts/") || video.embedUrl?.includes("/shorts/")));

  return (
    <Portal>
      <div
        style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"0" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#040509]/98 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className={`relative w-full ${isVertical ? 'max-w-[420px]' : 'max-w-[1000px]'} bg-black overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] sm:rounded-[40px] border border-white/10 flex flex-col`}
          style={{ height: window.innerWidth < 640 ? '100%' : 'auto' }}
        >
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-50 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all active:scale-90"
          >
            <X size={24} />
          </button>

          <div className={`relative w-full ${isVertical ? 'aspect-[9/16]' : 'aspect-video'} bg-black`}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-none"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="p-8 sm:p-10 bg-[#0e101a] border-t border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-[10px] font-black uppercase tracking-wider">
                {video.badge || "Video"}
              </span>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                {video.platform}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white leading-tight">
              {video.title}
            </h2>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

// ── Article Card ──────────────────────────────────────
function ArticleCard({ item, onRead, collection: col }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = (item.image || item.imageUrl) && !imgError;
  const handleRead = () => {
    if (item.id && !item.id.startsWith("f") && !item.id.startsWith("u"))
      incrementViews(col, item.id);
    onRead(item);
  };
  return (
    <TiltCard
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: hasImage ? 0 : isMobile ? "10px 10px 6px" : "18px 18px 10px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background:
            "linear-gradient(135deg,rgba(245,166,35,.1),rgba(255,255,255,.02)),linear-gradient(180deg,#1e2030,#161820)",
          aspectRatio: hasImage ? "16/9" : "auto",
          minHeight: hasImage ? 0 : isMobile ? 60 : 90,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {hasImage ? (
          <img
            src={item.image || item.imageUrl}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              width: "100%",
              padding: isMobile ? "12px" : "20px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: isMobile ? "3px 8px" : "4px 10px",
                borderRadius: 999,
                fontSize: isMobile ? 10 : 11,
                fontWeight: 800,
                ...BS.gold,
              }}
            >
              {item.badge}
            </span>
            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: "rgba(255,255,255,.4)",
                marginTop: isMobile ? 6 : 8,
              }}
            >
              {item.readTime || "5 min"} read
            </div>
          </div>
        )}
        {hasImage && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? 8 : 12,
              left: isMobile ? 8 : 12,
              padding: isMobile ? "3px 8px" : "4px 10px",
              borderRadius: 999,
              fontSize: isMobile ? 9 : 10,
              fontWeight: 800,
              ...BS.gold,
              backdropFilter: "blur(8px)",
            }}
          >
            {item.badge}
          </div>
        )}
      </div>
      <div
        style={{
          padding: isMobile ? 10 : 18,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: isMobile ? 14 : 18,
            margin: "0 0 4px",
            letterSpacing: "-.03em",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,.62)",
            fontSize: isMobile ? 11 : 14,
            lineHeight: 1.5,
            margin: "0 0 10px",
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: isMobile ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description || item.summary}
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
            borderTop: "1px solid rgba(255,255,255,.05)",
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: 9, color: "rgba(255,255,255,.35)" }}>
            👁 {fmtViews(item.views)}
          </span>
          {item.createdAt && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,.35)" }}>
              {timeAgo(item.createdAt)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <GoldBtn
            onClick={handleRead}
            style={{
              fontSize: isMobile ? 10 : 12,
              padding: isMobile ? "6px 10px" : "9px 16px",
              flex: 1,
              justifyContent: "center",
            }}
          >
            📖 Soma Zaidi
          </GoldBtn>
          <button
            onClick={() =>
              window.open(
                `https://wa.me/8619715852043?text=Habari%20STEA,%20nahitaji%20msaada%20kuhusu%20maujanja:%20${encodeURIComponent(item.title)}`,
                "_blank",
              )
            }
            style={{
              width: isMobile ? 32 : 42,
              height: isMobile ? 32 : 42,
              borderRadius: 10,
              border: "1px solid rgba(37,211,102,.3)",
              background: "rgba(37,211,102,.1)",
              color: "#25d366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={isMobile ? 14 : 18} />
          </button>
        </div>
      </div>
    </TiltCard>
  );
}

// ── Video Card ────────────────────────────────────────
function VideoCard({ item, onPlay, collection: col }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = (item.image || item.imageUrl) && !imgError;
  const handlePlay = () => {
    if (item.id && !item.id.startsWith("f") && !item.id.startsWith("u"))
      incrementViews(col, item.id);
    onPlay(item);
  };
  return (
    <TiltCard
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        onClick={handlePlay}
        style={{
          flexShrink: 0,
          position: "relative",
          aspectRatio: "16/9",
          background: "rgba(255,255,255,.03)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <img
            src={item.image || item.imageUrl}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg,rgba(245,166,35,.12),rgba(255,255,255,.02)),linear-gradient(180deg,#1e2030,#161820)",
            }}
          />
        )}
        {hasImage && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.3)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: isMobile ? 40 : 60,
              height: isMobile ? 40 : 60,
              borderRadius: "50%",
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 14 : 22,
              color: "#111",
              fontWeight: 900,
              boxShadow: `0 0 30px rgba(245,166,35,.4)`,
            }}
          >
            ▶
          </motion.div>
        </div>
        <div
          style={{
            position: "absolute",
            top: isMobile ? 8 : 10,
            left: isMobile ? 8 : 10,
            padding: isMobile ? "3px 8px" : "4px 10px",
            borderRadius: 999,
            fontSize: isMobile ? 9 : 10,
            fontWeight: 800,
            ...(item.platform === "youtube" ? BS.red : BS.purple),
          }}
        >
          {item.platform === "youtube" ? "▶ YouTube" : "♪ TikTok"}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? 8 : 10,
            right: isMobile ? 8 : 10,
            padding: isMobile ? "3px 6px" : "4px 8px",
            borderRadius: isMobile ? 6 : 8,
            fontSize: isMobile ? 9 : 10,
            fontWeight: 700,
            background: "rgba(0,0,0,.7)",
            color: "#fff",
          }}
        >
          {item.duration}
        </div>
      </div>
      <div
        style={{
          padding: isMobile ? 12 : 16,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: isMobile ? 8 : 10,
            alignItems: "center",
            marginBottom: isMobile ? 8 : 12,
          }}
        >
          <div
            style={{
              width: isMobile ? 24 : 32,
              height: isMobile ? 24 : 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,.1)",
              display: "grid",
              placeItems: "center",
              fontSize: isMobile ? 11 : 14,
            }}
          >
            {typeof item.channelImg === "string" && item.channelImg.length < 5
              ? item.channelImg
              : "🎙️"}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 11 : 13 }}>{item.channel}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>
              👁 {fmtViews(item.views)} views
            </div>
          </div>
        </div>
        <h3
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: isMobile ? 14 : 16,
            margin: "0 0 12px",
            letterSpacing: "-.02em",
            lineHeight: 1.3,
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          <GoldBtn
            onClick={handlePlay}
            style={{
              fontSize: isMobile ? 11 : 12,
              padding: isMobile ? "7px 12px" : "8px 14px",
              flex: 1,
              justifyContent: "center",
            }}
          >
            ▶ Tazama Sasa
          </GoldBtn>
          <button
            onClick={() =>
              window.open(
                `https://wa.me/8619715852043?text=Habari%20STEA,%20nimeona%20video%20hii:%20${encodeURIComponent(item.title)}`,
                "_blank",
              )
            }
            style={{
              width: isMobile ? 34 : 38,
              height: isMobile ? 34 : 38,
              borderRadius: 10,
              border: "1px solid rgba(37,211,102,.3)",
              background: "rgba(37,211,102,.1)",
              color: "#25d366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={isMobile ? 14 : 18} />
          </button>
        </div>
      </div>
    </TiltCard>
  );
}

// ════════════════════════════════════════════════════
// AUTH MODAL
// ════════════════════════════════════════════════════
function AuthModal({ onClose, onUser }) {
  const [tog, setTog] = useState(false);
  const [mode, setMode] = useState("login");
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [pw, setPw] = useState(""),
    [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""), [loading, setLoading] = useState(false);

  const switchTo = (m) => {
    if (m === "register") { setTog(true); setTimeout(() => setMode("register"), 80); }
    else if (m === "login") { setTog(false); setTimeout(() => setMode("login"), 80); }
    else setMode("forgot");
    setErr("");
  };

  const saveUser = async (user, displayName, provider) => {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const r = doc(db, "users", user.uid);
      const s = await getDoc(r);
      let role = isAdminEmail(user.email) ? "admin"
        : s.exists() ? s.data().role || "user" : "user";
      if (!s.exists())
        await setDoc(r, { uid: user.uid, name: displayName || user.displayName || "",
          email: user.email, role, provider, createdAt: serverTimestamp() });
      onUser({ ...user, role });
    } catch (err) {
      console.error("Error saving user:", err);
      onUser({ ...user, role: isAdminEmail(user.email) ? "admin" : "user" });
    }
  };

  const doGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) { setErr("⚠️ Firebase haijasanidiwa."); return; }
    setLoading(true); setErr("");
    try {
      const res = await signInWithPopup(auth, new GoogleAuthProvider());
      await saveUser(res.user, res.user.displayName, "google");
      onClose();
    } catch (e) {
      let msg = e.message.replace("Firebase:", "").trim();
      if (msg.includes("auth/popup-blocked")) msg = "⚠️ Popup imezuiwa. Ruhusu popups.";
      if (msg.includes("auth/unauthorized-domain")) msg = "⚠️ Domain hii haijaruhusiwa.";
      setErr(msg);
    } finally { setLoading(false); }
  };

  const doEmail = async () => {
    const auth = getFirebaseAuth();
    if (!auth) { setErr("⚠️ Firebase haijasanidiwa."); return; }
    if (!email || !pw) { setErr("Jaza email na password."); return; }
    setLoading(true); setErr("");
    const normalizedEmail = normalizeEmail(email);
    try {
      if (mode === "login") {
        const res = await signInWithEmailAndPassword(auth, normalizedEmail, pw);
        await saveUser(res.user, res.user.displayName || name, "email");
      } else {
        if (pw !== pw2) { setErr("Passwords hazifanani."); setLoading(false); return; }
        if (pw.length < 6) { setErr("Password lazima iwe herufi 6+."); setLoading(false); return; }
        const res = await createUserWithEmailAndPassword(auth, normalizedEmail, pw);
        await saveUser(res.user, name, "email");
      }
      onClose();
    } catch (e) {
      let msg = e.message.replace("Firebase:", "").trim();
      if (msg.includes("auth/user-not-found")) msg = "⚠️ Akaunti hii haipo. Tafadhali jisajili.";
      if (msg.includes("auth/wrong-password")) msg = "⚠️ Password si sahihi.";
      if (msg.includes("auth/invalid-credential")) msg = "⚠️ Email au Password si sahihi.";
      if (msg.includes("auth/email-already-in-use")) msg = "⚠️ Email hii tayari inatumika.";
      if (msg.includes("auth/invalid-email")) msg = "⚠️ Email si sahihi.";
      setErr(msg);
    } finally { setLoading(false); }
  };

  const doForgot = async () => {
    const auth = getFirebaseAuth();
    if (!auth) { setErr("⚠️ Firebase haijasanidiwa."); return; }
    if (!email) { setErr("Weka email yako kwanza."); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setErr("✅ Reset link imetumwa!");
    } catch (e) { setErr(e.message.replace("Firebase:", "").trim()); }
    finally { setLoading(false); }
  };

  // Shared input style
  const inputStyle = {
    width: "100%", height: 54, borderRadius: 16,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.05)",
    color: "#fff", padding: "0 18px", outline: "none",
    fontFamily: "inherit", fontSize: 14, boxSizing: "border-box",
  };

  return (
    <Portal>
      {/* ── Overlay ── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Dark backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(4,5,9,0.92)",
            backdropFilter: "blur(16px)",
          }}
        />

        {/* ── Modal card ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            position: "relative",
            width: "100%", maxWidth: 860,
            background: "#0e101a",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.85)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
            minHeight: 540,
            maxHeight: "calc(100vh - 32px)",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 20, right: 20, zIndex: 50,
              width: 44, height: 44, borderRadius: 14,
              border: "1px solid rgba(255,255,255,.07)",
              background: "rgba(255,255,255,.05)",
              color: "rgba(255,255,255,.4)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}
          >
            <X size={20} />
          </button>

          {/* ── Left: Form ── */}
          <div style={{
            flex: 1, padding: "clamp(28px,5vw,52px)",
            display: "flex", flexDirection: "column", justifyContent: "center",
            overflowY: "auto",
          }}>
            {/* Login / Register tabs */}
            {mode !== "forgot" && (
              <div style={{
                display: "inline-flex", padding: 5,
                borderRadius: 999, background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                marginBottom: 28, alignSelf: "flex-start",
              }}>
                {["login", "register"].map((m) => (
                  <button key={m} onClick={() => switchTo(m)}
                    style={{
                      padding: "9px 22px", borderRadius: 999, border: "none",
                      fontSize: 11, fontWeight: 900, textTransform: "uppercase",
                      letterSpacing: ".1em", cursor: "pointer", transition: "all .2s",
                      background: mode === m ? G : "transparent",
                      color: mode === m ? "#111" : "rgba(255,255,255,.4)",
                      boxShadow: mode === m ? "0 4px 14px rgba(245,166,35,.3)" : "none",
                    }}
                  >
                    {m === "login" ? "Ingia" : "Jisajili"}
                  </button>
                ))}
              </div>
            )}

            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: "clamp(28px,4vw,38px)", fontWeight: 900,
                letterSpacing: "-.04em", color: "#fff", margin: "0 0 8px",
              }}>
                {mode === "login" ? "Karibu Tena" : mode === "register" ? "Jisajili Sasa" : "Reset Password"}
              </h2>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.4)", margin: 0 }}>
                {mode === "login" ? "Ingia kwenye akaunti yako ya STEA"
                  : mode === "register" ? "Anza safari yako ya kidijitali nasi"
                  : "Weka email yako kupata link ya reset"}
              </p>
            </div>

            {/* Error message */}
            {err && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  marginBottom: 20, padding: "12px 16px", borderRadius: 14,
                  border: `1px solid ${err.startsWith("✅") ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
                  background: err.startsWith("✅") ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                  color: err.startsWith("✅") ? "#4ade80" : "#fca5a5",
                  fontSize: 12.5, fontWeight: 700, lineHeight: 1.5,
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}
              >
                {err.startsWith("✅")
                  ? <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                {err}
              </motion.div>
            )}

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Google button (login only) */}
              {mode === "login" && (
                <button onClick={doGoogle} disabled={loading}
                  style={{
                    width: "100%", height: 54, borderRadius: 16,
                    border: "1px solid rgba(255,255,255,.1)",
                    background: "rgba(255,255,255,.05)",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                    transition: "all .2s", marginBottom: 4,
                    opacity: loading ? .6 : 1,
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(255,255,255,.09)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    style={{ width: 20, height: 20 }} alt="Google" />
                  Endelea kwa Google
                </button>
              )}

              {mode === "register" && (
                <input type="text" placeholder="Jina Kamili" value={name}
                  onChange={(e) => setName(e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"} />
              )}

              <input type="email" placeholder="Email address" value={email}
                onChange={(e) => setEmail(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = G}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"} />

              {mode !== "forgot" && (
                <input type="password" placeholder="Password" value={pw}
                  onChange={(e) => setPw(e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"} />
              )}

              {mode === "register" && (
                <input type="password" placeholder="Thibitisha Password" value={pw2}
                  onChange={(e) => setPw2(e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"} />
              )}

              {/* Submit button */}
              <button
                onClick={mode === "forgot" ? doForgot : doEmail}
                disabled={loading}
                style={{
                  width: "100%", height: 54, borderRadius: 16, border: "none",
                  background: loading ? "rgba(245,166,35,.6)" : `linear-gradient(135deg,${G},${G2})`,
                  color: "#111", fontSize: 14, fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 20px rgba(245,166,35,.3)",
                  marginTop: 4, transition: "all .2s",
                }}
              >
                {loading ? "Tafadhali subiri..." : mode === "login" ? "Ingia Sasa →"
                  : mode === "register" ? "Fungua Account →" : "Tuma Reset Link"}
              </button>

              {/* Footer link */}
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                {mode === "login" ? (
                  <button onClick={() => switchTo("forgot")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.25)",
                      fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                      letterSpacing: ".1em", cursor: "pointer" }}>
                    Umesahau Password?
                  </button>
                ) : mode === "forgot" ? (
                  <button onClick={() => switchTo("login")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ← Rudi kwenye Login
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Right: Brand panel (desktop only) ── */}
          <div style={{
            width: 340, flexShrink: 0,
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg,#0d1019,#090b12)",
            padding: 44,
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}
            className="auth-brand-panel"
          >
            {/* Animated gold slab */}
            <motion.div
              animate={{ rotate: tog ? 0 : 10, skewY: tog ? 0 : 38 }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "absolute", right: "-5%", top: "-8%",
                height: "130%", width: "115%",
                background: `linear-gradient(135deg,${G},#E09612)`,
                transformOrigin: "bottom right",
              }}
            />
            <motion.div
              animate={{ rotate: tog ? -10 : 0, skewY: tog ? -38 : 0 }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
              style={{
                position: "absolute", left: "22%", top: "98%",
                height: "120%", width: "110%",
                background: "#0c0e16",
                borderTop: `4px solid ${G}`,
                transformOrigin: "bottom left",
              }}
            />
            <div style={{ position: "relative", zIndex: 10, color: "#111" }}>
              <h3 style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 52, fontWeight: 900, lineHeight: 0.88,
                letterSpacing: "-.06em", marginBottom: 20,
                whiteSpace: "pre-line",
              }}>
                {tog ? "KARIBU\nSTEA" : "KARIBU\nTENA"}
              </h3>
              <p style={{ maxWidth: 260, fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, marginBottom: 20, opacity: .8 }}>
                {tog
                  ? "Anza safari yako ya tech. Platform ya kwanza ya tech kwa Watanzania."
                  : "Login uendelee kujifunza na kupata deals bora za kidijitali."}
              </p>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".12em", opacity: .4 }}>
                ✉️ swahilitecheliteacademy@gmail.com
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hide brand panel on mobile */}
      <style>{`.auth-brand-panel { display: flex; } @media(max-width:640px){ .auth-brand-panel{ display:none!important; } }`}</style>
    </Portal>
  );
}
// ── User Chip ─────────────────────────────────────────
function UserChip({ user, onLogout, onAdmin, onProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const ini = (user.displayName || user.email || "S")[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Account button — initials only, no photo */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        style={{
          width: 38, height: 38, borderRadius: "50%", border: "none",
          background: open ? G : "rgba(245,166,35,.15)",
          color: open ? "#111" : G,
          fontWeight: 900, fontSize: 15,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, outline: "none",
          transition: "background .2s, color .2s, transform .15s",
          transform: open ? "scale(0.94)" : "scale(1)",
        }}
      >
        {ini}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              minWidth: 220,
              maxWidth: "calc(100vw - 24px)",
              background: "rgba(9,10,17,0.99)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,.75)",
              overflow: "hidden",
              zIndex: 9999,
            }}
          >
            {/* User info header */}
            <div style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,.06)",
            }}>
              <div style={{
                fontWeight: 800, fontSize: 13, color: "#fff",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user.displayName || "STEA User"}
              </div>
              <div style={{
                fontSize: 10.5, color: "rgba(255,255,255,.35)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2,
              }}>
                {user.email}
              </div>
              {user.role === "admin" && (
                <div style={{
                  marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 99,
                  background: "rgba(245,166,35,.1)", border: "1px solid rgba(245,166,35,.2)",
                  color: G, fontSize: 9, fontWeight: 900,
                  textTransform: "uppercase", letterSpacing: ".08em",
                }}>
                  <Shield size={8} /> Admin
                </div>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding: 6 }}>
              {[
                { icon: <User size={14} />, label: "Profile Yangu", action: () => { onProfile(); setOpen(false); } },
                ...(user.role === "admin" ? [{ icon: <Shield size={14} />, label: "Admin Panel", action: () => { onAdmin(); setOpen(false); } }] : []),
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 10, margin: "2px 0",
                    border: "none", background: "transparent",
                    color: "rgba(255,255,255,.72)", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", textAlign: "left", transition: "all .14s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.72)"; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "rgba(245,166,35,.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: G,
                  }}>
                    {item.icon}
                  </div>
                  {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,.05)", margin: "4px 0" }} />

              <button onClick={() => { onLogout(); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 10, margin: "2px 0",
                  border: "none", background: "transparent",
                  color: "rgba(239,68,68,.85)", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", textAlign: "left", transition: "all .14s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,.85)"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "rgba(239,68,68,.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444",
                }}>
                  <LogOut size={14} />
                </div>
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function ProfileModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user.displayName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: name });
      onUpdate({ ...user, displayName: name });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div
        style={{ position:"fixed", inset:0, zIndex:5000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#040509]/95 backdrop-blur-2xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[440px] bg-[#0e101a] rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="text-xl font-black tracking-tighter text-white">Profile</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto scrollbar-hide">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <ProfilePictureUpload
                userId={user.uid}
                currentPhotoURL={user.photoURL}
                onUpdate={(url) => onUpdate({ ...user, photoURL: url })}
              />
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F5A623] ml-1">
                  Jina Kamili
                </label>
                <div className="relative group">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Weka jina lako..."
                    className="w-full h-14 px-5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.06] transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
                  Email Address
                </label>
                <div className="w-full h-14 px-5 bg-white/[0.01] border border-white/5 rounded-xl text-white/40 flex items-center font-bold text-sm">
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 rounded-xl bg-[#F5A623] text-[#111] font-black hover:bg-[#FFD17C] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Inahifadhi..." : "Hifadhi Mabadiliko"}
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

// ════════════════════════════════════════════════════
// LIVE DATA PAGES
// ════════════════════════════════════════════════════
function TechContentPage({ goPage }) {
  const [filter, setFilter] = useState("all");

  const { docs: tipsDocs, loading: tipsLoading } = useCollection(
    "tips",
    "createdAt",
  );

  const loading = tipsLoading;

  const [art, setArt] = useState(null);
  const [vid, setVid] = useState(null);

  const filteredDocs = tipsDocs
    .filter((d) => {
      if (filter === "all") return true;
      if (filter === "article") return d.type === "article" || !d.type;
      if (filter === "video") return d.type === "video";
      return true;
    });

  return (
    <section style={{ padding: "26px 0" }}>
      <W>
        {art && (
          <ArticleModal
            article={art}
            onClose={() => setArt(null)}
            collection="tips"
          />
        )}
        {vid && (
          <VideoModal
            video={vid}
            onClose={() => setVid(null)}
            collection="tips"
          />
        )}

        <SHead
          title="Tech"
          hi="Tips"
          copy="Jifunze maujanja ya Android, iPhone, PC na AI kwa matumizi ya kila siku."
        />

        {/* Filters: All | Articles | Videos */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 32,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {["all", "article", "video"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: filter === f ? G : "rgba(255,255,255,.1)",
                background:
                  filter === f ? "rgba(245,166,35,.1)" : "transparent",
                color: filter === f ? G : "rgba(255,255,255,.6)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
              }}
            >
              {f === "all" ? "All Content" : f + "s"}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 22,
            marginBottom: 40,
          }}
        >
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} />)
          ) : filteredDocs.length > 0 ? (
            filteredDocs.map((item) =>
              item.type === "video" ? (
                <VideoCard
                  key={item.id}
                  item={item}
                  onPlay={setVid}
                  collection="tips"
                />
              ) : (
                <ArticleCard
                  key={item.id}
                  item={item}
                  onRead={setArt}
                  collection="tips"
                />
              ),
            )
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna Tech Tips bado"
                message="Tunaandaa maudhui mapya kwa ajili yako. Tafadhali rudi hivi karibuni."
                actionText="Rudi Home"
                onAction={() => goPage("home")}
              />
            </div>
          )}
        </div>
      </W>
    </section>
  );
}

function DealCard({ d, i, goPage }) {
  const isMobile = useMobile();
  const getCTA = () => {
    if (d.ctaText) return { text: d.ctaText, url: d.directLink || d.affiliateLink || d.whatsappLink };
    if (d.dealType === "affiliate_offer")
      return { text: "Nunua Sasa", url: d.affiliateLink };
    if (d.dealType === "lead_offer")
      return { text: "Ulizia WhatsApp", url: d.whatsappLink };
    if (d.dealType === "promo_code")
      return { text: "Tumia Promo Code", url: d.directLink };
    return { text: "Pata Deal", url: d.directLink };
  };

  const cta = getCTA();

  return (
    <TiltCard key={d.id || i} onClick={() => goPage && goPage("deal-detail", d)} style={{ cursor: "pointer", width: "100%", maxWidth: "100%" }}>
      <div className={`flex ${isMobile ? "flex-col" : "flex-row"} w-full h-full`}>
        <div className={`${isMobile ? "w-full" : "w-2/5"} relative shrink-0`}>
          <Thumb
            bg={d.bg || "linear-gradient(135deg,#00c4cc,#7d2ae8)"}
            name={d.title || d.name}
            badge={d.badge}
            imageUrl={d.image || d.imageUrl}
            fit="contain"
          />
        </div>
        <div className={`${isMobile ? "p-3.5" : "p-6"} flex flex-col flex-1 w-full`}>
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: isMobile ? 15 : 19,
              margin: "0 0 4px",
              letterSpacing: "-.03em",
              lineHeight: 1.2,
            }}
          >
            {d.title || d.name}
          </h3>
          <p
            style={{
              color: "rgba(255,255,255,.68)",
              fontSize: isMobile ? 12 : 14,
              lineHeight: 1.5,
              margin: "4px 0",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {d.description}
          </p>
          
          {d.joinedCount && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: isMobile ? 10 : 12, color: "rgba(255,255,255,.5)" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#00c4cc", animation: "pulse 2s infinite" }}></span>
              {d.liveJoinedText || `${d.joinedCount}+ members joined`}
            </div>
          )}

          <div className="mt-auto pt-2">
            {d.oldPrice && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,.42)",
                    textDecoration: "line-through",
                    fontSize: isMobile ? 11 : 14,
                    fontWeight: 700,
                  }}
                >
                  {d.oldPrice}
                </span>
                <span style={{ color: G, fontSize: isMobile ? 16 : 20, fontWeight: 900 }}>
                  {d.newPrice}
                </span>
                {d.savingsText && (
                  <span style={{ fontSize: isMobile ? 9 : 12, color: "#00c4cc", fontWeight: 700, background: "rgba(0,196,204,.1)", padding: "2px 5px", borderRadius: 6 }}>
                    {d.savingsText}
                  </span>
                )}
              </div>
            )}
            {d.promoCode && (
              <div
                style={{
                  marginBottom: 8,
                  padding: isMobile ? "6px 10px" : "12px 14px",
                  borderRadius: 10,
                  border: "1px dashed rgba(245,166,35,.3)",
                  background: "rgba(245,166,35,.07)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.38)",
                    marginBottom: 2,
                  }}
                >
                  🎫 Promo Code
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <strong
                    style={{
                      fontSize: isMobile ? 14 : 18,
                      fontWeight: 900,
                      color: G,
                      letterSpacing: ".06em",
                    }}
                  >
                    {d.promoCode}
                  </strong>
                  <CopyBtn code={d.promoCode} />
                </div>
              </div>
            )}
            <div className="w-full mt-1">
              <GoldBtn 
                className="w-full flex justify-center items-center"
                style={{
                  padding: isMobile ? "7px 12px" : "10px 18px",
                  fontSize: isMobile ? 11 : 14,
                }}
                onClick={(e) => {
                  if (!goPage) {
                    window.open(cta.url, "_blank");
                  } else {
                    e.stopPropagation();
                    goPage("deal-detail", d);
                  }
                }}
              >
                {cta.text} →
              </GoldBtn>
            </div>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

function DealsPage({ goPage }) {
  const isMobile = useMobile();
  const { docs: dealsDocs, loading: dealsLoading } = useCollection("deals", "createdAt");
  const deals = dealsDocs.filter((d) => d.active !== false);

  return (
    <section style={{ padding: isMobile ? "24px 0" : "40px 0" }}>
      <W>
        <SHead
          title="Premium"
          hi="Deals"
          copy="Discounts, promo codes na referral deals — napata commission, wewe unapata bei nzuri."
        />
        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: isMobile ? 16 : 24 }}
        >
          {dealsLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} />)
          ) : deals.length > 0 ? (
            deals.map((d, i) => <DealCard key={d.id || i} d={d} i={i} goPage={goPage} />)
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna Deals kwa sasa" 
                message="Bado tunatafuta ofa bora zaidi kwa ajili yako. Tafadhali rudi baadaye."
                actionText="Rudi Home"
                onAction={() => goPage("home")}
              />
            </div>
          )}
        </div>
      </W>
    </section>
  );
}


function CourseListItem({ c, goPage }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = c.imageUrl && !imgError;

  return (
    <TiltCard className="course-list-item" style={{ overflow: "hidden" }}>
      {/* Top: Image & Badge */}
      <div
        className="course-img-container"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "rgba(255,255,255,.05)",
          aspectRatio: "16/9",
        }}
      >
        {hasImage ? (
          <img
            loading="lazy"
            src={c.imageUrl}
            alt={c.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
            }}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              opacity: 0.1,
            }}
          >
            <BookOpen size={isMobile ? 48 : 64} />
          </div>
        )}
        {c.badge && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? 12 : 16,
              left: isMobile ? 12 : 16,
              background: G,
              color: "#000",
              padding: isMobile ? "4px 8px" : "6px 12px",
              borderRadius: 8,
              fontSize: isMobile ? 10 : 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 1,
              zIndex: 2,
            }}
          >
            {c.badge}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? 10 : 12,
            right: isMobile ? 10 : 12,
            background: "rgba(0,0,0,.6)",
            backdropFilter: "blur(4px)",
            padding: isMobile ? "3px 8px" : "4px 10px",
            borderRadius: 8,
            fontSize: isMobile ? 10 : 12,
            fontWeight: 700,
            color: "#fff",
            border: "1px solid rgba(255,255,255,.2)",
            zIndex: 2,
          }}
        >
          {c.level || "All Levels"}
        </div>
      </div>

      {/* Bottom: Content */}
      <div
        className="course-content"
        style={{
          padding: isMobile ? 12 : 24,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 10 : 16,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: isMobile ? 16 : 24,
              margin: 0,
              letterSpacing: "-.03em",
              lineHeight: 1.2,
              flex: 1,
              fontWeight: 800,
            }}
          >
            {c.title}
          </h3>
          <div style={{ textAlign: "right" }}>
            {c.oldPrice && (
              <div
                style={{
                  fontSize: isMobile ? 10 : 13,
                  color: "rgba(255,255,255,.3)",
                  textDecoration: "line-through",
                }}
              >
                {c.oldPrice}
              </div>
            )}
            <div style={{ fontSize: isMobile ? 16 : 22, fontWeight: 900, color: G }}>
              {c.newPrice || c.price}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 12,
            color: "rgba(255,255,255,.5)",
            fontSize: isMobile ? 11 : 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={isMobile ? 11 : 14} fill={G} color={G} />
            <span>{c.rating || "5.0"}</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={isMobile ? 11 : 14} />
            <span>{c.studentsCount || "100+"}</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={isMobile ? 11 : 14} />
            <span>{c.duration || "4 Weeks"}</span>
          </div>
        </div>

        <p
          style={{
            color: "rgba(255,255,255,.6)",
            fontSize: isMobile ? 12 : 15,
            lineHeight: 1.5,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: isMobile ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {c.desc}
        </p>

        {/* Benefits Preview */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: isMobile ? 2 : 4 }}
        >
          {(c.whatYouWillLearn || []).slice(0, 2).map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: isMobile ? 10 : 12,
                color: "rgba(255,255,255,.7)",
                background: "rgba(255,255,255,.03)",
                padding: isMobile ? "3px 8px" : "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,.05)",
              }}
            >
              <Check size={isMobile ? 10 : 12} color={G} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMobile ? 100 : 150 }}>{item}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: isMobile ? 8 : 16,
            borderTop: "1px solid rgba(255,255,255,.05)",
          }}
        >
          <GoldBtn
            onClick={() => goPage("course-detail", c)}
            style={{ width: "100%", padding: isMobile ? "8px" : "12px", fontSize: isMobile ? 12 : 14 }}
          >
            {c.cta || "Anza Sasa"} →
          </GoldBtn>
        </div>
      </div>
    </TiltCard>
  );
}

function CoursesPage({ goPage }) {
  const isMobile = useMobile();
  const { docs: coursesDocs, loading: coursesLoading } = useCollection("courses", "createdAt");
  const courses = coursesDocs;

  return (
    <section style={{ padding: isMobile ? "20px 0" : "40px 0" }}>
      <W>
        <SHead
          title="Jifunze Skills"
          hi="Zinazolipa Sana Mtandaoni"
          copy="Kutoka kwa wataalamu wa teknolojia Tanzania — Mwaka 2026 ni mwaka wako wa kupata pesa kupitia skills za teknolojia."
        />

        {/* Courses List */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 16 : 32,
            marginBottom: isMobile ? 30 : 80,
          }}
        >
          {coursesLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} />)
          ) : courses.length > 0 ? (
            courses.map((c, i) => (
              <CourseListItem key={c.id || i} c={c} goPage={goPage} />
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna Courses kwa sasa" 
                message="Tunatayarisha masomo mapya ya kusisimua. Kaa tayari!"
                actionText="Angalia Deals"
                onAction={() => goPage("deals")}
              />
            </div>
          )}
        </div>

        {/* Trust Section: Why STEA? */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))",
            gap: isMobile ? 10 : 24,
            marginBottom: isMobile ? 40 : 100,
          }}
        >
          {[
            {
              icon: <Users color={G} size={isMobile ? 18 : 24} />,
              title: "10,000+ Wanafunzi",
              desc: "Jamii kubwa ya teknolojia.",
            },
            {
              icon: <Award color={G} size={isMobile ? 18 : 24} />,
              title: "Vyeti Rasmi",
              desc: "Utambulisho wa ujuzi wako.",
            },
            {
              icon: <ShieldCheck color={G} size={isMobile ? 18 : 24} />,
              title: "Malipo Salama",
              desc: "Yanasimamiwa na STEA.",
            },
            {
              icon: <Zap color={G} size={isMobile ? 18 : 24} />,
              title: "Ujuzi wa Vitendo",
              desc: "Sio nadharia, ni kazi.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: isMobile ? 12 : 32,
                borderRadius: isMobile ? 12 : 24,
                background: "rgba(255,255,255,.02)",
                border: "1px solid rgba(255,255,255,.05)",
                textAlign: "center",
                transition: "transform .3s ease",
              }}
            >
              <div
                style={{
                  width: isMobile ? 36 : 56,
                  height: isMobile ? 36 : 56,
                  borderRadius: isMobile ? 8 : 16,
                  background: "rgba(245,166,35,.08)",
                  display: "grid",
                  placeItems: "center",
                  margin: isMobile ? "0 auto 10px" : "0 auto 20px",
                }}
              >
                {item.icon}
              </div>
              <h4 style={{ fontSize: isMobile ? 12 : 18, fontWeight: 800, marginBottom: isMobile ? 2 : 8 }}>
                {item.title}
              </h4>
              <p
                style={{
                  fontSize: isMobile ? 10 : 14,
                  color: "rgba(255,255,255,.4)",
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </W>
    </section>
  );
}

function DealDetailPage({ deal: d, goPage }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const [content, setContent] = useState(d.fullDescription || "");
  const [loadingContent, setLoadingContent] = useState(!!d.contentFileUrl && !d.fullDescription);
  const hasImage = d && d.imageUrl && !imgError;

  useEffect(() => {
    if (d.contentFileUrl && !d.fullDescription) {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => setLoadingContent(true));
      fetch(d.contentFileUrl)
        .then(res => res.json())
        .then(data => {
            setContent(data);
            setLoadingContent(false);
        })
        .catch(err => {
            console.error("Error fetching content:", err);
            setLoadingContent(false);
        });
    }
  }, [d]);

  if (!d)
    return (
      <div style={{ padding: isMobile ? 40 : 100, textAlign: "center" }}>
        Deal not found.{" "}
        <button onClick={() => goPage("deals")}>Back to Deals</button>
      </div>
    );

  const getCTA = () => {
    if (d.ctaText) return { text: d.ctaText, url: d.directLink || d.affiliateLink || d.whatsappLink };
    if (d.dealType === "affiliate_offer")
      return { text: "Nunua Sasa", url: d.affiliateLink };
    if (d.dealType === "lead_offer")
      return { text: "Ulizia WhatsApp", url: d.whatsappLink };
    if (d.dealType === "promo_code")
      return { text: "Tumia Promo Code", url: d.directLink };
    return { text: "Pata Deal", url: d.directLink };
  };

  const cta = getCTA();
  const features = d.includedFeatures ? d.includedFeatures.split('\n').filter(f => f.trim()) : [];

  return (
    <div style={{ paddingBottom: isMobile ? 60 : 100 }}>
      {/* Hero Section */}
      <section
        style={{
          background: d.bg || "linear-gradient(135deg, #1a1d2e, #0f111a)",
          padding: isMobile ? "30px 0 20px" : "60px 0 40px",
          borderBottom: "1px solid rgba(255,255,255,.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <W>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 64, alignItems: "center" }}>
            {/* Image/Media */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  aspectRatio: "4/3",
                  borderRadius: isMobile ? 16 : 24,
                  overflow: "hidden",
                  background: "rgba(255,255,255,.02)",
                  border: "1px solid rgba(255,255,255,.05)",
                  boxShadow: "0 20px 40px rgba(0,0,0,.3)",
                }}
              >
                {hasImage ? (
                  <img
                    src={d.imageUrl}
                    alt={d.name}
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", height: "100%", objectFit: "contain", background: "rgba(255,255,255,.02)" }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: isMobile ? 48 : 64, opacity: 0.1 }}>
                    🎁
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {d.badge && (
                  <span
                    style={{
                      background: "rgba(245,166,35,.15)",
                      color: G,
                      padding: isMobile ? "2px 8px" : "4px 12px",
                      borderRadius: 20,
                      fontSize: isMobile ? 10 : 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      border: "1px solid rgba(245,166,35,.3)",
                    }}
                  >
                    {d.badge}
                  </span>
                )}
                {d.provider && (
                  <span style={{ color: "rgba(255,255,255,.5)", fontSize: isMobile ? 12 : 14 }}>
                    by {d.provider}
                  </span>
                )}
              </div>
              <h1
                style={{
                  fontSize: isMobile ? 28 : "clamp(32px, 5vw, 48px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  margin: isMobile ? "0 0 12px" : "0 0 20px",
                  letterSpacing: "-.03em",
                }}
              >
                {d.name}
              </h1>
              <p
                style={{
                  fontSize: isMobile ? 15 : 18,
                  color: "rgba(255,255,255,.7)",
                  lineHeight: 1.6,
                  margin: isMobile ? "0 0 20px" : "0 0 30px",
                  maxWidth: 600,
                }}
              >
                {d.description}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: isMobile ? 20 : 30 }}>
                {d.oldPrice && (
                  <span
                    style={{
                      color: "rgba(255,255,255,.4)",
                      textDecoration: "line-through",
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 700,
                    }}
                  >
                    {d.oldPrice}
                  </span>
                )}
                <span style={{ color: G, fontSize: isMobile ? 28 : 36, fontWeight: 900 }}>
                  {d.newPrice}
                </span>
                {d.savingsText && (
                  <span style={{ fontSize: isMobile ? 11 : 14, color: "#00c4cc", fontWeight: 700, background: "rgba(0,196,204,.1)", padding: "4px 10px", borderRadius: 10 }}>
                    {d.savingsText}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: isMobile ? "stretch" : "center", flexWrap: "wrap" }}>
                <GoldBtn
                  onClick={() => window.open(cta.url, "_blank")}
                  style={{ fontSize: isMobile ? 14 : 16, padding: isMobile ? "12px 24px" : "16px 32px" }}
                >
                  {cta.text} →
                </GoldBtn>
                
                {d.promoCode && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: isMobile ? "8px 12px" : "12px 20px",
                      borderRadius: isMobile ? 12 : 16,
                      border: "1px dashed rgba(245,166,35,.3)",
                      background: "rgba(245,166,35,.07)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 1 }}>Promo Code</div>
                      <strong style={{ fontSize: isMobile ? 14 : 18, color: G, letterSpacing: 1 }}>{d.promoCode}</strong>
                    </div>
                    <CopyBtn code={d.promoCode} />
                  </div>
                )}
              </div>

              {/* Trust Elements */}
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 20, marginTop: isMobile ? 20 : 30, flexWrap: "wrap" }}>
                {d.joinedCount && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,.6)" }}>
                    <div style={{ display: "flex", paddingLeft: 10 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: "50%", background: "#2a2d3e", border: "2px solid #1a1d2e", marginLeft: -10, display: "grid", placeItems: "center", fontSize: 10 }}>👤</div>
                      ))}
                    </div>
                    <span>
                      <strong style={{ color: "#fff" }}>{d.joinedCount}+</strong> {d.liveJoinedText || (isMobile ? "joined" : "members joined")}
                      {d.todayJoinedCount && <span style={{ color: G, marginLeft: 6 }}>({d.todayJoinedCount} today)</span>}
                    </span>
                  </div>
                )}
                {d.rating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,.6)" }}>
                    <span style={{ color: G }}>★</span>
                    <strong style={{ color: "#fff" }}>{d.rating}/5</strong> rating
                  </div>
                )}
                {d.urgencyText && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isMobile ? 12 : 14, color: "#ef4444" }}>
                    <span style={{ animation: "pulse 2s infinite" }}>🔥</span>
                    {d.urgencyText}
                  </div>
                )}
              </div>
            </div>
          </div>
        </W>
      </section>

      {/* Content Section */}
      <section style={{ padding: isMobile ? "40px 0" : "60px 0" }}>
        <W>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {(content || loadingContent) && (
                <div style={{ marginBottom: isMobile ? 30 : 40 }}>
                  <h2 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 16 }}>What is this?</h2>
                  <div style={{ color: "rgba(255,255,255,.7)", lineHeight: 1.8, fontSize: isMobile ? 15 : 16, whiteSpace: "pre-wrap" }}>
                    {loadingContent ? "Inapakia maudhui..." : content}
                  </div>
                </div>
              )}

              {d.whyThisDeal && (
                <div style={{ marginBottom: isMobile ? 30 : 40 }}>
                  <h2 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 16 }}>Why should I buy it?</h2>
                  <div style={{ color: "rgba(255,255,255,.7)", lineHeight: 1.8, fontSize: isMobile ? 15 : 16, whiteSpace: "pre-wrap" }}>
                    {d.whyThisDeal}
                  </div>
                </div>
              )}

              {features.length > 0 && (
                <div style={{ marginBottom: isMobile ? 30 : 40 }}>
                  <h2 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 16 }}>What do I get?</h2>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "rgba(255,255,255,.8)", fontSize: isMobile ? 15 : 16, lineHeight: 1.6 }}>
                        <span style={{ color: "#00c4cc", marginTop: 2 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.reviewText && (
                <div style={{ padding: isMobile ? 20 : 30, background: "rgba(255,255,255,.02)", borderRadius: isMobile ? 16 : 20, border: "1px solid rgba(255,255,255,.05)", marginBottom: isMobile ? 30 : 40 }}>
                  <div style={{ color: G, fontSize: 24, marginBottom: 10 }}>&quot;</div>
                  <p style={{ fontSize: isMobile ? 16 : 18, fontStyle: "italic", color: "rgba(255,255,255,.8)", lineHeight: 1.6, margin: 0 }}>
                    {d.reviewText}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div style={{ position: isMobile ? "relative" : "sticky", top: 100 }}>
                <div style={{ padding: isMobile ? 20 : 30, background: "rgba(255,255,255,.02)", borderRadius: isMobile ? 20 : 24, border: "1px solid rgba(255,255,255,.05)" }}>
                  <h3 style={{ fontSize: isMobile ? 18 : 20, marginBottom: 16 }}>Deal Summary</h3>
                  
                  <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.6)", fontSize: isMobile ? 14 : 16 }}>
                      <span>Original Price</span>
                      <span style={{ textDecoration: "line-through" }}>{d.oldPrice || "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.9)", fontWeight: 700, fontSize: isMobile ? 15 : 16 }}>
                      <span>Current Price</span>
                      <span style={{ color: G }}>{d.newPrice || "-"}</span>
                    </div>
                    {d.savingsText && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#00c4cc", fontWeight: 700, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)", fontSize: isMobile ? 15 : 16 }}>
                        <span>You Save</span>
                        <span>{d.savingsText}</span>
                      </div>
                    )}
                  </div>

                  <GoldBtn
                    onClick={() => window.open(cta.url, "_blank")}
                    style={{ width: "100%", padding: isMobile ? "14px" : "16px", fontSize: isMobile ? 15 : 16, justifyContent: "center" }}
                  >
                    {cta.text} →
                  </GoldBtn>

                  {d.terms && (
                    <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,.4)", lineHeight: 1.6, textAlign: "center" }}>
                      {d.terms}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </W>
      </section>
    </div>
  );
}

function CourseDetailPage({ course: c, goPage }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = c && c.imageUrl && !imgError;

  if (!c)
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        Course not found.{" "}
        <button onClick={() => goPage("courses")}>Back to Courses</button>
      </div>
    );

  const isFree =
    c.free ||
    (c.newPrice && c.newPrice.toLowerCase().includes("bure")) ||
    (c.price && c.price.toLowerCase().includes("bure"));
  const ctaText =
    c.cta || (isFree ? "Anza Bure Sasa" : "Jiunge na Kozi Hii Sasa");

  const testimonials = [];
  if (c.testimonial1Text)
    testimonials.push({
      name: c.testimonial1Name || "Mwanafunzi wa STEA",
      role: c.testimonial1Role || "Mwanafunzi",
      text: c.testimonial1Text,
    });
  if (c.testimonial2Text)
    testimonials.push({
      name: c.testimonial2Name || "Mwanafunzi wa STEA",
      role: c.testimonial2Role || "Mwanafunzi",
      text: c.testimonial2Text,
    });
  if (c.testimonial3Text)
    testimonials.push({
      name: c.testimonial3Name || "Mwanafunzi wa STEA",
      role: c.testimonial3Role || "Mwanafunzi",
      text: c.testimonial3Text,
    });

  const faqs = [];
  if (c.faq1Question && c.faq1Answer)
    faqs.push({ q: c.faq1Question, a: c.faq1Answer });
  if (c.faq2Question && c.faq2Answer)
    faqs.push({ q: c.faq2Question, a: c.faq2Answer });
  if (c.faq3Question && c.faq3Answer)
    faqs.push({ q: c.faq3Question, a: c.faq3Answer });

  return (
    <section style={{ padding: isMobile ? "20px 0" : "40px 0" }}>
      <W>
        <button
          onClick={() => goPage("courses")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,.5)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: isMobile ? 24 : 32,
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
          }}
        >
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
          Back to Courses
        </button>

        {/* Hero Section */}
        <div
          className="course-hero"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.2fr",
            gap: isMobile ? 30 : "clamp(30px, 5vw, 60px)",
            marginBottom: isMobile ? 40 : 80,
            alignItems: "start",
          }}
        >
          {/* Left: Image */}
          <div
            className="course-hero-img"
            style={{
              position: "relative",
              borderRadius: isMobile ? 20 : 32,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.1)",
              boxShadow: "0 20px 50px rgba(0,0,0,.5)",
              aspectRatio: isMobile ? "16/9" : "auto",
              background: "rgba(255,255,255,.05)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {hasImage ? (
              <img
                loading="lazy"
                src={c.imageUrl}
                alt={c.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  objectPosition: "center",
                }}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <BookOpen size={isMobile ? 48 : 64} style={{ opacity: 0.1 }} />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(5,6,10,.8), transparent)",
              }}
            />
            {c.badge && (
              <div
                style={{
                  position: "absolute",
                  top: isMobile ? 16 : 24,
                  left: isMobile ? 16 : 24,
                  background: G,
                  color: "#000",
                  padding: isMobile ? "6px 12px" : "8px 16px",
                  borderRadius: isMobile ? 8 : 12,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {c.badge}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="course-hero-info" style={{ padding: isMobile ? "0" : "20px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 8 : 12,
                color: G,
                fontSize: isMobile ? 12 : 14,
                fontWeight: 700,
                marginBottom: isMobile ? 12 : 16,
                flexWrap: "wrap",
              }}
            >
              <Award size={isMobile ? 14 : 16} />
              <span>{c.level || "Beginner"}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <Users size={isMobile ? 14 : 16} />
              <span>{c.studentsCount || "100+"} Wanafunzi</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <Star size={isMobile ? 14 : 16} fill={G} />
              <span>{c.rating || "5.0"}</span>
            </div>

            <h1
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: isMobile ? 32 : "clamp(32px, 5vw, 62px)",
                margin: 0,
                letterSpacing: "-.04em",
                lineHeight: 1.05,
              }}
            >
              {c.title}
            </h1>
            <p
              style={{
                color: G,
                fontSize: isMobile ? 14 : 22,
                fontWeight: 800,
                marginTop: isMobile ? 10 : 14,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {c.shortPromise}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 16 : 24,
                margin: isMobile ? "24px 0" : "36px 0",
              }}
            >
              <div style={{ textAlign: "left" }}>
                {c.oldPrice && (
                  <div
                    style={{
                      fontSize: isMobile ? 16 : 18,
                      color: "rgba(255,255,255,.3)",
                      textDecoration: "line-through",
                      marginBottom: 2,
                      fontWeight: 600,
                    }}
                  >
                    {c.oldPrice}
                  </div>
                )}
                <div
                  style={{
                    fontSize: isMobile ? 42 : 52,
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  {c.newPrice || c.price}
                </div>
              </div>
              {!isMobile && (
                <div
                  style={{
                    width: 1,
                    height: 60,
                    background: "rgba(255,255,255,.15)",
                  }}
                />
              )}
              <div
                style={{
                  fontSize: isMobile ? 13 : 15,
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.6,
                  maxWidth: isMobile ? "100%" : 280,
                  fontWeight: 500,
                }}
              >
                {c.priceDisclaimerShort ||
                  "Lifetime access. Malipo ni salama kupitia mitandao yote ya simu Tanzania."}
              </div>
            </div>

            <p
              style={{
                color: "rgba(255,255,255,.7)",
                fontSize: isMobile ? 15 : 18,
                lineHeight: 1.8,
                marginBottom: isMobile ? 32 : 40,
                maxWidth: 800,
              }}
            >
              {c.desc}
            </p>

            <div style={{ display: "flex", gap: 16, marginBottom: isMobile ? 32 : 48 }}>
              <GoldBtn
                onClick={() =>
                  window.open(
                    `https://wa.me/8619715852043?text=Habari%20STEA%20%F0%9F%91%8B%20Nahitaji%20kujiunga%20na%20kozi%20ya%20${encodeURIComponent(c.title)}`,
                  )
                }
                style={{
                  padding: isMobile ? "16px 24px" : "18px 40px",
                  fontSize: isMobile ? 16 : 18,
                  width: isMobile ? "100%" : "auto",
                  justifyContent: "center",
                  boxShadow: `0 12px 32px ${G}44`,
                }}
              >
                Jiunge na Kozi Hii Sasa →
              </GoldBtn>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr",
                gap: isMobile ? 16 : 32,
                marginBottom: isMobile ? 32 : 48,
              }}
            >
              <div style={{ display: "flex", gap: isMobile ? 10 : 16 }}>
                <div
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 10 : 14,
                    background: "rgba(255,255,255,.05)",
                    display: "grid",
                    placeItems: "center",
                    color: G,
                    flexShrink: 0,
                  }}
                >
                  <Clock size={isMobile ? 20 : 24} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? 10 : 12,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Duration
                  </div>
                  <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700 }}>
                    {c.duration || "4 Weeks"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: isMobile ? 10 : 16 }}>
                <div
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 10 : 14,
                    background: "rgba(255,255,255,.05)",
                    display: "grid",
                    placeItems: "center",
                    color: G,
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={isMobile ? 20 : 24} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? 10 : 12,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Lessons
                  </div>
                  <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700 }}>
                    {c.totalLessons || "12"} Modules
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: isMobile ? 10 : 16 }}>
                <div
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 10 : 14,
                    background: "rgba(255,255,255,.05)",
                    display: "grid",
                    placeItems: "center",
                    color: G,
                    flexShrink: 0,
                  }}
                >
                  <Award size={isMobile ? 20 : 24} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? 10 : 12,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Certificate
                  </div>
                  <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700 }}>
                    {c.certificateIncluded ? "Included" : "Not Included"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: isMobile ? 10 : 16 }}>
                <div
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: isMobile ? 10 : 14,
                    background: "rgba(255,255,255,.05)",
                    display: "grid",
                    placeItems: "center",
                    color: G,
                    flexShrink: 0,
                  }}
                >
                  <Zap size={isMobile ? 20 : 24} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? 10 : 12,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Support
                  </div>
                  <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700 }}>
                    {c.supportType || "WhatsApp"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What you will learn & Suitable For */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 24 : 40,
            marginBottom: isMobile ? 60 : 100,
          }}
        >
          <div
            style={{
              padding: isMobile ? 24 : 40,
              borderRadius: isMobile ? 24 : 32,
              background: "rgba(255,255,255,.02)",
              border: "1px solid rgba(255,255,255,.05)",
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 20 : 22,
                fontWeight: 800,
                marginBottom: isMobile ? 20 : 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${G}22`,
                  display: "grid",
                  placeItems: "center",
                  color: G,
                }}
              >
                <Check size={18} />
              </div>
              Utajifunza Nini:
            </h3>
            <div style={{ display: "grid", gap: isMobile ? 12 : 16 }}>
              {(c.whatYouWillLearn || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: isMobile ? 15 : 16,
                    color: "rgba(255,255,255,.8)",
                    lineHeight: 1.5,
                  }}
                >
                  <Check
                    size={18}
                    color={G}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? 24 : 40,
              borderRadius: isMobile ? 24 : 32,
              background: "rgba(255,255,255,.02)",
              border: "1px solid rgba(255,255,255,.05)",
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 20 : 22,
                fontWeight: 800,
                marginBottom: isMobile ? 20 : 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${G}22`,
                  display: "grid",
                  placeItems: "center",
                  color: G,
                }}
              >
                <Users size={18} />
              </div>
              Inafaa Kwa:
            </h3>
            <div style={{ display: "grid", gap: isMobile ? 12 : 16 }}>
              {(c.suitableFor || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: isMobile ? 15 : 16,
                    color: "rgba(255,255,255,.8)",
                    lineHeight: 1.5,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: G,
                      marginTop: 10,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        {testimonials.length > 0 && (
          <div style={{ marginBottom: isMobile ? 60 : 100 }}>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 50 }}>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: isMobile ? 28 : 36,
                  margin: 0,
                }}
              >
                Student <span style={{ color: G }}>Results</span>
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,.5)",
                  marginTop: 10,
                  fontSize: isMobile ? 14 : 16,
                }}
              >
                Ushuhuda kutoka kwa wanafunzi waliochukua kozi hii.
              </p>
            </div>
            <div
              className="testimonial-grid"
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : `repeat(auto-fit, minmax(320px, 1fr))`,
                gap: isMobile ? 20 : 32,
              }}
            >
              {testimonials.map((t, i) => {
                const initials = t.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={!isMobile ? {
                      y: -8,
                      boxShadow: `0 24px 48px rgba(0,0,0,0.4)`,
                      borderColor: "rgba(245,166,35,0.2)",
                    } : {}}
                    style={{
                      padding: isMobile ? 24 : 40,
                      borderRadius: isMobile ? 24 : 32,
                      background: "rgba(255,255,255,.02)",
                      border: "1px solid rgba(255,255,255,.06)",
                      position: "relative",
                      transition:
                        "all .4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: isMobile ? 20 : 30,
                        right: isMobile ? 24 : 40,
                        opacity: 0.05,
                      }}
                    >
                      <MessageCircle size={isMobile ? 40 : 60} />
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: isMobile ? 16 : 24 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={isMobile ? 14 : 16} fill={G} color={G} />
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: isMobile ? 15 : 18,
                        lineHeight: 1.8,
                        color: "rgba(255,255,255,.85)",
                        marginBottom: isMobile ? 24 : 36,
                        fontStyle: "italic",
                        fontWeight: 500,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      &quot;{t.text}&quot;
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: isMobile ? 44 : 52,
                          height: isMobile ? 44 : 52,
                          borderRadius: isMobile ? 12 : 16,
                          background: `linear-gradient(135deg, ${G}, ${G2})`,
                          color: "#111",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: isMobile ? 16 : 20,
                          boxShadow: `0 8px 16px ${G}33`,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: isMobile ? 15 : 17,
                            color: "#fff",
                          }}
                        >
                          {t.name}
                        </div>
                        <div
                          style={{
                            fontSize: isMobile ? 12 : 13,
                            color: "rgba(255,255,255,.45)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          {t.role || "Student"}
                        </div>
                      </div>
                    </div>
                    {/* Subtle Card Glow */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "100%",
                        height: "100%",
                        background: `radial-gradient(circle at bottom right, ${G}05, transparent 70%)`,
                        borderRadius: 32,
                        pointerEvents: "none",
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <div style={{ maxWidth: 900, margin: isMobile ? "0 auto 60px" : "0 auto 100px" }}>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 50 }}>
              <div
                style={{
                  width: isMobile ? 48 : 64,
                  height: isMobile ? 48 : 64,
                  borderRadius: isMobile ? 16 : 20,
                  background: "rgba(245,166,35,.1)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 20px",
                }}
              >
                <HelpCircle size={isMobile ? 24 : 32} color={G} />
              </div>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: isMobile ? 28 : 36,
                  margin: 0,
                }}
              >
                Maswali <span style={{ color: G }}>mnayouliza sana</span>
              </h2>
              <p style={{ color: "rgba(255,255,255,.5)", marginTop: 10, fontSize: isMobile ? 14 : 16 }}>
                Kila kitu unachohitaji kujua kuhusu kozi hii.
              </p>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {faqs.map((faq, i) => (
                <motion.details
                  key={i}
                  className="faq-item"
                  whileHover={!isMobile ? { scale: 1.01 } : {}}
                  style={{
                    background: "rgba(255,255,255,.02)",
                    border: "1px solid rgba(255,255,255,.06)",
                    borderRadius: isMobile ? 16 : 24,
                    overflow: "hidden",
                    transition:
                      "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  }}
                >
                  <summary
                    style={{
                      padding: isMobile ? "20px 24px" : "28px 36px",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: isMobile ? 16 : 19,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      listStyle: "none",
                      color: "#fff",
                    }}
                  >
                    {faq.q}
                    <div
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        display: "grid",
                        placeItems: "center",
                        transition: "0.3s",
                      }}
                      className="chevron-box"
                    >
                      <ChevronRight
                        size={isMobile ? 16 : 20}
                        className="chevron"
                        style={{ transition: "transform .4s ease" }}
                      />
                    </div>
                  </summary>
                  <div
                    style={{
                      padding: isMobile ? "0 24px 20px" : "0 36px 28px",
                      color: "rgba(255,255,255,.65)",
                      lineHeight: 1.9,
                      fontSize: isMobile ? 14 : 17,
                      fontWeight: 500,
                    }}
                  >
                    {faq.a}
                  </div>
                </motion.details>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA Section */}
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? "40px 24px" : "80px 40px",
            borderRadius: isMobile ? 32 : 40,
            background: `linear-gradient(135deg, ${G}22 0%, transparent 100%)`,
            border: `1px solid ${G}33`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: G,
              filter: "blur(150px)",
              opacity: 0.1,
            }}
          />
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: isMobile ? 32 : 42,
              marginBottom: 16,
              letterSpacing: "-.02em",
            }}
          >
            Uko Tayari <span style={{ color: G }}>Kuanza?</span>
          </h2>
          <p
            style={{
              maxWidth: 600,
              margin: "0 auto 32px",
              color: "rgba(255,255,255,.7)",
              fontSize: isMobile ? 15 : 18,
              lineHeight: 1.6,
            }}
          >
            {c.priceDisclaimerFull}
          </p>
          <GoldBtn
            onClick={() => window.open(getWhatsAppLink(c), "_blank")}
            style={{ 
              padding: isMobile ? "16px 32px" : "20px 56px", 
              fontSize: isMobile ? 18 : 22, 
              borderRadius: isMobile ? 16 : 20,
              width: isMobile ? "100%" : "auto",
              justifyContent: "center"
            }}
          >
            {ctaText} →
          </GoldBtn>
        </div>
      </W>
      <style>{`
        .faq-item[open] { background: rgba(255,255,255,.04) !important; border-color: ${G}33 !important; }
        .faq-item[open] .chevron { transform: rotate(90deg); color: ${G}; }
        .faq-item summary::-webkit-details-marker { display: none; }
      `}</style>
    </section>
  );
}

function ProductCard({ p }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = (p.image || p.imageUrl) && !imgError;

  const getCTA = () => {
    if (p.monetizationType === "affiliate")
      return { text: "Nunua Sasa", url: p.affiliateLink };
    if (p.monetizationType === "manual_lead")
      return { text: "Ulizia WhatsApp", url: p.whatsappLink };
    if (p.monetizationType === "hybrid")
      return { text: "Nunua Sasa", url: p.affiliateLink || p.whatsappLink };
    return { text: "Tazama Bidhaa", url: p.url };
  };

  const cta = getCTA();

  return (
    <TiltCard>
      <div
        style={{
          aspectRatio: "16/9",
          position: "relative",
          background: "rgba(255,255,255,.03)",
          overflow: "hidden",
        }}
      >
        {hasImage && (
          <img
            loading="lazy"
            src={p.image || p.imageUrl}
            alt={p.title || p.name}
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
            onError={() => setImgError(true)}
          />
        )}
        {p.badge && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? 10 : 14,
              left: isMobile ? 10 : 14,
              borderRadius: 999,
              padding: isMobile ? "4px 8px" : "6px 11px",
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(14,14,22,.75)",
              color: G,
              fontSize: isMobile ? 9 : 11,
              fontWeight: 800,
            }}
          >
            {p.badge}
          </div>
        )}
      </div>
      <div style={{ padding: isMobile ? 12 : 18 }}>
        <h3
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: isMobile ? 15 : 20,
            margin: "0 0 6px",
            letterSpacing: "-.03em",
            lineHeight: 1.2,
          }}
        >
          {p.title || p.name}
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,.68)",
            fontSize: isMobile ? 12 : 14,
            lineHeight: 1.5,
            margin: "0 0 10px",
            display: "-webkit-box",
            WebkitLineClamp: isMobile ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {p.description}
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: isMobile ? 10 : 12,
          }}
        >
          <span style={{ color: G, fontSize: isMobile ? 14 : 16, fontWeight: 800 }}>
            {p.price}
          </span>
          {p.oldPrice && (
            <span
              style={{
                color: "rgba(255,255,255,.42)",
                textDecoration: "line-through",
                fontSize: isMobile ? 10 : 13,
              }}
            >
              {p.oldPrice}
            </span>
          )}
        </div>
        {cta.url && (
          <GoldBtn 
            onClick={() => window.open(cta.url, "_blank")}
            style={{
              width: "100%",
              fontSize: isMobile ? 11 : 12,
              padding: isMobile ? "8px 14px" : "10px 18px",
              justifyContent: "center",
            }}
          >
            {cta.text}
          </GoldBtn>
        )}
      </div>
    </TiltCard>
  );
}

function DukaPage({ goPage }) {
  const isMobile = useMobile();
  const { docs: productsDocs, loading: productsLoading } = useCollection("products", "createdAt");
  const products = productsDocs;

  return (
    <section style={{ padding: isMobile ? "24px 0" : "40px 0" }}>
      <W>
        <SHead
          title="Electronics"
          hi="Duka"
          copy="Curated affiliate products na verified deals kwa buyers wa Tanzania."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))",
            gap: isMobile ? 16 : 24,
          }}
        >
          {productsLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((p, i) => <ProductCard key={p.id || i} p={p} />)
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna bidhaa kwenye Duka" 
                message="Duka letu linafanyiwa maboresho. Ofa mpya zinakuja hivi karibuni."
                actionText="Gundua Websites"
                onAction={() => goPage("websites")}
              />
            </div>
          )}
        </div>
      </W>
    </section>
  );
}

function WebsiteCard({ w }) {
  const isMobile = useMobile();
  const [iconError, setIconError] = useState(false);
  const hasIcon = w.iconUrl && !iconError;

  return (
    <TiltCard>
      <Thumb
        bg={w.bg}
        iconUrl={w.iconUrl}
        name={w.title || w.name}
        domain={w.meta}
        imageUrl={w.image || w.imageUrl}
        id={w.id}
      />
      <div
        style={{
          padding: isMobile ? 12 : 20,
          display: "flex",
          gap: isMobile ? 10 : 16,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: isMobile ? 40 : 52,
            height: isMobile ? 40 : 52,
            borderRadius: isMobile ? 10 : 14,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            background: "rgba(245,166,35,.12)",
            color: G,
            fontSize: isMobile ? 18 : 24,
            flexShrink: 0,
          }}
        >
          {hasIcon ? (
            <img
              loading="lazy"
              src={w.iconUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              referrerPolicy="no-referrer"
              onError={() => setIconError(true)}
            />
          ) : (
            <Globe size={isMobile ? 18 : 24} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontSize: isMobile ? 15 : 19,
              margin: "0 0 4px",
              letterSpacing: "-.03em",
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            {w.title || w.name}
          </h3>
          <div
            style={{
              fontSize: isMobile ? 10 : 12,
              color: "rgba(255,255,255,.4)",
              margin: "0 0 8px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap"
            }}
          >
            <span style={{ fontWeight: 600 }}>{w.meta}</span>
            {w.category && (
              <span style={{ 
                background: "rgba(245,166,35,.1)", 
                color: G, 
                padding: "2px 6px", 
                borderRadius: 6, 
                fontSize: 8,
                fontWeight: 800,
                textTransform: "uppercase"
              }}>
                {w.category}
              </span>
            )}
          </div>
          <p
            style={{
              color: "rgba(255,255,255,.68)",
              fontSize: isMobile ? 12 : 14,
              lineHeight: 1.5,
              margin: "0 0 10px",
              display: "-webkit-box",
              WebkitLineClamp: isMobile ? 2 : 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {w.description || w.desc}
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {(w.tags || []).map((t, j) => (
              <span
                key={j}
                style={{
                  color: j === 0 ? G : "#75c5ff",
                  fontSize: isMobile ? 9 : 12,
                  fontWeight: 800,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <GoldBtn
            onClick={() => window.open(w.url, "_blank")}
            style={{ 
              fontSize: isMobile ? 11 : 13, 
              padding: isMobile ? "7px 14px" : "10px 20px",
              width: isMobile ? "100%" : "auto",
              justifyContent: "center"
            }}
          >
            Tembelea →
          </GoldBtn>
        </div>
      </div>
    </TiltCard>
  );
}

function WebsitesPage() {
  const isMobile = useMobile();
  const { docs: websitesDocs, loading: websitesLoading } = useCollection("websites", "createdAt");
  const [activeCategory, setActiveCategory] = useState("All");
  const websites = websitesDocs.filter(w => activeCategory === "All" || w.category === activeCategory);

  const categories = ["All", "Free Movie", "Streaming", "AI Tools", "Learning", "Jobs", "Design", "Business", "Download", "Gaming", "Live TV", "Sports", "Music"];

  return (
    <section style={{ padding: isMobile ? "24px 0" : "40px 0" }}>
      <W>
        <SHead
          title="Websites za Siri"
          hi="🤫"
          copy="Gundua websites za siri ambazo zinaweza kubadilisha namna unavyotumia internet kila siku. Kuanzia kuangalia movies bure 🎬, kujifunza lugha 🌍, kutumia AI tools 🛠, hadi kupata tools za kukusaidia kutatua matatizo mbalimbali 🔍 — hapa utapata gems ambazo watu wengi hawazijui. Jaribu moja tu, utashangaa."
        />
        
        <CategoryTabs categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))",
            gap: isMobile ? 16 : 24,
          }}
        >
          {websitesLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} />)
          ) : websites.length > 0 ? (
            websites.map((w, i) => <WebsiteCard key={w.id || i} w={w} />)
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna Websites kwa sasa" 
                message={`Hatujapata websites kwenye kipengele cha "${activeCategory}" bado. Jaribu kategoria nyingine.`}
                compact
              />
            </div>
          )}
        </div>
      </W>
    </section>
  );
}

// ── Prompt Lab Components ──────────────────────────────
const generatePromptPDF = (p) => {
  const doc = new jsPDF();
  doc.setFillColor(20, 24, 35);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, 210, 25, "F");

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SWAHILITECH ELITE ACADEMY (STEA)", 105, 16, { align: "center" });

  doc.setTextColor(245, 166, 35);
  doc.setFontSize(24);
  doc.text(p.title, 20, 45);

  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text(`Category: ${p.category}`, 20, 53);

  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.5);
  doc.line(20, 60, 190, 60);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("The Prompt:", 20, 75);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(220, 220, 220);
  const splitPrompt = doc.splitTextToSize(`"${p.prompt}"`, 170);
  doc.text(splitPrompt, 20, 85);

  let currentY = 85 + splitPrompt.length * 7;

  if (p.howToUse) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 166, 35);
    doc.text("Step-by-Step Guide:", 20, currentY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    const splitHow = doc.splitTextToSize(p.howToUse, 170);
    doc.text(splitHow, 20, currentY + 25);
  }

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("© 2026 SwahiliTech Elite Academy - Tanzania's Tech Hub", 105, 285, {
    align: "center",
  });

  doc.save(`STEA_Prompt_${p.title.replace(/\s+/g, "_")}.pdf`);
};

function ToolLink({ tool }) {
  const [iconError, setIconError] = useState(false);
  const hasIcon = tool.iconUrl && !iconError;
  let hostname;
  try {
    hostname = new URL(tool.toolUrl).hostname.replace("www.", "");
  } catch {
    hostname = "Tool";
  }

  return (
    <a
      href={tool.toolUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.1)",
        textDecoration: "none",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        transition: ".2s",
      }}
      onMouseEnter={(ev) =>
        (ev.currentTarget.style.background = "rgba(255,255,255,.1)")
      }
      onMouseLeave={(ev) =>
        (ev.currentTarget.style.background = "rgba(255,255,255,.05)")
      }
    >
      {hasIcon ? (
        <img
          loading="lazy"
          src={tool.iconUrl}
          style={{ width: 20, height: 20, borderRadius: 4 }}
          referrerPolicy="no-referrer"
          onError={() => setIconError(true)}
        />
      ) : (
        "🔗"
      )}
      {hostname}
    </a>
  );
}

function PromptModal({ prompt: p, onClose }) {
  const isMobile = useMobile();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = p.imageUrl && !imgError;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(p.prompt);
    setCopied(true);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: [G, G2],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(4,5,9,.94)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 16,
      }}
    >
      <motion.div
        initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
        style={{
          width: isMobile ? "100%" : "min(900px, 100%)",
          borderRadius: isMobile ? "32px 32px 0 0" : 32,
          border: isMobile ? "none" : "1px solid rgba(255,255,255,.12)",
          borderTop: isMobile ? "1px solid rgba(255,255,255,.12)" : "1px solid rgba(255,255,255,.12)",
          background: "rgba(15,18,28,.98)",
          boxShadow: "0 40px 100px rgba(0,0,0,.6)",
          overflow: "hidden",
          maxHeight: isMobile ? "92vh" : "90vh",
          display: "flex",
          flexDirection: isMobile ? "column" : (hasImage ? "row" : "column"),
        }}
      >
        {hasImage && (
          <div
            style={{
              width: isMobile ? "100%" : "clamp(200px, 35%, 320px)",
              aspectRatio: isMobile ? "16/9" : "auto",
              flexShrink: 0,
              background: "rgba(255,255,255,.05)",
              position: "relative",
            }}
          >
            <img
              loading="lazy"
              src={p.imageUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              referrerPolicy="no-referrer"
              alt={p.title}
              onError={() => setImgError(true)}
            />
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(0,0,0,.5)",
                  backdropFilter: "blur(10px)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 10,
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: isMobile ? 24 : 32, flex: 1, overflowY: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: isMobile ? 20 : 24,
            }}
          >
            <div style={{ flex: 1 }}>
              <span
                style={{
                  padding: isMobile ? "4px 10px" : "6px 14px",
                  borderRadius: 99,
                  fontSize: isMobile ? 9 : 11,
                  fontWeight: 900,
                  ...BS.gold,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: isMobile ? 8 : 12,
                  display: "inline-block",
                }}
              >
                {p.category}
              </span>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontSize: isMobile ? 24 : 32,
                  margin: 0,
                  letterSpacing: "-.04em",
                  lineHeight: 1.2,
                }}
              >
                {p.title}
              </h2>
            </div>
            {!isMobile && (
              <button
                onClick={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.05)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
            {isMobile && !hasImage && (
              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.05)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div
            style={{
              background: "rgba(0,0,0,.3)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: isMobile ? 16 : 20,
              padding: isMobile ? 20 : 24,
              marginBottom: isMobile ? 24 : 28,
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 10 : 12,
                fontWeight: 800,
                color: G,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              The Prompt
            </div>
            <p
              style={{
                color: "#fff",
                fontSize: isMobile ? 15 : 16,
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {p.prompt}
            </p>
          </div>

          {p.howToUse && (
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <div
                style={{
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 800,
                  color: G,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={isMobile ? 16 : 18} /> Jinsi ya Kutumia
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,.7)",
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                  paddingLeft: 12,
                  borderLeft: `2px solid ${G}33`,
                }}
              >
                {p.howToUse}
              </div>
            </div>
          )}

          {p.tools && p.tools.length > 0 && (
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <div
                style={{
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 800,
                  color: G,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                Tools to Use
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {p.tools.map((tool, i) => (
                  <ToolLink key={i} tool={tool} />
                ))}
              </div>
            </div>
          )}

          <div
            style={{ 
              display: "grid", 
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
              gap: 12,
              paddingBottom: isMobile ? 20 : 0
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                height: isMobile ? 50 : 54,
                borderRadius: isMobile ? 14 : 16,
                border: "none",
                background: copied
                  ? "#00C48C"
                  : `linear-gradient(135deg,${G},${G2})`,
                color: "#111",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: ".3s",
                fontSize: isMobile ? 15 : 16,
              }}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}{" "}
              {copied ? "Imenakiliwa!" : "Nakili Prompt"}
            </button>
            <button
              onClick={() => generatePromptPDF(p)}
              style={{
                height: isMobile ? 50 : 54,
                borderRadius: isMobile ? 14 : 16,
                border: "1px solid rgba(255,255,255,.1)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: isMobile ? 15 : 16,
              }}
            >
              <Download size={20} /> Download PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ToolIcon({ tool }) {
  const [iconError, setIconError] = useState(false);
  const hasIcon = tool.iconUrl && !iconError;
  
  const handleClick = (e) => {
    if (tool.toolUrl) {
      e.stopPropagation();
      window.open(tool.toolUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      title={tool.toolUrl || tool.name}
      onClick={handleClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.1)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        cursor: tool.toolUrl ? "pointer" : "default",
        transition: ".2s",
      }}
      onMouseEnter={(e) => { if (tool.toolUrl) e.currentTarget.style.borderColor = G; }}
      onMouseLeave={(e) => { if (tool.toolUrl) e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}
    >
      {hasIcon ? (
        <img
          loading="lazy"
          src={tool.iconUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          referrerPolicy="no-referrer"
          onError={() => setIconError(true)}
        />
      ) : (
        <span style={{ fontSize: 12 }}>🔗</span>
      )}
    </div>
  );
}

function PromptCard({ p, setSel, handleCopy, copiedId }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = (p.image || p.imageUrl) && !imgError;

  return (
    <TiltCard
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "rgba(255,255,255,.03)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          overflow: "hidden",
        }}
      >
        {hasImage && (
          <img
            loading="lazy"
            src={p.image || p.imageUrl}
            alt={p.title}
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
            }}
            onError={() => setImgError(true)}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent, rgba(0,0,0,.4))",
          }}
        />
        <div style={{ position: "absolute", top: isMobile ? 10 : 14, left: isMobile ? 10 : 14, zIndex: 2 }}>
          <span
            style={{
              padding: isMobile ? "4px 10px" : "5px 12px",
              borderRadius: 99,
              fontSize: isMobile ? 9 : 10,
              fontWeight: 900,
              ...BS.gold,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {p.category}
          </span>
        </div>
      </div>
      <div
        style={{
          padding: isMobile ? 14 : 24,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          position: "relative",
          zIndex: 1,
        }}
      >
        <h3
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: isMobile ? 16 : 20,
            margin: isMobile ? "0 0 8px" : "0 0 12px",
            letterSpacing: "-.02em",
            lineHeight: 1.3,
          }}
        >
          {p.title}
        </h3>

        <div
          style={{
            flex: 1,
            background: "rgba(0,0,0,.2)",
            borderRadius: isMobile ? 10 : 14,
            padding: isMobile ? 10 : 16,
            marginBottom: isMobile ? 12 : 16,
            border: "1px solid rgba(255,255,255,.04)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,.6)",
              fontSize: isMobile ? 12 : 14,
              lineHeight: 1.5,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            &quot;{p.description || p.prompt}&quot;
          </p>
        </div>

        {p.tools && p.tools.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: isMobile ? 12 : 16,
              flexWrap: "wrap",
            }}
          >
            {p.tools.map((tool, i) => (
              <ToolIcon key={i} tool={tool} />
            ))}
          </div>
        )}

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 8 : 10 }}
        >
          <button
            onClick={() => handleCopy(p.description || p.prompt, p.id)}
            style={{
              padding: isMobile ? "8px 10px" : "10px 16px",
              borderRadius: isMobile ? 10 : 12,
              background: copiedId === p.id ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.05)",
              border: `1px solid ${copiedId === p.id ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.1)"}`,
              color: copiedId === p.id ? "#4ade80" : "#fff",
              fontSize: isMobile ? 11 : 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: ".2s",
            }}
          >
            {copiedId === p.id ? <Check size={isMobile ? 14 : 14} /> : <Copy size={isMobile ? 14 : 14} />}
            {copiedId === p.id ? "Copied" : "Copy"}
          </button>
          <GoldBtn
            onClick={() => setSel(p)}
            style={{
              padding: isMobile ? "8px 10px" : "10px 16px",
              fontSize: isMobile ? 11 : 12,
              justifyContent: "center",
            }}
          >
            Details →
          </GoldBtn>
        </div>
        <button
          onClick={() => generatePromptPDF(p)}
          style={{
            width: "100%",
            marginTop: isMobile ? 10 : 12,
            height: isMobile ? 36 : 40,
            borderRadius: isMobile ? 10 : 12,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,.4)",
            fontSize: isMobile ? 10 : 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = G)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,.4)")
          }
        >
          <Download size={14} /> Download PDF Guide
        </button>
      </div>
    </TiltCard>
  );
}

function PromptLabPage() {
  const isMobile = useMobile();
  const { docs: promptsDocs, loading: promptsLoading } = useCollection("prompts", "createdAt");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sel, setSel] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const categories = ["All", "Business", "AI Tools", "Content Creation", "School", "Productivity", "Marketing", "Social Media", "Coding", "Freelancing", "Design"];
  const prompts = promptsDocs.filter(p => activeCategory === "All" || p.category === activeCategory);

  const handleCopy = (txt, id) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
      colors: [G, G2],
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section style={{ padding: isMobile ? "24px 0" : "40px 0" }}>
      <W>
        {sel && <PromptModal prompt={sel} onClose={() => setSel(null)} />}
        <SHead
          title="Prompt"
          hi="Lab"
          copy="Maktaba ya AI Prompts bora zilizojaribiwa kwa Kiswahili. Copy na u-paste kwenye ChatGPT, Gemini au Claude."
        />
        
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#0f111a" }}>
          <CategoryTabs categories={categories} activeCategory={activeCategory} onSelect={(c) => { setActiveCategory(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))",
            gap: isMobile ? 16 : 24,
          }}
        >
          {promptsLoading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} type="prompt" />)
          ) : prompts.length > 0 ? (
            prompts.map((p) => (
              <PromptCard
                key={p.id}
                p={p}
                setSel={setSel}
                handleCopy={handleCopy}
                copiedId={copiedId}
              />
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState 
                title="Hakuna Prompts kwa sasa" 
                message={`Hatujapata prompts kwenye kipengele cha "${activeCategory}" bado. Jaribu kategoria nyingine.`}
                compact
              />
            </div>
          )}
        </div>
      </W>
    </section>
  );
}

// ── Support & Newsletter ──────────────────────────────
// eslint-disable-next-line no-unused-vars
function SupportForm() {
  const isMobile = useMobile();
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "General",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, "support_messages", Date.now().toString()), {
          ...form,
          createdAt: serverTimestamp(),
        });
      }
      setSent(true);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      alert("Samahani, imeshindikana kutuma ujumbe.");
    } finally {
      setLoading(false);
    }
  };

  if (sent)
    return (
      <div style={{ textAlign: "center", padding: isMobile ? "30px 16px" : "40px 20px" }}>
        <div
          style={{
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            borderRadius: "50%",
            background: "rgba(0,196,140,.1)",
            color: "#00C48C",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <Check size={isMobile ? 28 : 32} />
        </div>
        <h3 style={{ fontSize: isMobile ? 20 : 24, marginBottom: 10 }}>Asante!</h3>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: isMobile ? 14 : 16 }}>
          Ujumbe wako umepokelewa. Tutajibu hivi karibuni.
        </p>
        <button
          onClick={() => setSent(false)}
          style={{
            marginTop: 20,
            color: G,
            background: "none",
            border: "none",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: isMobile ? 14 : 16,
          }}
        >
          Tuma ujumbe mwingine
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: isMobile ? 10 : 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 10 : 16 }}>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Jina lako"
          style={{
            height: isMobile ? 44 : 50,
            borderRadius: isMobile ? 10 : 14,
            border: "1px solid rgba(255,255,255,.1)",
            background: "rgba(255,255,255,.05)",
            color: "#fff",
            padding: "0 14px",
            outline: "none",
            fontSize: isMobile ? 13 : 16,
          }}
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email yako"
          style={{
            height: isMobile ? 44 : 50,
            borderRadius: isMobile ? 10 : 14,
            border: "1px solid rgba(255,255,255,.1)",
            background: "rgba(255,255,255,.05)",
            color: "#fff",
            padding: "0 14px",
            outline: "none",
            fontSize: isMobile ? 13 : 16,
          }}
        />
      </div>
      <select
        value={form.topic}
        onChange={(e) => setForm({ ...form, topic: e.target.value })}
        style={{
          height: isMobile ? 44 : 50,
          borderRadius: isMobile ? 10 : 14,
          border: "1px solid rgba(255,255,255,.1)",
          background: "rgba(255,255,255,.05)",
          color: "#fff",
          padding: "0 14px",
          outline: "none",
          fontSize: isMobile ? 13 : 16,
        }}
      >
        <option value="General">General Inquiry</option>
        <option value="Courses">Courses Support</option>
        <option value="Deals">Deals/Affiliate</option>
        <option value="Technical">Technical Issue</option>
      </select>
      <textarea
        required
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder="Ujumbe wako..."
        style={{
          height: isMobile ? 80 : 120,
          borderRadius: isMobile ? 10 : 14,
          border: "1px solid rgba(255,255,255,.1)",
          background: "rgba(255,255,255,.05)",
          color: "#fff",
          padding: "14px",
          outline: "none",
          resize: "none",
          fontSize: isMobile ? 13 : 16,
        }}
      />
      <button
        disabled={loading}
        style={{
          height: isMobile ? 46 : 54,
          borderRadius: isMobile ? 12 : 16,
          border: "none",
          background: `linear-gradient(135deg,${G},${G2})`,
          color: "#111",
          fontWeight: 900,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: isMobile ? 14 : 16,
          transition: ".2s"
        }}
      >
        {loading ? (
          "Inatuma..."
        ) : (
          <>
            <Send size={isMobile ? 14 : 18} /> Tuma Ujumbe
          </>
        )}
      </button>
    </form>
  );
}








// ── Legal & Trust Pages ──────────────────────────────
function CreatorSection({ goPage, siteSettings }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const data = siteSettings?.about_creator || {
    fullName: "Isaya Hans Masika",
    title: "Founder & Developer",
    shortBio: "Tanzanian tech creator na web developer.",
    fullBio: "Isaya Hans Masika ni Tanzanian tech creator na web developer, asili yake ikiwa ni mkoani Mbeya na kwa sasa anaishi nchini China. Anashikilia Shahada ya Uzamili (Bachelor’s Degree) katika Computer Science kutoka Guilin University of Electronic Technology, China. Safari yake ya elimu ilianzia Wazo Hill Primary School, akaendelea Mbezi Beach Secondary School, na baadaye Lugufu Boys Secondary School. Isaya ana shauku kubwa na teknolojia, AI, na kujenga majukwaa ya kidijitali yanayosaidia watu kupata maarifa kwa lugha ya Kiswahili.",
    imageUrl: "/stea-icon.jpg",
    imageAlt: "Isaya Hans Masika",
    contactText: "Contact Creator"
  };

  return (
    <section style={{ padding: isMobile ? "40px 0" : "100px 0", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: isMobile ? "100%" : "80%",
          height: isMobile ? "100%" : "80%",
          background: `radial-gradient(circle, ${G}15, transparent 70%)`,
          filter: "blur(80px)",
          zIndex: -1,
        }}
      />
      <W>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
            gap: isMobile ? 32 : 60,
            alignItems: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : -30, y: isMobile ? 20 : 0 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div
              style={{
                display: "inline-block",
                padding: isMobile ? "3px 10px" : "6px 14px",
                borderRadius: 99,
                background: "rgba(255,209,124,0.1)",
                color: G,
                fontSize: isMobile ? 9 : 12,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: isMobile ? 12 : 20,
              }}
            >
              The Visionary
            </div>
            <h2
              style={{
                fontSize: isMobile ? "28px" : "clamp(32px, 5vw, 48px)",
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: isMobile ? 16 : 24,
                color: "#fff",
                letterSpacing: "-0.03em",
              }}
            >
              About the <span style={{ color: G }}>Creator</span>
            </h2>
            <div
              style={{
                fontSize: isMobile ? 14 : 18,
                lineHeight: isMobile ? 1.6 : 1.8,
                color: "rgba(255,255,255,0.7)",
                display: "grid",
                gap: isMobile ? 12 : 20,
              }}
            >
              <p>
                <strong style={{ color: "#fff", fontSize: isMobile ? 16 : 20 }}>{data.fullName}</strong> {data.shortBio}
              </p>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {data.fullBio}
              </div>
              {data.education && (
                <p style={{ fontSize: isMobile ? 13 : 16 }}>
                  🎓 <strong>Education:</strong> {data.education}
                </p>
              )}
              {data.career && (
                <p style={{ fontSize: isMobile ? 13 : 16 }}>
                  💼 <strong>Career:</strong> {data.career}
                </p>
              )}
              {data.hobbies && (
                <p style={{ fontSize: isMobile ? 13 : 16 }}>
                  🎨 <strong>Interests:</strong> {data.hobbies}
                </p>
              )}
            </div>
            <div style={{ marginTop: isMobile ? 24 : 40 }}>
              <PushBtn onClick={() => {
                if (data.contactLink) window.open(data.contactLink, "_blank");
                else goPage("contact");
              }} style={{ fontSize: isMobile ? 13 : 15, padding: isMobile ? "10px 20px" : "12px 24px" }}>
                ✉️ {data.contactText || "Contact Creator"}
              </PushBtn>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ position: "relative", order: isMobile ? -1 : 0 }}
          >
            {/* Avatar Area */}
            <div
              style={{
                width: "100%",
                maxWidth: isMobile ? 260 : 400,
                margin: "0 auto",
                position: "relative",
              }}
            >
              <div
                style={{
                  aspectRatio: "1/1",
                  borderRadius: isMobile ? 24 : 40,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 20px ${G}10`,
                }}
              >
                {!imgError && data.imageUrl ? (
                  <img
                    src={data.imageUrl}
                    alt={data.imageAlt || data.fullName}
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.9,
                    }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`,
                    }}
                  >
                    <User size={isMobile ? 60 : 120} color={G} strokeWidth={1} opacity={0.3} />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, #0a0b10 0%, transparent 40%)",
                    pointerEvents: "none",
                  }}
                />
                
                {/* Info Overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: isMobile ? 16 : 30,
                    left: isMobile ? 16 : 30,
                    right: isMobile ? 16 : 30,
                    zIndex: 2,
                  }}
                >
                  <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    {data.fullName}
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 14, color: G, fontWeight: 700, letterSpacing: 0.5 }}>
                    {data.title}
                  </div>
                </div>
              </div>

              {/* Decorative Rings */}
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  border: `1px dashed ${G}30`,
                  animation: "spin 30s linear infinite",
                  zIndex: -1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: -20,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${G}20, transparent)`,
                  filter: "blur(20px)",
                  zIndex: -1,
                }}
              />
            </div>
          </motion.div>
        </div>
      </W>
    </section>
  );
}

function AboutPage({ goPage, siteSettings }) {
  const isMobile = useMobile();
  const data = siteSettings?.about_us || {
    title: "Kuhusu",
    hi: "STEA",
    copy: "SwahiliTech Elite Academy (STEA) ni jukwaa namba moja la teknolojia kwa lugha ya Kiswahili.",
    fullDesc: "SwahiliTech Elite Academy (STEA) ni jukwaa la kisasa la teknolojia linalolenga kuwapa Watanzania na Waafrika Mashariki ujuzi wa vitendo. Tunaamini teknolojia ni haki ya kila mtu. Tunatoa elimu rahisi kwa Kiswahili ili uweze kujifunza, kubuni, na kujipatia kipato kupitia ujuzi wa kidijitali.",
    mission: "Kutoa elimu na fursa za tech zinazobadilisha maisha.",
    vision: "Kuwa jukwaa namba moja la tech kwa Kiswahili Afrika."
  };

  return (
    <div style={{ background: "#0a0b10" }}>
      <section style={{ padding: isMobile ? "40px 0 30px" : "100px 0 60px" }}>
        <W>
          <SHead
            title={data.title || "Kuhusu"}
            hi={data.hi || "STEA"}
            copy={data.copy || data.shortDesc || "SwahiliTech Elite Academy (STEA) ni jukwaa namba moja la teknolojia kwa lugha ya Kiswahili."}
          />
          <div
            style={{
              maxWidth: 800,
              margin: isMobile ? "20px auto 0" : "40px auto 0",
              color: "rgba(255,255,255,.7)",
              lineHeight: isMobile ? 1.6 : 1.9,
              fontSize: isMobile ? 15 : 18,
              display: "grid",
              gap: isMobile ? 16 : 24,
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>
              {data.fullDesc}
            </div>
            
            <div style={{ 
              background: "rgba(255,255,255,0.03)", 
              padding: isMobile ? 20 : 40, 
              borderRadius: isMobile ? 20 : 32, 
              border: "1px solid rgba(255,255,255,0.06)",
              marginTop: isMobile ? 20 : 40
            }}>
              <h3 style={{ color: "#fff", fontSize: isMobile ? 18 : 24, fontWeight: 900, marginBottom: isMobile ? 14 : 24 }}>
                Tunachotoa
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: isMobile ? 10 : 20 }}>
                {[
                  "Kozi za Tech na AI",
                  "Tech Tips",
                  "Prompt Lab",
                  "Deals na Duka la Tech",
                  "Websites za Earning"
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: G }} />
                    <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 16 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: isMobile ? 20 : 40, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: isMobile ? 20 : 32 }}>
              <div>
                <h3 style={{ color: G, fontSize: isMobile ? 11 : 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Vision</h3>
                <p style={{ fontSize: isMobile ? 16 : 20, color: "#fff", fontWeight: 700 }}>{data.vision}</p>
              </div>
              <div>
                <h3 style={{ color: G, fontSize: isMobile ? 11 : 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Mission</h3>
                <p style={{ fontSize: isMobile ? 16 : 20, color: "#fff", fontWeight: 700 }}>{data.mission}</p>
              </div>
            </div>

            {data.btnText && (
              <div style={{ textAlign: "center", marginTop: isMobile ? 24 : 40 }}>
                <PushBtn onClick={() => {
                  if (data.btnLink?.startsWith("http")) window.open(data.btnLink, "_blank");
                  else goPage(data.btnLink || "home");
                }} style={{ fontSize: isMobile ? 13 : 15, padding: isMobile ? "10px 20px" : "12px 24px" }}>
                  {data.btnText}
                </PushBtn>
              </div>
            )}
          </div>
        </W>
      </section>
    </div>
  );
}

function CreatorPage({ goPage, siteSettings }) {
  return (
    <div style={{ padding: "20px 0" }}>
      <CreatorSection goPage={goPage} siteSettings={siteSettings} />
    </div>
  );
}

function ContactPage({ siteSettings }) {
  const isMobile = useMobile();
  const data = siteSettings?.contact_info || {
    title: "Wasiliana",
    hi: "Nasi",
    copy: "Je, una swali au unahitaji msaada? Tupo hapa kukusaidia.",
    email: "swahilitecheliteacademy@gmail.com",
    whatsapp: "8619715852043"
  };

  return (
    <section style={{ padding: isMobile ? "30px 0" : "60px 0" }}>
      <W>
        <SHead
          title={data.title || "Wasiliana"}
          hi={data.hi || "Nasi"}
          copy={data.copy || "Je, una swali au unahitaji msaada? Tupo hapa kukusaidia."}
        />
        <div style={{ display: "grid", gap: isMobile ? 20 : 32, marginTop: isMobile ? 24 : 40 }}>
          <div>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <div
                style={{
                  color: G,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  fontSize: isMobile ? 9 : 12,
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                Email
              </div>
              <div style={{ fontSize: isMobile ? 15 : 18, color: "#fff", wordBreak: "break-all" }}>
                {data.email}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: G,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  fontSize: isMobile ? 9 : 12,
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                WhatsApp
              </div>
              <a
                href={`https://wa.me/${data.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: isMobile ? 15 : 18,
                  color: "#25d366",
                  textDecoration: "none",
                }}
              >
                Wasiliana nasi hapa
              </a>
            </div>
          </div>
        </div>
      </W>
    </section>
  );
}

function FAQPage({ faqs: remoteFaqs }) {
  const [openIndex, setOpenIndex] = useState(null);
  const defaultFaqs = [
    {
      q: "STEA ni nini?",
      a: "Ni jukwaa la elimu ya teknolojia na fursa za kidijitali kwa Kiswahili.",
    },
    {
      q: "Nani anaweza kujiunga?",
      a: "Kila mtu! Vijana, wajasiriamali, na yeyote anayetaka kujifunza tech.",
    },
    {
      q: "Kozi zenu zinafundishwa kwa lugha gani?",
      a: "Tunafundisha kwa Kiswahili rahisi ili kila mtu aelewe.",
    },
    {
      q: "Je, ninaweza kupata kipato kupitia STEA?",
      a: "Ndiyo, tunakupa ujuzi na fursa za kuanza kujipatia kipato mtandaoni.",
    },
    {
      q: "Je, huduma zenu ni za bure?",
      a: "Tuna huduma za bure na kozi za kulipia ili kukuza ujuzi wako kwa kina.",
    },
    {
      q: "Ninawezaje kupata msaada?",
      a: "Wasiliana nasi kupitia WhatsApp au Email wakati wowote.",
    },
  ];

  const displayFaqs = remoteFaqs?.length > 0 ? remoteFaqs : defaultFaqs;

  return (
    <div style={{ background: "#0a0b10", minHeight: "100vh", padding: "100px 0" }}>
      <W>
        <SHead
          title="Maswali"
          hi="Yanayoulizwa"
          copy="Pata majibu ya maswali yanayoulizwa mara kwa mara kuhusu STEA."
        />
        <div style={{ maxWidth: 800, margin: "60px auto 0", display: "grid", gap: 16 }}>
          {displayFaqs.map((f, i) => (
            <div
              key={i}
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                transition: "0.3s"
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  width: "100%",
                  padding: "24px 30px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#fff"
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700 }}>{f.question || f.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  style={{ color: G }}
                >
                  <HelpCircle size={24} />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div style={{ padding: "0 30px 30px", color: "rgba(255,255,255,0.6)", lineHeight: 1.8, fontSize: 16 }}>
                      {f.answer || f.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </W>
    </div>
  );
}

function PrivacyPage() {
  return (
    <section style={{ padding: "60px 0" }}>
      <W>
        <SHead title="Privacy" hi="Policy" copy="Sera yetu ya faragha." />
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.8,
          }}
        >
          <p>
            Tunathamini faragha yako. STEA inakusanya taarifa muhimu tu ili
            kuboresha huduma zetu. Hatutashiriki taarifa zako na watu wengine
            bila idhini yako. Data yako iko salama nasi.
          </p>
        </div>
      </W>
    </section>
  );
}

function TermsPage() {
  return (
    <section style={{ padding: "60px 0" }}>
      <W>
        <SHead
          title="Terms"
          hi="of Use"
          copy="Masharti ya matumizi ya jukwaa la STEA."
        />
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.8,
          }}
        >
          <p>
            Kwa kutumia STEA, unakubaliana na masharti yetu. Tunajitahidi kutoa
            elimu bora, lakini tunatarajia watumiaji wetu watumie jukwaa hili
            kwa heshima na kwa malengo ya kimaendeleo. Hatuhusiki na matumizi
            mabaya ya ujuzi unaopata.
          </p>
        </div>
      </W>
    </section>
  );
}
const getWhatsAppLink = (course) => {
  const number = course.adminWhatsAppNumber || "8619715852043";
  const price = course.newPrice || course.price || "Bure";
  const defaultMsg = `Habari STEA, nataka kujiunga na kozi ya: ${course.title} yenye bei ya ${price}.\n\nNaomba maelekezo ya jinsi ya kuanza na utaratibu wa malipo.`;
  const msg = course.customWhatsAppMessageTemplate || defaultMsg;
  return `https://wa.me/${number.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`;
};

const CourseCard = ({ item, goPage }) => {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = (item.image || item.imageUrl) && !imgError;
  return (
    <TiltCard style={{ overflow: "hidden" }}>
      <div
        onClick={() => goPage && goPage("course-detail", item)}
        style={{ cursor: "pointer" }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16/9",
            overflow: "hidden",
            background: "rgba(255,255,255,.05)",
          }}
        >
          {hasImage ? (
            <img
              src={item.image || item.imageUrl}
              alt={item.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                opacity: 0.1,
              }}
            >
              <BookOpen size={isMobile ? 48 : 64} />
            </div>
          )}
          {item.badge && (
            <div
              style={{
                position: "absolute",
                top: isMobile ? 10 : 12,
                left: isMobile ? 10 : 12,
                background: G,
                color: "#000",
                padding: isMobile ? "3px 8px" : "4px 10px",
                borderRadius: 6,
                fontSize: isMobile ? 9 : 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 1,
                zIndex: 2,
              }}
            >
              {item.badge}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              top: isMobile ? 10 : 12,
              right: isMobile ? 10 : 12,
              background: "rgba(0,0,0,.6)",
              backdropFilter: "blur(4px)",
              padding: isMobile ? "3px 8px" : "4px 10px",
              borderRadius: 8,
              fontSize: isMobile ? 10 : 12,
              fontWeight: 700,
              color: "#fff",
              border: "1px solid rgba(255,255,255,.2)",
              zIndex: 2,
            }}
          >
            {item.level || "All Levels"}
          </div>
        </div>
        <div style={{ padding: isMobile ? 12 : 20, position: "relative", marginTop: isMobile ? -10 : -20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: G,
              fontSize: isMobile ? 10 : 12,
              fontWeight: 700,
              marginBottom: isMobile ? 6 : 8,
            }}
          >
            <Star size={isMobile ? 10 : 14} fill={G} />
            <span>{item.rating || "5.0"}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>{item.studentsCount || "100+"} Students</span>
          </div>
          <h4
            style={{
              fontSize: isMobile ? 15 : 18,
              fontWeight: 800,
              margin: "0 0 6px",
              letterSpacing: "-.02em",
              lineHeight: 1.2,
            }}
          >
            {item.title}
          </h4>
          <p
            style={{
              fontSize: isMobile ? 11 : 13,
              color: "rgba(255,255,255,.5)",
              lineHeight: 1.5,
              margin: "0 0 12px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.description}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginTop: "auto",
              paddingTop: isMobile ? 10 : 12,
              borderTop: "1px solid rgba(255,255,255,.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, color: G }}>
                {item.price}
              </span>
              {item.oldPrice && (
                <span style={{ fontSize: isMobile ? 10 : 12, color: "rgba(255,255,255,.3)", textDecoration: "line-through" }}>
                  {item.oldPrice}
                </span>
              )}
            </div>
            <div style={{ fontSize: isMobile ? 9 : 11, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
              {item.duration || "10+ hrs"}
            </div>
          </div>
        </div>
      </div>
    </TiltCard>
  );
};

function FeaturedDeal({ featuredDeal, goPage }) {
  const isMobile = useMobile();
  const [imgError, setImgError] = useState(false);
  const hasImage = featuredDeal.imageUrl && !imgError;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: isMobile ? 10 : 16 }}>
      <h2
        style={{
          fontSize: isMobile ? 12 : 18,
          color: "rgba(255,255,255,.5)",
          textTransform: "uppercase",
          letterSpacing: 2,
          fontWeight: 800,
        }}
      >
        Hot Deal
      </h2>
      <TiltCard
        onClick={() => goPage && goPage("deal-detail", featuredDeal)}
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          background:
            "linear-gradient(135deg,rgba(245,166,35,.1),rgba(255,255,255,.02))",
          cursor: "pointer",
          borderRadius: isMobile ? 16 : 24,
        }}
      >
        <div className="flex flex-col md:flex-row w-full h-full">
          <div
            className="w-full md:w-2/5 relative shrink-0 aspect-[16/9] md:aspect-auto"
            style={{
              background: "rgba(255,255,255,.05)",
            }}
          >
            {hasImage && (
              <img
                loading="lazy"
                src={featuredDeal.imageUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  inset: 0,
                }}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            )}
          </div>
          <div
            className="w-full md:w-3/5 p-4 md:p-6 flex flex-col"
          >
            <span
              style={{
                color: G,
                fontWeight: 900,
                fontSize: isMobile ? 9 : 10,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {featuredDeal.badge}
            </span>
            <h3 style={{ fontSize: isMobile ? 18 : 20, margin: isMobile ? "4px 0 8px" : "8px 0 12px", fontWeight: 800, lineHeight: 1.2 }}>
              {featuredDeal.name}
            </h3>
            <div
              style={{
                fontSize: isMobile ? 20 : 24,
                fontWeight: 900,
                color: G,
                marginBottom: isMobile ? 12 : 16,
              }}
            >
              {featuredDeal.newPrice}
            </div>
            <div style={{ marginTop: "auto" }} className="w-full">
              <GoldBtn
                className="w-full flex justify-center items-center"
                onClick={(e) => {
                  if (!goPage) {
                    window.open(
                      featuredDeal.affiliateLink ||
                        featuredDeal.directLink ||
                        featuredDeal.whatsappLink,
                      "_blank",
                    );
                  } else {
                    e.stopPropagation();
                    goPage("deal-detail", featuredDeal);
                  }
                }}
                style={{ fontSize: isMobile ? 12 : 12, padding: isMobile ? "10px 16px" : "10px 20px", justifyContent: "center" }}
              >
                {featuredDeal.ctaText || "Buy Now"} →
              </GoldBtn>
            </div>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}

const WhatsAppCTA = ({ link }) => {
  const isMobile = useMobile();
  return (
    <div 
      style={{
        marginTop: isMobile ? 32 : 48,
        padding: isMobile ? "20px" : "clamp(24px, 5vw, 40px)",
        borderRadius: isMobile ? 20 : 24,
        border: "1px solid rgba(34, 197, 94, 0.2)",
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02))",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{
        position: "absolute",
        top: -20,
        right: -20,
        opacity: 0.05,
        transform: "rotate(15deg)"
      }}>
        <MessageCircle size={isMobile ? 120 : 180} color="#22c55e" />
      </div>
      
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: isMobile ? "3px 8px" : "6px 12px",
          borderRadius: 99,
          background: "rgba(34, 197, 94, 0.1)",
          color: "#22c55e",
          fontSize: isMobile ? 9 : 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: isMobile ? 10 : 16
        }}>
          <MessageCircle size={isMobile ? 10 : 14} />
          WhatsApp Community
        </div>
        
        <h3 style={{
          fontSize: isMobile ? 18 : 28,
          fontWeight: 900,
          color: "#fff",
          marginBottom: isMobile ? 6 : 12,
          letterSpacing: "-0.02em"
        }}>
          Jiunge na Jamii yetu ya WhatsApp
        </h3>
        
        <p style={{
          fontSize: isMobile ? 13 : 16,
          color: "rgba(255, 255, 255, 0.6)",
          lineHeight: 1.5,
          marginBottom: isMobile ? 16 : 24,
          maxWidth: 500
        }}>
          Pata taarifa za haraka kuhusu fursa mpya, deals za moto, na mafunzo ya AI moja kwa moja kwenye simu yako.
        </p>
        
        <button
          onClick={() => window.open(link || "https://chat.whatsapp.com/your-link", "_blank")}
          style={{
            background: "#22c55e",
            color: "#fff",
            border: "none",
            padding: isMobile ? "8px 16px" : "12px 28px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: isMobile ? 12 : 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: ".2s"
          }}
        >
          Jiunge Sasa <ChevronRight size={isMobile ? 14 : 18} />
        </button>
      </div>
    </div>
  );
};

function HomePage({ goPage, settings = {} }) {
  const isMobile = useMobile();
  const { docs: tips, loading: tipsLoading } = useCollection(
    "tips",
    "createdAt",
    6
  );
  const { docs: deals, loading: dealsLoading } = useCollection("deals", "createdAt", 6);
  const { docs: products, loading: productsLoading } = useCollection("products", "createdAt", 6);
  const { docs: courses, loading: coursesLoading } = useCollection("courses", "createdAt", 6);
  const { docs: prompts, loading: promptsLoading } = useCollection(
    "prompts",
    "createdAt",
    6
  );
  const { docs: websites, loading: websitesLoading } = useCollection("websites", "createdAt", 6);

  const [art, setArt] = useState(null);
  const [vid, setVid] = useState(null);
  const [imgError, setImgError] = useState(false);

  const featuredPrompt = prompts.length > 0 ? prompts[0] : null;
  const featuredDeal = deals.length > 0 ? deals[0] : null;

  // Relaxed filtering: If it's in the 'tips' collection, it's a tip.
  const featuredTips = tips.slice(0, 3);

  const featuredCourses = courses.length > 0 ? courses.slice(0, 3) : [];

  return (
    <section style={{ padding: isMobile ? "12px 0 10px" : "22px 0 16px" }}>
      <W>
        {art && (
          <ArticleModal
            article={art}
            onClose={() => setArt(null)}
            collection="tips"
          />
        )}
        {vid && (
          <VideoModal
            video={vid}
            onClose={() => setVid(null)}
            collection="tips"
          />
        )}

        {/* Hero Section */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isMobile ? 20 : 30,
            border: "1px solid rgba(255,255,255,.07)",
            padding: isMobile 
              ? "32px 20px 36px" 
              : "clamp(30px,5vw,62px) clamp(20px,4vw,52px) clamp(36px,5vw,54px)",
            background:
              "radial-gradient(circle at 18% 22%,rgba(245,166,35,.12),transparent 30%),radial-gradient(circle at 78% 28%,rgba(86,183,255,.12),transparent 35%),radial-gradient(circle at 50% 50%,rgba(147,51,234,.08),transparent 50%),linear-gradient(135deg,#05060a,#090b12,#05060a)",
            boxShadow: "0 28px 80px rgba(0,0,0,.6)",
          }}
        >
          <StarCanvas />
          <EarthHero />

          <div
            style={{
              position: "absolute",
              bottom: -20,
              left: 0,
              right: 0,
              height: "35%",
              background:
                "url('https://www.transparenttextures.com/patterns/dark-matter.png'), linear-gradient(to top, rgba(255,255,255,0.08), transparent)",
              opacity: 0.5,
              pointerEvents: "none",
              zIndex: 1,
              maskImage: "linear-gradient(to top, black 20%, transparent 90%)",
              WebkitMaskImage:
                "linear-gradient(to top, black 20%, transparent 90%)",
            }}
          />

          <div style={{ position: "relative", zIndex: 2, maxWidth: 760 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: isMobile ? "6px 12px" : "8px 16px",
                border: "1px solid rgba(245,166,35,.22)",
                background: "rgba(245,166,35,.08)",
                color: G,
                fontSize: isMobile ? 9 : 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: isMobile ? 14 : 18,
              }}
            >
              🚀 STEA · Learn · Build · Grow · Tanzania
            </div>
            <h1
              style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: isMobile ? 42 : "clamp(46px,7vw,106px)",
                lineHeight: isMobile ? 0.95 : 0.88,
                letterSpacing: "-.07em",
                margin: isMobile ? "0 0 10px" : "0 0 14px",
              }}
            >
              <span style={{ display: "block" }}>
                {settings.hero?.title1 || "SwahiliTech"}
              </span>
              <span
                style={{
                  display: "block",
                  background: `linear-gradient(135deg,${G},${G2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {settings.hero?.title2 || "Elite Academy"}
              </span>
            </h1>
            <div
              style={{
                fontSize: isMobile ? 14 : "clamp(15px,2vw,28px)",
                fontWeight: 800,
                letterSpacing: "-.03em",
                color: "rgba(255,255,255,.86)",
                margin: "0 0 6px",
              }}
            >
              {settings.hero?.topSubtitle || "Teknolojia kwa Kiswahili 🇹🇿"}
            </div>
            <TypedText strings={settings.hero?.typedStrings} />
            <p
              style={{
                maxWidth: 560,
                lineHeight: isMobile ? 1.6 : 1.9,
                color: "rgba(255,255,255,.65)",
                fontSize: isMobile ? 14 : 16,
                margin: isMobile ? "0 0 8px" : "0 0 10px",
                fontWeight: 500,
              }}
            >
              {settings.hero?.subtitle ||
                "STEA inaleta tech tips, deals, electronics, na kozi za kisasa kwa lugha rahisi ya Kiswahili — platform ya kwanza ya tech kwa Watanzania."}
            </p>
            <p
              style={{
                color: G,
                fontSize: isMobile ? 15 : 18,
                fontWeight: 900,
                marginBottom: isMobile ? 20 : 28,
                letterSpacing: "-0.01em",
              }}
            >
              {settings.hero?.quote ||
                "“Mwaka 2026 ni mwaka wako wa kupata pesa kupitia skills za teknolojia.”"}
            </p>
            <div
              style={{
                display: "flex",
                gap: isMobile ? 10 : 14,
                flexWrap: "wrap",
                marginTop: isMobile ? 20 : 28,
                alignItems: "center",
              }}
            >
              <PushBtn onClick={() => goPage("courses")} style={{ padding: isMobile ? "12px 20px" : "14px 26px", fontSize: isMobile ? 14 : 15 }}>
                🎓 Chagua Kozi Yako →
              </PushBtn>
              <button
                onClick={() => goPage("tips")}
                style={{
                  border: "1px solid rgba(255,255,255,.14)",
                  cursor: "pointer",
                  borderRadius: 18,
                  padding: isMobile ? "12px 20px" : "14px 26px",
                  fontWeight: 900,
                  fontSize: isMobile ? 14 : 15,
                  color: "#fff",
                  background: "rgba(255,255,255,.05)",
                  transition: "0.3s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                }
              >
                ⚡ Explore Content
              </button>
            </div>
          </div>
        </div>

        <BannerAd />

        {/* Quick Value Highlights */}
        <div
          id="explore-section"
          style={{
            marginTop: isMobile ? 24 : 40,
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit,minmax(200px,1fr))",
            gap: isMobile ? 10 : 16,
          }}
        >
          {[
            { t: "Tech Tips", d: "Maujanja ya kila siku", p: "tips" },
            { t: "Online Courses", d: "Jifunze skills za tech", p: "courses" },
            { t: "Deals", d: "Ofa na punguzo kali", p: "deals" },
            { t: "Prompt Lab", d: "AI prompts za nguvu", p: "prompts" },
            { t: "Duka", d: "Bidhaa na huduma", p: "duka" },
            { t: "Websites Solutions", d: "Websites bora bure", p: "websites" },
          ].map((h, i) => (
            <div
              key={i}
              onClick={() => goPage(h.p)}
              style={{
                padding: isMobile ? 14 : 20,
                borderRadius: isMobile ? 16 : 20,
                border: "1px solid rgba(255,255,255,.05)",
                background: "rgba(255,255,255,.02)",
                textAlign: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                gridColumn: isMobile && i === 6 ? "span 2" : "auto",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
            >
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, marginBottom: 4 }}>
                {h.t}
              </div>
              <div style={{ fontSize: isMobile ? 11 : 13, color: "rgba(255,255,255,.5)" }}>
                {h.d}
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <WhatsAppCTA link={settings.contact_info?.whatsapp} />

        {/* Featured Tech Tips */}
        {(tipsLoading || featuredTips.length > 0) && (
          <div style={{ marginTop: isMobile ? 40 : 80 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isMobile ? 16 : 24,
                gap: 12,
              }}
            >
              <SHead
                title="Featured"
                hi="Tech Tips"
                copy={isMobile ? null : "Maujanja ya Android, AI na PC kwa Kiswahili."}
              />
              <button
                onClick={() => goPage("tips")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: G,
                  fontWeight: 800,
                  fontSize: isMobile ? 12 : 14,
                  cursor: "pointer",
                  padding: "10px 0",
                  flexShrink: 0,
                }}
              >
                View All →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))",
                gap: isMobile ? 12 : 22,
              }}
            >
              {featuredTips.map((item) =>
                  item.type === "video" ? (
                    <VideoCard
                      key={item.id}
                      item={item}
                      onPlay={setVid}
                      collection="tips"
                    />
                  ) : (
                    <ArticleCard
                      key={item.id}
                      item={item}
                      onRead={setArt}
                      collection="tips"
                    />
                  ),
                )}
            </div>
            <InlineAd index={0} />
          </div>
        )}

        {/* Featured Courses */}
        {(coursesLoading || featuredCourses.length > 0) && (
          <div style={{ marginTop: 80 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 24,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <SHead
                title="Premium"
                hi="Courses"
                copy="Jifunze stadi za kisasa kuanzia mwanzo hadi ubingwa."
              />
              <button
                onClick={() => goPage("courses")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: G,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "10px 0",
                }}
              >
                View All Courses →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
                gap: 24,
              }}
            >
              {coursesLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} />)
              ) : (
                featuredCourses.map((c) => (
                  <CourseCard key={c.id} item={c} goPage={goPage} />
                ))
              )}
            </div>
            <InlineAd index={1} />
          </div>
        )}

        {/* Featured Prompt */}
        <div
          style={{
            marginTop: 80,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 40,
            alignItems: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <span
              style={{
                color: G,
                fontWeight: 900,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 12,
                display: "block",
              }}
            >
              Featured Prompt
            </span>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 38,
                margin: "0 0 16px",
                letterSpacing: "-.04em",
              }}
            >
              Nguvu ya AI mkononi mwako.
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,.6)",
                fontSize: 16,
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Tumia prompts zetu zilizojaribiwa kupata matokeo bora zaidi kutoka
              kwa ChatGPT na Gemini kwa Kiswahili.
            </p>
            <GoldBtn onClick={() => goPage("prompts")}>
              Gundua Prompt Lab <ChevronRight size={18} />
            </GoldBtn>
          </motion.div>
          {promptsLoading ? (
            <Skeleton type="prompt" />
          ) : featuredPrompt ? (
            <TiltCard>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "16/9",
                  background: "rgba(255,255,255,.03)",
                  borderBottom: "1px solid rgba(255,255,255,.07)",
                  overflow: "hidden",
                }}
              >
                {featuredPrompt.imageUrl && !imgError && (
                  <img
                    loading="lazy"
                    src={featuredPrompt.imageUrl}
                    alt={featuredPrompt.title}
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      position: "absolute",
                      inset: 0,
                    }}
                    onError={() => setImgError(true)}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to bottom, transparent, rgba(0,0,0,.4))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 14,
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      padding: "5px 12px",
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 900,
                      ...BS.gold,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {featuredPrompt.category}
                  </span>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque',sans-serif",
                    fontSize: 24,
                    margin: "0 0 12px",
                    letterSpacing: "-.02em",
                    lineHeight: 1.3,
                  }}
                >
                  {featuredPrompt.title}
                </h3>
                <div
                  style={{
                    background: "rgba(0,0,0,.3)",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.05)",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,.6)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 20,
                  }}
                >
                  &quot;{featuredPrompt.prompt.substring(0, 140)}...&quot;
                </div>
                <GoldBtn onClick={() => goPage("prompts")}>
                  Gundua Prompt Lab <ChevronRight size={18} />
                </GoldBtn>
              </div>
            </TiltCard>
          ) : (
            <EmptyState 
              title="Hakuna Featured Prompt" 
              message="Tunaandaa prompts mpya za AI kwa ajili yako."
              compact
            />
          )}
        </div>

        {/* Featured Deal */}
        {dealsLoading ? (
          <div style={{ marginTop: 80 }}><Skeleton /></div>
        ) : featuredDeal ? (
          <div
            style={{
              marginTop: 80,
              background: "rgba(245,166,35,.03)",
              borderRadius: 32,
              border: "1px solid rgba(245,166,35,.1)",
              padding: 40,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div style={{ order: window.innerWidth < 800 ? 2 : 1 }}>
              <span
                style={{
                  color: G,
                  fontWeight: 900,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                  display: "block",
                }}
              >
                Limited Time Deal
              </span>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontSize: 38,
                  margin: "0 0 16px",
                  letterSpacing: "-.04em",
                }}
              >
                Okoa pesa na Tech Deals bora.
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,.6)",
                  fontSize: 16,
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                Tunakuletea ofa kali za vifaa na huduma za tech kutoka vyanzo
                vinavyoaminika Tanzania.
              </p>
              <GoldBtn onClick={() => goPage("deals")}>
                Tazama Deals Zote <ChevronRight size={18} />
              </GoldBtn>
            </div>
            <div style={{ order: window.innerWidth < 800 ? 1 : 2 }}>
              <FeaturedDeal featuredDeal={featuredDeal} goPage={goPage} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 80 }}>
            <EmptyState 
              title="Hakuna Hot Deal kwa sasa" 
              message="Angalia Deals zote zilizopita au rudi baadaye kwa ofa mpya."
              actionText="Angalia Deals Zote"
              onAction={() => goPage("deals")}
            />
          </div>
        )}

        {/* Duka Products */}
        {products.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 24,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <SHead
                title="Shop"
                hi="Duka Products"
                copy="Bidhaa bora za tech kwa bei nafuu."
              />
              <button
                onClick={() => goPage("duka")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: G,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "10px 0",
                }}
              >
                View All Products →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: 22,
              }}
            >
              {productsLoading ? (
                [1, 2, 3, 4].map((i) => <Skeleton key={i} />)
              ) : (
                products.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Websites section */}
        {websites && websites.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 24,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <SHead
                title="Websites"
                hi="STEA Websites Solutions"
                copy="Gundua websites bora na za siri ambazo watu wengi hawazijui..."
              />
              <button
                onClick={() => goPage("websites")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: G,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "10px 0",
                }}
              >
                View All Websites →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                gap: 22,
              }}
            >
              {websitesLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} />)
              ) : (
                websites.slice(0, 3).map((w) => (
                  <WebsiteCard key={w.id} w={w} />
                ))
              )}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 80,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <a
            href="mailto:swahilitecheliteacademy@gmail.com"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 20px",
              borderRadius: 14,
              border: "1px solid rgba(245,166,35,.2)",
              background: "rgba(245,166,35,.07)",
              color: G,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ✉️ Email Us
          </a>
          <a
            href="https://wa.me/8619715852043"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 20px",
              borderRadius: 14,
              border: "1px solid rgba(37,211,102,.2)",
              background: "rgba(37,211,102,.07)",
              color: "#25d366",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            💬 WhatsApp Support
          </a>
        </div>
      </W>
    </section>
  );
}


// ════════════════════════════════════════════════════
// AI ASSISTANT — Global Floating Robot
// ════════════════════════════════════════════════════
function AIAssistant() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="stea-chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              bottom: 88,
              right: 20,
              width: "min(420px, calc(100vw - 24px))",
              height: "min(600px, calc(100vh - 110px))",
              zIndex: 9000,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,166,35,0.15)",
              border: "1px solid rgba(245,166,35,0.15)",
            }}
          >
            <AIChat onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(v => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 20,
          border: "none",
          background: open
            ? "rgba(255,255,255,0.12)"
            : "linear-gradient(135deg, #F5A623, #FFD17C)",
          color: open ? "#fff" : "#111",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9001,
          boxShadow: open
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 28px rgba(245,166,35,0.45), 0 2px 8px rgba(0,0,0,0.3)",
          transition: "background 0.25s, box-shadow 0.25s, color 0.25s",
        }}
        aria-label="STEA AI Assistant"
      >
        {open ? <X size={22} /> : <Bot size={26} />}
      </motion.button>

      {/* Pulse ring */}
      {!open && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 20,
          border: "2px solid rgba(245,166,35,0.35)",
          zIndex: 8999,
          pointerEvents: "none",
          animation: "steaRingPulse 2.5s ease-out infinite",
        }} />
      )}

      <style>{`
        @keyframes steaRingPulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </Portal>
  );
}

// ════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════

export default function App() {
  const isMobile = useMobile();
  const getInitialPage = () => {
    const path = window.location.pathname.replace("/", "");
    return path || "home";
  };
  const [page, setPage] = useState(getInitialPage());
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [scrollPct, setScrollPct] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    initFirebase();
    const db = getFirebaseDb();
    if (!db) return;

    // Sponsored Ads Popup

    // Site Settings
    const unsubs = ["about_us", "about_creator", "contact_info", "stats", "hero"].map(id => 
      onSnapshot(doc(db, "site_settings", id), (snap) => {
        if (snap.exists()) {
          setSiteSettings(prev => ({ ...prev, [id]: snap.data().data }));
        }
      })
    );
    const faqUnsub = onSnapshot(query(collection(db, "faqs"), orderBy("order", "asc")), (snap) => {
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.isActive));
    });
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      if (u) {
        const db = getFirebaseDb();
        let role = "user";
        let extraData = {};
        if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          role = "admin";
        }
        if (db) {
          try {
            const s = await getDoc(doc(db, "users", u.uid));
            if (s.exists()) {
              const data = s.data();
              role = data.role || role;
              extraData = {
                photoURL: data.photoURL || u.photoURL,
                displayName: data.displayName || u.displayName,
              };
            }
          } catch (e) {
            console.error("Error fetching user data:", e);
          }
        }
        setUser({ ...u, role, ...extraData });
      } else {
        setUser(null);
      }
    });
    return () => { 
      unsubs.forEach(u => u()); 
      faqUnsub(); 
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace("/", "");
      setPage(path || "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const fn = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(h > 0 ? (window.scrollY / h) * 100 : 0);
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    console.log("Current User State:", user);
  }, [user]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  const goPage = (p, data = null) => {
    setMobileOpen(false);
    if (p === page && !data) return;
    setTransitioning(true);
    setTimeout(() => {
      if (p === "course-detail" && data) {
        setSelectedCourse(data);
      }
      if (p === "deal-detail" && data) {
        setSelectedDeal(data);
      }
      setPage(p);
      window.history.pushState({}, "", `/${p === "home" ? "" : p}`);
      window.scrollTo(0, 0);
      setMobileOpen(false);
      setTimeout(() => setTransitioning(false), 200);
    }, 150);
  };
  const handleLogout = async () => {
    try {
      await signOut(getFirebaseAuth());
      setUser(null);
      setPage("home");
      setAdminOpen(false);
      setAuthOpen(false);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const PAGES = {
    home: <HomePage goPage={goPage} settings={siteSettings} />,
    tips: <TechContentPage goPage={goPage} />,
    prompts: <PromptLabPage />,
    deals: <DealsPage goPage={goPage} />,
    "deal-detail": (
      <DealDetailPage deal={selectedDeal} goPage={goPage} />
    ),
    courses: <CoursesPage goPage={goPage} />,
    "course-detail": (
      <CourseDetailPage course={selectedCourse} goPage={goPage} />
    ),
    duka: <DukaPage goPage={goPage} />,
    websites: <WebsitesPage />,
    about: <AboutPage goPage={goPage} siteSettings={siteSettings} />,
    creator: <CreatorPage goPage={goPage} siteSettings={siteSettings} />,
    contact: <ContactPage siteSettings={siteSettings} />,
    faq: <FAQPage faqs={faqs} />,
    privacy: <PrivacyPage />,
    terms: <TermsPage />,
  };

  return (
    <>
      <NotificationManager />
      <PopupAd />
      <InstallPrompt />
      <ErrorBoundary>
      {adminOpen ? (
        <div
          style={{
            fontFamily: "'Instrument Sans',system-ui,sans-serif",
            color: "#fff",
            minHeight: "100vh",
            background: "#0a0b0f",
          }}
        >
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:rgba(255,255,255,.28)}textarea::placeholder{color:rgba(255,255,255,.28)}`}</style>
          <AdminPanel user={user} onBack={() => setAdminOpen(false)} />
        </div>
      ) : (
        <div
          style={{
            fontFamily: "'Instrument Sans',system-ui,sans-serif",
            color: "#fff",
            minHeight: "100vh",
            overflowX: "hidden",
            background:
              "radial-gradient(circle at 14% 12%,rgba(245,166,35,.12),transparent 18%),radial-gradient(circle at 84% 22%,rgba(86,183,255,.12),transparent 20%),linear-gradient(180deg,#05060a,#080a11)",
          }}
        >
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes blink{50%{opacity:0}}@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes logoPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,.45)}50%{box-shadow:0 0 0 18px rgba(245,166,35,0)}}@keyframes steaGlow{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}@keyframes steaEntrance{from{opacity:0;transform:scale(0.75)}to{opacity:1;transform:scale(1)}}@keyframes steaPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0px rgba(245,166,35,0))}50%{transform:scale(1.04);filter:drop-shadow(0 0 18px rgba(245,166,35,0.35))}}@keyframes loadBar{0%{width:0%}60%{width:65%}100%{width:100%}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(245,166,35,.28);border-radius:3px}input::placeholder{color:rgba(255,255,255,.28)}a{text-decoration:none;color:inherit}nav::-webkit-scrollbar{display:none}@media(max-width:900px){#desktopNav{display:none!important}}@media(min-width:901px){#hamburger{display:none!important}}.course-list-item{display:flex;flex-direction:column;height:100%}.course-img-container{aspect-ratio:16/9;width:100%;border-bottom:1px solid rgba(255,255,255,.05)}.course-hero{display:grid;grid-template-columns:1fr;gap:30px}.course-hero-img{aspect-ratio:16/9;width:100%}@media(min-width:900px){.course-hero{grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}.course-hero-img{aspect-ratio:16/9}}`}</style>

          <AnimatePresence>
            {transitioning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  background: "rgba(5, 6, 10, 0.4)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    background: `linear-gradient(135deg, ${G}, ${G2})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 40px ${G}44`,
                    marginBottom: 24,
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                  </svg>
                </motion.div>
                <div
                  style={{
                    width: 140,
                    height: 4,
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5 }}
                    style={{ height: "100%", background: G }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 10,
                    fontWeight: 900,
                    color: G,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  }}
                >
                  STEA Loading...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              height: 3,
              width: `${scrollPct}%`,
              zIndex: 400,
              background: `linear-gradient(90deg,${G},${G2})`,
              boxShadow: `0 0 12px rgba(245,166,35,.6)`,
              transition: "width .1s",
              pointerEvents: "none",
            }}
          />

          {/* Ticker */}
          <div
            style={{
              background: `linear-gradient(90deg,${G},${G2})`,
              color: "#111",
              padding: isMobile ? "7px 0" : "9px 0",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: isMobile ? 11 : 13,
              fontWeight: 800,
              userSelect: "none",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                gap: isMobile ? 24 : 32,
                animation: "ticker 26s linear infinite",
              }}
            >
              {[
                "🔥 Tech Tips mpya kila siku",
                "🤖 AI & ChatGPT kwa Kiswahili",
                "📱 Android, iPhone na PC Hacks",
                "🛍️ Deals za Tanzania",
                "🎓 Kozi za STEA kwa M-Pesa",
                "⚡ SwahiliTech Elite Academy — STEA",
                "🔥 Tech Tips mpya kila siku",
                "🤖 AI & ChatGPT kwa Kiswahili",
                "📱 Android, iPhone na PC Hacks",
                "🛍️ Deals za Tanzania",
                "🎓 Kozi za STEA kwa M-Pesa",
                "⚡ SwahiliTech Elite Academy — STEA",
              ].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>

          {/* Topbar */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 300,
              backdropFilter: "blur(20px)",
              background: "rgba(7,8,13,.78)",
              borderBottom: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div
              className="main-container"
              style={{
                minHeight: isMobile ? 64 : 76,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                position: "relative",
              }}
            >
              <div
                onClick={() => goPage("home")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 8 : 10,
                  cursor: "pointer",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                <img 
                  src="/stea-icon.jpg" 
                  alt="STEA Logo" 
                  className="stea-navbar-logo" 
                  referrerPolicy="no-referrer"
                  style={{
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    borderRadius: 8,
                    objectFit: "cover"
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: isMobile ? 16 : 18,
                      lineHeight: 1,
                      letterSpacing: "-.04em",
                      fontWeight: 800,
                    }}
                  >
                    STEA
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: isMobile ? 2 : 3,
                      color: "rgba(255,255,255,.38)",
                      fontSize: isMobile ? 9 : 10,
                      letterSpacing: ".03em",
                    }}
                  >
                    Tanzania&apos;s Tech Platform
                  </span>
                </div>
              </div>

              <nav
                id="desktopNav"
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    alignItems: "center",
                    padding: "5px",
                    border: "1px solid rgba(255,255,255,.07)",
                    background: "rgba(255,255,255,.04)",
                    borderRadius: 999,
                    overflow: "auto",
                    scrollbarWidth: "none",
                  }}
                >
                  {NAV.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => goPage(n.id)}
                      style={{
                        border: "none",
                        background:
                          page === n.id
                            ? `linear-gradient(135deg,${G},${G2})`
                            : "transparent",
                        color: page === n.id ? "#111" : "rgba(255,255,255,.68)",
                        padding: "9px 12px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all .2s",
                        boxShadow:
                          page === n.id
                            ? "0 6px 16px rgba(245,166,35,.18)"
                            : "none",
                      }}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setSearchOpen(true)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.04)",
                    color: "rgba(255,255,255,.65)",
                    cursor: "pointer",
                    fontSize: 19,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  ⌕
                </button>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.08)",
                      background: "rgba(255,255,255,.04)",
                      color: "rgba(255,255,255,.65)",
                      cursor: "pointer",
                      fontSize: 17,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    🔔
                  </button>
                  {notifOpen && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 10px)",
                        width: 290,
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "rgba(14,16,26,.98)",
                        boxShadow: "0 24px 60px rgba(0,0,0,.45)",
                        padding: 12,
                        zIndex: 500,
                      }}
                    >
                      {[
                        {
                          t: "Deal mpya imeingia",
                          b: "Angalia deals zetu mpya.",
                        },
                        {
                          t: "Kozi mpya iko active",
                          b: "AI & ChatGPT Mastery iko tayari.",
                        },
                        {
                          t: "Habari mpya za tech",
                          b: "Angalia Tech Tips za leo.",
                        },
                      ].map((n, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "11px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,.06)",
                            background: "rgba(255,255,255,.04)",
                            marginTop: i > 0 ? 8 : 0,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              marginBottom: 3,
                              fontSize: 14,
                            }}
                          >
                            {n.t}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,.55)",
                              lineHeight: 1.55,
                            }}
                          >
                            {n.b}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {user ? (
                  <UserChip
                    user={user}
                    onLogout={handleLogout}
                    onAdmin={() => setAdminOpen(true)}
                    onProfile={() => setProfileOpen(true)}
                  />
                ) : (
                  <button
                    onClick={() => setAuthOpen(true)}
                    style={{
                      height: 40,
                      padding: "0 16px",
                      borderRadius: 12,
                      border: "none",
                      background: `linear-gradient(135deg,${G},${G2})`,
                      color: "#111",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Login
                  </button>
                )}
                <button
                  id="hamburger"
                  onClick={() => setMobileOpen((v) => !v)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.04)",
                    color: "rgba(255,255,255,.65)",
                    cursor: "pointer",
                    fontSize: 18,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {mobileOpen ? "✕" : "☰"}
                </button>
              </div>

              {mobileOpen && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "calc(100% + 6px)",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(12,14,22,.98)",
                    boxShadow: "0 24px 60px rgba(0,0,0,.5)",
                    padding: 14,
                    zIndex: 400,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 9,
                    }}
                  >
                    {NAV.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => goPage(n.id)}
                        style={{
                          border: "1px solid rgba(255,255,255,.08)",
                          background:
                            page === n.id
                              ? `linear-gradient(135deg,${G},${G2})`
                              : "rgba(255,255,255,.04)",
                          color:
                            page === n.id ? "#111" : "rgba(255,255,255,.68)",
                          borderRadius: 13,
                          padding: "12px 14px",
                          textAlign: "left",
                          fontWeight: 800,
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          {searchOpen && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setSearchOpen(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 600,
                background: "rgba(4,5,9,.84)",
                backdropFilter: "blur(18px)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "88px 16px 20px",
              }}
            >
              <div
                style={{
                  width: "min(680px,100%)",
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(12,14,22,.97)",
                  boxShadow: "0 32px 80px rgba(0,0,0,.55)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: 16 }}>
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search STEA — tips, deals, courses, websites..."
                    style={{
                      width: "100%",
                      height: 52,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.1)",
                      background: "rgba(255,255,255,.05)",
                      color: "#fff",
                      padding: "0 16px",
                      outline: "none",
                      fontSize: 15,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div
                  style={{ padding: "0 16px 16px", display: "grid", gap: 7 }}
                >
                  {NAV.filter(
                    (n) =>
                      !searchQ ||
                      n.label.toLowerCase().includes(searchQ.toLowerCase()),
                  ).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => goPage(n.id)}
                      style={{
                        border: "1px solid rgba(255,255,255,.06)",
                        background: "rgba(255,255,255,.04)",
                        borderRadius: 13,
                        padding: "12px 16px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,.08)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,.04)")
                      }
                    >
                      <strong
                        style={{
                          display: "block",
                          marginBottom: 3,
                          fontSize: 15,
                        }}
                      >
                        {n.label}
                      </strong>
                      <span
                        style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}
                      >
                        STEA — {n.label} section
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {authOpen && (
            <AuthModal
              onClose={() => setAuthOpen(false)}
              onUser={(u) => {
                setUser(u);
                setAuthOpen(false);
              }}
            />
          )}

          <main>{PAGES[page] || PAGES.home}</main>


          {/* Footer */}
          <footer
            style={{
              background: "#05060a",
              borderTop: "1px solid rgba(255,255,255,.06)",
              padding: isMobile ? "40px 0 24px" : "80px 0 40px",
              marginTop: isMobile ? 40 : 100,
            }}
          >
            <W>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(200px,1fr))",
                  gap: isMobile ? 32 : 60,
                  marginBottom: isMobile ? 32 : 60,
                }}
              >
                <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: isMobile ? 16 : 24,
                    }}
                  >
                    <img 
                      src="/stea-icon.jpg" 
                      alt="STEA Logo" 
                      className="stea-footer-logo" 
                      referrerPolicy="no-referrer"
                      style={{ height: isMobile ? 32 : 40, borderRadius: 8 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <p
                    style={{
                      color: "rgba(255,255,255,.5)",
                      lineHeight: 1.8,
                      maxWidth: 380,
                      marginBottom: isMobile ? 24 : 32,
                      fontSize: isMobile ? 13 : 14,
                    }}
                  >
                    {siteSettings.about_us?.shortDesc ||
                      "SwahiliTech Elite Academy (STEA) ni jukwaa namba moja la teknolojia kwa Kiswahili nchini Tanzania. Tunaleta elimu, habari na ofa bora za tech kiganjani mwako."}
                  </p>
                  <div style={{ display: "flex", gap: 12, marginBottom: isMobile ? 24 : 32 }}>
                    {Object.entries(siteSettings.contact_info?.socialLinks || {}).map(
                      ([s, url]) =>
                        url && (
                          <a
                            key={s}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: isMobile ? 36 : 40,
                              height: isMobile ? 36 : 40,
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,.08)",
                              background: "rgba(255,255,255,.04)",
                              display: "grid",
                              placeItems: "center",
                              color: "rgba(255,255,255,.6)",
                              fontSize: isMobile ? 16 : 18,
                            }}
                          >
                            {s === "facebook" && "F"}
                            {s === "instagram" && "I"}
                            {s === "twitter" && "X"}
                            {s === "youtube" && "Y"}
                            {s === "linkedin" && "L"}
                            {s === "tiktok" && "T"}
                          </a>
                        )
                    )}
                  </div>
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: 800,
                      marginBottom: isMobile ? 16 : 24,
                      color: "#fff",
                    }}
                  >
                    Quick Links
                  </h4>
                  <div style={{ display: "grid", gap: 10 }}>
                    {NAV.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => goPage(n.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(255,255,255,.5)",
                          fontSize: isMobile ? 13 : 14,
                          textAlign: "left",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = G)}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "rgba(255,255,255,.5)")
                        }
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: 800,
                      marginBottom: isMobile ? 16 : 24,
                      color: "#fff",
                    }}
                  >
                    Trust & Legal
                  </h4>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { id: "about", l: "About Us" },
                      { id: "creator", l: "About Creator" },
                      { id: "contact", l: "Contact Us" },
                      { id: "faq", l: "FAQ" },
                      { id: "privacy", l: "Privacy Policy" },
                      { id: "terms", l: "Terms of Use" },
                    ].map((l) => (
                      <button
                        key={l.id}
                        onClick={() => goPage(l.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(255,255,255,.5)",
                          fontSize: isMobile ? 13 : 14,
                          textAlign: "left",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = G)}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "rgba(255,255,255,.5)")
                        }
                      >
                        {l.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,.06)",
                  paddingTop: isMobile ? 24 : 40,
                  display: "flex",
                  justifyContent: isMobile ? "center" : "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: isMobile ? 12 : 20,
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>
                  © 2026 SwahiliTech Elite Academy. All rights reserved.
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: isMobile ? 16 : 24,
                    color: "rgba(255,255,255,.3)",
                    fontSize: 12,
                  }}
                >
                  <span>Made with ❤️ in Tanzania</span>
                  <span>v2.5.0 Premium</span>
                </div>
              </div>
            </W>
          </footer>


          {showTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{
                position: "fixed",
                right: 34,
                bottom: 120,
                zIndex: 200,
                width: 50,
                height: 50,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(245,166,35,.3)",
                background: "rgba(12,14,24,.92)",
                color: G,
                cursor: "pointer",
                fontSize: 20,
                boxShadow: "0 8px 24px rgba(0,0,0,.35)",
              }}
            >
              ↑
            </button>
          )}

          {profileOpen && user && (
            <ProfileModal
              user={user}
              onClose={() => setProfileOpen(false)}
              onUpdate={(u) => setUser(u)}
            />
          )}
        </div>
      )}
    </ErrorBoundary>

      {/* AI Assistant — globally mounted, always visible */}
      <AIAssistant />
    </>
  );
}
