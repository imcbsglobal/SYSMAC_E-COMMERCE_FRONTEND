import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../api";
import "../styles/BrandManagement.scss";

/* ── Inline SVG icons ── */
const IconMenu = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconImage = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export default function BrandManagement() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/sysmac-brands/");
      setBrands(res.data?.results || []);
    } catch (err) {
      console.error("Error loading brands:", err);
      setError("Could not load brands from Sysmac.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  return (
    <div className="admin-layout">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="admin-main">
        <div className="brand-management-container">

          {/* ── Page header ── */}
          <div className="brand-management-header">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              type="button"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#e05c00", marginBottom: 2 }}>
                Admin › Brands
              </div>
              <h1 className="page-title">Brand Management</h1>
            </div>
          </div>

          {/* ── Card ── */}
          <div className="management-card brands-card">
            <div className="card-header">
              <h2 className="card-title">All Brands (from Sysmac)</h2>
              <div className="header-actions">
                <span className="brand-count-badge">{brands.length} brands</span>
              </div>
            </div>

            <div className="brand-search-bar">
              <IconSearch />
              <input
                type="text"
                placeholder="Search brands…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="brand-grid">
              {loading ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <p>Loading brands…</p>
                </div>
              ) : error ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <p>{error}</p>
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <div className="empty-state-icon"><IconImage /></div>
                  <p>No brands found.</p>
                </div>
              ) : (
                filteredBrands.map((brand) => (
                  <div className="brand-item" key={brand.name}>
                    <div className="brand-logo no-logo">
                      <IconImage />
                    </div>
                    <div className="brand-details">
                      <div className="brand-name">{brand.name}</div>
                      {brand.website && (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brand-website"
                        >
                          <IconLink /> {brand.website}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}