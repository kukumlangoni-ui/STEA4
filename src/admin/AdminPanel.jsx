import { useState, useEffect, useCallback } from "react";
import { getFirebaseDb, doc, serverTimestamp, deleteDoc } from "../firebase.js";
import { useCollection, updateDocument, addDocument } from "../hooks/useFirestore.js";
import { timeAgo } from "../hooks/useFirestore.js";
import ImageEditor from "./ImageEditor.jsx";

const G = "#F5A623", G2 = "#FFD17C";
const WEBSITE_CATEGORIES = ["Free Movie", "Streaming", "AI Tools", "Learning", "Jobs", "Design", "Business", "Download", "Gaming", "Live TV", "Sports", "Music"];

// ── Shared UI Components ──────────────────────────────────

const Btn = ({ children, onClick, color = G, textColor = "#111", disabled, style = {} }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    style={{ 
      border:"none", 
      cursor:disabled ? "not-allowed" : "pointer", 
      borderRadius:12,
      padding:"10px 18px", 
      fontWeight:800, 
      fontSize:13, 
      color:textColor,
      background:color, 
      opacity:disabled ? 0.6 : 1, 
      transition:"all .2s",
      display:"inline-flex", 
      alignItems:"center", 
      gap:8, 
      ...style 
    }}
    onMouseEnter={e => { if(!disabled) e.currentTarget.style.opacity = "0.85"; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
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
  <input {...props} 
    value={props.value || ""} 
    style={{ 
      height:46, 
      borderRadius:12, 
      border:"1px solid rgba(255,255,255,.1)",
      background:"rgba(255,255,255,.05)", 
      color:"#fff", 
      padding:"0 14px", 
      outline:"none",
      fontFamily:"inherit", 
      fontSize:14, 
      width:"100%", 
      ...props.style 
    }}
    onFocus={e => e.target.style.borderColor = G}
    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"}/>
);

const Textarea = (props) => (
  <textarea {...props} 
    value={props.value || ""} 
    style={{ 
      borderRadius:12, 
      border:"1px solid rgba(255,255,255,.1)",
      background:"rgba(255,255,255,.05)", 
      color:"#fff", 
      padding:"12px 14px", 
      outline:"none",
      fontFamily:"inherit", 
      fontSize:14, 
      width:"100%", 
      resize:"vertical", 
      minHeight:100, 
      ...props.style 
    }}
    onFocus={e => e.target.style.borderColor = G}
    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"}/>
);

// ... other shared components like Select, Toast, StatCard, ConfirmDialog, etc.

// ── Courses Manager ───────────────────────────────────────

function CoursesManager() {
  const { docs: courses, loading: loadingCourses } = useCollection("courses");
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const db = getFirebaseDb();
  const toast_ = (msg, type = "success") => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3000); 
  };

  const handleEdit = useCallback((course) => {
    setEditing(course.id);
    setForm(course);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSave = async () => {
    if (!form.title?.trim()) {
      return toast_("Title is required", "error");
    }

    setLoading(true);
    const collectionName = "courses";

    try {
      if (editing) {
        await updateDocument(collectionName, editing, {
          title: form.title,
          summary: form.summary,
          // ... other fields
        });
        toast_("Course updated successfully!");
      } else {
        await addDocument(collectionName, {
          ...form,
          createdAt: serverTimestamp(),
        });
        toast_("Course added successfully!");
      }
      setEditing(null);
      setForm({});
    } catch (error) {
      console.error("Error saving course:", error);
      toast_("Failed to save course.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirm({
      msg: "Are you sure you want to delete this course?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "courses", id));
          toast_("Course deleted.");
          setConfirm(null);
        } catch (error) {
          console.error("Error deleting course:", error);
          toast_("Failed to delete course.", "error");
        }
      },
      onCancel: () => setConfirm(null),
    });
  };

  return (
    <div>
      {/* ... Toast and ConfirmDialog components */}
      
      <div style={{ borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"#141823", padding:24, marginBottom:28 }}>
        <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, margin:"0 0 20px" }}>
          {editing ? "✏️ Edit Course" : "➕ Add New Course"}
        </h3>
        <div style={{ display:"grid", gap:16 }}>
          <Field label="Title *">
            <Input 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
              placeholder="e.g., Web Development Masterclass"
            />
          </Field>
          <Field label="Summary">
            <Textarea 
              value={form.summary} 
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} 
              placeholder="A brief summary of the course..."
              style={{ minHeight: 80 }}
            />
          </Field>
          
          {/* ... Other form fields ... */}

          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : editing ? "💾 Save Changes" : "🚀 Publish Course"}
            </Btn>
            {editing && (
              <Btn onClick={() => { setEditing(null); setForm({}); }} color="rgba(255,255,255,.08)" textColor="#fff">
                ✕ Cancel
              </Btn>
            )}
          </div>
        </div>
      </div>

      <div>
        {loadingCourses ? (
          <div>Loading courses...</div>
        ) : (
          courses.map(course => (
            <div key={course.id} style={{ borderRadius:16, border:"1px solid rgba(255,255,255,.07)", background:"#1a1d2e", padding:"14px 18px", display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15 }}>{course.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>{course.summary?.substring(0, 60)}...</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={() => handleEdit(course)} color="rgba(245,166,35,.12)" textColor={G} style={{padding:"8px 14px"}}>✏️</Btn>
                <Btn onClick={() => handleDelete(course.id)} color="rgba(239,68,68,.12)" textColor="#fca5a5" style={{padding:"8px 14px"}}>🗑️</Btn>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────

export default function AdminPanel({ user, onBack }) {
  const [section, setSection] = useState("overview");
  // ... rest of the AdminPanel component

  return (
    <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"240px 1fr", background:"#0a0b0f" }}>
      {/* Sidebar */}
      <div style={{ borderRight:"1px solid rgba(255,255,255,.06)", padding:"24px 16px", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        {/* ... Sidebar content ... */}
      </div>

      {/* Main content */}
      <div style={{ padding:"28px 32px", overflowY:"auto" }}>
        {section === "courses" && (
          <>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:28, margin:"0 0 24px" }}>
              🎓 Manage <span style={{color:G}}>Courses</span>
            </h2>
            <CoursesManager />
          </>
        )}
        
        {/* ... Other sections ... */}
      </div>
    </div>
  );
}