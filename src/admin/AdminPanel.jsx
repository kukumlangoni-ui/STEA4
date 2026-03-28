import { useState, useEffect, useRef } from "react";
import {
  getFirebaseDb, collection, addDoc, updateDoc, deleteDoc, setDoc,
  doc, serverTimestamp, query, limit, onSnapshot, orderBy,
  handleFirestoreError, OperationType, sendPushNotification, isAdminEmail
} from "../firebase.js";
import { timeAgo } from "../hooks/useFirestore.js";

const G = "#F5A623", G2 = "#FFD17C";

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

// ── Stats Card ────────────────────────────────────────
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

// ── Confirm Delete Dialog ─────────────────────────────
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

// ── Image Cropper Modal ───────────────────────────────
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

// ══════════════════════════════════════════════════════
// TECH CONTENT MANAGER (Tips & Updates)
// ══════════════════════════════════════════════════════
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
    const q = query(collection(db, collectionName), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
    }, (err) => {
      console.error(`Error loading ${collectionName}:`, err);
    });
    return () => unsub();
  }, [db, collectionName]);

  const save = async () => {
    const title = (form.title || "").toString();
    if (!title.trim()) { toast_("Weka title kwanza", "error"); return; }
    setLoading(true);
    try {
      const data = { 
        ...form, 
        category: form.category || (collectionName === "tips" ? "tech-tips" : "tech-updates"),
        sectionType: collectionName === "tips" ? "techTips" : "techUpdates",
        views: form.views || 0, 
        createdAt: form.createdAt || serverTimestamp() 
      };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });

      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        await updateDoc(doc(db, collectionName, editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      }
      else { 
        await addDoc(collection(db, collectionName), data);
        toast_("Imewekwa live!");
        try {
          const section = collectionName === "tips" ? "tips" : "habari";
          await sendPushNotification({ title: "New on STEA 🔥", body: `${data.title} ipo live sasa!`, url: `${window.location.origin}/?page=${section}` });
        } catch(e) { console.warn("[FCM]", e.message); }
      }
      setForm({ 
        type: "article", badge: "Tech", title: "", summary: "", content: "", 
        imageUrl: "", carouselImages: [], ctaText: "", ctaUrl: "", source: "",
        platform: "youtube", embedUrl: "", channel: "", channelImg: "🎙️", duration: "",
        category: collectionName === "tips" ? "tech-tips" : "tech-updates",
        sectionType: collectionName === "tips" ? "techTips" : "techUpdates",
        views: 0
      });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, collectionName);
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = async (id) => {
    setConfirm({ msg:"Una uhakika unataka kufuta post hii? Haiwezi kurejeshwa.", onConfirm: async()=>{ await deleteDoc(doc(db,collectionName,id)); setConfirm(null); toast_("Imefutwa"); }, onCancel:()=>setConfirm(null) });
  };

  const edit = (item) => { 
    setEditing(item.id); 
    setForm({ ...item, carouselImages: item.carouselImages || [] }); 
    setTab(item.type || "article"); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  };

  const addCarouselImage = () => setForm(f => ({ ...f, carouselImages: [...(f.carouselImages||[]), ""] }));
  const updateCarouselImage = (i, val) => {
    const arr = [...(form.carouselImages||[])];
    arr[i] = val;
    setForm(f => ({ ...f, carouselImages: arr }));
  };
  const removeCarouselImage = (i) => {
    const arr = [...(form.carouselImages||[])];
    arr.splice(i, 1);
    setForm(f => ({ ...f, carouselImages: arr }));
  };

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

              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: 1 }}>Image Carousel (Optional, Max 20)</div>
                  <Btn onClick={addCarouselImage} style={{ padding: "4px 12px", fontSize: 12 }} color="rgba(255,255,255,.05)">+ Add Image</Btn>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(form.carouselImages||[]).map((img, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 10, alignItems: "end" }}>
                      <ImageUploadField label={`Image ${i+1} URL`} value={img} onChange={val => updateCarouselImage(i, val)} />
                      <Btn onClick={() => removeCarouselImage(i)} color="rgba(239,68,68,.1)" textColor="#fca5a5" style={{ padding: 10, marginBottom: 4 }}>✕</Btn>
                    </div>
                  ))}
                </div>
              </div>
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
            {editing && <Btn onClick={()=>{setEditing(null);setForm({type:"article",badge:"Tech",title:"",summary:"",content:"",imageUrl:"",carouselImages:[],ctaText:"",ctaUrl:"",source:"",platform:"youtube",embedUrl:"",channel:"",channelImg:"🎙️",duration:""});}} color="rgba(255,255,255,.08)" textColor="#fff">✕ Acha</Btn>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {docs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna content bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item => (
          <div key={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.05)", fontSize: 20 }}>
              {item.type === "video" ? "▶️" : "📝"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{item.type} • {item.summary?.substring(0, 40)}...</div>
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

// ══════════════════════════════════════════════════════
// DEALS MANAGER
// ══════════════════════════════════════════════════════
function DealsManager() {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ 
    imageUrl: "", name: "", description: "", dealType: "direct_offer", directLink: "", affiliateLink: "", whatsappLink: "", promoCode: "", 
    oldPrice: "", newPrice: "", expiryDate: "", badge: "", featured: false, category: "hosting",
    fullDescription: "", whyThisDeal: "", includedFeatures: "", savingsText: "", ctaText: "Pata Deal", provider: "", terms: "",
    joinedCount: "", liveJoinedText: "", todayJoinedCount: "", rating: "5.0", reviewText: "", urgencyText: ""
  });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "deals"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
    }, (err) => {
      console.error("Error loading deals:", err);
    });
    return () => unsub();
  }, [db]);

  const save = async () => {
    const name = (form.name || "").toString();
    if (!name.trim()) { toast_("Weka jina la deal kwanza", "error"); return; }
    setLoading(true);
    try {
      const data = { ...form, createdAt: serverTimestamp() };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });

      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        console.log("Updating deal:", editing, "Fields count:", Object.keys(updateData).length);
        await updateDoc(doc(db,"deals",editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      }
      else          { 
        console.log("Adding new deal:", data);
        await addDoc(collection(db,"deals"), data); 
        toast_("Deal imewekwa live!"); 
      }
      setForm({ 
        imageUrl: "", name: "", description: "", dealType: "direct_offer", directLink: "", affiliateLink: "", whatsappLink: "", promoCode: "", 
        oldPrice: "", newPrice: "", expiryDate: "", badge: "", featured: false, category: "hosting",
        fullDescription: "", whyThisDeal: "", includedFeatures: "", savingsText: "", ctaText: "Pata Deal", provider: "", terms: "",
        joinedCount: "", liveJoinedText: "", todayJoinedCount: "", rating: "5.0", reviewText: "", urgencyText: ""
      });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "deals");
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = async (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta deal hii? Hatua hii haiwezi kurejeshwa.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "deals", id));
          setConfirm(null);
          toast_("Deal imefutwa");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  const toggle = async (item) => {
    await updateDoc(doc(db,"deals",item.id), { active:!item.active });
  };

  return (
    <div>
      {toast   && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog {...confirm}/>}

      <div style={{ borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"#141823", padding:24, marginBottom:28 }}>
        <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 20px" }}>
          {editing?"✏️ Hariri Deal":"➕ Ongeza Deal Mpya"}
        </h3>
        <div style={{ display:"grid", gap:16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Jina la Deal *"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Canva Pro"/></Field>
            <Field label="Deal Type">
              <select value={form.dealType} onChange={e => setForm(f => ({ ...f, dealType: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1a1d2e", border: "1px solid rgba(255,255,255,.1)", color: "white" }}>
                <option value="direct_offer">Direct Offer</option>
                <option value="promo_code">Promo Code</option>
                <option value="affiliate_offer">Affiliate Offer</option>
                <option value="lead_offer">Lead Offer</option>
              </select>
            </Field>
          </div>
          <ImageUploadField label="Real Image URL (Optional)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
          <Field label="Short Intro"><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Maelezo mafupi ya deal hii..." style={{minHeight:60}}/></Field>
          <Field label="Full Description"><Textarea value={form.fullDescription} onChange={e=>setForm(f=>({...f,fullDescription:e.target.value}))} placeholder="Maelezo kamili ya deal hii..." style={{minHeight:100}}/></Field>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Why This Deal?"><Textarea value={form.whyThisDeal} onChange={e=>setForm(f=>({...f,whyThisDeal:e.target.value}))} placeholder="Kwa nini ununue deal hii?" style={{minHeight:80}}/></Field>
            <Field label="Included Features (One per line)"><Textarea value={form.includedFeatures} onChange={e=>setForm(f=>({...f,includedFeatures:e.target.value}))} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" style={{minHeight:80}}/></Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Direct Link"><Input value={form.directLink} onChange={e=>setForm(f=>({...f,directLink:e.target.value}))} placeholder="https://..."/></Field>
            <Field label="Affiliate Link"><Input value={form.affiliateLink} onChange={e=>setForm(f=>({...f,affiliateLink:e.target.value}))} placeholder="https://..."/></Field>
            <Field label="WhatsApp Link"><Input value={form.whatsappLink} onChange={e=>setForm(f=>({...f,whatsappLink:e.target.value}))} placeholder="https://wa.me/..."/></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            <Field label="Promo Code"><Input value={form.promoCode} onChange={e=>setForm(f=>({...f,promoCode:e.target.value}))} placeholder="STEA60"/></Field>
            <Field label="Old Price"><Input value={form.oldPrice} onChange={e=>setForm(f=>({...f,oldPrice:e.target.value}))} placeholder="$15"/></Field>
            <Field label="New Price"><Input value={form.newPrice} onChange={e=>setForm(f=>({...f,newPrice:e.target.value}))} placeholder="$6"/></Field>
            <Field label="Savings Text"><Input value={form.savingsText} onChange={e=>setForm(f=>({...f,savingsText:e.target.value}))} placeholder="Save 60%"/></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Badge"><Input value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))} placeholder="HOT"/></Field>
            <Field label="Category"><Input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="hosting"/></Field>
            <Field label="Provider/Source"><Input value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))} placeholder="Hostinger"/></Field>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="CTA Button Text"><Input value={form.ctaText} onChange={e=>setForm(f=>({...f,ctaText:e.target.value}))} placeholder="Pata Deal"/></Field>
            <Field label="Expiry Date"><Input type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))} /></Field>
          </div>

          <h4 style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.8)" }}>Trust & Persuasion Elements</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Total Joined Count"><Input value={form.joinedCount} onChange={e=>setForm(f=>({...f,joinedCount:e.target.value}))} placeholder="1200"/></Field>
            <Field label="Live Joined Text"><Input value={form.liveJoinedText} onChange={e=>setForm(f=>({...f,liveJoinedText:e.target.value}))} placeholder="120+ members joined"/></Field>
            <Field label="Today Joined Count"><Input value={form.todayJoinedCount} onChange={e=>setForm(f=>({...f,todayJoinedCount:e.target.value}))} placeholder="15"/></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Rating (e.g. 4.9)"><Input value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))} placeholder="5.0"/></Field>
            <Field label="Urgency Text"><Input value={form.urgencyText} onChange={e=>setForm(f=>({...f,urgencyText:e.target.value}))} placeholder="Offer ends soon!"/></Field>
          </div>
          <Field label="Short Review/Testimonial"><Textarea value={form.reviewText} onChange={e=>setForm(f=>({...f,reviewText:e.target.value}))} placeholder="This deal saved me $100! - John" style={{minHeight:60}}/></Field>
          <Field label="Terms / Important Notes"><Textarea value={form.terms} onChange={e=>setForm(f=>({...f,terms:e.target.value}))} placeholder="Valid for new users only..." style={{minHeight:60}}/></Field>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
            Featured
          </div>
          <Btn onClick={save} disabled={loading}>{loading ? "Inahifadhi..." : editing ? "💾 Hifadhi" : "🚀 Weka Live"}</Btn>

          <Field label="Background Gradient">
            <Input value={form.bg} onChange={e=>setForm(f=>({...f,bg:e.target.value}))} placeholder="linear-gradient(135deg,#00c4cc,#7d2ae8)"/>
          </Field>
        </div>
      </div>

      <div style={{ display:"grid", gap:12 }}>
        {docs.length===0 && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.35)" }}>Hakuna deals bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item=>(
          <div key={item.id} style={{ borderRadius:16, border:`1px solid ${item.active?"rgba(255,255,255,.07)":"rgba(239,68,68,.2)"}`, background:item.active?"#1a1d2e":"rgba(239,68,68,.05)", padding:"14px 18px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <AdminThumb url={item.imageUrl} fallback={item.type === "video" ? "🎬" : "📄"} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>{item.name}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>{item.domain} · {item.code?"Code: "+item.code:"Referral"}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=>toggle(item)} style={{ border:`1px solid ${item.active?"rgba(0,196,140,.3)":"rgba(239,68,68,.3)"}`, borderRadius:10, padding:"6px 12px", background:item.active?"rgba(0,196,140,.1)":"rgba(239,68,68,.1)", color:item.active?"#67f0c1":"#fca5a5", cursor:"pointer", fontWeight:700, fontSize:12 }}>
                {item.active?"✅ Live":"⏸ Paused"}
              </button>
              <Btn onClick={()=>{setEditing(item.id);setForm({...item});window.scrollTo({top:0,behavior:"smooth"});}} color="rgba(245,166,35,.12)" textColor={G} style={{padding:"8px 14px"}}>✏️</Btn>
              <Btn onClick={()=>del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"8px 14px"}}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// COURSES MANAGER
// ══════════════════════════════════════════════════════
function CoursesManager() {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ 
    imageUrl:"", carouselImages: [], title:"", desc:"", free:true, price:"Bure · Start now", cta:"Anza Sasa →", lessons:"", whatsapp:"https://wa.me/255768260933", accent:"",
    badge: "New", level: "Beginner", instructorName: "STEA Instructor", duration: "4 Weeks", totalLessons: "12", studentsCount: "0", rating: "5.0",
    oldPrice: "", newPrice: "", shortPromise: "Jifunze stadi za kisasa kwa Kiswahili.",
    whatYouWillLearn: "", whatYouWillGet: "", suitableFor: "", requirements: "",
    language: "Kiswahili", certificateIncluded: true, supportType: "WhatsApp Group",
    adminWhatsAppNumber: "255768260933", customWhatsAppMessageTemplate: "",
    priceDisclaimerShort: "Bei elekezi. Thibitisha malipo kupitia STEA.",
    priceDisclaimerFull: "Maelekezo rasmi ya kujiunga na malipo yatathibitishwa kupitia STEA pekee. Usifanye malipo nje ya mawasiliano rasmi ya STEA.",
    testimonial1Name: "", testimonial1Text: "", testimonial1Role: "",
    testimonial2Name: "", testimonial2Text: "", testimonial2Role: "",
    testimonial3Name: "", testimonial3Text: "", testimonial3Role: "",
    faq1Question: "Nitaanzaje baada ya kulipia?", faq1Answer: "Baada ya malipo kuthibitishwa, utatumiwa link ya kujiunga na darasa na kuanza masomo mara moja.",
    faq2Question: "Nitapata support?", faq2Answer: "Ndiyo, utapata msaada wa moja kwa moja kupitia group letu la WhatsApp la wanafunzi.",
    faq3Question: "Je, bei inaweza kubadilika?", faq3Answer: "Bei inaweza kubadilika kulingana na ofa zilizopo. Hakikisha unathibitisha bei ya sasa kabla ya kulipia."
  });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "courses"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
    }, (err) => {
      console.error("Error loading courses:", err);
    });
    return () => unsub();
  }, [db]);

  const addCarouselImage = () => setForm(f => ({ ...f, carouselImages: [...(f.carouselImages||[]), ""] }));
  const updateCarouselImage = (i, val) => {
    const arr = [...(form.carouselImages||[])];
    arr[i] = val;
    setForm(f => ({ ...f, carouselImages: arr }));
  };
  const removeCarouselImage = (i) => {
    const arr = [...(form.carouselImages||[])];
    arr.splice(i, 1);
    setForm(f => ({ ...f, carouselImages: arr }));
  };

  const save = async () => {
    const title = (form.title || "").toString();
    if (!title.trim()) { toast_("Weka title kwanza", "error"); return; }
    setLoading(true);
    console.log("Saving course data...", { id: editing, imageUrlLength: form.imageUrl?.length });
    try {
      const processArray = (val) => {
        if (typeof val === 'string') return val.split("\n").map(l=>l.trim()).filter(Boolean);
        if (Array.isArray(val)) return val;
        return [];
      };

      const data = { 
        ...form, 
        lessons: processArray(form.lessons),
        whatYouWillLearn: processArray(form.whatYouWillLearn),
        whatYouWillGet: processArray(form.whatYouWillGet),
        suitableFor: processArray(form.suitableFor),
        requirements: processArray(form.requirements),
        createdAt: serverTimestamp() 
      };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });

      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        console.log("Updating document:", editing, "Fields count:", Object.keys(updateData).length);
        await updateDoc(doc(db,"courses",editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      }
      else          { 
        console.log("Adding new document");
        await addDoc(collection(db,"courses"), data); 
        toast_("Kozi imewekwa live!"); 
      }
      setForm({ 
        imageUrl:"", carouselImages: [], title:"", desc:"", free:true, price:"Bure · Start now", cta:"Anza Sasa →", lessons:"", whatsapp:"https://wa.me/255768260933", accent:"",
        badge: "New", level: "Beginner", instructorName: "STEA Instructor", duration: "4 Weeks", totalLessons: "12", studentsCount: "0", rating: "5.0",
        oldPrice: "", newPrice: "", shortPromise: "Jifunze stadi za kisasa kwa Kiswahili.",
        whatYouWillLearn: "", whatYouWillGet: "", suitableFor: "", requirements: "",
        language: "Kiswahili", certificateIncluded: true, supportType: "WhatsApp Group",
        adminWhatsAppNumber: "255768260933", customWhatsAppMessageTemplate: "",
        priceDisclaimerShort: "Bei elekezi. Thibitisha malipo kupitia STEA.",
        priceDisclaimerFull: "Maelekezo rasmi ya kujiunga na malipo yatathibitishwa kupitia STEA pekee. Usifanye malipo nje ya mawasiliano rasmi ya STEA.",
        testimonial1Name: "", testimonial1Text: "", testimonial1Role: "",
        testimonial2Name: "", testimonial2Text: "", testimonial2Role: "",
        testimonial3Name: "", testimonial3Text: "", testimonial3Role: "",
        faq1Question: "Nitaanzaje baada ya kulipia?", faq1Answer: "Baada ya malipo kuthibitishwa, utatumiwa link ya kujiunga na darasa na kuanza masomo mara moja.",
        faq2Question: "Nitapata support?", faq2Answer: "Ndiyo, utapata msaada wa moja kwa moja kupitia group letu la WhatsApp la wanafunzi.",
        faq3Question: "Je, bei inaweza kubadilika?", faq3Answer: "Bei inaweza kubadilika kulingana na ofa zilizopo. Hakikisha unathibitisha bei ya sasa kabla ya kulipia.",
        category: "web"
      });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "courses");
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = async (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta kozi hii? Wanafunzi waliojiunga wataathirika.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "courses", id));
          setConfirm(null);
          toast_("Kozi imefutwa");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog {...confirm}/>}
      <div style={{ borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"#141823", padding:24, marginBottom:28 }}>
        <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 20px" }}>
          {editing?"✏️ Hariri Kozi":"➕ Ongeza Kozi Mpya"}
        </h3>
        <div style={{ display:"grid", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Title *"><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Web Development"/></Field>
            <Field label="Badge"><Input value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))} placeholder="Bestseller / New / Hot"/></Field>
          </div>

          <ImageUploadField label="Real Image URL (Optional)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
          
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: 1 }}>Image Carousel (Optional, Max 20)</div>
              <Btn onClick={addCarouselImage} style={{ padding: "4px 12px", fontSize: 12 }} color="rgba(255,255,255,.05)">+ Add Image</Btn>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(form.carouselImages||[]).map((img, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 10, alignItems: "end" }}>
                  <ImageUploadField label={`Image ${i+1} URL`} value={img} onChange={val => updateCarouselImage(i, val)} />
                  <Btn onClick={() => removeCarouselImage(i)} color="rgba(239,68,68,.1)" textColor="#fca5a5" style={{ padding: 10, marginBottom: 4 }}>✕</Btn>
                </div>
              ))}
            </div>
          </div>
          
          <Field label="Short Promise / Value Prop"><Input value={form.shortPromise} onChange={e=>setForm(f=>({...f,shortPromise:e.target.value}))} placeholder="Jifunze stadi za kisasa kwa Kiswahili."/></Field>
          <Field label="Maelezo"><Textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Maelezo ya kozi..." style={{minHeight:80}}/></Field>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            <Field label="Level"><Input value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))} placeholder="Beginner"/></Field>
            <Field label="Duration"><Input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="4 Weeks"/></Field>
            <Field label="Total Lessons"><Input value={form.totalLessons} onChange={e=>setForm(f=>({...f,totalLessons:e.target.value}))} placeholder="12"/></Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            <Field label="Instructor Name"><Input value={form.instructorName} onChange={e=>setForm(f=>({...f,instructorName:e.target.value}))} placeholder="STEA Instructor"/></Field>
            <Field label="Students Count"><Input value={form.studentsCount} onChange={e=>setForm(f=>({...f,studentsCount:e.target.value}))} placeholder="150"/></Field>
            <Field label="Rating"><Input value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))} placeholder="4.9"/></Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            <Field label="Language"><Input value={form.language} onChange={e=>setForm(f=>({...f,language:e.target.value}))} placeholder="Kiswahili"/></Field>
            <Field label="Support Type"><Input value={form.supportType} onChange={e=>setForm(f=>({...f,supportType:e.target.value}))} placeholder="WhatsApp Group"/></Field>
            <Field label="Category (web, ai, marketing, design)"><Input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="web"/></Field>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, fontWeight:700 }}>
              <input type="checkbox" checked={form.free} onChange={e=>setForm(f=>({...f,free:e.target.checked,price:e.target.checked?"Bure · Start now":"TZS 5,000/mwezi · M-Pesa"}))} style={{ width:18, height:18, accentColor:G }}/>
              Kozi ya bure
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, fontWeight:700 }}>
              <input type="checkbox" checked={form.certificateIncluded} onChange={e=>setForm(f=>({...f,certificateIncluded:e.target.checked}))} style={{ width:18, height:18, accentColor:G }}/>
              Certificate Included
            </label>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Old Price (e.g. TZS 50,000)"><Input value={form.oldPrice} onChange={e=>setForm(f=>({...f,oldPrice:e.target.value}))} placeholder="TZS 50,000"/></Field>
            <Field label="New Price (e.g. TZS 25,000)"><Input value={form.newPrice} onChange={e=>setForm(f=>({...f,newPrice:e.target.value}))} placeholder="TZS 25,000"/></Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Price text (Legacy Display)"><Input value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="TZS 5,000/mwezi · M-Pesa"/></Field>
            <Field label="CTA Button text"><Input value={form.cta} onChange={e=>setForm(f=>({...f,cta:e.target.value}))} placeholder="Jiunge Leo"/></Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Admin WhatsApp Number"><Input value={form.adminWhatsAppNumber} onChange={e=>setForm(f=>({...f,adminWhatsAppNumber:e.target.value}))} placeholder="255768260933"/></Field>
            <Field label="Custom WhatsApp Message"><Input value={form.customWhatsAppMessageTemplate} onChange={e=>setForm(f=>({...f,customWhatsAppMessageTemplate:e.target.value}))} placeholder="Optional custom message..."/></Field>
          </div>

          <Field label="Price Disclaimer (Short)"><Input value={form.priceDisclaimerShort} onChange={e=>setForm(f=>({...f,priceDisclaimerShort:e.target.value}))} placeholder="Bei elekezi..."/></Field>
          <Field label="Price Disclaimer (Full)"><Textarea value={form.priceDisclaimerFull} onChange={e=>setForm(f=>({...f,priceDisclaimerFull:e.target.value}))} placeholder="Maelezo marefu ya disclaimer..." style={{minHeight:60}}/></Field>

          <Field label="Lessons List (Moja kwa kila mstari)"><Textarea value={Array.isArray(form.lessons)?form.lessons.join("\n"):form.lessons} onChange={e=>setForm(f=>({...f,lessons:e.target.value}))} placeholder="Lesson 1: Introduction\nLesson 2: Basics..." style={{minHeight:100}}/></Field>
          <Field label="What You Will Learn (Moja kwa kila mstari)"><Textarea value={Array.isArray(form.whatYouWillLearn)?form.whatYouWillLearn.join("\n"):form.whatYouWillLearn} onChange={e=>setForm(f=>({...f,whatYouWillLearn:e.target.value}))} placeholder="Skill 1\nSkill 2..." style={{minHeight:100}}/></Field>
          <Field label="What You Will Get (Moja kwa kila mstari)"><Textarea value={Array.isArray(form.whatYouWillGet)?form.whatYouWillGet.join("\n"):form.whatYouWillGet} onChange={e=>setForm(f=>({...f,whatYouWillGet:e.target.value}))} placeholder="Certificate\nSupport..." style={{minHeight:100}}/></Field>
          <Field label="Suitable For (Moja kwa kila mstari)"><Textarea value={Array.isArray(form.suitableFor)?form.suitableFor.join("\n"):form.suitableFor} onChange={e=>setForm(f=>({...f,suitableFor:e.target.value}))} placeholder="Beginners\nCreators..." style={{minHeight:100}}/></Field>
          <Field label="Requirements (Moja kwa kila mstari)"><Textarea value={Array.isArray(form.requirements)?form.requirements.join("\n"):form.requirements} onChange={e=>setForm(f=>({...f,requirements:e.target.value}))} placeholder="Laptop\nInternet..." style={{minHeight:100}}/></Field>

          <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:20, marginTop:10 }}>
            <h4 style={{ fontSize:16, marginBottom:16, color:G }}>Testimonials</h4>
            <div style={{ display:"grid", gap:20 }}>
              {[1,2,3].map(num => (
                <div key={num} style={{ background:"rgba(255,255,255,.02)", padding:16, borderRadius:12, border:"1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
                    <Field label={`Student ${num} Name`}><Input value={form[`testimonial${num}Name`]} onChange={e=>setForm(f=>({...f,[`testimonial${num}Name`]:e.target.value}))}/></Field>
                    <Field label={`Student ${num} Role`}><Input value={form[`testimonial${num}Role`]} onChange={e=>setForm(f=>({...f,[`testimonial${num}Role`]:e.target.value}))}/></Field>
                  </div>
                  <Field label={`Student ${num} Feedback`}><Textarea value={form[`testimonial${num}Text`]} onChange={e=>setForm(f=>({...f,[`testimonial${num}Text`]:e.target.value}))} style={{minHeight:60}}/></Field>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:20, marginTop:10 }}>
            <h4 style={{ fontSize:16, marginBottom:16, color:G }}>FAQs</h4>
            <div style={{ display:"grid", gap:20 }}>
              {[1,2,3].map(num => (
                <div key={num} style={{ background:"rgba(255,255,255,.02)", padding:16, borderRadius:12, border:"1px solid rgba(255,255,255,.05)" }}>
                  <Field label={`FAQ ${num} Question`}><Input value={form[`faq${num}Question`]} onChange={e=>setForm(f=>({...f,[`faq${num}Question`]:e.target.value}))}/></Field>
                  <Field label={`FAQ ${num} Answer`}><Textarea value={form[`faq${num}Answer`]} onChange={e=>setForm(f=>({...f,[`faq${num}Answer`]:e.target.value}))} style={{minHeight:60}}/></Field>
                </div>
              ))}
            </div>
          </div>

          <Field label="Accent Color (Optional Hex)"><Input value={form.accent} onChange={e=>setForm(f=>({...f,accent:e.target.value}))} placeholder="#f5a623"/></Field>
          <Btn onClick={save} disabled={loading}>{loading?"Inahifadhi...":editing?"💾 Hifadhi":"🚀 Weka Live"}</Btn>
        </div>
      </div>

      <div style={{ display:"grid", gap:12 }}>
        {docs.length===0 && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.35)" }}>Hakuna kozi bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item=>(
          <div key={item.id} style={{ borderRadius:16, border:"1px solid rgba(255,255,255,.07)", background:"#1a1d2e", padding:"14px 18px", display:"flex", gap:12, alignItems:"center" }}>
            <AdminThumb url={item.imageUrl} fallback="🎓" />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:2 }}>{item.title}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>{item.free?"🆓 Bure":"⭐ Paid"} · {item.price} · {(item.lessons||[]).length} lessons</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={()=>{
                setEditing(item.id);
                setForm({
                  ...form, // Default values from initial state
                  ...item,
                  carouselImages: item.carouselImages || [],
                  lessons: Array.isArray(item.lessons) ? item.lessons.join("\n") : (item.lessons || ""),
                  whatYouWillLearn: Array.isArray(item.whatYouWillLearn) ? item.whatYouWillLearn.join("\n") : (item.whatYouWillLearn || ""),
                  whatYouWillGet: Array.isArray(item.whatYouWillGet) ? item.whatYouWillGet.join("\n") : (item.whatYouWillGet || ""),
                  suitableFor: Array.isArray(item.suitableFor) ? item.suitableFor.join("\n") : (item.suitableFor || ""),
                  requirements: Array.isArray(item.requirements) ? item.requirements.join("\n") : (item.requirements || ""),
                });
                window.scrollTo({top:0,behavior:"smooth"});
              }} color="rgba(245,166,35,.12)" textColor={G} style={{padding:"8px 14px"}}>✏️</Btn>
              <Btn onClick={()=>del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"8px 14px"}}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PRODUCTS MANAGER
// ══════════════════════════════════════════════════════
function ProductsManager() {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ 
    name: "", description: "", price: "", oldPrice: "", imageUrl: "", badge: "", url: "", category: "Electronics",
    monetizationType: "affiliate", affiliateLink: "", whatsappLink: "", sellerName: "", sellerNotes: "", featured: false
  });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "products"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
    }, (err) => {
      console.error("Error loading products:", err);
    });
    return () => unsub();
  }, [db]);

  const save = async () => {
    const name = (form.name || "").toString();
    const price = (form.price || "").toString();
    if (!name.trim() || !price.trim()) { toast_("Weka jina na bei kwanza", "error"); return; }
    setLoading(true);
    try {
      const data = { ...form, createdAt: serverTimestamp() };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });

      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        console.log("Updating product:", editing, "Fields count:", Object.keys(updateData).length);
        await updateDoc(doc(db, "products", editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      }
      else { 
        console.log("Adding new product:", data);
        await addDoc(collection(db, "products"), data); 
        toast_("Bidhaa imewekwa live!"); 
      }
      setForm({ name: "", description: "", price: "", oldPrice: "", imageUrl: "", badge: "", url: "", category: "Electronics" });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "products");
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = async (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta bidhaa hii?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "products", id));
          setConfirm(null);
          toast_("Bidhaa imefutwa");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog {...confirm} />}
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", background: "#141823", padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, margin: "0 0 20px" }}>
          {editing ? "✏️ Hariri Bidhaa" : "➕ Ongeza Bidhaa Mpya"}
        </h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Jina la Bidhaa *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sony WH-1000XM4" /></Field>
            <Field label="Monetization Type">
              <select value={form.monetizationType} onChange={e => setForm(f => ({ ...f, monetizationType: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1a1d2e", border: "1px solid rgba(255,255,255,.1)", color: "white" }}>
                <option value="affiliate">Affiliate</option>
                <option value="manual_lead">Manual Lead</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
          </div>
          <ImageUploadField label="Real Image URL (Optional)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
          <Field label="Maelezo"><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Maelezo ya bidhaa..." style={{ minHeight: 80 }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Bei ya Sasa"><Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="TZS 850,000" /></Field>
            <Field label="Bei ya Zamani"><Input value={form.oldPrice} onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} placeholder="TZS 950,000" /></Field>
            <Field label="Badge (e.g. New)"><Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="HOT" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Affiliate URL"><Input value={form.affiliateLink} onChange={e => setForm(f => ({ ...f, affiliateLink: e.target.value }))} placeholder="https://amazon.com/..." /></Field>
            <Field label="WhatsApp URL"><Input value={form.whatsappLink} onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))} placeholder="https://wa.me/..." /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Seller Name"><Input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))} placeholder="Jina la Muuzaji" /></Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
              Featured
            </label>
          </div>
          <Field label="Seller Notes"><Textarea value={form.sellerNotes} onChange={e => setForm(f => ({ ...f, sellerNotes: e.target.value }))} placeholder="Maelezo ya muuzaji..." style={{ minHeight: 60 }} /></Field>
          <Btn onClick={save} disabled={loading}>{loading ? "Inahifadhi..." : editing ? "💾 Hifadhi" : "🚀 Weka Live"}</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {docs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna bidhaa bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item => (
          <div key={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <AdminThumb url={item.imageUrl} fallback="🏷️" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{item.category} · {item.price}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setEditing(item.id); setForm({ ...item }); window.scrollTo({ top: 0, behavior: "smooth" }); }} color="rgba(245,166,35,.12)" textColor={G} style={{ padding: "8px 14px" }}>✏️</Btn>
              <Btn onClick={() => del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{ padding: "8px 14px" }}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// WEBSITES MANAGER
// ══════════════════════════════════════════════════════
function WebsitesManager() {
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ name: "", url: "", description: "", iconUrl: "", imageUrl: "", bg: "linear-gradient(135deg,#667eea,#764ba2)", meta: "Free Tool", tags: "" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "websites"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
    }, (err) => {
      console.error("Error loading websites:", err);
    });
    return () => unsub();
  }, [db]);

  const save = async () => {
    const name = (form.name || "").toString();
    const url = (form.url || "").toString();
    if (!name.trim() || !url.trim()) { toast_("Weka jina na URL", "error"); return; }
    setLoading(true);
    try {
      const data = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean), createdAt: serverTimestamp() };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) data[key] = "";
      });

      if (data.imageUrl && data.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...data };
        delete updateData.id;
        delete updateData.createdAt;
        await updateDoc(doc(db, "websites", editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Imesahihishwa!");
      }
      else { await addDoc(collection(db, "websites"), data); toast_("Website imewekwa live!"); }
      setForm({ name: "", url: "", description: "", iconUrl: "", imageUrl: "", bg: "linear-gradient(135deg,#667eea,#764ba2)", meta: "Free Tool", tags: "" });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "websites");
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = async (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta website hii?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "websites", id));
          setConfirm(null);
          toast_("Website imefutwa");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog {...confirm} />}
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", background: "#141823", padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, margin: "0 0 20px" }}>
          {editing ? "✏️ Hariri Website" : "➕ Ongeza Website Mpya"}
        </h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <Field label="Jina la Website *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Remove.bg" /></Field>
          </div>
          <ImageUploadField label="Website Icon URL (Optional)" value={form.iconUrl} onChange={val => setForm(f => ({ ...f, iconUrl: val }))} />
          <ImageUploadField label="Thumbnail Image URL (Optional)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
          <Field label="URL *"><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://remove.bg" /></Field>
          <Field label="Maelezo"><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Maelezo mafupi..." style={{ minHeight: 80 }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Meta Info"><Input value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} placeholder="Free AI Tool" /></Field>
            <Field label="Tags (comma separated)"><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="AI, Design, Tools" /></Field>
          </div>
          <Btn onClick={save} disabled={loading}>{loading ? "Inahifadhi..." : editing ? "💾 Hifadhi" : "🚀 Weka Live"}</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {docs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna websites bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item => (
          <div key={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <AdminThumb url={item.iconUrl || item.imageUrl} fallback="🛠️" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{item.url}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setEditing(item.id); setForm({ iconUrl: "", imageUrl: "", ...item, tags: (item.tags || []).join(", ") }); window.scrollTo({ top: 0, behavior: "smooth" }); }} color="rgba(245,166,35,.12)" textColor={G} style={{ padding: "8px 14px" }}>✏️</Btn>
              <Btn onClick={() => del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{ padding: "8px 14px" }}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptsManager() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ 
    category: "", 
    title: "", 
    prompt: "", 
    imageUrl: "", 
    howToUse: "", 
    tools: [] 
  });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const db = getFirebaseDb();

  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "prompts"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => {
        const fieldA = a.updatedAt || a.createdAt;
        const fieldB = b.updatedAt || b.createdAt;
        const valA = fieldA?.toDate ? fieldA.toDate() : fieldA;
        const valB = fieldB?.toDate ? fieldB.toDate() : fieldB;
        const timeA = valA === null || valA === undefined ? Date.now() + 10000 : (typeof valA === 'number' ? valA : new Date(valA).getTime() || 0);
        const timeB = valB === null || valB === undefined ? Date.now() + 10000 : (typeof valB === 'number' ? valB : new Date(valB).getTime() || 0);
        return timeB - timeA;
      });
      setDocs(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Error loading prompts:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [db]);

  const save = async () => {
    if (!form.title || !form.prompt) return toast_("Jaza kila kitu!", "error");
    setLoading(true);
    try {
      const payload = {
        ...form,
        tools: form.tools.filter(t => t.toolUrl) // Filter out empty tools
      };

      // Ensure no undefined or null values are sent to Firestore
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null) payload[key] = "";
      });

      if (payload.imageUrl && payload.imageUrl.length > 900000) {
        throw new Error("Picha ni kubwa mno kwa database. Tafadhali tumia picha ndogo zaidi au weka link ya picha.");
      }

      if (editing) {
        const updateData = { ...payload };
        delete updateData.id;
        delete updateData.createdAt;
        await updateDoc(doc(db, "prompts", editing), { ...updateData, updatedAt: serverTimestamp() });
        toast_("Prompt imebadilishwa");
      } else {
        await addDoc(collection(db, "prompts"), { ...payload, createdAt: serverTimestamp() });
        toast_("Prompt mpya imeongezwa");
      }
      setForm({ category: "", title: "", prompt: "", imageUrl: "", howToUse: "", tools: [] });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "prompts");
      }
      toast_(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const addTool = () => {
    if (form.tools.length >= 5) return toast_("Mwisho ni tools 5 tu!", "error");
    setForm(f => ({ ...f, tools: [...f.tools, { iconUrl: "", toolUrl: "" }] }));
  };

  const updateTool = (index, field, value) => {
    const newTools = [...form.tools];
    newTools[index] = { ...newTools[index], [field]: value };
    setForm(f => ({ ...f, tools: newTools }));
  };

  const removeTool = (index) => {
    setForm(f => ({ ...f, tools: f.tools.filter((_, i) => i !== index) }));
  };

  const del = (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta prompt hii?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "prompts", id));
          setConfirm(null);
          toast_("Prompt imefutwa");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog {...confirm} />}
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", background: "#141823", padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, margin: "0 0 20px" }}>
          {editing ? "✏️ Hariri Prompt" : "➕ Ongeza Prompt Mpya"}
        </h3>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Title *"><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Business Plan Generator" /></Field>
          <ImageUploadField label="Real Image URL (Optional)" value={form.imageUrl} onChange={val => setForm(f => ({ ...f, imageUrl: val }))} />
          <Field label="Category"><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Biashara" /></Field>
          <Field label="Prompt *"><Textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} placeholder="Andika prompt yako hapa..." style={{ minHeight: 120 }} /></Field>
          
          <Field label="How to Use (Step by Step)"><Textarea value={form.howToUse} onChange={e => setForm(f => ({ ...f, howToUse: e.target.value }))} placeholder="1. Copy prompt\n2. Open ChatGPT\n3. Paste and run..." style={{ minHeight: 80 }} /></Field>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: 1 }}>Tools to Use (Max 5)</div>
              <Btn onClick={addTool} style={{ padding: "4px 12px", fontSize: 12 }} color="rgba(255,255,255,.05)">+ Ongeza Tool</Btn>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {form.tools.map((tool, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 10, alignItems: "end" }}>
                  <Field label={`Tool ${i+1} Icon URL`}><Input value={tool.iconUrl} onChange={e => updateTool(i, "iconUrl", e.target.value)} placeholder="https://... (ChatGPT icon)" /></Field>
                  <Field label={`Tool ${i+1} Website URL`}><Input value={tool.toolUrl} onChange={e => updateTool(i, "toolUrl", e.target.value)} placeholder="https://chat.openai.com" /></Field>
                  <Btn onClick={() => removeTool(i)} color="rgba(239,68,68,.1)" textColor="#fca5a5" style={{ padding: 10, marginBottom: 4 }}>✕</Btn>
                </div>
              ))}
            </div>
          </div>

          <Btn onClick={save} disabled={loading}>{loading ? "Inahifadhi..." : editing ? "💾 Hifadhi" : "🚀 Weka Live"}</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {docs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna prompts bado. Ongeza ya kwanza! 👆</div>}
        {docs.map(item => (
          <div key={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <AdminThumb url={item.imageUrl} fallback="🤖" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{item.category} • {item.tools?.length || 0} Tools</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setEditing(item.id); setForm({ ...item, tools: item.tools || [] }); window.scrollTo({ top: 0, behavior: "smooth" }); }} color="rgba(245,166,35,.12)" textColor={G} style={{ padding: "8px 14px" }}>✏️</Btn>
              <Btn onClick={() => del(item.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{ padding: "8px 14px" }}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SITE CONTENT MANAGER (About, Creator, Contact, Stats, FAQ)
// ══════════════════════════════════════════════════════
function SiteContentManager() {
  const [subTab, setSubTab] = useState("about_us");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const [hero, setHero] = useState({ title1: "", title2: "", topSubtitle: "", subtitle: "", quote: "", typedStrings: [] });
  const [aboutUs, setAboutUs] = useState({ title: "", shortDesc: "", fullDesc: "", mission: "", vision: "", btnText: "", btnLink: "" });
  const [aboutCreator, setAboutCreator] = useState({ fullName: "", title: "", shortBio: "", fullBio: "", origin: "", location: "", education: "", career: "", hobbies: "", contactText: "", contactLink: "", imageUrl: "", imageAlt: "" });
  const [contactInfo, setContactInfo] = useState({ whatsapp: "", email: "", supportMsg: "", officeText: "", socialLinks: { facebook: "", twitter: "", instagram: "", youtube: "", linkedin: "", tiktok: "" } });
  const [stats, setStats] = useState({ websitesBuilt: "", activeProjects: "", launchDate: "", achievements: "" });

  useEffect(() => {
    if (!db) return;
    const docs = ["hero", "about_us", "about_creator", "contact_info", "stats"];
    const unsubs = docs.map(id => 
      onSnapshot(doc(db, "site_settings", id), (snap) => {
        if (snap.exists()) {
          const data = snap.data().data;
          if (id === "hero") setHero(prev => ({ ...prev, ...data }));
          if (id === "about_us") setAboutUs(prev => ({ ...prev, ...data }));
          if (id === "about_creator") setAboutCreator(prev => ({ ...prev, ...data }));
          if (id === "contact_info") setContactInfo(prev => ({ ...prev, ...data }));
          if (id === "stats") setStats(prev => ({ ...prev, ...data }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [db]);

  const saveSettings = async (id, data) => {
    setLoading(true);
    try {
      await setDoc(doc(db, "site_settings", id), { data, updatedAt: serverTimestamp() });
      toast_("Imesahihishwa kikamilifu!");
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, OperationType.WRITE, `site_settings/${id}`);
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const SUB_TABS = [
    { id: "hero", label: "Hero Section", icon: "⚡" },
    { id: "about_us", label: "About Us", icon: "🏢" },
    { id: "about_creator", label: "Creator", icon: "👨‍💻" },
    { id: "contact_info", label: "Contact", icon: "📞" },
    { id: "stats", label: "Stats", icon: "📈" },
    { id: "faq", label: "FAQ", icon: "❓" },
  ];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ border: "none", borderRadius: 12, padding: "10px 18px", cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap",
              background: subTab === t.id ? `linear-gradient(135deg,${G},${G2})` : "rgba(255,255,255,.06)", color: subTab === t.id ? "#111" : "rgba(255,255,255,.6)",
              display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", background: "#141823", padding: 24 }}>
        {subTab === "hero" && (
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>⚡ Hero Section Settings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Title Part 1 (White)"><Input value={hero.title1} onChange={e => setHero({ ...hero, title1: e.target.value })} placeholder="SwahiliTech" /></Field>
              <Field label="Title Part 2 (Gradient)"><Input value={hero.title2} onChange={e => setHero({ ...hero, title2: e.target.value })} placeholder="Elite Academy" /></Field>
            </div>
            <Field label="Top Subtitle"><Input value={hero.topSubtitle} onChange={e => setHero({ ...hero, topSubtitle: e.target.value })} placeholder="Teknolojia kwa Kiswahili 🇹🇿" /></Field>
            <Field label="Main Description"><Textarea value={hero.subtitle} onChange={e => setHero({ ...hero, subtitle: e.target.value })} placeholder="STEA inaleta tech tips..." style={{ minHeight: 80 }} /></Field>
            <Field label="Yearly Quote"><Input value={hero.quote} onChange={e => setHero({ ...hero, quote: e.target.value })} placeholder="“Mwaka 2026 ni mwaka wako...”" /></Field>
            
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>Typed Strings (Animated Text)</label>
              {hero.typedStrings.map((str, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8 }}>
                  <Input value={str} onChange={e => {
                    const newStrings = [...hero.typedStrings];
                    newStrings[idx] = e.target.value;
                    setHero({ ...hero, typedStrings: newStrings });
                  }} />
                  <button onClick={() => setHero({ ...hero, typedStrings: hero.typedStrings.filter((_, i) => i !== idx) })}
                    style={{ background: "rgba(255,0,0,.1)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#ff4444" }}>
                    🗑️
                  </button>
                </div>
              ))}
              <button onClick={() => setHero({ ...hero, typedStrings: [...hero.typedStrings, ""] })}
                style={{ background: "rgba(255,255,255,.05)", border: "1px dashed rgba(255,255,255,.2)", borderRadius: 8, padding: 8, cursor: "pointer", color: G }}>
                + Add String
              </button>
            </div>

            <Btn onClick={() => saveSettings("hero", hero)} disabled={loading}>{loading ? "Inahifadhi..." : "💾 Hifadhi Mabadiliko"}</Btn>
          </div>
        )}

        {subTab === "about_us" && (
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>🏢 About STEA / About Us</h3>
            <Field label="Section Title"><Input value={aboutUs.title} onChange={e => setAboutUs({ ...aboutUs, title: e.target.value })} placeholder="Kuhusu STEA" /></Field>
            <Field label="Short Description"><Textarea value={aboutUs.shortDesc} onChange={e => setAboutUs({ ...aboutUs, shortDesc: e.target.value })} placeholder="Short intro..." style={{ minHeight: 60 }} /></Field>
            <Field label="Full Description"><Textarea value={aboutUs.fullDesc} onChange={e => setAboutUs({ ...aboutUs, fullDesc: e.target.value })} placeholder="Detailed about us..." style={{ minHeight: 120 }} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Mission"><Textarea value={aboutUs.mission} onChange={e => setAboutUs({ ...aboutUs, mission: e.target.value })} placeholder="Our mission..." style={{ minHeight: 80 }} /></Field>
              <Field label="Vision"><Textarea value={aboutUs.vision} onChange={e => setAboutUs({ ...aboutUs, vision: e.target.value })} placeholder="Our vision..." style={{ minHeight: 80 }} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Optional Button Text"><Input value={aboutUs.btnText} onChange={e => setAboutUs({ ...aboutUs, btnText: e.target.value })} placeholder="Learn More" /></Field>
              <Field label="Optional Button Link"><Input value={aboutUs.btnLink} onChange={e => setAboutUs({ ...aboutUs, btnLink: e.target.value })} placeholder="/about" /></Field>
            </div>
            <Btn onClick={() => saveSettings("about_us", aboutUs)} disabled={loading}>{loading ? "Inahifadhi..." : "💾 Hifadhi Mabadiliko"}</Btn>
          </div>
        )}

        {subTab === "about_creator" && (
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>👨‍💻 About the Creator</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Creator Full Name"><Input value={aboutCreator.fullName} onChange={e => setAboutCreator({ ...aboutCreator, fullName: e.target.value })} placeholder="Isaya Hans Masika" /></Field>
              <Field label="Title / Role"><Input value={aboutCreator.title} onChange={e => setAboutCreator({ ...aboutCreator, title: e.target.value })} placeholder="Founder & Developer" /></Field>
            </div>
            <ImageUploadField label="Creator Image (Will be used in profile card)" value={aboutCreator.imageUrl} onChange={val => setAboutCreator({ ...aboutCreator, imageUrl: val })} />
            <Field label="Image Alt Text"><Input value={aboutCreator.imageAlt} onChange={e => setAboutCreator({ ...aboutCreator, imageAlt: e.target.value })} placeholder="Isaya Hans Masika Profile" /></Field>
            <Field label="Short Bio"><Textarea value={aboutCreator.shortBio} onChange={e => setAboutCreator({ ...aboutCreator, shortBio: e.target.value })} placeholder="One sentence bio..." style={{ minHeight: 60 }} /></Field>
            <Field label="Full Bio"><Textarea value={aboutCreator.fullBio} onChange={e => setAboutCreator({ ...aboutCreator, fullBio: e.target.value })} placeholder="Detailed background..." style={{ minHeight: 120 }} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Country / Origin"><Input value={aboutCreator.origin} onChange={e => setAboutCreator({ ...aboutCreator, origin: e.target.value })} placeholder="Tanzania" /></Field>
              <Field label="Current Location"><Input value={aboutCreator.location} onChange={e => setAboutCreator({ ...aboutCreator, location: e.target.value })} placeholder="China" /></Field>
            </div>
            <Field label="Education Background"><Textarea value={aboutCreator.education} onChange={e => setAboutCreator({ ...aboutCreator, education: e.target.value })} placeholder="Degrees, schools..." style={{ minHeight: 60 }} /></Field>
            <Field label="Career / Profession"><Textarea value={aboutCreator.career} onChange={e => setAboutCreator({ ...aboutCreator, career: e.target.value })} placeholder="Work experience..." style={{ minHeight: 60 }} /></Field>
            <Field label="Hobbies / Interests"><Input value={aboutCreator.hobbies} onChange={e => setAboutCreator({ ...aboutCreator, hobbies: e.target.value })} placeholder="Tech, AI, Music..." /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Optional Contact Text"><Input value={aboutCreator.contactText} onChange={e => setAboutCreator({ ...aboutCreator, contactText: e.target.value })} placeholder="Contact Creator" /></Field>
              <Field label="WhatsApp / Contact Link"><Input value={aboutCreator.contactLink} onChange={e => setAboutCreator({ ...aboutCreator, contactLink: e.target.value })} placeholder="https://wa.me/..." /></Field>
            </div>
            <Btn onClick={() => saveSettings("about_creator", aboutCreator)} disabled={loading}>{loading ? "Inahifadhi..." : "💾 Hifadhi Mabadiliko"}</Btn>
          </div>
        )}

        {subTab === "contact_info" && (
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>📞 Contact & Support Info</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="WhatsApp Number"><Input value={contactInfo.whatsapp} onChange={e => setContactInfo({ ...contactInfo, whatsapp: e.target.value })} placeholder="255..." /></Field>
              <Field label="Email Address"><Input value={contactInfo.email} onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })} placeholder="support@stea.africa" /></Field>
            </div>
            <Field label="Support Message"><Textarea value={contactInfo.supportMsg} onChange={e => setContactInfo({ ...contactInfo, supportMsg: e.target.value })} placeholder="How can we help you?" style={{ minHeight: 60 }} /></Field>
            <Field label="Office / Location Text"><Input value={contactInfo.officeText} onChange={e => setContactInfo({ ...contactInfo, officeText: e.target.value })} placeholder="Mbezi Beach, Dar es Salaam" /></Field>
            
            <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 16 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, color: G }}>Social Links</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {Object.keys(contactInfo.socialLinks).map(key => (
                  <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                    <Input value={contactInfo.socialLinks[key]} onChange={e => setContactInfo({ ...contactInfo, socialLinks: { ...contactInfo.socialLinks, [key]: e.target.value } })} placeholder={`https://${key}.com/...`} />
                  </Field>
                ))}
              </div>
            </div>
            <Btn onClick={() => saveSettings("contact_info", contactInfo)} disabled={loading}>{loading ? "Inahifadhi..." : "💾 Hifadhi Mabadiliko"}</Btn>
          </div>
        )}

        {subTab === "stats" && (
          <div style={{ display: "grid", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>📈 Founder & Website Stats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Websites Built"><Input value={stats.websitesBuilt} onChange={e => setStats({ ...stats, websitesBuilt: e.target.value })} placeholder="50+" /></Field>
              <Field label="Active Projects"><Input value={stats.activeProjects} onChange={e => setStats({ ...stats, activeProjects: e.target.value })} placeholder="12" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Launch Date"><Input value={stats.launchDate} onChange={e => setStats({ ...stats, launchDate: e.target.value })} placeholder="Jan 2024" /></Field>
              <Field label="Short Achievements Text"><Input value={stats.achievements} onChange={e => setStats({ ...stats, achievements: e.target.value })} placeholder="Award winning academy" /></Field>
            </div>
            <Btn onClick={() => saveSettings("stats", stats)} disabled={loading}>{loading ? "Inahifadhi..." : "💾 Hifadhi Mabadiliko"}</Btn>
          </div>
        )}

        {subTab === "faq" && <FAQManager />}
      </div>
    </div>
  );
}

function FAQManager() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "", category: "General", order: 0, isActive: true });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "faqs"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [db]);

  const save = async () => {
    if (!form.question || !form.answer) return toast_("Jaza swali na jibu!", "error");
    setLoading(true);
    try {
      const data = { ...form, order: Number(form.order) };
      if (editing) {
        await updateDoc(doc(db, "faqs", editing), { ...data, updatedAt: serverTimestamp() });
        toast_("FAQ imebadilishwa");
      } else {
        await addDoc(collection(db, "faqs"), { ...data, createdAt: serverTimestamp() });
        toast_("FAQ mpya imeongezwa");
      }
      setForm({ question: "", answer: "", category: "General", order: faqs.length + 1, isActive: true });
      setEditing(null);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, editing ? OperationType.UPDATE : OperationType.CREATE, "faqs");
      }
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const del = (id) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta FAQ hii?",
      onConfirm: async () => {
        await deleteDoc(doc(db, "faqs", id));
        setConfirm(null);
        toast_("FAQ imefutwa");
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog {...confirm} />}
      
      <div style={{ background: "rgba(255,255,255,.02)", padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,.05)" }}>
        <h4 style={{ margin: "0 0 16px", fontSize: 16 }}>{editing ? "✏️ Edit FAQ" : "➕ Add New FAQ"}</h4>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Question"><Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Nitaanzaje?" /></Field>
          <Field label="Answer"><Textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Maelezo..." style={{ minHeight: 80 }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Category"><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="General" /></Field>
            <Field label="Order"><Input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} /></Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 24 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={loading}>{loading ? "Saving..." : editing ? "Update FAQ" : "Add FAQ"}</Btn>
            {editing && <Btn onClick={() => { setEditing(null); setForm({ question: "", answer: "", category: "General", order: faqs.length, isActive: true }); }} color="rgba(255,255,255,.05)" textColor="#fff">Cancel</Btn>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {faqs.map(f => (
          <div key={f.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.02)", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: f.isActive ? `${G}20` : "rgba(239,68,68,.1)", color: f.isActive ? G : "#fca5a5", display: "grid", placeItems: "center", fontWeight: 800 }}>{f.order}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.question}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{f.category} • {f.isActive ? "Active" : "Inactive"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setEditing(f.id); setForm(f); }} style={{ background: "transparent", border: "none", color: G, cursor: "pointer" }}>✏️</button>
              <button onClick={() => del(f.id)} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer" }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// USERS MANAGER
// ══════════════════════════════════════════════════════
function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const db = getFirebaseDb();

  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error loading users:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [db]);

  const setRole = async (uid, role) => {
    try {
      await updateDoc(doc(db, "users", uid), { role });
      toast_(`Role imebadilishwa kuwa ${role}`);
    } catch (e) {
      console.error(e);
      if (e.message.includes("insufficient permissions")) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
      }
      toast_(e.message, "error");
    }
  };

  const delUser = async (uid) => {
    setConfirm({
      msg: "Una uhakika unataka kufuta user huyu? Data zake zote zitafutwa Firestore (lakini account yake ya Auth itabaki mpaka uifute manual).",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", uid));
          setConfirm(null);
          toast_("User amefutwa Firestore");
        } catch (e) {
          toast_(e.message, "error");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  const filtered = users.filter(u =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog {...confirm} />}

      <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tafuta user kwa jina au email..."
            style={{ paddingLeft: 44 }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: .4 }}>🔍</span>
        </div>
        <div style={{ padding: "0 16px", height: 46, borderRadius: 12, background: "rgba(255,255,255,.05)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,.1)" }}>
          {users.length} Users
        </div>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)" }}>Inapakia users...</div> :
        filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.35)" }}>Hakuna users waliopatikana.</div> :
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(u => (
              <div key={u.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "#1a1d2e", padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: u.role === "admin" ? `linear-gradient(135deg,${G},${G2})` : "rgba(255,255,255,.05)", display: "grid", placeItems: "center", color: u.role === "admin" ? "#111" : "rgba(255,255,255,.4)", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
                  {(u.name || u.email || "U")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{u.name || "No name"}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", wordBreak: "break-all" }}>{u.email}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 2 }}>via {u.provider || "email"} · {timeAgo(u.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {u.role === "admin" ? <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: "rgba(245,166,35,.15)", color: G }}>⚡ Admin</span>
                    : <Btn onClick={() => setRole(u.id, "admin")} color="rgba(245,166,35,.1)" textColor={G} style={{ padding: "6px 12px", fontSize: 12 }}>Make Admin</Btn>}
                  {u.role === "admin" && u.email !== "isayamasika100@gmail.com" &&
                    <Btn onClick={() => setRole(u.id, "user")} color="rgba(255,255,255,.06)" textColor="rgba(255,255,255,.6)" style={{ padding: "6px 12px", fontSize: 12 }}>Remove Admin</Btn>}
                  {u.email !== "isayamasika100@gmail.com" &&
                    <Btn onClick={() => delUser(u.id)} color="rgba(239,68,68,.1)" textColor="#fca5a5" style={{ padding: "10px", borderRadius: 10 }}>🗑️</Btn>
                  }
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SPONSORED ADS MANAGER
// ══════════════════════════════════════════════════════
function SponsoredAdsManager() {
  const EMPTY_FORM = {
    title: "", clientName: "", imageUrl: "", shortText: "", ctaText: "", ctaLink: "",
    adType: "popup", campaignStatus: "draft", priority: 1,
    startDate: "", endDate: "",
    showDelaySeconds: 5, showFrequency: "once_per_day", maxViewsPerUserPerDay: 1,
    targetPages: ["all_pages"], isClosable: true, autoExpire: true,
    totalImpressions: 0, totalClicks: 0,
  };

  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "sponsored_ads"), limit(200));
    const unsub = onSnapshot(q, async (snap) => {
      const now = new Date();
      const ads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Auto-expire: if endDate passed and autoExpire=true, mark expired
      for (const ad of ads) {
        if (ad.autoExpire && ad.endDate && new Date(ad.endDate) < now && ad.campaignStatus !== "expired") {
          try { await updateDoc(doc(db, "sponsored_ads", ad.id), { campaignStatus: "expired" }); } catch (e) {}
        }
      }
      setDocs(ads.sort((a,b) => (b.priority||0) - (a.priority||0)));
    }, (err) => console.error("Error loading ads:", err));
    return () => unsub();
  }, [db]);

  const save = async () => {
    if (!form.title.trim()) { toast_("Weka title ya ad", "error"); return; }
    setLoading(true);
    try {
      const data = {
        ...form,
        priority: parseInt(form.priority) || 1,
        showDelaySeconds: parseInt(form.showDelaySeconds) || 5,
        maxViewsPerUserPerDay: parseInt(form.maxViewsPerUserPerDay) || 1,
        totalImpressions: form.totalImpressions || 0,
        totalClicks: form.totalClicks || 0,
        updatedAt: serverTimestamp(),
      };
      if (!editing) data.createdAt = serverTimestamp();
      if (editing) {
        await updateDoc(doc(db, "sponsored_ads", editing), data);
        toast_("✅ Campaign imesahihishwa!");
      } else {
        await addDoc(collection(db, "sponsored_ads"), data);
        toast_("🚀 Campaign imewekwa!");
      }
      setForm(EMPTY_FORM); setEditing(null); setShowForm(false);
    } catch (e) { console.error(e); toast_(e.message, "error"); }
    setLoading(false);
  };

  const quickStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "sponsored_ads", id), { campaignStatus: status, updatedAt: serverTimestamp() });
      toast_(`Status: ${status}`);
    } catch (e) { toast_(e.message, "error"); }
  };

  const del = (id) => setConfirm({
    msg: "Una uhakika unataka kufuta campaign hii?",
    onConfirm: async () => { await deleteDoc(doc(db, "sponsored_ads", id)); setConfirm(null); toast_("Imefutwa"); },
    onCancel: () => setConfirm(null),
  });

  const statusColor = (s) => ({
    active: "#22c55e", draft: "#94a3b8", paused: "#f59e0b", expired: "#ef4444"
  }[s] || "#94a3b8");

  const PAGE_OPTIONS = ["all_pages","home","tips","habari","deals","courses","duka","websites","prompts"];

  const togglePage = (p) => {
    const pages = form.targetPages || [];
    if (p === "all_pages") { setForm(f => ({ ...f, targetPages: ["all_pages"] })); return; }
    const without_all = pages.filter(x => x !== "all_pages");
    setForm(f => ({ ...f, targetPages: without_all.includes(p) ? without_all.filter(x => x !== p) : [...without_all, p] }));
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog {...confirm}/>}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
            {docs.filter(d=>d.campaignStatus==="active").length} active • {docs.filter(d=>d.campaignStatus==="expired").length} expired
          </div>
        </div>
        <Btn onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowForm(v => !v); }}>
          {showForm ? "✕ Funga" : "➕ Campaign Mpya"}
        </Btn>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"#141823", padding:24, marginBottom:28 }}>
          <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 20px" }}>
            {editing ? "✏️ Hariri Campaign" : "➕ Campaign Mpya"}
          </h3>
          <div style={{ display:"grid", gap:16 }}>

            {/* Basic Info */}
            <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(245,166,35,.06)", border:"1px solid rgba(245,166,35,.15)" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(245,166,35,.8)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:14 }}>📋 Basic Info</div>
              <div style={{ display:"grid", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Ad Title *"><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Airtel Summer Deal"/></Field>
                  <Field label="Client Name"><Input value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} placeholder="e.g. Airtel Tanzania"/></Field>
                </div>
                <Field label="Short Text / Tagline"><Input value={form.shortText} onChange={e=>setForm(f=>({...f,shortText:e.target.value}))} placeholder="Brief description shown on ad"/></Field>
                <ImageUploadField label="Ad Image (Banner/Popup)" value={form.imageUrl} onChange={val=>setForm(f=>({...f,imageUrl:val}))}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="CTA Button Text"><Input value={form.ctaText} onChange={e=>setForm(f=>({...f,ctaText:e.target.value}))} placeholder="e.g. Pata Deal Sasa"/></Field>
                  <Field label="CTA Link"><Input value={form.ctaLink} onChange={e=>setForm(f=>({...f,ctaLink:e.target.value}))} placeholder="https://..."/></Field>
                </div>
              </div>
            </div>

            {/* Campaign Settings */}
            <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(86,183,255,.05)", border:"1px solid rgba(86,183,255,.12)" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(86,183,255,.8)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:14 }}>⚙️ Campaign Settings</div>
              <div style={{ display:"grid", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <Field label="Ad Type">
                    <select value={form.adType} onChange={e=>setForm(f=>({...f,adType:e.target.value}))} style={{height:46,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",padding:"0 14px",width:"100%"}}>
                      <option value="popup">🔲 Popup</option>
                      <option value="banner">📰 Banner</option>
                      <option value="inline">📌 Inline</option>
                    </select>
                  </Field>
                  <Field label="Campaign Status">
                    <select value={form.campaignStatus} onChange={e=>setForm(f=>({...f,campaignStatus:e.target.value}))} style={{height:46,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",padding:"0 14px",width:"100%"}}>
                      <option value="draft">⬜ Draft</option>
                      <option value="active">🟢 Active</option>
                      <option value="paused">🟡 Paused</option>
                      <option value="expired">🔴 Expired</option>
                    </select>
                  </Field>
                  <Field label="Priority (1=low, 10=high)">
                    <Input type="number" min="1" max="10" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}/>
                  </Field>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Start Date"><Input type="datetime-local" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></Field>
                  <Field label="End Date"><Input type="datetime-local" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></Field>
                </div>
              </div>
            </div>

            {/* Popup Behavior */}
            {form.adType === "popup" && (
              <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(147,51,234,.05)", border:"1px solid rgba(147,51,234,.15)" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"rgba(167,139,250,.8)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:14 }}>🎯 Popup Behavior</div>
                <div style={{ display:"grid", gap:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <Field label="Show Delay (seconds)">
                      <Input type="number" min="0" max="60" value={form.showDelaySeconds} onChange={e=>setForm(f=>({...f,showDelaySeconds:e.target.value}))}/>
                    </Field>
                    <Field label="Show Frequency">
                      <select value={form.showFrequency} onChange={e=>setForm(f=>({...f,showFrequency:e.target.value}))} style={{height:46,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",padding:"0 14px",width:"100%"}}>
                        <option value="once_per_session">Once per Session</option>
                        <option value="once_per_day">Once per Day</option>
                        <option value="every_visit">Every Visit</option>
                      </select>
                    </Field>
                    <Field label="Max Views/User/Day">
                      <Input type="number" min="1" max="10" value={form.maxViewsPerUserPerDay} onChange={e=>setForm(f=>({...f,maxViewsPerUserPerDay:e.target.value}))}/>
                    </Field>
                  </div>
                  <div style={{ display:"flex", gap:24, alignItems:"center" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
                      <input type="checkbox" checked={form.isClosable} onChange={e=>setForm(f=>({...f,isClosable:e.target.checked}))} style={{width:16,height:16,accentColor:"#F5A623"}}/>
                      <span>Show Close Button (X)</span>
                    </label>
                    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
                      <input type="checkbox" checked={form.autoExpire} onChange={e=>setForm(f=>({...f,autoExpire:e.target.checked}))} style={{width:16,height:16,accentColor:"#F5A623"}}/>
                      <span>Auto-Expire on End Date</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Target Pages */}
            <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:14 }}>📍 Target Pages</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {PAGE_OPTIONS.map(p => {
                  const active = (form.targetPages||[]).includes(p);
                  return (
                    <button key={p} onClick={()=>togglePage(p)} style={{
                      padding:"7px 14px", borderRadius:99, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                      background: active ? "linear-gradient(135deg,#F5A623,#FFD17C)" : "rgba(255,255,255,.07)",
                      color: active ? "#111" : "rgba(255,255,255,.6)",
                      transition:"all .15s",
                    }}>{p}</button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={save} disabled={loading} style={{ flex:1 }}>{loading ? "Inahifadhi..." : editing ? "💾 Hifadhi Mabadiliko" : "🚀 Launch Campaign"}</Btn>
              {editing && (
                <Btn onClick={()=>{setForm(EMPTY_FORM);setEditing(null);setShowForm(false);}} color="rgba(255,255,255,.06)" textColor="#fff">✕ Acha</Btn>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div>
        <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:14 }}>
          All Campaigns ({docs.length})
        </div>
        {docs.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"rgba(255,255,255,.25)", fontSize:14 }}>
            Hakuna campaigns bado. Ongeza ya kwanza! ☝️
          </div>
        )}
        <div style={{ display:"grid", gap:10 }}>
          {docs.map(item => {
            const now = new Date();
            const isLive = item.campaignStatus === "active"
              && (!item.startDate || new Date(item.startDate) <= now)
              && (!item.endDate || new Date(item.endDate) >= now);
            const ctr = item.totalImpressions > 0 ? ((item.totalClicks / item.totalImpressions) * 100).toFixed(1) : "0.0";
            return (
              <div key={item.id} style={{
                borderRadius:16, border:`1px solid ${isLive ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.07)"}`,
                background: isLive ? "rgba(34,197,94,.04)" : "#1a1d2e",
                padding:"14px 18px",
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" style={{ width:52, height:52, borderRadius:10, objectFit:"cover", flexShrink:0 }} referrerPolicy="no-referrer"/>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:800, fontSize:15 }}>{item.title}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:`${statusColor(item.campaignStatus)}22`, color:statusColor(item.campaignStatus) }}>
                        {item.campaignStatus || "draft"}
                      </span>
                      {isLive && <span style={{ fontSize:10, fontWeight:800, color:"#22c55e", animation:"pulse 2s infinite" }}>● LIVE</span>}
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:6 }}>
                      {item.clientName} • {item.adType} • Priority {item.priority||1}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", display:"flex", gap:16, flexWrap:"wrap" }}>
                      {item.startDate && <span>Start: {new Date(item.startDate).toLocaleDateString()}</span>}
                      {item.endDate && <span>End: {new Date(item.endDate).toLocaleDateString()}</span>}
                      <span>⏱ {item.showDelaySeconds||5}s delay</span>
                      <span>📄 {(item.targetPages||[]).join(", ")}</span>
                    </div>
                    {/* Stats */}
                    <div style={{ display:"flex", gap:16, marginTop:10, flexWrap:"wrap" }}>
                      {[
                        {label:"👁 Impressions", val: item.totalImpressions||0, color:"#60a5fa"},
                        {label:"🖱 Clicks", val: item.totalClicks||0, color:"#34d399"},
                        {label:"📊 CTR", val:`${ctr}%`, color:"#f59e0b"},
                      ].map(s => (
                        <div key={s.label} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.val}</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    <Btn onClick={()=>{setEditing(item.id);setForm({...EMPTY_FORM,...item});setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}} color="rgba(245,166,35,.12)" textColor={G} style={{padding:"6px 12px",fontSize:12}}>✏️ Edit</Btn>
                    {item.campaignStatus !== "active" && (
                      <Btn onClick={()=>quickStatus(item.id,"active")} color="rgba(34,197,94,.12)" textColor="#22c55e" style={{padding:"6px 12px",fontSize:12}}>▶ Activate</Btn>
                    )}
                    {item.campaignStatus === "active" && (
                      <Btn onClick={()=>quickStatus(item.id,"paused")} color="rgba(245,158,11,.12)" textColor="#f59e0b" style={{padding:"6px 12px",fontSize:12}}>⏸ Pause</Btn>
                    )}
                    {item.campaignStatus !== "expired" && (
                      <Btn onClick={()=>quickStatus(item.id,"expired")} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"6px 12px",fontSize:12}}>⛔ Expire</Btn>
                    )}
                    <Btn onClick={()=>del(item.id)} color="rgba(239,68,68,.08)" textColor="#fca5a5" style={{padding:"6px 12px",fontSize:12}}>🗑️</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// COMMERCE MANAGER
// ══════════════════════════════════════════════════════
function CommerceManager() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [notes, setNotes] = useState({});
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "orders"), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({id:d.id,...d.data()}));
      data.sort((a,b) => {
        const ta = a.createdAt?.toDate?.() || new Date(a.createdAt||0);
        const tb = b.createdAt?.toDate?.() || new Date(b.createdAt||0);
        return tb - ta;
      });
      setOrders(data);
    }, err => console.error("orders:", err));
    return () => unsub();
  }, [db]);

  const updateOrder = async (id, fields) => {
    try { await updateDoc(doc(db,"orders",id), {...fields, updatedAt: serverTimestamp()}); toast_("Order imesahihishwa!"); }
    catch(e) { toast_(e.message,"error"); }
  };

  const counts = {
    all: orders.length,
    pending: orders.filter(o=>o.orderStatus==="pending"||o.status==="pending").length,
    approved: orders.filter(o=>o.orderStatus==="approved"||o.status==="approved").length,
    completed: orders.filter(o=>o.orderStatus==="completed"||o.status==="completed").length,
    rejected: orders.filter(o=>o.orderStatus==="rejected"||o.status==="rejected").length,
  };

  const filtered = filter==="all" ? orders : orders.filter(o=>(o.orderStatus||o.status)===filter);
  const statusColor = s => ({pending:"#f59e0b",approved:"#22c55e",completed:"#60a5fa",rejected:"#ef4444"}[s]||"#94a3b8");
  const fmtDate = ts => { try { const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString()+" "+d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); } catch{return "-";} };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog {...confirm}/>}
      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        {[["all","📋","All",counts.all,"#60a5fa"],["pending","⏳","Pending",counts.pending,"#f59e0b"],["approved","✅","Approved",counts.approved,"#22c55e"],["completed","🏁","Completed",counts.completed,"#56b7ff"],["rejected","❌","Rejected",counts.rejected,"#ef4444"]].map(([f,ic,lb,val,col])=>(
          <div key={f} onClick={()=>setFilter(f)} style={{borderRadius:14,padding:"14px 16px",border:`1px solid ${filter===f?col+"55":"rgba(255,255,255,.07)"}`,background:filter===f?col+"11":"#141823",cursor:"pointer",transition:"all .2s"}}>
            <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
            <div style={{fontSize:22,fontWeight:800,color:col}}>{val}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,.25)",fontSize:14}}>Hakuna orders {filter!=="all"?`(${filter})`:""}. Data itaonekana hapa baada ya orders kuwasilishwa.</div>}
      <div style={{display:"grid",gap:10}}>
        {filtered.map(o => {
          const st = o.orderStatus || o.status || "pending";
          return (
            <div key={o.id} style={{borderRadius:16,border:`1px solid ${statusColor(st)}33`,background:"#141823",padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:15}}>{o.customerName||o.buyerName||"Customer"}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:statusColor(st)+"22",color:statusColor(st)}}>{st}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>#{o.id.slice(-8)}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:8}}>
                    <span>📦 {o.productName||o.dealId||o.itemName||"—"}</span>
                    <span>💰 TZS {o.amount||o.amountPaid||"—"}</span>
                    <span>💳 {o.paymentMethod||"—"}</span>
                    <span>📅 {fmtDate(o.createdAt)}</span>
                  </div>
                  {o.customerPhone && <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>📱 {o.customerPhone}</div>}
                  {o.customerEmail && <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>📧 {o.customerEmail}</div>}
                </div>
                {/* Actions */}
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  {st==="pending" && <>
                    <Btn onClick={()=>updateOrder(o.id,{orderStatus:"approved"})} color="rgba(34,197,94,.15)" textColor="#22c55e" style={{padding:"6px 12px",fontSize:12}}>✅ Approve</Btn>
                    <Btn onClick={()=>updateOrder(o.id,{orderStatus:"rejected"})} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"6px 12px",fontSize:12}}>❌ Reject</Btn>
                  </>}
                  {st==="approved" && (
                    <Btn onClick={()=>updateOrder(o.id,{orderStatus:"completed"})} color="rgba(96,165,250,.15)" textColor="#60a5fa" style={{padding:"6px 12px",fontSize:12}}>🏁 Complete</Btn>
                  )}
                  {(st==="pending"||st==="approved") && (
                    <Btn onClick={()=>{ const n=notes[o.id]||""; updateOrder(o.id,{adminNote:n}); }} color="rgba(245,166,35,.1)" textColor={G} style={{padding:"6px 12px",fontSize:12}}>💾 Note</Btn>
                  )}
                </div>
              </div>
              {/* Note field */}
              <div style={{marginTop:10}}>
                <input value={notes[o.id]||o.adminNote||""} onChange={e=>setNotes(n=>({...n,[o.id]:e.target.value}))}
                  placeholder="Admin note (optional)..."
                  style={{width:"100%",height:36,borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.04)",color:"#fff",padding:"0 12px",outline:"none",fontSize:13}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PAYMENT REVIEW MANAGER — FULL
// ══════════════════════════════════════════════════════
function PaymentReviewManager() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db,"payments"), limit(500));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b) => {
        const ta = a.submittedAt?.toDate?.() || new Date(a.submittedAt||0);
        const tb = b.submittedAt?.toDate?.() || new Date(b.submittedAt||0);
        return tb - ta;
      });
      setPayments(data);
    }, err => console.error("payments:", err));
    return () => unsub();
  }, [db]);

  const review = async (id, status, note) => {
    try {
      await updateDoc(doc(db,"payments",id), { reviewStatus:status, reviewNote:note||"", reviewedAt:serverTimestamp() });
      // Also update linked order if exists
      const p = payments.find(x=>x.id===id);
      if (p?.orderId) {
        try { await updateDoc(doc(db,"orders",p.orderId), { paymentStatus:status, updatedAt:serverTimestamp() }); } catch(e){}
      }
      toast_(`Payment ${status}!`);
    } catch(e) { toast_(e.message,"error"); }
  };

  const counts = { all:payments.length, pending:payments.filter(p=>p.reviewStatus==="pending"||!p.reviewStatus).length, approved:payments.filter(p=>p.reviewStatus==="approved").length, rejected:payments.filter(p=>p.reviewStatus==="rejected").length };
  const filtered = filter==="all" ? payments : payments.filter(p=>(p.reviewStatus||"pending")===filter);
  const statusColor = s => ({pending:"#f59e0b",approved:"#22c55e",rejected:"#ef4444"}[s]||"#f59e0b");
  const fmtDate = ts => { try { const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString(); } catch{return "-";} };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {/* Image preview modal */}
      {preview && (
        <div onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.9)",display:"grid",placeItems:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:600,width:"100%"}}>
            <button onClick={()=>setPreview(null)} style={{position:"absolute",top:-40,right:0,background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer"}}>✕</button>
            <img src={preview} alt="Payment proof" style={{width:"100%",borderRadius:16,objectFit:"contain",maxHeight:"80vh"}} referrerPolicy="no-referrer"/>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["pending","⏳","Pending Review",counts.pending,"#f59e0b"],["approved","✅","Approved",counts.approved,"#22c55e"],["rejected","❌","Rejected",counts.rejected,"#ef4444"],["all","📋","All",counts.all,"#60a5fa"]].map(([f,ic,lb,val,col])=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"9px 18px",borderRadius:12,border:`1px solid ${filter===f?col:col+"33"}`,background:filter===f?col+"18":"transparent",color:filter===f?col:"rgba(255,255,255,.5)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            {ic} {lb} ({val})
          </button>
        ))}
      </div>

      {filtered.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,.25)",fontSize:14}}>Hakuna malipo ya {filter}. Malipo yataonekana hapa yanapowasilishwa.</div>}

      <div style={{display:"grid",gap:12}}>
        {filtered.map(p => {
          const st = p.reviewStatus || "pending";
          return (
            <div key={p.id} style={{borderRadius:16,border:`1px solid ${statusColor(st)}33`,background:"#141823",padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
                {/* Screenshot */}
                {p.screenshotUrl && (
                  <div onClick={()=>setPreview(p.screenshotUrl)} style={{width:80,height:80,borderRadius:12,overflow:"hidden",flexShrink:0,cursor:"pointer",border:"1px solid rgba(255,255,255,.1)"}}>
                    <img src={p.screenshotUrl} alt="proof" style={{width:"100%",height:"100%",objectFit:"cover"}} referrerPolicy="no-referrer"/>
                    <div style={{fontSize:9,textAlign:"center",color:"rgba(255,255,255,.4)",marginTop:2}}>Tap to view</div>
                  </div>
                )}
                {!p.screenshotUrl && (
                  <div style={{width:72,height:72,borderRadius:12,background:"rgba(255,255,255,.04)",display:"grid",placeItems:"center",flexShrink:0,fontSize:24}}>📄</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:15}}>{p.customerName||p.buyerName||"Customer"}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:statusColor(st)+"22",color:statusColor(st)}}>{st}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:8}}>
                    <span>💰 TZS {p.amountPaid||p.amount||"—"}</span>
                    <span>💳 {p.paymentMethod||"—"}</span>
                    <span>🔖 Ref: {p.paymentReference||p.reference||"—"}</span>
                    <span>📅 {fmtDate(p.submittedAt||p.createdAt)}</span>
                  </div>
                  {p.productName && <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>📦 {p.productName}</div>}
                  {p.reviewNote && <div style={{marginTop:8,padding:"8px 12px",borderRadius:9,background:"rgba(255,255,255,.04)",fontSize:12,color:"rgba(255,255,255,.5)"}}>Note: {p.reviewNote}</div>}
                </div>
                {st==="pending" && (
                  <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                    <Btn onClick={()=>review(p.id,"approved",notes[p.id])} color="rgba(34,197,94,.15)" textColor="#22c55e" style={{padding:"8px 14px",fontSize:12}}>✅ Approve</Btn>
                    <Btn onClick={()=>review(p.id,"rejected",notes[p.id])} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"8px 14px",fontSize:12}}>❌ Reject</Btn>
                  </div>
                )}
              </div>
              {st==="pending" && (
                <div style={{marginTop:10}}>
                  <input value={notes[p.id]||""} onChange={e=>setNotes(n=>({...n,[p.id]:e.target.value}))}
                    placeholder="Review note (optional — will be saved with decision)..."
                    style={{width:"100%",height:36,borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.04)",color:"#fff",padding:"0 12px",outline:"none",fontSize:13}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SUBSCRIPTION MANAGER — FULL
// ══════════════════════════════════════════════════════
function SubscriptionManager() {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState("active");
  const [toast, setToast] = useState(null);
  const [extendDays, setExtendDays] = useState({});
  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db,"subscriptions"), limit(500));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>{
        const ta = a.endDate?.toDate?.() || new Date(a.endDate||0);
        const tb = b.endDate?.toDate?.() || new Date(b.endDate||0);
        return ta - tb;
      });
      setSubs(data);
    }, err => console.error("subs:", err));
    return () => unsub();
  }, [db]);

  const updateSub = async (id, fields) => {
    try { await updateDoc(doc(db,"subscriptions",id), {...fields, updatedAt:serverTimestamp()}); toast_("Imesahihishwa!"); }
    catch(e) { toast_(e.message,"error"); }
  };

  const extendSub = async (id, days) => {
    const sub = subs.find(s=>s.id===id);
    if (!sub) return;
    const endDate = sub.endDate?.toDate?.() || new Date(sub.endDate || Date.now());
    endDate.setDate(endDate.getDate() + parseInt(days||30));
    await updateSub(id, { endDate: endDate.toISOString(), status: "active" });
  };

  const daysLeft = (endDate) => {
    try {
      const end = endDate?.toDate?.() || new Date(endDate);
      const diff = Math.ceil((end - new Date()) / (1000*60*60*24));
      return diff;
    } catch { return null; }
  };

  const categorize = (sub) => {
    const dl = daysLeft(sub.endDate);
    if (sub.status==="cancelled") return "cancelled";
    if (dl === null) return "active";
    if (dl < 0) return "expired";
    if (dl <= 3) return "expiring";
    return "active";
  };

  const cats = { active:subs.filter(s=>categorize(s)==="active"), expiring:subs.filter(s=>categorize(s)==="expiring"), expired:subs.filter(s=>categorize(s)==="expired"||s.status==="expired"), cancelled:subs.filter(s=>s.status==="cancelled") };
  const filtered = filter==="all" ? subs : (cats[filter]||[]);
  const fmtDate = ts => { try { const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString(); } catch{return "-";} };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {/* Summary tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["active","🟢","Active",cats.active.length,"#22c55e"],["expiring","🟡","Expiring Soon",cats.expiring.length,"#f59e0b"],["expired","🔴","Expired",cats.expired.length,"#ef4444"],["cancelled","⚫","Cancelled",cats.cancelled.length,"#94a3b8"],["all","📋","All",subs.length,"#60a5fa"]].map(([f,ic,lb,val,col])=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"9px 18px",borderRadius:12,border:`1px solid ${filter===f?col:col+"33"}`,background:filter===f?col+"18":"transparent",color:filter===f?col:"rgba(255,255,255,.5)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            {ic} {lb} ({val})
          </button>
        ))}
      </div>

      {filtered.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,.25)",fontSize:14}}>Hakuna subscriptions za "{filter}". Subscriptions zitaonekana hapa zikiwekwa.</div>}

      <div style={{display:"grid",gap:10}}>
        {filtered.map(s => {
          const dl = daysLeft(s.endDate);
          const cat = categorize(s);
          const catColor = {active:"#22c55e",expiring:"#f59e0b",expired:"#ef4444",cancelled:"#94a3b8"}[cat]||"#22c55e";
          return (
            <div key={s.id} style={{borderRadius:16,border:`1px solid ${catColor}33`,background:"#141823",padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:15}}>{s.customerName||s.buyerName||"Customer"}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:catColor+"22",color:catColor}}>{cat}</span>
                    {dl !== null && <span style={{fontSize:11,color:dl<=3?"#f59e0b":"rgba(255,255,255,.35)"}}>{dl>=0?`${dl} days left`:"Expired"}</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,fontSize:13,color:"rgba(255,255,255,.5)"}}>
                    <span>📦 {s.productName||s.dealTitle||s.planName||"—"}</span>
                    <span>📅 Start: {fmtDate(s.startDate||s.createdAt)}</span>
                    <span>🏁 End: {fmtDate(s.endDate)}</span>
                    <span>💰 {s.amount||s.price||"—"}</span>
                  </div>
                  {s.customerPhone && <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:4}}>📱 {s.customerPhone}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  <div style={{display:"flex",gap:4}}>
                    <input value={extendDays[s.id]||"30"} onChange={e=>setExtendDays(d=>({...d,[s.id]:e.target.value}))}
                      style={{width:48,height:32,borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"#fff",textAlign:"center",fontSize:12,outline:"none"}}/>
                    <Btn onClick={()=>extendSub(s.id,extendDays[s.id]||30)} color="rgba(34,197,94,.15)" textColor="#22c55e" style={{padding:"6px 10px",fontSize:11}}>+Extend</Btn>
                  </div>
                  {s.status!=="cancelled" && <Btn onClick={()=>updateSub(s.id,{status:"cancelled"})} color="rgba(239,68,68,.1)" textColor="#fca5a5" style={{padding:"6px 10px",fontSize:11}}>✕ Cancel</Btn>}
                  {(cat==="expired"||s.status==="cancelled") && <Btn onClick={()=>updateSub(s.id,{status:"active"})} color="rgba(34,197,94,.1)" textColor="#22c55e" style={{padding:"6px 10px",fontSize:11}}>↩ Renew</Btn>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DELIVERY MANAGER — FULL
// ══════════════════════════════════════════════════════
function DeliveryManager() {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [newDel, setNewDel] = useState({customer:"",product:"",accessType:"digital_link",accessDetails:"",phone:"",email:""});
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db,"deliveries"), limit(500));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>{
        const ta = a.createdAt?.toDate?.() || new Date(a.createdAt||0);
        const tb = b.createdAt?.toDate?.() || new Date(b.createdAt||0);
        return tb - ta;
      });
      setDeliveries(data);
    }, err => console.error("deliveries:", err));
    return () => unsub();
  }, [db]);

  const updateDel = async (id, fields) => {
    try { await updateDoc(doc(db,"deliveries",id), {...fields, updatedAt:serverTimestamp()}); toast_("Imesahihishwa!"); }
    catch(e) { toast_(e.message,"error"); }
  };

  const createDelivery = async () => {
    if (!newDel.customer.trim()) { toast_("Weka jina la customer","error"); return; }
    try {
      await addDoc(collection(db,"deliveries"), { ...newDel, deliveryStatus:"pending", createdAt:serverTimestamp() });
      setNewDel({customer:"",product:"",accessType:"digital_link",accessDetails:"",phone:"",email:""});
      setShowForm(false);
      toast_("Delivery imeundwa!");
    } catch(e) { toast_(e.message,"error"); }
  };

  const counts = { pending:deliveries.filter(d=>d.deliveryStatus==="pending").length, sent:deliveries.filter(d=>d.deliveryStatus==="sent").length, delivered:deliveries.filter(d=>d.deliveryStatus==="delivered").length };
  const filtered = filter==="all" ? deliveries : deliveries.filter(d=>d.deliveryStatus===filter);
  const statusColor = s => ({pending:"#f59e0b",sent:"#60a5fa",delivered:"#22c55e"}[s]||"#94a3b8");
  const fmtDate = ts => { try { const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString(); } catch{return "-";} };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["pending","⏳","Pending",counts.pending,"#f59e0b"],["sent","📤","Sent",counts.sent,"#60a5fa"],["delivered","✅","Delivered",counts.delivered,"#22c55e"],["all","📋","All",deliveries.length,"#94a3b8"]].map(([f,ic,lb,val,col])=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"8px 16px",borderRadius:12,border:`1px solid ${filter===f?col:col+"33"}`,background:filter===f?col+"18":"transparent",color:filter===f?col:"rgba(255,255,255,.5)",fontWeight:800,fontSize:12,cursor:"pointer"}}>
              {ic} {lb} ({val})
            </button>
          ))}
        </div>
        <Btn onClick={()=>setShowForm(v=>!v)}>{showForm?"✕ Funga":"➕ Delivery Mpya"}</Btn>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{borderRadius:20,border:"1px solid rgba(255,255,255,.08)",background:"#141823",padding:20,marginBottom:20}}>
          <h3 style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:18,margin:"0 0 16px"}}>➕ New Delivery Task</h3>
          <div style={{display:"grid",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Customer Name *"><Input value={newDel.customer} onChange={e=>setNewDel(d=>({...d,customer:e.target.value}))} placeholder="Jina la customer"/></Field>
              <Field label="Product/Course"><Input value={newDel.product} onChange={e=>setNewDel(d=>({...d,product:e.target.value}))} placeholder="Kitu kilichonunuliwa"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <Field label="Phone"><Input value={newDel.phone} onChange={e=>setNewDel(d=>({...d,phone:e.target.value}))} placeholder="+255..."/></Field>
              <Field label="Email"><Input value={newDel.email} onChange={e=>setNewDel(d=>({...d,email:e.target.value}))} placeholder="email@..."/></Field>
              <Field label="Access Type">
                <select value={newDel.accessType} onChange={e=>setNewDel(d=>({...d,accessType:e.target.value}))} style={{height:46,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",padding:"0 14px",width:"100%"}}>
                  <option value="digital_link">🔗 Digital Link</option>
                  <option value="whatsapp_group">💬 WhatsApp Group</option>
                  <option value="email_course">📧 Email Course</option>
                  <option value="zoom_meeting">📹 Zoom Meeting</option>
                  <option value="physical">📦 Physical</option>
                </select>
              </Field>
            </div>
            <Field label="Access Details (link, group, info)">
              <Textarea value={newDel.accessDetails} onChange={e=>setNewDel(d=>({...d,accessDetails:e.target.value}))} placeholder="Link ya course, WhatsApp group link, au maelezo..." style={{minHeight:70}}/>
            </Field>
            <Btn onClick={createDelivery}>🚀 Unda Delivery</Btn>
          </div>
        </div>
      )}

      {filtered.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,.25)",fontSize:14}}>Hakuna deliveries za "{filter}". Ongeza delivery mpya ukitumia kitufe hapo juu.</div>}

      <div style={{display:"grid",gap:10}}>
        {filtered.map(d => {
          const st = d.deliveryStatus || "pending";
          return (
            <div key={d.id} style={{borderRadius:16,border:`1px solid ${statusColor(st)}33`,background:"#141823",padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:15}}>{d.customer||d.customerName||"Customer"}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:statusColor(st)+"22",color:statusColor(st)}}>{st}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>{d.accessType||"digital"}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:6}}>
                    <span>📦 {d.product||d.productName||"—"}</span>
                    {d.phone && <span>📱 {d.phone}</span>}
                    {d.email && <span>📧 {d.email}</span>}
                    <span>📅 {fmtDate(d.createdAt)}</span>
                    {d.sentAt && <span>📤 Sent: {fmtDate(d.sentAt)}</span>}
                  </div>
                  {d.accessDetails && <div style={{fontSize:12,color:"rgba(255,255,255,.4)",padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,.03)",fontFamily:"monospace",wordBreak:"break-all"}}>{d.accessDetails}</div>}
                  {d.adminNote && <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:6}}>Note: {d.adminNote}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  {st==="pending" && <Btn onClick={()=>updateDel(d.id,{deliveryStatus:"sent",sentAt:serverTimestamp()})} color="rgba(96,165,250,.15)" textColor="#60a5fa" style={{padding:"6px 12px",fontSize:12}}>📤 Mark Sent</Btn>}
                  {st==="sent" && <Btn onClick={()=>updateDel(d.id,{deliveryStatus:"delivered",deliveredAt:serverTimestamp()})} color="rgba(34,197,94,.15)" textColor="#22c55e" style={{padding:"6px 12px",fontSize:12}}>✅ Delivered</Btn>}
                  <Btn onClick={()=>updateDel(d.id,{adminNote:notes[d.id]||""})} color="rgba(245,166,35,.1)" textColor={G} style={{padding:"6px 12px",fontSize:12}}>💾 Note</Btn>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <input value={notes[d.id]||d.adminNote||""} onChange={e=>setNotes(n=>({...n,[d.id]:e.target.value}))}
                  placeholder="Admin delivery note..."
                  style={{width:"100%",height:36,borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.04)",color:"#fff",padding:"0 12px",outline:"none",fontSize:13}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MESSAGE TEMPLATE MANAGER — FULL
// ══════════════════════════════════════════════════════
function MessageTemplateManager() {
  const DEFAULT_TEMPLATES = [
    { key:"payment_instructions", label:"💳 Payment Instructions", icon:"💳", defaultContent:"Asante kwa kuchagua {product}!\n\nTafadhali lipa kiasi cha TZS {amount} kwa njia zifuatazo:\n\n📱 M-Pesa: {mpesa_number}\n📱 Tigo Pesa: {tigopesa_number}\n\nBaada ya kulipa, tuma screenshot ya malipo yako kwenye WhatsApp: {whatsapp_number}\n\nRef: {order_id}" },
    { key:"payment_approved", label:"✅ Payment Approved", icon:"✅", defaultContent:"🎉 Hongera {customer_name}!\n\nMalipo yako ya TZS {amount} yamekubaliwa.\n\nOrder yako: {product}\nRef: {order_id}\n\nUtapata maelekezo ya upatikanaji hivi karibuni.\n\nAsante kwa kuamini STEA! 🇹🇿" },
    { key:"payment_rejected", label:"❌ Payment Rejected", icon:"❌", defaultContent:"Habari {customer_name},\n\nSamahani, malipo yako ya TZS {amount} hayakukubaliwa.\n\nSababu: {rejection_reason}\n\nTafadhali wasiliana nasi WhatsApp {whatsapp_number} tupate suluhisho.\n\nSTEA Team" },
    { key:"subscription_reminder_3days", label:"⏰ Sub Reminder 3 Days", icon:"⏰", defaultContent:"Habari {customer_name}!\n\nSubscription yako ya {product} itaisha siku 3 zijazo ({end_date}).\n\nKwa kuendelea kupata huduma, fanya malipo mapya: {renewal_link}\n\nAsante! — STEA Team" },
    { key:"subscription_reminder_1day", label:"🚨 Sub Reminder 1 Day", icon:"🚨", defaultContent:"⚠️ MUHIMU {customer_name}!\n\nSubscription yako ya {product} itaisha KESHO ({end_date})!\n\nFanya renewal sasa ili usipoteze upatikanaji:\n{renewal_link}\n\nSTEA Team" },
    { key:"subscription_expired", label:"🔴 Subscription Expired", icon:"🔴", defaultContent:"Habari {customer_name},\n\nSubscription yako ya {product} imekwisha tarehe {end_date}.\n\nKwa kuendelea, fanya malipo mapya:\n{renewal_link}\n\nTunatumai kukuona tena! — STEA" },
    { key:"delivery_sent", label:"📤 Delivery Sent", icon:"📤", defaultContent:"🎉 {customer_name}, umepata!\n\n{product} yako ipo tayari!\n\n🔗 Upatikanaji wako:\n{access_details}\n\nKama una tatizo lolote, wasiliana: {support_whatsapp}\n\nFuraha ya kujifunza! — STEA 🚀" },
    { key:"sponsored_ads_confirmation", label:"📢 Ads Confirmation", icon:"📢", defaultContent:"Habari {client_name}!\n\nMatangazo yako kwenye STEA yamekubaliwa!\n\n📋 Maelezo ya Campaign:\nJina: {ad_title}\nMuda: {start_date} — {end_date}\nAina: {ad_type}\n\nMatangazo yataanza kuonekana kuanzia {start_date}.\n\nSTEA Marketing Team" },
  ];

  const [templates, setTemplates] = useState({});
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);
  const db = getFirebaseDb();
  const toast_ = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db,"message_templates"), snap => {
      const data = {};
      snap.docs.forEach(d => { data[d.id] = d.data(); });
      setTemplates(data);
    }, err => console.error("templates:", err));
    return () => unsub();
  }, [db]);

  const save = async (key, content) => {
    try {
      await setDoc(doc(db,"message_templates",key), { key, content, updatedAt:serverTimestamp() }, {merge:true});
      toast_("Template imehifadhiwa!");
      setEditing(null);
    } catch(e) { toast_(e.message,"error"); }
  };

  const reset = async (key, defaultContent) => {
    try {
      await setDoc(doc(db,"message_templates",key), { key, content:defaultContent, updatedAt:serverTimestamp() }, {merge:true});
      toast_("Template imeresetwa!");
      setEditing(null);
    } catch(e) { toast_(e.message,"error"); }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(()=>setCopied(null),2000);
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={{padding:"12px 16px",borderRadius:14,background:"rgba(245,166,35,.06)",border:"1px solid rgba(245,166,35,.15)",marginBottom:24,fontSize:13,color:"rgba(255,255,255,.6)",lineHeight:1.7}}>
        💡 <strong style={{color:G}}>Variables:</strong> Tumia <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{"{customer_name}"}</code>, <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{"{product}"}</code>, <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{"{amount}"}</code>, <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{"{order_id}"}</code>, <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{"{end_date}"}</code> n.k.
      </div>

      <div style={{display:"grid",gap:14}}>
        {DEFAULT_TEMPLATES.map(tmpl => {
          const saved = templates[tmpl.key];
          const content = saved?.content || tmpl.defaultContent;
          const isEditing = editing === tmpl.key;
          return (
            <div key={tmpl.key} style={{borderRadius:16,border:"1px solid rgba(255,255,255,.07)",background:"#141823",overflow:"hidden"}}>
              <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:isEditing?"1px solid rgba(255,255,255,.06)":"none"}}>
                <span style={{fontSize:22}}>{tmpl.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14}}>{tmpl.label}</div>
                  {saved?.updatedAt && <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Imebadilishwa: {saved.updatedAt?.toDate?.()?.toLocaleDateString()||"—"}</div>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={()=>copy(content,tmpl.key)} color={copied===tmpl.key?"rgba(34,197,94,.15)":"rgba(255,255,255,.06)"} textColor={copied===tmpl.key?"#22c55e":"rgba(255,255,255,.6)"} style={{padding:"6px 12px",fontSize:12}}>
                    {copied===tmpl.key?"✅ Copied":"📋 Copy"}
                  </Btn>
                  <Btn onClick={()=>{if(isEditing){setEditing(null);}else{setEditing(tmpl.key);setEditContent(content);}}} color={isEditing?"rgba(239,68,68,.1)":"rgba(245,166,35,.1)"} textColor={isEditing?"#fca5a5":G} style={{padding:"6px 12px",fontSize:12}}>
                    {isEditing?"✕ Funga":"✏️ Edit"}
                  </Btn>
                </div>
              </div>
              {!isEditing && (
                <div style={{padding:"12px 18px",background:"rgba(255,255,255,.02)"}}>
                  <pre style={{fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit"}}>{content}</pre>
                </div>
              )}
              {isEditing && (
                <div style={{padding:"16px 18px"}}>
                  <Textarea value={editContent} onChange={e=>setEditContent(e.target.value)} style={{minHeight:180,fontFamily:"monospace",fontSize:13}}/>
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <Btn onClick={()=>save(tmpl.key,editContent)} style={{flex:1}}>💾 Hifadhi Template</Btn>
                    <Btn onClick={()=>reset(tmpl.key,tmpl.defaultContent)} color="rgba(255,255,255,.06)" textColor="rgba(255,255,255,.5)" style={{padding:"10px 14px",fontSize:12}}>↩ Reset Default</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════
export default function AdminPanel({ user, onBack }) {
  const [section, setSection] = useState("overview");
  const [counts,  setCounts]  = useState({ tips:0, updates:0, deals:0, courses:0, users:0, products:0, websites:0, prompts:0 });

  const db = getFirebaseDb();

  useEffect(() => {
    if (!db) return;
    const cols = ["tips","updates","deals","courses","users","products","websites","prompts", "sponsored_ads", "orders", "subscriptions"];
    const unsubs = cols.map(c => 
      onSnapshot(collection(db, c), (snap) => {
        setCounts(prev => ({ ...prev, [c]: snap.size }));
      }, (err) => {
        console.error(`Error loading count for ${c}:`, err);
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, [db]);

  const SECTIONS = [
    { id:"overview", icon:"📊", label:"Overview" },
    { id:"ads",      icon:"📢", label:"Sponsored Ads" },
    { id:"commerce", icon:"💳", label:"Commerce" },
    { id:"payments", icon:"💰", label:"Payment Review" },
    { id:"subs",     icon:"🔄", label:"Subscriptions" },
    { id:"delivery", icon:"📦", label:"Delivery" },
    { id:"templates", icon:"✉️", label:"Templates" },
    { id:"tips",     icon:"💡", label:"Tech Tips" },
    { id:"updates",  icon:"📰", label:"Tech Updates" },
    { id:"prompts",  icon:"🤖", label:"Prompt Lab" },
    { id:"deals",    icon:"🏷️", label:"Deals" },
    { id:"courses",  icon:"🎓", label:"Courses" },
    { id:"products", icon:"🛒", label:"Duka" },
    { id:"websites", icon:"🌐", label:"Websites" },
    { id:"content",  icon:"📝", label:"Site Content" },
    { id:"users",    icon:"👥", label:"Users" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"240px 1fr", background:"#0a0b0f" }}>

      {/* Sidebar */}
      <div style={{ borderRight:"1px solid rgba(255,255,255,.06)", padding:"24px 16px", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, marginBottom:4 }}>⚡ Admin Panel</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>SwahiliTech Elite Academy</div>
        </div>

        <div style={{ display:"grid", gap:4 }}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)}
              style={{ border:"none", borderRadius:12, padding:"11px 14px", textAlign:"left", cursor:"pointer", fontWeight:700, fontSize:14,
                background:section===s.id?`linear-gradient(135deg,${G},${G2})`:"transparent",
                color:section===s.id?"#111":"rgba(255,255,255,.65)",
                display:"flex", alignItems:"center", gap:10, transition:"all .2s" }}>
              <span style={{ fontSize:18 }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop:"auto", paddingTop:24 }}>
          <button onClick={onBack} style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:12, padding:"10px 14px", background:"transparent", color:"rgba(255,255,255,.5)", cursor:"pointer", fontWeight:700, fontSize:13, width:"100%", display:"flex", alignItems:"center", gap:8 }}>
            ← Rudi Website
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding:"28px 32px", overflowY:"auto" }}>

        {section==="overview" && (
          <div>
            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:32, margin:"0 0 6px" }}>
                Karibu, <span style={{ color:G }}>{user?.displayName||"Admin"}</span> 👋
              </h1>
              <p style={{ color:"rgba(255,255,255,.45)", fontSize:15, margin:0 }}>
                Hapa unaweza kumanage content yote ya STEA — posts, deals, courses na users.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:32 }}>
              <StatCard icon="💡" label="Tech Tips Posts" value={counts.tips}/>
              <StatCard icon="📰" label="Tech Updates" value={counts.updates} color="#56b7ff"/>
              <StatCard icon="🤖" label="Prompts" value={counts.prompts} color="#ff85cf"/>
              <StatCard icon="🏷️" label="Active Deals" value={counts.deals} color="#a5b4fc"/>
              <StatCard icon="🎓" label="Courses" value={counts.courses} color="#67f0c1"/>
              <StatCard icon="🛒" label="Duka Products" value={counts.products} color="#fbbf24"/>
              <StatCard icon="🌐" label="Websites" value={counts.websites} color="#818cf8"/>
              <StatCard icon="👥" label="Users" value={counts.users} color="#ff85cf"/>
              <StatCard icon="📢" label="Sponsored Ads" value={counts.sponsored_ads} color="#f5a623"/>
              <StatCard icon="💳" label="Orders" value={counts.orders} color="#67f0c1"/>
              <StatCard icon="🔄" label="Subscriptions" value={counts.subscriptions} color="#a5b4fc"/>
              <StatCard icon="💰" label="Payments" value={counts.payments} color="#f5a623"/>
              <StatCard icon="📦" label="Deliveries" value={counts.deliveries} color="#67f0c1"/>
            </div>

            {/* Quick guide */}
            <div style={{ borderRadius:20, border:"1px solid rgba(245,166,35,.2)", background:"rgba(245,166,35,.06)", padding:24 }}>
              <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 16px", color:G }}>📋 Mwongozo wa Haraka</h3>
              <div style={{ display:"grid", gap:12 }}>
                {[
                  { step:"1", title:"Ongeza Tech Tips", desc:"Nenda Tech Tips → ongeza articles za kweli kwa Kiswahili + videos za YouTube/TikTok" },
                  { step:"2", title:"Weka Habari za Tech Updates", desc:"Nenda Tech Updates → weka habari mpya za ulimwengu wa tech kila siku" },
                  { step:"3", title:"Update Deals na links za kweli", desc:"Nenda Deals → badilisha URL za dummy na affiliate links zako za kweli" },
                  { step:"4", title:"Weka WhatsApp links kwa Courses", desc:"Nenda Courses → kila kozi iweke WhatsApp link ili watu wakuwasiliane nawe" },
                ].map(g=>(
                  <div key={g.step} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${G},${G2})`, display:"grid", placeItems:"center", color:"#111", fontWeight:900, fontSize:13, flexShrink:0 }}>{g.step}</div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, marginBottom:3 }}>{g.title}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.6 }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section==="ads"      && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>📢 Manage <span style={{color:G}}>Sponsored Ads</span></h2><SponsoredAdsManager/></>}
        {section==="commerce" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>💳 Manage <span style={{color:G}}>Commerce</span></h2><CommerceManager/></>}
        {section==="payments" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>💰 Manage <span style={{color:G}}>Payment Review</span></h2><PaymentReviewManager/></>}
        {section==="subs"     && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🔄 Manage <span style={{color:G}}>Subscriptions</span></h2><SubscriptionManager/></>}
        {section==="delivery" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>📦 Manage <span style={{color:G}}>Delivery</span></h2><DeliveryManager/></>}
        {section==="templates" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>✉️ Manage <span style={{color:G}}>Templates</span></h2><MessageTemplateManager/></>}
        {section==="tips"    && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>💡 Manage <span style={{color:G}}>Tech Tips</span></h2><TechContentManager collectionName="tips" /></>}
        {section==="updates" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>📰 Manage <span style={{color:G}}>Tech Updates</span></h2><TechContentManager collectionName="updates" /></>}
        {section==="prompts" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🤖 Manage <span style={{color:G}}>Prompt Lab</span></h2><PromptsManager/></>}
        {section==="deals"   && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🏷️ Manage <span style={{color:G}}>Deals</span></h2><DealsManager/></>}
        {section==="courses" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🎓 Manage <span style={{color:G}}>Courses</span></h2><CoursesManager/></>}
        {section==="products" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🛒 Manage <span style={{color:G}}>Duka Products</span></h2><ProductsManager/></>}
        {section==="websites" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>🌐 Manage <span style={{color:G}}>Websites</span></h2><WebsitesManager/></>}
        {section==="content" && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>📝 Manage <span style={{color:G}}>Site Content</span></h2><SiteContentManager/></>}
        {section==="users"   && <><h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>👥 Manage <span style={{color:G}}>Users</span></h2><UsersManager/></>}

      </div>

      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
