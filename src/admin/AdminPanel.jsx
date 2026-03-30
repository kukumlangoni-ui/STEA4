
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getFirebaseDb, collection, addDoc, updateDoc, deleteDoc, setDoc,
  doc, serverTimestamp, query, limit, onSnapshot, orderBy
} from "../firebase.js";
import { timeAgo, handleFirestoreError, OperationType } from "../hooks/useFirestore.js";
import ImageEditor from './ImageEditor.jsx';

const G = "#F5A623", G2 = "#FFD17C";

const WEBSITE_CATEGORIES = ["Free Movie", "Streaming", "AI Tools", "Learning", "Jobs", "Design", "Business", "Download", "Gaming", "Live TV", "Sports", "Music"];

// ── Shared UI ─────────────────────────────────────────
const Btn = ({ children, onClick, color = G, textColor = "#111", disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ border:"none", cursor:disabled?"not-allowed":"pointer", borderRadius:12,
      padding:"10px 18px", fontWeight:800, fontSize:13, color:textColor,
      background:color, opacity:disabled?.6:1, transition:"all .2s",
      display:"inline-flex", alignItems:"center", gap:8, ...style }}
    onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity=".85"; }}
    onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; }}>
    {children}
  </button>
);

const Field = ({ label, children }) => (
  <div style={{ display:"grid", gap:6 }}>
    <label style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em" }}>{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} value={props.value || ""} style={{ height:46, borderRadius:12, border:"1px solid rgba(255,255,255,.1)",
    background:"rgba(255,255,255,.05)", color:"#fff", padding:"0 14px", outline:"none",
    fontFamily:"inherit", fontSize:14, width:"100%", ...props.style }}
    onFocus={e=>e.target.style.borderColor=G}
    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
);

const Textarea = (props) => (
  <textarea {...props} value={props.value || ""} style={{ borderRadius:12, border:"1px solid rgba(255,255,255,.1)",
    background:"rgba(255,255,255,.05)", color:"#fff", padding:"12px 14px", outline:"none",
    fontFamily:"inherit", fontSize:14, width:"100%", resize:"vertical", minHeight:100,
    ...props.style }}
    onFocus={e=>e.target.style.borderColor=G}
    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
);

const Select = (props) => (
  <select {...props} style={{ height:46, borderRadius:12, border:"1px solid rgba(255,255,255,.1)",
    background:"rgba(255,255,255,.05)", color:"#fff", padding:"0 14px", outline:"none",
    fontFamily:"inherit", fontSize:14, width:"100%", cursor:"pointer", ...props.style }}
    onFocus={e=>e.target.style.borderColor=G}
    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}>
    {props.children}
  </select>
);

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, padding:"14px 20px",
      borderRadius:14, fontWeight:700, fontSize:14,
      background:type==="error"?"rgba(239,68,68,.95)":"rgba(0,196,140,.95)",
      color:"#fff", boxShadow:"0 12px 32px rgba(0,0,0,.4)",
      animation:"slideUp .3s ease" }}>
      {type==="error"?"❌":"✅"} {msg}
    </div>
  );
}

function StatCard({ icon, label, value, color = G }) {
  return (
    <div style={{ borderRadius:18, border:"1px solid rgba(255,255,255,.08)", background:"#141823",
      padding:"20px 24px", display:"flex", alignItems:"center", gap:16 }}>
      <div style={{ width:52, height:52, borderRadius:14, display:"grid", placeItems:"center",
        background:`${color}18`, fontSize:26 }}>{icon}</div>
      <div>
        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, fontWeight:800,
          color, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginTop:4 }}>{label}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:800, background:"rgba(4,5,9,.85)",
      backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"min(420px,90%)", borderRadius:22, border:"1px solid rgba(255,255,255,.12)",
        background:"rgba(16,18,28,.98)", padding:28, boxShadow:"0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>⚠️ Confirm Delete</div>
        <p style={{ color:"rgba(255,255,255,.6)", fontSize:14, lineHeight:1.7, margin:"0 0 24px" }}>{msg}</p>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={onConfirm} color="rgba(239,68,68,.9)" textColor="#fff">🗑️ Futa</Btn>
          <Btn onClick={onCancel} color="rgba(255,255,255,.08)" textColor="#fff">Acha</Btn>
        </div>
      </div>
    </div>
  );
}

import ImageEditor from './ImageEditor.jsx';

function ImageUploadField({ label, value, onChange }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 700000) { // ~700KB limit to stay under 1MB after base64
        alert("Picha hii ni kubwa mno (zidi 700KB). Tafadhali punguza size ya picha kwanza.");
        return;
      }
      setLoading(true);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        console.log("Image uploaded, size:", reader.result.length);
        onChange(reader.result);
        setLoading(false);
      });
      reader.readAsDataURL(file);
    }
  };

  const isDataUrl = value && value.startsWith("data:image/");

  return (
    <Field label={label}>
      {editing && isDataUrl && (
        <ImageEditor
          image={value}
          onSave={(cropped) => {
            onChange(cropped);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
    {isDataUrl ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "0 10px", height: 46 }}>
        <img src={value} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} referrerPolicy="no-referrer" onError={(e) => { e.target.style.display = 'none'; }} />
        <span style={{ color: "#00C48C", fontSize: 13, flex: 1, fontWeight: 700 }}>Uploaded</span>
        <button onClick={() => setEditing(true)} style={{ background: "rgba(245,166,35,.1)", border: "none", color: G, cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>Edit</button>
        <button onClick={() => onChange("")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
    ) : (
          <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Weka link ya picha (sio website) au upload ➔" />
        )}
        <Btn onClick={() => fileInputRef.current.click()} color="rgba(255,255,255,.08)" textColor="#fff" style={{ padding: "0 14px" }} disabled={loading}>
          {loading ? "⏳..." : "📸 Upload"}
        </Btn>
        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" style={{ display: "none" }} />
      </div>
    </Field>
  );
}

function AdminThumb({ url, fallback = "🖼️" }) {
  const [error, setError] = useState(false);
  return (
    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.05)" }}>
      {url && !error ? (
        <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" onError={() => setError(true)} />
      ) : (
        <span style={{ fontSize: 20 }}>{fallback}</span>
      )}
    </div>
  );
}

function TechContentManager({ collectionName }) {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ 
    type: "article", badge: "Tech", title: "", summary: "", content: "", 
    imageUrl: "", carouselImages: [], ctaText: "", ctaUrl: "", source: "",
    platform: "youtube", embedUrl: "", channel: "", channelImg: "🎙️", duration: "",
    category: collectionName === "tips" ? "tech-tips" : "tech-updates",
    sectionType: collectionName === "tips" ? "techTips" : "techUpdates"
  });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [tab,     setTab]     = useState("article");

  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDocs(fetched);
    }, (err) => {
      console.error(`Error loading ${collectionName}:`, err);
    });
    return () => unsub();
  }, [db, collectionName]);

  const resetForm = () => {
    setForm({ 
      type: "article", badge: "Tech", title: "", summary: "", content: "", 
      imageUrl: "", carouselImages: [], ctaText: "", ctaUrl: "", source: "",
      platform: "youtube", embedUrl: "", channel: "", channelImg: "🎙️", duration: "",
      category: collectionName === "tips" ? "tech-tips" : "tech-updates",
      sectionType: collectionName === "tips" ? "techTips" : "techUpdates",
      views: 0
    });
    setEditing(null);
    setTab("article");
  };

  const save = async () => {
    if (!(form.title || "").toString().trim()) {
      toast_("Weka title kwanza", "error");
      return;
    }

    setLoading(true);
    const originalDocs = docs;
    const docToSave = { ...form };

    // Optimistic UI Update
    if (editing) {
      setDocs(docs.map(doc => doc.id === editing ? { ...doc, ...docToSave, updatedAt: new Date() } : doc));
    } else {
      const tempId = `temp-${Date.now()}`;
      const newDoc = { ...docToSave, id: tempId, createdAt: new Date(), isPending: true };
      setDocs([newDoc, ...docs]);
    }
    
    resetForm();

    try {
      const data = { ...docToSave };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });
      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database.");
      }
      
      if (editing) {
        delete data.id;
        delete data.createdAt;
        await updateDoc(doc(db, collectionName, editing), { ...data, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      } else {
        await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
        toast_("Imewekwa live!");
      }
    } catch (e) {
      setDocs(originalDocs); // Rollback on error
      console.error(e);
      handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, collectionName);
      toast_(e.message, "error");
    } finally {
      setLoading(false);
    }
  };
  
  const del = (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta post hii? Haiwezi kurejeshwa.",
      onConfirm: async () => {
        setConfirm(null);
        const originalDocs = docs;
        setDocs(docs.filter(doc => doc.id !== id)); // Optimistic delete
        try {
          await deleteDoc(doc(db, collectionName, id));
          toast_("Imefutwa");
        } catch (e) {
          setDocs(originalDocs); // Rollback on error
          console.error("Error deleting post:", e);
          toast_("Error deleting post.", "error");
        }
      },
      onCancel: () => setConfirm(null),
    });
  };

  const edit = (item) => { 
    setEditing(item.id); 
    setForm({ ...item, carouselImages: item.carouselImages || [] }); 
    setTab(item.type || "article"); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  };
  
  // ... (rest of TechContentManager component)

  return (
    <div>
      {toast   && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog {...confirm}/>}
      
      <div style={{ borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"#141823", padding:24, marginBottom:28 }}>
        <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 20px" }}>
          {editing ? "✏️ Hariri Post" : "➕ Ongeza Post Mpya"}
        </h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["article","video"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setForm(f=>({...f,type:t}));}}
              style={{ border:"none", borderRadius:10, padding:"9px 18px", cursor:"pointer", fontWeight:800, fontSize:13,
                background:tab===t?`linear-gradient(135deg,${G},${G2})`:"rgba(255,255,255,.06)", color:tab===t?"#111":"rgba(255,255,255,.6)" }}>
              {t==="article"?"📝 Article":"🎬 Video"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Badge (e.g. Android, AI, News)"><Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Tech" /></Field>
            <Field label="Category (e.g. ai, android, pc)"><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="tech-tips" /></Field>
          </div>
          <Field label="Title *"><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title..." /></Field>
          
          {tab === "article" && (
            <>
              <ImageUploadField label="Thumbnail Image URL (16:9)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
              <Field label="Short Intro / Summary"><Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Short description..." style={{ minHeight: 60 }} /></Field>
              <Field label="Step-by-step Content"><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Full content..." style={{ minHeight: 150 }} /></Field>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="CTA Button Text"><Input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="e.g. Read More" /></Field>
                <Field label="CTA Button URL"><Input value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))} placeholder="https://..." /></Field>
              </div>
              
              {collectionName === "updates" && (
                <Field label="Optional Source"><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. TechCrunch" /></Field>
              )}

              {/* ... (rest of the form remains the same) */}
            </>
          )}

          {tab === "video" && (
             <>
              <ImageUploadField label="Thumbnail Image URL" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
              <Field label="Short Caption"><Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Caption..." style={{ minHeight: 60 }} /></Field>
              <Field label="Watch URL (External Link or Embed)"><Input value={form.embedUrl} onChange={e => setForm(f => ({ ...f, embedUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></Field>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Creator Name"><Input value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} placeholder="e.g. MKBHD" /></Field>
                <Field label="Creator Profile Image (Emoji or URL)"><Input value={form.channelImg} onChange={e => setForm(f => ({ ...f, channelImg: e.target.value }))} placeholder="🎙️ or https://..." /></Field>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Platform Icon (youtube, tiktok, instagram)"><Input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="youtube" /></Field>
                <Field label="Duration (Optional)"><Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="10:00" /></Field>
              </div>
            </>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={save} disabled={loading}>{loading?"Inahifadhi...":editing?"💾 Hifadhi":"🚀 Weka Live"}</Btn>
            {editing && <Btn onClick={resetForm} color="rgba(255,255,255,.08)" textColor="#fff">✕ Acha</Btn>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {docs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna content bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item => (
          <div key={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", opacity: item.isPending ? 0.5 : 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.05)", fontSize: 20 }}>
              {item.type === "video" ? "▶️" : "📝"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                {item.type} • {item.summary?.substring(0, 40)}...
                {item.isPending && " (Pending...)"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => edit(item)} color="rgba(245,166,35,.12)" textColor={G} style={{ padding: "8px 14px" }}>✏️</Btn>
              <Btn onClick={() => del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{ padding: "8px 14px" }}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// Repeat this optimistic update pattern for:
// - DealsManager
// - CoursesManager
// - ProductsManager
// - WebsitesManager
// - PromptsManager
// ...
export default function AdminPanel({ user, onBack }) {
    // ... main panel logic
}
