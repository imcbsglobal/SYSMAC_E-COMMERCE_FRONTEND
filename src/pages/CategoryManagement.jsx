import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../api";
import "../styles/CategoryManagement.scss";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/sysmac-categories/");
      setCategories(res.data?.results || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter((c) => {
    const name = (c.name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return !searchTerm || name.includes(search);
  });

  return (
    <AdminLayout pageTitle="Category Management" breadcrumb="Category Management">
      <div className="cat">

        <div className="cat-page-header">
          <div>
            <h2 className="cat-title">Category Management</h2>
            {/* <p className="cat-subtitle">
              Categories are fetched live from the Sysmac product-type directory
            </p> */}
          </div>
        </div>

        <div className="cat-search-wrap">
          <svg className="cat-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="cat-search"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="cat-clear" onClick={() => setSearchTerm("")} title="Clear">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="cat-count">
          Showing <span>{filteredCategories.length}</span> of <span>{categories.length}</span> categories
        </div>

        {loading ? (
          <div className="cat-loading">
            <div className="cat-spinner"></div> Loading categories…
          </div>
        ) : error ? (
          <div className="cat-error">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="cat-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.35, marginBottom:12}}>
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
            <div className="cat-empty-title">No categories found</div>
            <div className="cat-empty-sub">
              {categories.length > 0
                ? "No categories match your search."
                : "Categories are fetched live from the Sysmac product-type directory."}
            </div>
          </div>
        ) : (
          <ul className="cat-list">
            {filteredCategories.map((c) => (
              <li className="cat-item" key={c.name}>
                <span className="cat-item-name">{c.name}</span>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cat-item-link"
                  >
                    Visit site
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                    </svg>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}