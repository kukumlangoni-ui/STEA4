import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Send, X, Phone, ChevronLeft, Sparkles, Bot, Zap } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

const G = "#F5A623";
const G2 = "#FFD17C";

const SYSTEM_PROMPT = `STEA AI ASSISTANT

You are STEA AI, the official assistant of SwahiliTech Elite Academy (STEA), owned by Isaya Hans Masika — a Tanzanian tech creator based in China.

MISSION: Help users with tech, smartphones, AI tools, digital opportunities in natural Kiswahili.

TONE: Smart, friendly, practical Tanzanian assistant. Sound human, not robotic.
- Casual users (bro/mkuu/oya): informal, energetic
- Formal users (Shikamoo/Habari): respectful, clear
- Default: neutral friendly Kiswahili

RULES:
- Always Kiswahili. English only for tech terms (App, Update, Storage, Link)
- Short to medium answers. Direct and practical
- Never say "I am an AI language model" — answer as STEA AI
- Lightly mention STEA when relevant (courses, deals, tips, websites)
- End naturally: "Ukikwama, niambie." or "Tupo pamoja."`;

let aiInstance = null;
const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 16px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: G,
          animation: `steaDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes steaDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1.1);opacity:1} }
        @keyframes steaFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes steaFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .stea-msg{animation:steaFadeUp 0.28s ease forwards}
        .stea-chat-scroll::-webkit-scrollbar{width:3px}
        .stea-chat-scroll::-webkit-scrollbar-thumb{background:rgba(245,166,35,0.2);border-radius:3px}
      `}</style>
    </div>
  );
}

function MsgBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className="stea-msg" style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14, alignItems: "flex-end", gap: 8,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg,${G},${G2})`,
          display: "grid", placeItems: "center",
          boxShadow: "0 2px 10px rgba(245,166,35,0.25)",
        }}>
          <Zap size={13} color="#111" strokeWidth={2.5} />
        </div>
      )}
      <div style={{
        maxWidth: "76%",
        padding: isUser ? "10px 14px" : "12px 16px",
        borderRadius: isUser ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
        background: isUser ? `linear-gradient(135deg,${G},${G2})` : "rgba(255,255,255,0.07)",
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
        color: isUser ? "#111" : "#fff",
        fontSize: 13.5, lineHeight: 1.7,
        fontWeight: isUser ? 600 : 400,
        wordBreak: "break-word",
        backdropFilter: isUser ? "none" : "blur(8px)",
        boxShadow: isUser ? "0 4px 20px rgba(245,166,35,0.22)" : "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        {isUser ? <span>{msg.text}</span> : (
          <ReactMarkdown components={{
            code: ({ children }) => <code style={{ background:"rgba(245,166,35,0.12)",color:G,padding:"2px 6px",borderRadius:5,fontSize:12,fontFamily:"monospace" }}>{children}</code>,
            pre: ({ children }) => <pre style={{ background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:12,overflowX:"auto",fontSize:12,margin:"8px 0" }}>{children}</pre>,
            p: ({ children }) => <p style={{ margin:"4px 0" }}>{children}</p>,
            ul: ({ children }) => <ul style={{ paddingLeft:18,margin:"6px 0" }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft:18,margin:"6px 0" }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom:3 }}>{children}</li>,
            strong: ({ children }) => <strong style={{ color:G }}>{children}</strong>,
          }}>{msg.text}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AIChat({ onClose }) {
  const [view, setView] = useState("home");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (view === "chat") setTimeout(() => inputRef.current?.focus(), 250); }, [view]);

  const handleSend = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;
    if (view !== "chat") setView("chat");
    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });
      
      const reply = response.text || "Samahani, jaribu tena.";
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      console.error("[STEA AI]", err);
      let userMessage = "Samahani, imeshindwa kupata majibu. Tafadhali jaribu tena.";
      if (err.message && err.message.includes("403")) {
        userMessage = "Samahani, huna ruhusa ya kufikia huduma hii. Tafadhali wasiliana na admin.";
      } else if (err.message && err.message.includes("429")) {
        userMessage = "Samahani, maombi ni mengi sana kwa sasa. Tafadhali subiri kidogo.";
      }
      setError(userMessage);
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

  const inputBar = (
    <div style={{
      position:"relative",zIndex:10,
      padding:"10px 14px 14px",
      borderTop:"1px solid rgba(255,255,255,0.07)",
      background:"rgba(0,0,0,0.35)",
      backdropFilter:"blur(20px)", flexShrink:0,
    }}>
      <div style={{
        display:"flex",alignItems:"flex-end",gap:9,
        background:"rgba(255,255,255,0.05)",
        border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:16,padding:"8px 8px 8px 14px",transition:"border-color 0.2s",
      }}
        onFocusCapture={e=>e.currentTarget.style.borderColor="rgba(245,166,35,0.45)"}
        onBlurCapture={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.09)"}
      >
        <textarea ref={inputRef} value={input}
          onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,110)+"px";}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
          placeholder={view==="home"?"Uliza swali lako...":"Andika swali... (Enter kutuma)"}
          rows={1}
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:13.5,lineHeight:1.6,resize:"none",fontFamily:"inherit",maxHeight:110,overflowY:"auto"}}
        />
        <button onClick={()=>handleSend()} disabled={loading||!input.trim()} style={{
          width:40,height:40,borderRadius:12,flexShrink:0,border:"none",
          background:(!loading&&input.trim())?`linear-gradient(135deg,${G},${G2})`:"rgba(255,255,255,0.07)",
          color:(!loading&&input.trim())?"#111":"rgba(255,255,255,0.2)",
          cursor:(!loading&&input.trim())?"pointer":"default",
          display:"grid",placeItems:"center",transition:"all 0.2s",
          boxShadow:(!loading&&input.trim())?"0 4px 14px rgba(245,166,35,0.3)":"none",
        }}>
          <Send size={16}/>
        </button>
      </div>
      <div style={{textAlign:"center",marginTop:7,fontSize:9,color:"rgba(255,255,255,0.16)",fontWeight:700,letterSpacing:".16em",textTransform:"uppercase"}}>
        STEA AI • Powered by Claude
      </div>
    </div>
  );

  return (
    <div style={{
      display:"flex",flexDirection:"column",height:"100%",width:"100%",
      background:"linear-gradient(160deg,#080c18 0%,#0a0e1a 45%,#05060a 100%)",
      borderRadius:24,overflow:"hidden",position:"relative",
      fontFamily:"'Instrument Sans',system-ui,sans-serif",
    }}>
      {/* Background grid */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(245,166,35,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,166,35,0.025) 1px,transparent 1px)`,
        backgroundSize:"44px 44px"}} />
      {/* Glow orbs */}
      <div style={{position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,166,35,0.1) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"absolute",bottom:60,left:-100,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(86,183,255,0.055) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>

      {/* Header */}
      <div style={{position:"relative",zIndex:10,padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          {view==="chat" ? (
            <button onClick={()=>setView("home")} style={{width:34,height:34,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0}}>
              <ChevronLeft size={16}/>
            </button>
          ) : (
            <div style={{width:42,height:42,borderRadius:14,background:`linear-gradient(135deg,${G},${G2})`,display:"grid",placeItems:"center",boxShadow:`0 4px 20px rgba(245,166,35,0.35)`,animation:"steaFloat 3s ease-in-out infinite",flexShrink:0}}>
              <Bot size={22} color="#111" strokeWidth={2}/>
            </div>
          )}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-.02em"}}>STEA AI</span>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px rgba(34,197,94,0.8)",flexShrink:0}}/>
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>Msaidizi wa STEA Africa</div>
          </div>
        </div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.4)",cursor:"pointer",display:"grid",placeItems:"center",transition:"all 0.2s",flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,80,80,0.15)";e.currentTarget.style.color="#ff6b6b";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="rgba(255,255,255,0.4)";}}>
          <X size={15}/>
        </button>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:"hidden",position:"relative",zIndex:1}}>

        {view==="home" && (
          <div style={{height:"100%",overflowY:"auto",padding:"24px 18px 16px"}} className="stea-chat-scroll">
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:68,height:68,borderRadius:22,margin:"0 auto 14px",background:`linear-gradient(135deg,${G},${G2})`,display:"grid",placeItems:"center",boxShadow:`0 8px 36px rgba(245,166,35,0.38)`}}>
                <Bot size={30} color="#111" strokeWidth={2}/>
              </div>
              <h3 style={{fontSize:21,fontWeight:800,color:"#fff",margin:"0 0 8px",letterSpacing:"-.04em"}}>Karibu STEA AI! 🇹🇿</h3>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.48)",lineHeight:1.7,maxWidth:270,margin:"0 auto"}}>
                Msaidizi wako wa tech kwa Kiswahili. Uliza chochote — nitakusaidia haraka!
              </p>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
              <button onClick={()=>setView("chat")} style={{padding:"13px 16px",borderRadius:15,border:"none",background:`linear-gradient(135deg,${G},${G2})`,color:"#111",fontWeight:800,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:`0 6px 22px rgba(245,166,35,0.32)`,transition:"transform 0.18s,box-shadow 0.18s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 30px rgba(245,166,35,0.42)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 6px 22px rgba(245,166,35,0.32)";}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{padding:"5px 7px",background:"rgba(0,0,0,0.15)",borderRadius:8,display:"grid",placeItems:"center"}}><Sparkles size={15}/></div>
                  <span>Anza Chat na AI</span>
                </div>
                <ChevronLeft size={15} style={{transform:"rotate(180deg)"}}/>
              </button>
              <a href="https://wa.me/255752661307" target="_blank" rel="noopener noreferrer" style={{padding:"13px 16px",borderRadius:15,border:"1px solid rgba(37,211,102,0.2)",background:"rgba(37,211,102,0.06)",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background 0.18s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(37,211,102,0.12)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(37,211,102,0.06)"}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{padding:"5px 7px",background:"rgba(37,211,102,0.1)",borderRadius:8,display:"grid",placeItems:"center"}}><Phone size={15} color="#25D366"/></div>
                  <span>Chat nasi WhatsApp</span>
                </div>
                <ChevronLeft size={15} style={{transform:"rotate(180deg)",opacity:0.4}}/>
              </a>
            </div>

            <div>
              <div style={{fontSize:9.5,fontWeight:800,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:".2em",marginBottom:11}}>Maswali ya Haraka</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {quickActions.map(a=>(
                  <button key={a.label} onClick={()=>handleSend(a.prompt)} style={{textAlign:"left",padding:"11px 13px",borderRadius:13,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.68)",fontSize:12,fontWeight:600,cursor:"pointer",lineHeight:1.5,transition:"all 0.18s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,166,35,0.08)";e.currentTarget.style.borderColor="rgba(245,166,35,0.22)";e.currentTarget.style.color="#fff";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,0.68)";}}>
                    <span style={{fontSize:15,display:"block",marginBottom:5}}>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view==="chat" && (
          <div style={{height:"100%",overflowY:"auto",padding:"16px 14px 8px"}} className="stea-chat-scroll">
            {messages.length===0 && (
              <div style={{textAlign:"center",padding:"32px 16px",opacity:0.3}}>
                <Bot size={28} color="#fff" style={{margin:"0 auto 10px"}}/>
                <p style={{fontSize:12.5,color:"#fff",margin:0}}>Uliza chochote kuhusu tech au STEA...</p>
              </div>
            )}
            {messages.map((msg,i)=><MsgBubble key={i} msg={msg}/>)}
            {loading && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:9,flexShrink:0,background:`linear-gradient(135deg,${G},${G2})`,display:"grid",placeItems:"center"}}>
                  <Zap size={13} color="#111" strokeWidth={2.5}/>
                </div>
                <div style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"4px 18px 18px 18px",backdropFilter:"blur(10px)"}}>
                  <TypingDots/>
                </div>
              </div>
            )}
            {error && (
              <div style={{padding:"10px 14px",borderRadius:12,marginBottom:12,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#fca5a5",fontSize:12.5,lineHeight:1.6}}>
                {error}
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>
        )}
      </div>

      {inputBar}
    </div>
  );
}
