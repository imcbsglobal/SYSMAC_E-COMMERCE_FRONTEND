import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI } from "../api";
import AdminLayout from "../components/AdminLayout";
import "../styles/CustomProducts.scss";

export default function CustomProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bestsellerFilter, setBestsellerFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    productsAPI.adminGetAll()
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    await productsAPI.adminDelete(id);
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const brands = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const b = (p.brand || "").trim();
      if (b && b !== "-") s.add(b);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productTypes = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const pr = (typeof p.product === "object" ? p.product?.name : p.product) || "";
      const v = pr.trim();
      if (v && v !== "-") s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const getProductName = (p) =>
    typeof p.product === "object" ? (p.product?.name || "") : (p.product || "");

  const filtered = products.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const product = getProductName(p).toLowerCase();
    const brand = (p.brand || "").toLowerCase();

    const term = search.toLowerCase().trim();
    const matchSearch = !term ||
      name.includes(term) || product.includes(term) || brand.includes(term);

    const matchBrand = !brandFilter || brand === brandFilter.toLowerCase();
    const matchProduct = !productFilter || product === productFilter.toLowerCase();
    const matchStatus = !statusFilter || (statusFilter === "active" ? p.is_active : !p.is_active);
    const matchBs = !bestsellerFilter || (bestsellerFilter === "yes" ? p.is_bestseller : !p.is_bestseller);

    return matchSearch && matchBrand && matchProduct && matchStatus && matchBs;
  });

  const resetAll = () => {
    setSearch(""); setBrandFilter(""); setProductFilter("");
    setStatusFilter(""); setBestsellerFilter("");
  };

  const stockClass = (q) => (q > 10 ? "high" : q > 0 ? "medium" : "low");

  return (
    <AdminLayout title="Custom Products">
      <div className="cp">

        <div className="cp-page-header">
          <div>
            <div className="cp-breadcrumb">Catalog &rsaquo; Products</div>
            <h2 className="cp-title">Custom Products</h2>
            <p className="cp-subtitle">Manage your custom product catalog</p>
          </div>
          <button className="cp-add" onClick={() => navigate("/admin/custom-products/add")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create product
          </button>
        </div>

        <div className="cp-toolbar">
          <div className="cp-field cp-field-search">
            <label className="cp-label">Search</label>
            <div className="cp-search-wrap">
              <svg className="cp-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="cp-search"
                placeholder="Search name, brand, product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="cp-clear" onClick={() => setSearch("")} title="Clear">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="cp-field">
            <label className="cp-label">Brand</label>
            <select className="cp-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="cp-field">
            <label className="cp-label">Product type</label>
            <select className="cp-select" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="">All types</option>
              {productTypes.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="cp-field">
            <label className="cp-label">Status</label>
            <select className="cp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="cp-field">
            <label className="cp-label">Bestseller</label>
            <select className="cp-select" value={bestsellerFilter} onChange={(e) => setBestsellerFilter(e.target.value)}>
              <option value="">All</option>
              <option value="yes">Bestsellers</option>
              <option value="no">Regular</option>
            </select>
          </div>

          <div className="cp-field cp-field-action">
            <button className="cp-reset" onClick={resetAll}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset filters
            </button>
          </div>
        </div>

        <div className="cp-count">
          Showing <span>{filtered.length}</span> of <span>{products.length}</span> products
        </div>

        {loading ? (
          <div className="cp-loading">
            <div className="cp-spinner"></div> Loading products…
          </div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.35, marginBottom:14}}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <div className="cp-empty-title">No products found</div>
            <div className="cp-empty-sub">Try adjusting your search or filters</div>
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Product type</th>
                  <th>Company</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Bestseller</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.main_image
                        ? <img src={p.main_image} alt="" className="cp-img" />
                        : <div className="cp-no-img">No img</div>}
                    </td>
                    <td>
                      <span className="cp-name-cell">{p.name}</span>
                    </td>
                    <td>{getProductName(p)}</td>
                    <td>{p.company}</td>
                    <td>{p.brand}</td>
                    <td>{p.category}</td>
                    <td className="cp-price">₹{p.price}</td>
                    <td className="cp-desc-cell">
                      <div className="cp-desc">{p.description}</div>
                    </td>
                    <td>{p.unit}</td>
                    <td>
                      <span className={"cp-stock " + stockClass(p.stock_quantity)}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td>
                      <span className={"cp-loz " + (p.is_active ? "success" : "removed")}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {p.is_bestseller
                        ? <span className="cp-bs">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Bestseller
                          </span>
                        : <span className="cp-regular">Regular</span>}
                    </td>
                    <td>
                      <div className="cp-actions">
                        <button
                          className="cp-act edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/custom-products/edit/${p.id}`)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="cp-act del"
                          title="Delete"
                          onClick={() => deleteProduct(p.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/>
                            <path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}