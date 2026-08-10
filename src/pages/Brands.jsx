import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { brandsAPI } from "../api";
import "../styles/Brands.scss";

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    brandsAPI
      .getAll()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setBrands(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="br-page">
      <div className="br-breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span className="current">Brands</span>
      </div>

      <div className="br-toolbar">
        <div>
          <h1 className="br-title">All Brands</h1>
          <p className="br-subtitle">
            {loading ? "Loading brands…" : `${brands.length} brand${brands.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="br-loading">Loading brands...</div>
      ) : error ? (
        <div className="br-empty">Couldn't load brands right now. Please try again later.</div>
      ) : brands.length === 0 ? (
        <div className="br-empty">No brands found.</div>
      ) : (
        <div className="br-grid">
          {brands.map((b) => (
            <BrandCard key={b.id || b.name} brand={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BrandCard({ brand }) {
  const logoSrc = brand.logo || brand.image_url || "https://via.placeholder.com/200x120?text=" + encodeURIComponent(brand.name || "Brand");

  const content = (
    <>
      <div className="br-card-image">
        <img src={logoSrc} alt={brand.name} />
      </div>
      <div className="br-card-body">
        <h3 className="br-card-name">{brand.name}</h3>
        {brand.description && <p className="br-card-desc">{brand.description}</p>}
      </div>
    </>
  );

  // Clicking a brand now takes the user to the products listing,
  // pre-filtered to that brand — instead of jumping out to the
  // brand's external website.
  return brand.name ? (
    <Link
      className="br-card"
      to={`/products?brand=${encodeURIComponent(brand.name)}`}
    >
      {content}
    </Link>
  ) : (
    <div className="br-card br-card-static">{content}</div>
  );
}