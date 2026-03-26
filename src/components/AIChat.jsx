/* global process */
import { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";
import { Send, X, MessageSquare, Phone, ChevronLeft, Sparkles, Bot, Zap } from "lucide-react";

const G = "#F5A623";
const G2 = "#FFD17C";

// ── Typing dots animation ──────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 16px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: G,
          animation: `steaDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes steaDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes steaFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes steaShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes steaFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        .stea-msg { animation: steaFadeUp 0.3s ease forwards; }
        .stea-chat-scroll::-webkit-scrollbar { width: 3px; }
        .stea-chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,166,35,0.2); border-radius: 3px; }
      `}</style>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────
function MsgBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className="stea-msg" style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14,
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0, marginRight: 8, marginTop: 2,
          background: `linear-gradient(135deg, ${G}, ${G2})`,
          display: "grid", placeItems: "center",
        }}>
          <Zap size={14} color="#111" strokeWidth={2.5} />
        </div>
      )}
      <div style={{
        maxWidth: "78%",
        padding: isUser ? "10px 14px" : "12px 16px",
        borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
        background: isUser
          ? `linear-gradient(135deg, ${G}, ${G2})`
          : "rgba(255,255,255,0.07)",
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
        color: isUser ? "#111" : "#fff",
        fontSize: 14,
        lineHeight: 1.65,
        fontWeight: isUser ? 600 : 400,
        wordBreak: "break-word",
        backdropFilter: isUser ? "none" : "blur(10px)",
        boxShadow: isUser
          ? "0 4px 20px rgba(245,166,35,0.25)"
          : "0 2px 12px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <ReactMarkdown
            components={{
              code: ({ children }) => (
                <code style={{
                  background: "rgba(245,166,35,0.12)",
                  color: G,
                  padding: "2px 6px",
                  borderRadius: 5,
                  fontSize: 12,
                  fontFamily: "monospace",
                }}>{children}</code>
              ),
              pre: ({ children }) => (
                <pre style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: 12,
                  overflowX: "auto",
                  fontSize: 12,
                  margin: "8px 0",
                }}>{children}</pre>
              ),
              p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
              ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: "6px 0" }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "6px 0" }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: isUser ? "#111" : G }}>{children}</strong>,
            }}
          >{msg.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────
export default function AIChat({ onClose }) {
  const [view, setView] = useState("home");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (view === "chat") setTimeout(() => inputRef.current?.focus(), 300);
  }, [view]);

  const handleSend = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;

    if (view !== "chat") setView("chat");
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model,
        contents: text,
        config: {
          systemInstruction: `You are STEA AI, a helpful assistant for SwahiliTech Elite Academy (STEA).
STEA was created and is owned by Isaya Hans Masika, a Tanzanian tech creator and web developer originally from Mbeya Region, currently based in China.
Isaya holds a Bachelor's Degree in Computer Science from Guilin University of Electronic Technology, China.
His education background includes Lugufu Boys Secondary School, Mbezi Beach Secondary School, and Wazo Hill Primary School.
He is the 4th born in a family of 6 children and is passionate about technology, website development, and digital tools.
STEA focuses on tech education, AI tools, and digital resources in Kiswahili.
The platform was officially launched recently after Isaya successfully built and deployed multiple working websites.
When asked "Who owns STEA?", always answer clearly: Isaya Hans Masika.
Respond confidently and accurately in Swahili and English. Keep responses concise and helpful.`,
        },
      });

      setMessages(prev => [...prev, { role: "ai", text: response.text }]);
    } catch (err) {
      console.error("[STEA AI]", err);
      setMessages(prev => [...prev, {
        role: "ai",
        text: "Samahani, kuna tatizo limetokea. Tafadhali jaribu tena au wasiliana nasi kupitia WhatsApp.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: "🎓", label: "Courses za STEA", prompt: "Nionyeshe courses zinazopatikana STEA" },
    { icon: "🔥", label: "Deals za leo", prompt: "Kuna deals gani za leo?" },
    { icon: "🌐", label: "Website tools", prompt: "Nisaidie kupata website tools bora" },
    { icon: "💬", label: "Wasiliana nasi", prompt: "Nataka kuwasiliana na STEA moja kwa moja" },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", width: "100%",
      background: "linear-gradient(160deg, #080c18 0%, #0a0e1a 40%, #05060a 100%)",
      borderRadius: 24,
      overflow: "hidden",
      position: "relative",
      fontFamily: "'Instrument Sans', system-ui, sans-serif",
    }}>

      {/* ── Animated background grid ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* ── Glow orbs ── */}
      <div style={{
        position: "absolute", top: -60, right: -60, width: 220, height: 220,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "absolute", bottom: 80, left: -80, width: 260, height: 260,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(86,183,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ── */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {view === "chat" ? (
            <button onClick={() => setView("home")} style={{
              width: 34, height: 34, borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.6)", cursor: "pointer",
              display: "grid", placeItems: "center",
            }}>
              <ChevronLeft size={16} />
            </button>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: `linear-gradient(135deg, ${G}, ${G2})`,
              display: "grid", placeItems: "center",
              boxShadow: `0 0 20px rgba(245,166,35,0.3)`,
              animation: "steaFloat 3s ease-in-out infinite",
            }}>
              <Zap size={20} color="#111" strokeWidth={2.5} />
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
                STEA AI
              </span>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.7)",
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Powered by Gemini • STEA Africa
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.4)", cursor: "pointer",
          display: "grid", placeItems: "center",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* HOME VIEW */}
        {view === "home" && (
          <div style={{ height: "100%", overflowY: "auto", padding: "28px 20px 20px" }} className="stea-chat-scroll">

            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
                background: `linear-gradient(135deg, ${G}, ${G2})`,
                display: "grid", placeItems: "center",
                boxShadow: `0 8px 32px rgba(245,166,35,0.35)`,
              }}>
                <Bot size={28} color="#111" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-.04em" }}>
                Karibu STEA AI! 🇹🇿
              </h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 260, margin: "0 auto" }}>
                Msaidizi wako wa tech kwa Kiswahili. Uliza chochote — nitakusaidia haraka!
              </p>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              <button onClick={() => setView("chat")} style={{
                padding: "14px 18px",
                borderRadius: 16,
                border: "none",
                background: `linear-gradient(135deg, ${G}, ${G2})`,
                color: "#111", fontWeight: 800, fontSize: 14,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: `0 8px 24px rgba(245,166,35,0.3)`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(245,166,35,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 24px rgba(245,166,35,0.3)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: "6px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 9, display: "grid", placeItems: "center" }}>
                    <Sparkles size={16} />
                  </div>
                  <span>Anza Chat na AI</span>
                </div>
                <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
              </button>

              <a href="https://wa.me/255752661307" target="_blank" rel="noopener noreferrer" style={{
                padding: "14px 18px", borderRadius: 16,
                border: "1px solid rgba(37,211,102,0.2)",
                background: "rgba(37,211,102,0.06)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.06)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: "6px 8px", background: "rgba(37,211,102,0.1)", borderRadius: 9, display: "grid", placeItems: "center" }}>
                    <Phone size={16} color="#25D366" />
                  </div>
                  <span>Chat nasi WhatsApp</span>
                </div>
                <ChevronLeft size={16} style={{ transform: "rotate(180deg)", opacity: 0.4 }} />
              </a>
            </div>

            {/* Quick Actions */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 12 }}>
                Maswali ya Haraka
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {quickActions.map(a => (
                  <button key={a.label} onClick={() => handleSend(a.prompt)} style={{
                    textAlign: "left", padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.7)", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", lineHeight: 1.5,
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,166,35,0.08)"; e.currentTarget.style.borderColor = "rgba(245,166,35,0.2)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                  >
                    <span style={{ fontSize: 16, display: "block", marginBottom: 4 }}>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHAT VIEW */}
        {view === "chat" && (
          <div style={{ height: "100%", overflowY: "auto", padding: "20px 16px 8px" }} className="stea-chat-scroll">
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.35 }}>
                <MessageSquare size={32} color="#fff" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 13, color: "#fff", margin: 0 }}>Uliza chochote kuhusu tech au STEA...</p>
              </div>
            )}
            {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${G}, ${G2})`,
                  display: "grid", placeItems: "center",
                }}>
                  <Zap size={14} color="#111" strokeWidth={2.5} />
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "4px 18px 18px 18px",
                  backdropFilter: "blur(10px)",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── Input Area ── */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "12px 16px 16px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(20px)",
      }}>
        {view === "home" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18, padding: "6px 8px 6px 16px",
            transition: "border-color 0.2s",
          }}
            onFocus={e => e.currentTarget.style.borderColor = `rgba(245,166,35,0.4)`}
            onBlur={e => e.currentTarget.style.borderColor = `rgba(255,255,255,0.08)`}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              onFocus={e => e.currentTarget.closest("div").style.borderColor = `rgba(245,166,35,0.4)`}
              onBlur={e => e.currentTarget.closest("div").style.borderColor = `rgba(255,255,255,0.08)`}
              placeholder="Uliza swali lako..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 14,
              }}
            />
            <button onClick={() => handleSend()} disabled={!input.trim()} style={{
              width: 38, height: 38, borderRadius: 12,
              border: "none",
              background: input.trim() ? `linear-gradient(135deg, ${G}, ${G2})` : "rgba(255,255,255,0.07)",
              color: input.trim() ? "#111" : "rgba(255,255,255,0.2)",
              cursor: input.trim() ? "pointer" : "default",
              display: "grid", placeItems: "center",
              transition: "all 0.2s",
            }}>
              <Send size={16} />
            </button>
          </div>
        )}

        {view === "chat" && (
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18, padding: "8px 8px 8px 16px",
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = `rgba(245,166,35,0.4)`}
            onBlurCapture={e => e.currentTarget.style.borderColor = `rgba(255,255,255,0.08)`}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Andika swali lako... (Enter kutuma)"
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 14, lineHeight: 1.6, resize: "none",
                fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
              }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()} style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0,
              border: "none",
              background: (!loading && input.trim()) ? `linear-gradient(135deg, ${G}, ${G2})` : "rgba(255,255,255,0.07)",
              color: (!loading && input.trim()) ? "#111" : "rgba(255,255,255,0.2)",
              cursor: (!loading && input.trim()) ? "pointer" : "default",
              display: "grid", placeItems: "center",
              transition: "all 0.2s",
              boxShadow: (!loading && input.trim()) ? `0 4px 16px rgba(245,166,35,0.3)` : "none",
            }}>
              <Send size={17} />
            </button>
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 9.5, color: "rgba(255,255,255,0.18)", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>
          STEA AI • Powered by Gemini
        </div>
      </div>
    </div>
  );
}
