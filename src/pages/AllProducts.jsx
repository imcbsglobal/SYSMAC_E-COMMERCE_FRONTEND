import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { productsAPI, categoriesAPI, cartAPI, wishlistAPI, brandsAPI } from "../api";
import "../styles/AllProducts.scss";

export default function AllProducts() {
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const brandParam = searchParams.get("brand") || "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 1 });

  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "");
  const [selectedBrands, setSelectedBrands] = useState(brandParam ? [brandParam] : []);
  const [priceRange, setPriceRange] = useState(20000);
  const [sortBy, setSortBy] = useState("featured");
  // Seeded from ?search= in the URL (Navbar's search button/Enter lands
  // here with that param set) so results are populated immediately
  // instead of showing an empty search box on arrival.
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const perPage = 15;

  // --- NEW: toast state ---
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);
  // --- end new ---

  // --- NEW: login-required prompt state ---
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const requireLoginPrompt = () => setShowLoginPrompt(true);
  const closeLoginPrompt = () => setShowLoginPrompt(false);
  const goToLoginFromPrompt = () => {
    setShowLoginPrompt(false);
    navigate("/login");
  };
  // --- end new ---

  const cancelledRef = useRef(false);

  // Brand checkbox list comes from the same live brand feed Brands.jsx uses —
  // independent of whatever products happen to be loaded, and guaranteed to
  // match the exact name Brands.jsx puts in the URL (no casing drift).
  useEffect(() => {
    brandsAPI.getAll()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setBrands(data.map((b) => b.name).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    // ── Brand filter active: one direct server-side call instead of
    // streaming through the whole ~212-page catalogue and hoping the
    // brand's products happen to be on an early page. build_product_list()
    // is cached for 10 minutes server-side, so this is fast even cold. ──
    async function loadFilteredByBrand() {
      setLoading(true);
      setLoadingMore(false);
      setProducts([]);

      try {
        const res = await productsAPI.getAll({ brand: brandParam });
        if (cancelledRef.current) return;
        setProducts(res.data?.results || []);
      } catch {
        // ap-empty message covers a failed/empty result
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

    async function loadAll() {
      setLoading(true);
      setLoadingMore(false);
      setProducts([]);

      categoriesAPI.getAll()
        .then((res) => {
          if (cancelledRef.current) return;
          const catData = Array.isArray(res.data) ? res.data : res.data?.results || [];
          setCategories(catData);
        })
        .catch(() => {});

      let firstResults = [];
      let totalPages = 1;
      try {
        const res = await productsAPI.getAll({ page: 1 });
        firstResults = res.data?.results || [];
        totalPages = res.data?.num_pages || 1;
      } catch {
        if (!cancelledRef.current) setLoading(false);
        return;
      }
      if (cancelledRef.current) return;

      setProducts(firstResults);
      setLoading(false);
      setLoadProgress({ loaded: 1, total: totalPages });

      if (totalPages <= 1) return;

      setLoadingMore(true);
      const concurrency = 5;
      let nextPage = 2;
      let loadedCount = 1;

      async function worker() {
        while (!cancelledRef.current) {
          const myPage = nextPage;
          if (myPage > totalPages) return;
          nextPage += 1;

          try {
            const res = await productsAPI.getAll({ page: myPage });
            const results = res.data?.results || [];
            if (cancelledRef.current) return;

            setProducts((prev) => [...prev, ...results]);
          } catch {
            // skip a failed page rather than stalling the rest
          }

          loadedCount += 1;
          if (!cancelledRef.current) {
            setLoadProgress({ loaded: loadedCount, total: totalPages });
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, worker));
      if (!cancelledRef.current) setLoadingMore(false);
    }

    if (brandParam) {
      loadFilteredByBrand();
    } else {
      loadAll();
    }

    return () => { cancelledRef.current = true; };
  }, [brandParam]);

  useEffect(() => {
    setSelectedCategory(categoryParam || "");
    setPage(1);
  }, [categoryParam]);

  // Keep the brand filter in sync with ?brand= in the URL — this is what
  // makes clicking a brand card on the Brands page actually filter here.
  // Compared case-insensitively since the brand name in the URL comes from
  // the live sysmac_brands feed, while the checkbox list below is built
  // from p.brand on loaded products (a separate live feed) — casing can differ.
  useEffect(() => {
    setSelectedBrands(brandParam ? [brandParam] : []);
    setPage(1);
  }, [brandParam]);

  // Keep the search box in sync with ?search= in the URL — this is what
  // makes the Navbar's search button/Enter (which navigates to
  // /products?search=...) actually populate results here, including when
  // searching again while already on this page.
  useEffect(() => {
    const s = searchParams.get("search") || "";
    setSearchQuery(s);
    setPage(1);
  }, [searchParams]);

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) => {
      const isSelected = prev.some((b) => b.toLowerCase() === brand.toLowerCase());
      const next = isSelected
        ? prev.filter((b) => b.toLowerCase() !== brand.toLowerCase())
        : [...prev, brand];

      // Keep the URL's ?brand= param in sync with manual checkbox toggles too
      setSearchParams((params) => {
        const p = new URLSearchParams(params);
        if (next.length === 1) p.set("brand", next[0]);
        else p.delete("brand");
        return p;
      });

      return next;
    });
    setPage(1);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setPage(1);

    // Keep the URL's ?search= param in sync with manual typing too, so the
    // address bar reflects the active search and it survives a refresh.
    setSearchParams((params) => {
      const p = new URLSearchParams(params);
      if (val.trim()) p.set("search", val);
      else p.delete("search");
      return p;
    });
  };

  const clearSearch = () => {
    setSearchQuery("");
    setPage(1);
    setSearchParams((params) => {
      const p = new URLSearchParams(params);
      p.delete("search");
      return p;
    });
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const haystack = [p.name, p.brand, p.company, p.spec_line, p.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (selectedCategory) {
      list = list.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (selectedBrands.length) {
      const wanted = selectedBrands.map((b) => b.toLowerCase());
      list = list.filter((p) => wanted.includes((p.brand || "").toLowerCase()));
    }
    list = list.filter((p) => Number(p.price) <= Number(priceRange));

    switch (sortBy) {
      case "price_low":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_high":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "rating":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      default:
        break;
    }
    return list;
  }, [products, selectedCategory, selectedBrands, priceRange, sortBy, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const paginated = filteredProducts.slice((page - 1) * perPage, page * perPage);

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedBrands([]);
    setPriceRange(20000);
    setSearchQuery("");
    setPage(1);
    navigate("/products");
  };

  const selectCategory = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
    navigate(cat ? `/products/${cat}` : "/products");
  };

  const pricePct = (Number(priceRange) / 20000) * 100;

  const pageTitle = selectedCategory || (selectedBrands.length === 1 ? selectedBrands[0] : "All Products");

  return (
    <div className="ap-page">
      <div className="ap-breadcrumb">
        <Link to="/">Home</Link>
        <span className="ap-crumb-sep">›</span>
        <span className="current">{pageTitle}</span>
      </div>

      <div className="ap-layout">
        {/* Sidebar */}
        <aside className="ap-sidebar">
          <div className="ap-sidebar-section">
            <div className="ap-sidebar-header">
              <h3>Categories</h3>
              {selectedCategory && <span className="ap-clear-link" onClick={() => selectCategory("")}>✕</span>}
            </div>
            <ul className="ap-category-list">
              <li
                className={!selectedCategory ? "active" : ""}
                onClick={() => selectCategory("")}
              >
                <span className="ap-cat-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
                  </svg>
                </span>
                All Categories
              </li>
              {categories.map((c) => (
                <li
                  key={c.id || c.name}
                  className={selectedCategory === c.name ? "active" : ""}
                  onClick={() => selectCategory(c.name)}
                >
                  {c.name}
                  <span className="ap-count">{c.count ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ap-sidebar-section">
            <div className="ap-sidebar-header">
              <h3>Filters</h3>
              <span className="ap-clear-link" onClick={clearFilters}>Clear All</span>
            </div>

            <div className="ap-filter-block">
              <label className="ap-filter-label">Price Range</label>
              <input
                type="range"
                min="0"
                max="20000"
                step="100"
                value={priceRange}
                onChange={(e) => { setPriceRange(e.target.value); setPage(1); }}
                className="ap-price-slider"
                style={{
                  background: `linear-gradient(to right, #f98f15 0%, #f98f15 ${pricePct}%, #e5e7eb ${pricePct}%, #e5e7eb 100%)`,
                }}
              />
              <div className="ap-price-values">
                <span>₹0</span>
                <span>₹{Number(priceRange).toLocaleString()}+</span>
              </div>
            </div>

            <div className="ap-filter-block">
              <div className="ap-sidebar-header">
                <label className="ap-filter-label">Brand</label>
                {selectedBrands.length > 0 && (
                  <span
                    className="ap-clear-link"
                    onClick={() => {
                      setSelectedBrands([]);
                      setSearchParams((params) => {
                        const p = new URLSearchParams(params);
                        p.delete("brand");
                        return p;
                      });
                      setPage(1);
                    }}
                  >
                    ✕
                  </span>
                )}
              </div>
              <div className="ap-checkbox-list">
                {brands.map((b) => (
                  <label key={b} className="ap-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedBrands.some((sb) => sb.toLowerCase() === b.toLowerCase())}
                      onChange={() => toggleBrand(b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="ap-main">
          <div className="ap-search-bar">
            <svg className="ap-search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="ap-search-input"
              placeholder="Search products by name, brand or spec..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button className="ap-search-clear" onClick={clearSearch} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>

          <div className="ap-toolbar">
            <div>
              <h1 className="ap-title">{pageTitle}</h1>
              <p className="ap-subtitle">
                Showing {paginated.length ? (page - 1) * perPage + 1 : 0}-
                {Math.min(page * perPage, filteredProducts.length)} of {filteredProducts.length} products
                {searchQuery && <> for "<strong>{searchQuery}</strong>"</>}
              </p>
            </div>
            <div className="ap-sort">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ap-loading">Loading products...</div>
          ) : paginated.length === 0 ? (
            <div className="ap-empty">
              {searchQuery
                ? <>No products found for "{searchQuery}".</>
                : <>No products found.</>}
            </div>
          ) : (
            <div className="ap-grid">
              {paginated.map((p) => (
                <ProductCard
                  key={p.id || p.code}
                  product={p}
                  onNotify={showToast}
                  onRequireLogin={requireLoginPrompt}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="ap-pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((n) => (
                  <button
                    key={n}
                    className={n === page ? "active" : ""}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              {totalPages > 5 && <span className="ap-page-dots">…</span>}
              {totalPages > 5 && (
                <button
                  className={totalPages === page ? "active" : ""}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            </div>
          )}
        </main>
      </div>

      {/* --- NEW: toast --- */}
      {toast && <div className="ap-toast">{toast}</div>}

      {/* --- NEW: login-required alert modal --- */}
      {showLoginPrompt && (
        <div className="ap-login-modal-overlay" onClick={closeLoginPrompt}>
          <div className="ap-login-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="ap-login-modal-close"
              onClick={closeLoginPrompt}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="ap-login-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM8 11V7a4 4 0 118 0v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="ap-login-modal-title">Please Login</h3>
            <p className="ap-login-modal-text">
              You need to be logged in to do that. Please login to continue.
            </p>
            <div className="ap-login-modal-actions">
              <button className="ap-login-modal-btn ap-login-modal-btn-secondary" onClick={closeLoginPrompt}>
                Cancel
              </button>
              <button className="ap-login-modal-btn ap-login-modal-btn-primary" onClick={goToLoginFromPrompt}>
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onNotify, onRequireLogin }) {
  const navigate = useNavigate();
  const [wished, setWished] = useState(false);

  const goToProduct = () =>
    navigate(`/product/${product.type}/${product.type === "custom" ? product.id : product.code}`);

  const addToCart = async (e) => {
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) { onRequireLogin?.(); return; }
    try {
      await cartAPI.add({
        is_custom: product.type === "custom",
        product_id: product.type === "custom" ? product.id : undefined,
        api_product_code: product.type !== "custom" ? product.code : undefined,
      });
      onNotify?.("Added to cart");
    } catch {
      onNotify?.("Could not add to cart");
    }
  };

  const toggleWishlist = async (e) => {
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) { onRequireLogin?.(); return; }
    try {
      const r = await wishlistAPI.toggle({
        is_custom: product.type === "custom",
        product_id: product.type === "custom" ? product.id : undefined,
        api_product_code: product.type !== "custom" ? product.code : undefined,
      });
      setWished(!!r.data.added);
      onNotify?.(r.data.added ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      onNotify?.("Could not update wishlist");
    }
  };

  return (
    <div className="ap-card" onClick={goToProduct}>
      {product.discount_percent > 0 && (
        <span className="ap-badge ap-badge-discount">-{product.discount_percent}%</span>
      )}
      {product.is_new && <span className="ap-badge ap-badge-new">New</span>}

      <div className="ap-card-image">
        <img src={product.image || "https://via.placeholder.com/300?text=No+Image"} alt={product.name} />
      </div>

      <div className="ap-card-body">
        <div className="ap-card-brand">{product.brand || product.company || ""}</div>
        <h3 className="ap-card-name">{product.name}</h3>
        {product.spec_line && <p className="ap-card-spec">{product.spec_line}</p>}

        {product.rating != null && (
          <div className="ap-card-rating">
            <span className="ap-star">★</span>
            <span>{product.rating}</span>
            {product.review_count != null && <span className="ap-review-count">({product.review_count})</span>}
          </div>
        )}

        <div className="ap-card-price-row">
          <span className="ap-card-price">₹{Number(product.price).toLocaleString()}</span>
          {product.mrp && Number(product.mrp) > Number(product.price) && (
            <span className="ap-card-mrp">₹{Number(product.mrp).toLocaleString()}</span>
          )}
        </div>

        <div className="ap-card-actions">
          <button
            className="ap-card-btn ap-card-btn-cart"
            onClick={addToCart}
            aria-label="Add to Cart"
            title="Add to Cart"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="21" r="1" fill="currentColor" />
              <circle cx="20" cy="21" r="1" fill="currentColor" />
              <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.64 16H19.4A2 2 0 0 0 21.36 14.39L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            className={"ap-icon-btn ap-icon-btn-wish" + (wished ? " active" : "")}
            onClick={toggleWishlist}
            aria-label={wished ? "Remove from Wishlist" : "Add to Wishlist"}
            title={wished ? "Wishlisted" : "Add to Wishlist"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21l7.78-7.55 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}