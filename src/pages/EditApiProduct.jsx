import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsAPI } from "../api";
import AdminLayout from "../components/AdminLayout";
import "../styles/EditApiProduct.scss";

export default function EditApiProduct() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState({
    name: "", product: "", brand: "", company: "", category: "",
    unit: "", price: "", is_active: true, is_bestseller: false, bestseller_order: 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    productsAPI.adminGetSysmac().then((r) => {
      const p = r.data.find((x) => x.code === code);
      if (p) {
        setOriginal(p);
        setPreview(p.image || "");
        setForm({
          name: p.edited_name || p.name || "",
          product: p.edited_product || p.product || "",
          brand: p.edited_brand || p.brand || "",
          company: p.edited_company || p.company || "",
          category: p.edited_product || p.product || "",
          unit: "",
          price: p.edited_price ?? p.price ?? "",
          is_active: p.is_active,
          is_bestseller: p.is_bestseller,
          bestseller_order: 0,
        });
      }
    });
  }, [code]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);
      await productsAPI.adminUpdateSysmac(code, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg("Saved successfully!");
      setTimeout(() => navigate("/admin/sysmac-products"), 1000);
    } catch { setMsg("Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout title={`Edit: ${code}`}>
      <form className="eap-form" onSubmit={handleSubmit}>
        {msg && <div className="eap-msg">{msg}</div>}
        {original && (
          <div className="eap-original">
            <strong>Original:</strong> {original.name} — ₹{original.price}
          </div>
        )}
        <div className="eap-grid">
          {[["name","Product Name"],["product","Product Type"],["brand","Brand"],["company","Company"],["unit","Unit"],["price","Price"]].map(([k, label]) => (
            <div className="eap-field" key={k}>
              <label>{label}</label>
              <input value={form[k]} onChange={set(k)} placeholder={label} />
            </div>
          ))}
        </div>
        <div className="eap-checks">
          <label><input type="checkbox" checked={form.is_active} onChange={set("is_active")} /> Active</label>
          <label><input type="checkbox" checked={form.is_bestseller} onChange={set("is_bestseller")} /> Bestseller</label>
          {form.is_bestseller && (
            <div className="eap-field">
              <label>Bestseller Order</label>
              <input type="number" value={form.bestseller_order} onChange={set("bestseller_order")} />
            </div>
          )}
        </div>
        <div className="eap-image-section">
          <label>Product Image</label>
          {preview && <img src={preview} alt="" className="eap-preview" />}
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>
        <div className="eap-actions">
          <button type="submit" className="eap-save" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          <button type="button" className="eap-cancel" onClick={() => navigate("/admin/sysmac-products")}>Cancel</button>
        </div>
      </form>
    </AdminLayout>
  );
}