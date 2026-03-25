import { useState, useEffect, useRef } from "react";
import {
  getFirebaseDb, collection, addDoc, updateDoc, deleteDoc, setDoc,
  doc, serverTimestamp, query, limit, onSnapshot, orderBy,
  sendPushNotification,
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
      if (file.size > 800000) { // ~800KB limit to stay under 1MB after base64
        alert("Picha hii ni kubwa mno (zidi 800KB). Tafadhali punguza size ya picha kwanza.");
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
        <img src={value} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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
        category: collectionName === "tips" ? "tech-tips" : "tech-updates",
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
        await updateDoc(doc(db, collectionName, editing), updateData);
        toast_("Imesahihishwa!");
      }
      else {
        await addDoc(collection(db, collectionName), data);
        toast_("Imewekwa live!");
        // Push notification — non-blocking, won't affect post if it fails
        try {
          const section = collectionName === "tips" ? "tips" : "habari";
          await sendPushNotification({
            title: "New on STEA 🔥",
            body: `${data.title} ipo live sasa. Bonyeza usome!`,
            url: `${window.location.origin}/?page=${section}`,
          });
        } catch (e) {
          console.warn("[FCM] Notification failed:", e.message);
        }
      }
      setForm({ 
        type: "article", badge: "Tech", title: "", summary: "", content: "", 
        imageUrl: "", carouselImages: [], ctaText: "", ctaUrl: "", source: "",
        platform: "youtube", embedUrl: "", channel: "", channelImg: "🎙️", duration: "",
        category: collectionName === "tips" ? "tech-tips" : "tech-updates",
        sectionType: collectionName === "tips" ? "techTips" : "techUpdates"
      });
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast_("Kuna tatizo", "error");
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
          <Field label="Badge (e.g. Android, AI, News)"><Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Tech" /></Field>
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
    oldPrice: "", newPrice: "", expiryDate: "", badge: "", featured: false
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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
        await updateDoc(doc(db,"deals",editing), updateData);
        toast_("Imesahihishwa!");
      }
      else          { 
        console.log("Adding new deal:", data);
        await addDoc(collection(db,"deals"), data); 
        toast_("Deal imewekwa live!"); 
      }
      setForm({ imageUrl: "", name: "", description: "", dealType: "direct_offer", directLink: "", affiliateLink: "", whatsappLink: "", promoCode: "", oldPrice: "", newPrice: "", expiryDate: "", badge: "", featured: false });
      setEditing(null);
    } catch(e) { toast_(e.message,"error"); }
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
          <Field label="Maelezo"><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Maelezo ya deal hii..." style={{minHeight:80}}/></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Direct Link"><Input value={form.directLink} onChange={e=>setForm(f=>({...f,directLink:e.target.value}))} placeholder="https://..."/></Field>
            <Field label="Affiliate Link"><Input value={form.affiliateLink} onChange={e=>setForm(f=>({...f,affiliateLink:e.target.value}))} placeholder="https://..."/></Field>
            <Field label="WhatsApp Link"><Input value={form.whatsappLink} onChange={e=>setForm(f=>({...f,whatsappLink:e.target.value}))} placeholder="https://wa.me/..."/></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            <Field label="Promo Code"><Input value={form.promoCode} onChange={e=>setForm(f=>({...f,promoCode:e.target.value}))} placeholder="STEA60"/></Field>
            <Field label="Old Price"><Input value={form.oldPrice} onChange={e=>setForm(f=>({...f,oldPrice:e.target.value}))} placeholder="$15"/></Field>
            <Field label="New Price"><Input value={form.newPrice} onChange={e=>setForm(f=>({...f,newPrice:e.target.value}))} placeholder="$6"/></Field>
            <Field label="Expiry Date"><Input type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Badge"><Input value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))} placeholder="HOT"/></Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
              Featured
            </label>
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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
        await updateDoc(doc(db,"courses",editing), updateData);
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
        faq3Question: "Je, bei inaweza kubadilika?", faq3Answer: "Bei inaweza kubadilika kulingana na ofa zilizopo. Hakikisha unathibitisha bei ya sasa kabla ya kulipia."
      });
      setEditing(null);
    } catch(e) { 
      console.error("Save error:", e);
      toast_(e.message,"error"); 
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

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field label="Language"><Input value={form.language} onChange={e=>setForm(f=>({...f,language:e.target.value}))} placeholder="Kiswahili"/></Field>
            <Field label="Support Type"><Input value={form.supportType} onChange={e=>setForm(f=>({...f,supportType:e.target.value}))} placeholder="WhatsApp Group"/></Field>
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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
        await updateDoc(doc(db, "products", editing), updateData);
        toast_("Imesahihishwa!");
      }
      else { 
        console.log("Adding new product:", data);
        await addDoc(collection(db, "products"), data); 
        toast_("Bidhaa imewekwa live!"); 
      }
      setForm({ name: "", description: "", price: "", oldPrice: "", imageUrl: "", badge: "", url: "", category: "Electronics" });
      setEditing(null);
    } catch (e) { toast_(e.message, "error"); }
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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
        await updateDoc(doc(db, "websites", editing), updateData);
        toast_("Imesahihishwa!");
      }
      else { await addDoc(collection(db, "websites"), data); toast_("Website imewekwa live!"); }
      setForm({ name: "", url: "", description: "", iconUrl: "", imageUrl: "", bg: "linear-gradient(135deg,#667eea,#764ba2)", meta: "Free Tool", tags: "" });
      setEditing(null);
    } catch (e) { toast_(e.message, "error"); }
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
        const valA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
        const valB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
        const timeA = typeof valA === 'number' ? valA : new Date(valA).getTime() || 0;
        const timeB = typeof valB === 'number' ? valB : new Date(valB).getTime() || 0;
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

  const [aboutUs, setAboutUs] = useState({ title: "", shortDesc: "", fullDesc: "", mission: "", vision: "", btnText: "", btnLink: "" });
  const [aboutCreator, setAboutCreator] = useState({ fullName: "", title: "", shortBio: "", fullBio: "", origin: "", location: "", education: "", career: "", hobbies: "", contactText: "", contactLink: "", imageUrl: "", imageAlt: "" });
  const [contactInfo, setContactInfo] = useState({ whatsapp: "", email: "", supportMsg: "", officeText: "", socialLinks: { facebook: "", twitter: "", instagram: "", youtube: "", linkedin: "", tiktok: "" } });
  const [stats, setStats] = useState({ websitesBuilt: "", activeProjects: "", launchDate: "", achievements: "" });

  useEffect(() => {
    if (!db) return;
    const docs = ["about_us", "about_creator", "contact_info", "stats"];
    const unsubs = docs.map(id => 
      onSnapshot(doc(db, "site_settings", id), (snap) => {
        if (snap.exists()) {
          const data = snap.data().data;
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
      toast_(e.message, "error");
    }
    setLoading(false);
  };

  const SUB_TABS = [
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
        await updateDoc(doc(db, "faqs", editing), data);
        toast_("FAQ imebadilishwa");
      } else {
        await addDoc(collection(db, "faqs"), { ...data, createdAt: serverTimestamp() });
        toast_("FAQ mpya imeongezwa");
      }
      setForm({ question: "", answer: "", category: "General", order: faqs.length + 1, isActive: true });
      setEditing(null);
    } catch (e) { toast_(e.message, "error"); }
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
// MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════
export default function AdminPanel({ user, onBack }) {
  const [section, setSection] = useState("overview");
  const [counts,  setCounts]  = useState({ tips:0, updates:0, deals:0, courses:0, users:0, products:0, websites:0, prompts:0 });

  const db = getFirebaseDb();

  useEffect(() => {
    if (!db) return;
    const cols = ["tips","updates","deals","courses","users","products","websites","prompts"];
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
