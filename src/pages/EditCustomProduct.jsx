import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { categoriesAPI, productsAPI } from "../api";
import AdminLayout from "../components/AdminLayout";
import "../styles/EditCustomProduct.scss";

// ── Inline SVG icons (no Font Awesome dependency) ──────────────────────────
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IconPrice = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconImages = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconClose = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function EditCustomProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const action = isEdit ? "Edit" : "Add";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [nonFieldError, setNonFieldError] = useState("");

  const [form, setForm] = useState({
    name: "", category: "", company: "", brand: "", product: "",
    unit: "", description: "", price: "", stock_quantity: "",
    is_active: true, is_bestseller: false, bestseller_order: 0,
  });

  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [currentMainImage, setCurrentMainImage] = useState("");
  const [currentAdditional, setCurrentAdditional] = useState([]);

  useEffect(() => {
    categoriesAPI.adminGetAll()
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/admin/custom-products/${id}/`)
      .then((r) => {
        const d = r.data || {};
        setForm({
          name: d.name || "", category: d.category || "",
          company: d.company || "", brand: d.brand || "",
          product: typeof d.product === "object" ? (d.product?.id || "") : (d.product || ""),
          unit: d.unit || "", description: d.description || "",
          price: d.price ?? "", stock_quantity: d.stock_quantity ?? "",
          is_active: !!d.is_active, is_bestseller: !!d.is_bestseller,
          bestseller_order: d.bestseller_order ?? 0,
        });
        setCurrentMainImage(d.main_image || "");
        setCurrentAdditional(Array.isArray(d.additional_images) ? d.additional_images : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { if (!(k in e)) return e; const next = { ...e }; delete next[k]; return next; });
  };

  const handleSubmit = async () => {
    setSaving(true); setErrors({}); setNonFieldError("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "is_active" || k === "is_bestseller") fd.append(k, v ? "true" : "false");
      else fd.append(k, v ?? "");
    });
    if (mainImage) fd.append("main_image", mainImage);
    additionalImages.forEach((file) => fd.append("additional_images", file));
    try {
      if (isEdit) {
        await productsAPI.adminUpdate(id, fd);
      } else {
        await productsAPI.adminCreate(fd);
      }
      navigate("/admin/custom-products");
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const clean = {};
        Object.entries(data).forEach(([field, val]) => {
          if (field === "detail") return;
          if (val === undefined || val === null) return;
          if (Array.isArray(val) && val.length === 0) return;
          clean[field] = val;
        });
        setErrors(clean);
        if (data.detail) setNonFieldError(data.detail);
      } else {
        setNonFieldError("Something went wrong. Please try again.");
      }
    } finally { setSaving(false); }
  };

  const deleteImage = async (imgId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await api.delete(`/product-images/delete/${imgId}/`);
      setCurrentAdditional((arr) => arr.filter((x) => x.id !== imgId));
    } catch { /* ignore */ }
  };

  const err = (k) => (errors[k] ? (Array.isArray(errors[k]) ? errors[k][0] : errors[k]) : "");
  const errorEntries = Object.entries(errors).filter(([, v]) => v !== undefined && v !== null && String(v) !== "");
  const hasErrors = errorEntries.length > 0 || Boolean(nonFieldError);

  return (
    <AdminLayout title={`${action} Custom Product`}>
      <div className="ecp">

        {/* ── Page header ── */}
        <div className="ecp-head">
          <div>
            <div className="ecp-breadcrumb">Catalog › Products › {action}</div>
            <h2 className="ecp-title">{action} Custom Product</h2>
            <p className="ecp-subtitle">
              {isEdit ? "Edit existing product details" : "Create a new custom product"}
            </p>
          </div>
        </div>

        <div className="ecp-card">
          <div className="ecp-card-head">
            <span className="ecp-card-title">Product Details</span>
          </div>

          <div className="ecp-card-body">
            {loading ? (
              <div className="ecp-loading">
                <div className="ecp-spinner"></div> Loading product…
              </div>
            ) : (
              <>
                {hasErrors && (
                  <div className="ecp-alert">
                    <strong>Please correct the following errors:</strong>
                    <ul>
                      {nonFieldError && <li>{nonFieldError}</li>}
                      {errorEntries.map(([field, val]) => (
                        <li key={field}>{field}: {Array.isArray(val) ? val[0] : String(val)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Section 1: Basic Info ── */}
                <div className="ecp-section">
                  <h4 className="ecp-section-title">
                    <IconInfo /> Basic Information
                  </h4>
                  <div className="ecp-grid-2">
                    <div className="ecp-group">
                      <label>Product Name *</label>
                      <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
                      {err("name") && <div className="ecp-error">{err("name")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Category</label>
                      <select value={form.category} onChange={(e) => update("category", e.target.value)}>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id || c.name} value={c.id || c.name}>{c.name || c.title || c}</option>
                        ))}
                      </select>
                      {err("category") && <div className="ecp-error">{err("category")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Company</label>
                      <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)} />
                      {err("company") && <div className="ecp-error">{err("company")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Brand</label>
                      <input type="text" value={form.brand} onChange={(e) => update("brand", e.target.value)} />
                      {err("brand") && <div className="ecp-error">{err("brand")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Product Type</label>
                      <input type="text" value={form.product} onChange={(e) => update("product", e.target.value)} />
                      {err("product") && <div className="ecp-error">{err("product")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Unit</label>
                      <input type="text" value={form.unit} onChange={(e) => update("unit", e.target.value)} />
                      {err("unit") && <div className="ecp-error">{err("unit")}</div>}
                    </div>
                  </div>

                  <div className="ecp-group ecp-full" style={{ marginTop: 16 }}>
                    <label>Description</label>
                    <textarea value={form.description} onChange={(e) => update("description", e.target.value)} />
                    {err("description") && <div className="ecp-error">{err("description")}</div>}
                  </div>
                </div>

                {/* ── Section 2: Pricing & Inventory ── */}
                <div className="ecp-section">
                  <h4 className="ecp-section-title">
                    <IconPrice /> Pricing &amp; Inventory
                  </h4>
                  <div className="ecp-grid-3">
                    <div className="ecp-group">
                      <label>Price *</label>
                      <input type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} />
                      {err("price") && <div className="ecp-error">{err("price")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Stock Quantity</label>
                      <input type="number" value={form.stock_quantity} onChange={(e) => update("stock_quantity", e.target.value)} />
                      {err("stock_quantity") && <div className="ecp-error">{err("stock_quantity")}</div>}
                    </div>

                    <div className="ecp-group ecp-status-group">
                      <label className="ecp-checkbox-label">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
                        Active Product
                      </label>
                      {err("is_active") && <div className="ecp-error">{err("is_active")}</div>}
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Bestseller ── */}
                <div className="ecp-section">
                  <h4 className="ecp-section-title">
                    <IconStar /> Bestseller Settings
                  </h4>
                  <div className="ecp-grid-2">
                    <div className="ecp-group">
                      <label className="ecp-checkbox-label">
                        <input type="checkbox" checked={form.is_bestseller} onChange={(e) => update("is_bestseller", e.target.checked)} />
                        Mark as Bestseller
                      </label>
                      {err("is_bestseller") && <div className="ecp-error">{err("is_bestseller")}</div>}
                    </div>

                    <div className="ecp-group" style={{ opacity: form.is_bestseller ? 1 : 0.5 }}>
                      <label>Bestseller Order</label>
                      <input type="number" value={form.bestseller_order} disabled={!form.is_bestseller} onChange={(e) => update("bestseller_order", e.target.value)} />
                      <small className="ecp-help">Lower numbers appear first (0 = not shown)</small>
                      {err("bestseller_order") && <div className="ecp-error">{err("bestseller_order")}</div>}
                    </div>
                  </div>
                </div>

                {/* ── Section 4: Images ── */}
                <div className="ecp-section ecp-section-last">
                  <h4 className="ecp-section-title">
                    <IconImages /> Product Images
                  </h4>
                  <div className="ecp-grid-2">
                    <div className="ecp-group">
                      <label>Main Image</label>
                      <input type="file" accept="image/*" onChange={(e) => setMainImage(e.target.files[0] || null)} />
                      {currentMainImage && (
                        <div className="ecp-current-image">
                          <img src={currentMainImage} alt="Current main" />
                          <span className="ecp-image-label">Current main image</span>
                        </div>
                      )}
                      {err("main_image") && <div className="ecp-error">{err("main_image")}</div>}
                    </div>

                    <div className="ecp-group">
                      <label>Additional Images</label>
                      <input type="file" accept="image/*" multiple onChange={(e) => setAdditionalImages(Array.from(e.target.files))} />
                      <small className="ecp-help">Select multiple images (max 5 MB each)</small>

                      {isEdit && currentAdditional.length > 0 && (
                        <div className="ecp-additional">
                          <h5 className="ecp-additional-title">Current additional images</h5>
                          <div className="ecp-additional-grid">
                            {currentAdditional.map((img) => (
                              <div className="ecp-image-item" key={img.id}>
                                <img src={img.image || img.url} alt="Additional" />
                                <button type="button" className="ecp-del-img" onClick={() => deleteImage(img.id)}>
                                  <IconClose />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="ecp-actions">
                  <button type="button" className="ecp-btn primary" disabled={saving} onClick={handleSubmit}>
                    <IconSave /> {saving ? "Saving…" : "Save product"}
                  </button>
                  <button type="button" className="ecp-btn secondary" onClick={() => navigate("/admin/custom-products")}>
                    <IconBack /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}