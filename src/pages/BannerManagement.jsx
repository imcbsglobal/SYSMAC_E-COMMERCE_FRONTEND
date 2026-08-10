import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { bannersAPI } from "../api";
import "../styles/BannerManagement.scss";

/* ── Inline SVG icons ── */
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconClose = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconMenu = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconImage = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

const EMPTY_FORM = { title: "", subtitle: "", url: "", is_active: true };

export default function BannerManagement() {
  const [banners, setBanners]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [mode, setMode]             = useState("add");
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [currentImage, setCurrentImage] = useState("");
  const [preview, setPreview]       = useState("");
  const [file, setFile]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);

  const loadBanners = async () => {
    setLoading(true);
    try {
      let res;
      try { res = await bannersAPI.adminGetAll(); }
      catch { res = await bannersAPI.getAll(); }
      setBanners(res.data || []);
    } catch (err) { console.error("Error loading banners:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBanners(); }, []);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM }); setEditId(null); setCurrentImage("");
    setPreview(""); setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAdd = () => { resetForm(); setMode("add"); setModalOpen(true); };

  const openEdit = (banner) => {
    setMode("edit"); setEditId(banner.id);
    setForm({
      title: banner.title === "No Title" ? "" : banner.title || "",
      subtitle: banner.subtitle || "", url: banner.link || "",
      is_active: !!banner.is_active,
    });
    setCurrentImage(banner.image || ""); setPreview(""); setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); resetForm(); };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]; setFile(f || null);
    if (f) { const r = new FileReader(); r.onload = (ev) => setPreview(ev.target.result); r.readAsDataURL(f); }
    else setPreview("");
  };

  const deleteBanner = async (bannerId) => {
    if (!window.confirm("Are you sure you want to delete this banner? This action cannot be undone.")) return;
    try { await bannersAPI.adminDelete(bannerId); await loadBanners(); }
    catch (err) { console.error("Error:", err); alert("Error occurred. Please try again."); }
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title); fd.append("subtitle", form.subtitle || "");
    fd.append("link", form.url || ""); fd.append("is_active", form.is_active ? "1" : "0");
    if (file) fd.append("image", file);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "add" && !file) { alert("Please select a banner image."); return; }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (mode === "add") await bannersAPI.adminCreate(fd);
      else await bannersAPI.adminUpdate(editId, fd);
      closeModal(); await loadBanners();
    } catch (err) { console.error("Error:", err); alert("Error occurred. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="admin-main">
        <div className="banner-management-container">

          {/* ── Page header ── */}
          <div className="banner-management-header">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} type="button" aria-label="Open menu">
              <IconMenu />
            </button>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#e05c00", marginBottom: 2 }}>
                Admin › Banners
              </div>
              <h1 className="page-title">Banner Management</h1>
            </div>
          </div>

          {/* ── Card ── */}
          <div className="management-card banners-card">
            <div className="card-header">
              <h2 className="card-title">All Banners</h2>
              <div className="header-actions">
                <span className="banner-count-badge">{banners.length} banners</span>
                <button onClick={openAdd} className="action-button add-btn" type="button">
                  <IconPlus /> Add Banner
                </button>
              </div>
            </div>

            <div className="banner-grid">
              {loading ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <p>Loading banners…</p>
                </div>
              ) : banners.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <div className="empty-state-icon"><IconImage /></div>
                  <p>No banners found.</p>
                  <button onClick={openAdd} className="action-button add-btn" style={{ marginTop: 12 }} type="button">
                    <IconPlus /> Add your first banner
                  </button>
                </div>
              ) : (
                banners.map((banner) => (
                  <div className="banner-item" key={banner.id}>
                    {banner.image
                      ? <img src={banner.image} alt={banner.title} className="banner-image" />
                      : <div className="banner-image no-image">No Image</div>}

                    <div className="banner-details">
                      <div className="banner-title">{banner.title || "No Title"}</div>
                      {banner.subtitle && <div className="banner-subtitle">{banner.subtitle}</div>}
                      {banner.link && <div className="banner-url">{banner.link}</div>}
                      <span className={`banner-status ${banner.is_active ? "status-active" : "status-inactive"}`}>
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                      <div className="banner-actions">
                        <button onClick={() => openEdit(banner)} className="action-button edit-btn" type="button">
                          <IconEdit /> Edit
                        </button>
                        <button onClick={() => deleteBanner(banner.id)} className="action-button delete-btn" type="button">
                          <IconTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h2 className="modal-title">{mode === "add" ? "Add New Banner" : "Edit Banner"}</h2>
              <button className="modal-close" onClick={closeModal} type="button" aria-label="Close">
                <IconClose />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>

                <div className="form-group">
                  <label className="form-label">Banner Title *</label>
                  <input type="text" className="form-input" placeholder="Enter banner title"
                    value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Subtitle</label>
                  <textarea className="form-input form-textarea" placeholder="Optional subtitle or description"
                    rows="2" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Link URL</label>
                  <input type="url" className="form-input" placeholder="https://example.com"
                    value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>

                <div className="form-group">
                  {mode === "edit" && currentImage && (
                    <div className="current-image-container">
                      <label className="form-label">Current Image</label>
                      <img src={currentImage} className="image-preview" alt="current" />
                    </div>
                  )}

                  <label className="form-label" style={mode === "edit" ? { marginTop: 10, display: "block" } : undefined}>
                    {mode === "edit" ? "Replace Image" : "Banner Image *"}
                  </label>

                  <div className="image-input-group active">
                    <input type="file" ref={fileInputRef} className="form-input form-file" accept="image/*" onChange={handleFileChange} required={mode === "add"} />
                  </div>

                  {preview && <img src={preview} className="image-preview" alt="preview" />}
                </div>

                <div className="form-group">
                  <div className="checkbox-group">
                    <input type="checkbox" className="form-checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    <label className="form-label">Active</label>
                  </div>
                  <div className="help-text">
                    {mode === "edit" ? "Uncheck to hide banner from display" : "Uncheck to save as draft"}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn btn-secondary" disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <IconSave /> {saving ? "Saving…" : mode === "add" ? "Add Banner" : "Update Banner"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}