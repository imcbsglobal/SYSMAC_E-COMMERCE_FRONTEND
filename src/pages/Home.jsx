import { useEffect, useLayoutEffect, useState, useMemo, useRef, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI, categoriesAPI, cartAPI, wishlistAPI, bannersAPI, brandsAPI, dealsAPI } from "../api";
import "../styles/Home.scss";

import promo1 from "../assets/1.png";
import promo2 from "../assets/2.png";
import promo3 from "../assets/3.png";
import promo4 from "../assets/4.png";
import promo5 from "../assets/5.png";
import promo6 from "../assets/6.png";
// import promo7 from "../assets/7.png";
import dealHero from "../assets/deal.png";

const PER_PAGE = 20;

// sessionStorage cache so returning to Home is instant (no refetch flash/hang)
const readCache = (k) => {
  try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; }
};
const writeCache = (k, v) => {
  try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {}
};

export default function Home() {
  const cachedProducts = readCache("home_products");
  const cachedBanners  = readCache("home_banners");
  const cachedBrands   = readCache("home_brands");
  const cachedCats     = readCache("home_categories");

  const [products, setProducts]     = useState(cachedProducts || []);
  const [banners, setBanners]       = useState(cachedBanners || []);
  const [brands, setBrands]         = useState(cachedBrands || []);
  const [categories, setCategories] = useState(cachedCats || []);
  const [productsLoading, setProductsLoading] = useState(!cachedProducts);
  const [bannersLoading, setBannersLoading]   = useState(!cachedBanners);
  const [addingKey, setAddingKey]   = useState(null);

  const [wishlistKeys, setWishlistKeys] = useState(new Set());
  const [wishlistBusy, setWishlistBusy] = useState(null);

  // ── Deal of the Day ──────────────────────────────────────────
  const [deals, setDeals] = useState([]);
  const [now, setNow] = useState(Date.now());

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands]         = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort]         = useState("featured");
  const [page, setPage]         = useState(1);
  const [heroIdx, setHeroIdx]   = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [openSections, setOpenSections] = useState({ category: true, price: true, brand: true });

  // Whether the navbar's "Shop by Categories" dropdown is currently open.
  const [catPanelOpen, setCatPanelOpen] = useState(false);

  // Login-required popup (shown instead of redirecting when guest tries to
  // add to cart or toggle wishlist).
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const navigate = useNavigate();

  const wishKey = (p) =>
    p.type === "custom" ? `custom-${p.id}` : `api-${String(p.code)}`;

  const wishPayload = (p) =>
    p.type === "custom"
      ? { is_custom: true, product_id: p.id }
      : { is_custom: false, api_product_code: String(p.code) };

  // Force the page to the very top on every fresh mount of Home, BEFORE the
  // browser paints (useLayoutEffect, not useEffect) and with an explicit
  // "instant" behavior so it isn't caught by the global `scroll-behavior:
  // smooth` CSS rule — otherwise this scroll animates visibly from wherever
  // the browser had already scrolled to (e.g. the products section),
  // looking like a jump from products up to the banner.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // ── Non-blocking shell fetch (page paints immediately from cache/empty) ──
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.allSettled([
      bannersAPI.getAll({ signal: ctrl.signal }),
      brandsAPI.getAll({ signal: ctrl.signal }),
      categoriesAPI.getAll({ signal: ctrl.signal }),
    ]).then(([b, br, c]) => {
      if (b.status === "fulfilled")  { setBanners(b.value.data || []);    writeCache("home_banners", b.value.data || []); }
      if (br.status === "fulfilled") { setBrands(br.value.data || []);    writeCache("home_brands", br.value.data || []); }
      if (c.status === "fulfilled")  { setCategories(c.value.data || []); writeCache("home_categories", c.value.data || []); }
      setBannersLoading(false);
    });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();

    async function loadProducts() {
      // Page 1 first — unblocks the homepage almost immediately.
      let firstResults = [];
      let totalPages = 1;
      try {
        const res = await productsAPI.getAll({ page: 1 }, { signal: ctrl.signal });
        firstResults = res.data?.results || [];
        totalPages = res.data?.num_pages || 1;
      } catch {
        setProductsLoading(false);
        return;
      }
      if (ctrl.signal.aborted) return;

      setProducts(firstResults);
      writeCache("home_products", firstResults);
      setProductsLoading(false);

      if (totalPages <= 1) return;

      // Remaining pages load quietly in the background, a few at a time.
      const concurrency = 5;
      let nextPage = 2;
      let all = firstResults;

      async function worker() {
        while (!ctrl.signal.aborted) {
          const myPage = nextPage;
          if (myPage > totalPages) return;
          nextPage += 1;
          try {
            const res = await productsAPI.getAll({ page: myPage }, { signal: ctrl.signal });
            const results = res.data?.results || [];
            if (ctrl.signal.aborted) return;
            all = [...all, ...results];
            setProducts(all);
            writeCache("home_products", all);
          } catch {
            // skip a failed page rather than stalling the rest
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, worker));
    }

    loadProducts();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    wishlistAPI.get({ signal: ctrl.signal })
      .then((r) => {
        const items = r.data.items || [];
        setWishlistKeys(new Set(
          items.map((it) =>
            it.is_custom ? `custom-${it.product_id}` : `api-${String(it.api_product_code)}`
          )
        ));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Deal of the Day — fetch active deals, and re-poll periodically so a
  // deal that just started (or just ended) shows up without a page reload.
  useEffect(() => {
    const ctrl = new AbortController();
    const loadDeals = () => {
      dealsAPI.getActive({ signal: ctrl.signal })
        .then((r) => setDeals(r.data?.results || []))
        .catch(() => {});
    };
    loadDeals();
    const poll = setInterval(loadDeals, 60000);
    return () => { ctrl.abort(); clearInterval(poll); };
  }, []);

  // Ticks every second to drive the countdown, and to drop a deal card
  // client-side the instant its timer hits zero (before the next poll).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const liveDeals = useMemo(
    () => deals.filter((d) => new Date(d.end_at).getTime() > now),
    [deals, now]
  );

  // Only the first 5 live deals are shown on the homepage. The full list
  // (still driven by the same `deals` state) lives on the /deals page.
  const homeDeals = useMemo(() => liveDeals.slice(0, 5), [liveDeals]);

  const formatCountdown = (endAt) => {
    const diff = new Date(endAt).getTime() - now;
    if (diff <= 0) return "00:00:00";
    const pad = (n) => String(n).padStart(2, "0");
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Countdown shown in the big hero panel — tracks whichever live deal
  // (among the ones actually shown on the homepage) ends soonest.
  const soonestEnd = useMemo(() => {
    if (homeDeals.length === 0) return null;
    return homeDeals.reduce(
      (min, d) => Math.min(min, new Date(d.end_at).getTime()),
      Infinity
    );
  }, [homeDeals]);

  const heroCountdown = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    if (!soonestEnd) return { h: "00", m: "00", s: "00" };
    const diff = Math.max(0, soonestEnd - now);
    return {
      h: pad(Math.floor(diff / 3600000)),
      m: pad(Math.floor((diff % 3600000) / 60000)),
      s: pad(Math.floor((diff % 60000) / 1000)),
    };
  }, [soonestEnd, now]);

  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(
      () => setHeroIdx((i) => (i + 1) % Math.min(banners.length, 3)),
      5000
    );
    return () => clearInterval(t);
  }, [banners]);

  // Listen for the navbar's category-dropdown open/close state.
  useEffect(() => {
    const onCatPanel = (e) => setCatPanelOpen(!!e.detail?.open);
    window.addEventListener("categories-panel", onCatPanel);
    return () => window.removeEventListener("categories-panel", onCatPanel);
  }, []);

  const bestsellers = useMemo(() => products.filter((p) => p.is_bestseller), [products]);

  const brandList = useMemo(() => {
    const s = new Set(products.map((p) => p.brand).filter(Boolean));
    return [...s].sort();
  }, [products]);

  const priceMax = useMemo(() => {
    const max = Math.max(0, ...products.map((p) => p.price || 0));
    return Math.ceil(max / 1000) * 1000 || 100000;
  }, [products]);

  // Defer the filter inputs so typing/sliding never blocks the main thread.
  const dProducts   = useDeferredValue(products);
  const dCategories = useDeferredValue(selectedCategories);
  const dBrands     = useDeferredValue(selectedBrands);
  const dMin        = useDeferredValue(minPrice);
  const dMax        = useDeferredValue(maxPrice);
  const dSort       = useDeferredValue(sort);

  const filtered = useMemo(() => {
    let list = dProducts;
    if (dCategories.length > 0) {
      list = list.filter((p) =>
        dCategories.some(
          (c) => (p.category || "").toLowerCase().trim() === c.toLowerCase().trim()
        )
      );
    }
    if (dBrands.length > 0) {
      list = list.filter((p) => dBrands.includes((p.brand || "").toLowerCase()));
    }
    const min = parseFloat(dMin) || 0;
    const max = parseFloat(dMax) || Infinity;
    list = list.filter((p) => p.price >= min && p.price <= max);

    const sorted = [...list];
    if (dSort === "price-low")       sorted.sort((a, b) => a.price - b.price);
    else if (dSort === "price-high") sorted.sort((a, b) => b.price - a.price);
    else if (dSort === "name")       sorted.sort((a, b) => a.name.localeCompare(b.name));
    // "featured": keep bestsellers first, preserve original order otherwise
    else sorted.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
    return sorted;
  }, [dProducts, dCategories, dBrands, dMin, dMax, dSort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  useEffect(() => setPage(1), [selectedCategories, selectedBrands, minPrice, maxPrice, sort]);

  const toggleCategory = (name) => {
    const v = name.toLowerCase();
    setSelectedCategories((prev) =>
      prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]
    );
  };

  const toggleBrand = (name) => {
    const v = name.toLowerCase();
    setSelectedBrands((prev) =>
      prev.includes(v) ? prev.filter((b) => b !== v) : [...prev, v]
    );
  };

  const toggleSection = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSort("featured");
  };

  const goProduct = (p) => navigate(`/product/${p.type}/${p.code}`);

  const goCategory = (c) => {
    navigate(`/products?category=${encodeURIComponent((c.name || "").toLowerCase())}`);
  };

  const addToCartAndGo = async (p) => {
    if (!localStorage.getItem("access")) { setShowLoginPopup(true); return; }
    const key = `${p.type}-${p.code}`;
    setAddingKey(key);
    const payload =
      p.type === "custom"
        ? { is_custom: true, product_id: p.id }
        : { is_custom: false, api_product_code: String(p.code) };
    try {
      await cartAPI.add(payload);
      navigate("/cart");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) setShowLoginPopup(true);
      else navigate("/cart");
    } finally {
      setAddingKey(null);
    }
  };

  const toggleWishlist = async (p) => {
    const token = localStorage.getItem("access");
    if (!token) { setShowLoginPopup(true); return; }
    const key = wishKey(p);
    setWishlistBusy(key);
    try {
      await wishlistAPI.toggle(wishPayload(p));
      setWishlistKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
      // Let the Navbar (and any other listeners) know the wishlist count changed.
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) setShowLoginPopup(true);
    } finally {
      setWishlistBusy(null);
    }
  };

  const minVal   = minPrice === "" ? 0 : Number(minPrice);
  const maxVal   = maxPrice === "" ? priceMax : Number(maxPrice);
  const leftPct  = priceMax ? (minVal / priceMax) * 100 : 0;
  const rightPct = priceMax ? 100 - (maxVal / priceMax) * 100 : 0;

  const onMinSlider = (e) => {
    const v = Math.min(Number(e.target.value), maxVal - 1);
    setMinPrice(v <= 0 ? "" : String(v));
  };
  const onMaxSlider = (e) => {
    const v = Math.max(Number(e.target.value), minVal + 1);
    setMaxPrice(v >= priceMax ? "" : String(v));
  };

  const brandsRef = useRef(null);
  const bsScrollRef = useRef(null);

  useEffect(() => {
    const section = brandsRef.current;
    if (!section) return;
    const strip = section.querySelector(".brands-logo-strip");
    if (!strip) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("brands-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(strip);
    return () => observer.disconnect();
  }, [brands.length]);

  const activeBanner = banners[heroIdx] || banners[0];

  return (
    <div className="home" style={{ overflowAnchor: "none" }}>

      {/* HERO — always reserve the space, even while banners are still
          loading (skeleton), so this section never gets inserted above the
          catalog AFTER the browser has already painted. That insertion-
          after-paint is what was causing the page to appear to land on the
          "All Products" section instead of the banner on fresh loads. */}
      {(bannersLoading || banners.length > 0) && (
        <section
          className={"hero-banner-boxed" + (catPanelOpen ? " panel-open" : "")}
          style={{ overflowAnchor: "none" }}
        >
          {bannersLoading ? (
            <div className="hbx-row no-sidebar">
              <div className="hbx-banner">
                <div className="hbx-media hbx-media-skeleton" />
              </div>
            </div>
          ) : (
            <>
              <div className={"hbx-row" + (catPanelOpen ? "" : " no-sidebar")}>
                {catPanelOpen && <div className="hbx-sidebar-spacer" />}

                <div className="hbx-banner">
                  <div className="hbx-media">
                    {banners.slice(0, 3).map((b, i) => (
                      <img
                        key={b.id}
                        src={b.image}
                        alt={b.title || "Banner"}
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "low"}
                        className={"hbx-img" + (i === heroIdx ? " active" : "")}
                      />
                    ))}
                    <div className="hbx-overlay" />
                  </div>

                  <div className="hbx-content">
                    <h1 className="hbx-heading">
                      {activeBanner?.title || "Built for Professionals.\nMade to Last."}
                    </h1>
                    <p className="hbx-text">
                      {activeBanner?.subtitle ||
                        "Top quality hardware tools and supplies for every project."}
                    </p>
                    <a href="#products" className="hbx-cta">
                      Shop Now <i className="fas fa-arrow-right" />
                    </a>

                    {banners.length > 1 && (
                      <div className="hbx-dots">
                        {banners.slice(0, 3).map((b, i) => (
                          <button
                            key={b.id}
                            className={"hbx-dot" + (i === heroIdx ? " active" : "")}
                            onClick={() => setHeroIdx(i)}
                            aria-label={`Slide ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="hbx-features">
                <div className="hbx-feature">
                  <i className="fas fa-shield-halved" />
                  <span><strong>100% Genuine Products</strong><small>Quality you can trust</small></span>
                </div>
                <div className="hbx-feature">
                  <i className="fas fa-tag" />
                  <span><strong>Best Price Guarantee</strong><small>Get the best deals</small></span>
                </div>
                <div className="hbx-feature">
                  <i className="fas fa-boxes-stacked" />
                  <span><strong>Bulk Order Discounts</strong><small>Save more on large orders</small></span>
                </div>
                <div className="hbx-feature">
                  <i className="fas fa-lock" />
                  <span><strong>Secure Payments</strong><small>100% secure transactions</small></span>
                </div>
                <div className="hbx-feature">
                  <i className="fas fa-rotate-left" />
                  <span><strong>Easy Returns</strong><small>Hassle free returns</small></span>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* DEAL OF THE DAY — dark glowing hero + accent deal cards, capped
          at 5 on the homepage, "View All Deals" routes to /deals */}
      {homeDeals.length > 0 && (
        <section className="deal-of-day-section">
          <div className="dotd-glow dotd-glow-1" />
          <div className="dotd-glow dotd-glow-2" />

          <div className="dotd-inner">
            <div className="dotd-top">
              <div className="dotd-top-text">
                <div className="dotd-eyebrow"><i className="fas fa-bolt" /> Deal of the Day</div>
                <h2 className="dotd-heading">
                  Unbeatable Deals.<br /><span>Today Only.</span>
                </h2>
                <p className="dotd-sub">
                  Grab the best products at jaw-dropping prices. Limited time offer — don't miss out!
                </p>

                <div className="dotd-countdown">
                  <div className="dotd-countdown-box">
                    <span className="dotd-countdown-num">{heroCountdown.h}</span>
                    <span className="dotd-countdown-label">HRS</span>
                  </div>
                  <span className="dotd-countdown-colon">:</span>
                  <div className="dotd-countdown-box">
                    <span className="dotd-countdown-num">{heroCountdown.m}</span>
                    <span className="dotd-countdown-label">MINS</span>
                  </div>
                  <span className="dotd-countdown-colon">:</span>
                  <div className="dotd-countdown-box">
                    <span className="dotd-countdown-num">{heroCountdown.s}</span>
                    <span className="dotd-countdown-label">SECS</span>
                  </div>
                </div>

                <button className="dotd-viewall-btn" onClick={() => navigate("/deals")}>
                  View All Deals <i className="fas fa-arrow-right" />
                </button>
              </div>

              <div className="dotd-top-visual">
                <img src={dealHero} alt="Deal of the Day" />
              </div>
            </div>

            <div className="dotd-grid">
              {homeDeals.map((p, idx) => {
                const original = p.original_price;
                const hasDiscount = !!(original && original > p.price);
                const discountPct = hasDiscount
                  ? Math.round(((original - p.price) / original) * 100)
                  : 0;
                const accent = idx % 4;

                return (
                  <div
                    className={`dotd-card dotd-accent-${accent}`}
                    key={p.id}
                    onClick={() => goProduct(p)}
                  >
                    <div className="dotd-card-timer">
                      <i className="fas fa-fire" /> Ends in {formatCountdown(p.end_at)}
                    </div>
                    <div className="dotd-card-image">
                      {hasDiscount && <span className="dotd-card-badge">{discountPct}% OFF</span>}
                      {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : (
                        <div className="dotd-card-image-placeholder"><i className="fas fa-image" /></div>
                      )}
                    </div>
                    <div className="dotd-card-body">
                      <h3 className="dotd-card-name" title={p.name}>{p.name}</h3>
                      <div className="dotd-card-price-row">
                        <span className="dotd-card-price">₹{p.price.toLocaleString()}</span>
                        {hasDiscount && (
                          <span className="dotd-card-price-original">₹{original.toLocaleString()}</span>
                        )}
                      </div>
                      <button
                        className="dotd-card-cta"
                        onClick={(e) => { e.stopPropagation(); goProduct(p); }}
                      >
                        <i className="fas fa-eye" /> View Deal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section className="best-seller-section">
          <div className="best-seller-inner">
            <div className="bs-section-header">
              <h2 className="bs-section-title">Best Sellers</h2>
              <a href="#products" className="bs-viewall">View All <i className="fas fa-arrow-right" /></a>
            </div>

            <div className="bs-carousel">
              <button
                className="bs-arrow bs-arrow-left"
                onClick={() => bsScrollRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                aria-label="Scroll left"
              >
                <i className="fas fa-chevron-left" />
              </button>

              <div className="bs-track" ref={bsScrollRef}>
                {bestsellers.map((p) => {
                  const rating  = p.rating || 4.5;
                  const reviews = p.review_count || p.reviews || 0;
                  return (
                    <div className="bs-product-card" key={`${p.type}-${p.code}`} onClick={() => goProduct(p)}>
                      <div className="bs-card-image">
                        {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : (
                          <div className="bs-card-image-placeholder"><i className="fas fa-image" /></div>
                        )}
                      </div>
                      <div className="bs-card-body">
                        <h3 className="bs-card-name" title={p.name}>{p.name}</h3>
                        <div className="bs-card-price">₹{p.price.toLocaleString()}</div>
                        <div className="bs-card-rating">
                          <i className="fas fa-star" />
                          <span>{rating.toFixed(1)}</span>
                          {reviews > 0 && <span className="bs-card-reviews">({reviews})</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="bs-arrow bs-arrow-right"
                onClick={() => bsScrollRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                aria-label="Scroll right"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        </section>
      )}


      {/* CATALOG + FILTERS */}
      <section className="catalog-section" id="products">
        <div className="catalog-crumb">
          <span>Home</span> <i className="fas fa-chevron-right" /> <span className="crumb-current">All Products</span>
        </div>

        <div className="catalog-layout">
          <aside className="filters-sidebar">
            <div className="filters-heading">
              <span className="filters-heading-icon"><i className="fas fa-sliders-h" /></span>
              <span className="filters-heading-text">Filters</span>
            </div>

            <div className="filters-scroll">
              <div className="filter-section">
                <button className="filter-title" onClick={() => toggleSection("category")}>
                  Categories
                  <i className={"fas fa-chevron-up filter-chevron" + (openSections.category ? "" : " closed")} />
                </button>
                {openSections.category && (
                  <div className="filter-options">
                    <label className="filter-option">
                      <input type="checkbox" checked={selectedCategories.length === 0} onChange={() => setSelectedCategories([])} />
                      <span className="filter-check"><i className="fas fa-check" /></span>
                      <span className="filter-label">All Categories</span>
                    </label>
                    {categories.map((c) => (
                      <label className="filter-option" key={c.id}>
                        <input type="checkbox" checked={selectedCategories.includes((c.name || "").toLowerCase())} onChange={() => toggleCategory(c.name)} />
                        <span className="filter-check"><i className="fas fa-check" /></span>
                        <span className="filter-label">{c.display_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-section">
                <button className="filter-title" onClick={() => toggleSection("price")}>
                  Price Range
                  <i className={"fas fa-chevron-up filter-chevron" + (openSections.price ? "" : " closed")} />
                </button>
                {openSections.price && (
                  <>
                    <div className="price-slider">
                      <div className="slider-rail" />
                      <div className="slider-fill" style={{ left: `${leftPct}%`, right: `${rightPct}%` }} />
                      <input type="range" min={0} max={priceMax} value={minVal} onChange={onMinSlider} className="slider-input" />
                      <input type="range" min={0} max={priceMax} value={maxVal} onChange={onMaxSlider} className="slider-input" />
                    </div>
                    <div className="price-inputs">
                      <div className="price-input-wrap">
                        <span className="price-prefix">₹</span>
                        <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                      </div>
                      <span className="price-dash">to</span>
                      <div className="price-input-wrap">
                        <span className="price-prefix">₹</span>
                        <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="filter-section">
                <button className="filter-title" onClick={() => toggleSection("brand")}>
                  Brand
                  <i className={"fas fa-chevron-up filter-chevron" + (openSections.brand ? "" : " closed")} />
                </button>
                {openSections.brand && (
                  <div className="filter-options">
                    <label className="filter-option">
                      <input type="checkbox" checked={selectedBrands.length === 0} onChange={() => setSelectedBrands([])} />
                      <span className="filter-check"><i className="fas fa-check" /></span>
                      <span className="filter-label">All Brands</span>
                    </label>
                    {brandList.map((b) => (
                      <label className="filter-option" key={b}>
                        <input type="checkbox" checked={selectedBrands.includes(b.toLowerCase())} onChange={() => toggleBrand(b)} />
                        <span className="filter-check"><i className="fas fa-check" /></span>
                        <span className="filter-label">{b}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filters-footer">
              <button className="clear-filters-btn" onClick={clearAll}>
                <i className="fas fa-rotate-left" /> Clear All Filters
              </button>
            </div>
          </aside>

          <div className="products-content">
            <div className="catalog-toolbar">
              <div className="catalog-head">
                <h2 className="catalog-title">All Products</h2>
                <p className="catalog-subtitle">Explore our wide range of premium hardware products</p>
              </div>
              <div className="catalog-controls">
                <div className="view-toggle">
                  <button className={"view-btn" + (viewMode === "grid" ? " active" : "")} onClick={() => setViewMode("grid")} aria-label="Grid view">
                    <i className="fas fa-table-cells-large" />
                  </button>
                  <button className={"view-btn" + (viewMode === "list" ? " active" : "")} onClick={() => setViewMode("list")} aria-label="List view">
                    <i className="fas fa-list" />
                  </button>
                </div>
                <div className="sort-options">
                  <label htmlFor="sort-select">Sort by:</label>
                  <div className="select-wrap">
                    <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="featured">Featured</option>
                      <option value="name">Name</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                    <i className="fas fa-chevron-down" />
                  </div>
                </div>
              </div>
            </div>

            <div className="products-scroll">
              {productsLoading ? (
                <div className="empty-state">
                  <span className="empty-state-icon"><i className="fas fa-spinner fa-spin" /></span>
                  <h3>Loading products…</h3>
                </div>
              ) : pageItems.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon"><i className="fas fa-box-open" /></span>
                  <h3>No Products Found</h3>
                  <p>Try adjusting your filters.</p>
                </div>
              ) : (
                <div className={"products-grid" + (viewMode === "list" ? " list-view" : "")}>
                  {pageItems.map((p) => {
                    const rating   = p.rating || 4.5;
                    const reviews  = p.review_count || p.reviews || 0;
                    const key      = `${p.type}-${p.code}`;
                    const wKey     = wishKey(p);
                    const wished   = wishlistKeys.has(wKey);
                    const wBusy    = wishlistBusy === wKey;
                    const original = p.original_price || p.mrp || null;
                    const hasDiscount = !!(original && original > p.price);
                    const discountPct = hasDiscount
                      ? Math.round(((original - p.price) / original) * 100)
                      : 0;

                    return (
                      <div className="product-card" key={key} onClick={() => goProduct(p)}>
                        <div className="product-image">
                          {p.is_bestseller ? (
                            <span className="badge badge-bestseller">Best Seller</span>
                          ) : hasDiscount ? (
                            <span className="badge badge-discount">{discountPct}% OFF</span>
                          ) : null}
                          <button
                            className={"wishlist-heart" + (wished ? " active" : "")}
                            disabled={wBusy}
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                          >
                            <i className={wished ? "fas fa-heart" : "far fa-heart"} />
                          </button>
                          {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : (
                            <div className="product-image-placeholder">
                              <i className="fas fa-image" /><span>Image coming soon</span>
                            </div>
                          )}
                        </div>
                        <div className="product-content">
                          <div className="product-category">{p.category || "General"}</div>
                          <h3 className="product-name" title={p.name}>{p.name}</h3>
                          <div className="product-rating">
                            <span className="product-stars">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <i key={s} className={rating >= s ? "fas fa-star" : rating >= s - 0.5 ? "fas fa-star-half-alt" : "far fa-star"} />
                              ))}
                            </span>
                            <span className="product-reviews">({reviews})</span>
                          </div>
                          <div className="product-price-row">
                            <span className="product-price">₹{p.price.toLocaleString()}</span>
                            {hasDiscount && (
                              <span className="product-price-original">₹{original.toLocaleString()}</span>
                            )}
                          </div>
                          <button
                            className="add-to-cart-btn"
                            onClick={(e) => { e.stopPropagation(); goProduct(p); }}
                          >
                            <i className="fas fa-eye" /> View Product
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="catalog-footer-row">
                <div className="results-count">
                  Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} products
                </div>
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                      <button key={n} className={"pagination-btn" + (n === page ? " active" : "")} onClick={() => setPage(n)}>{n}</button>
                    ))}
                    {totalPages > 5 && <span className="pagination-ellipsis">…</span>}
                    <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showLoginPopup && (
        <div className="login-modal-overlay" onClick={() => setShowLoginPopup(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setShowLoginPopup(false)}>×</button>
            <h3>Login Required</h3>
            <p>Please login to your account to continue.</p>
            <button className="login-modal-btn" onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>
      )}

    </div>
  );
}