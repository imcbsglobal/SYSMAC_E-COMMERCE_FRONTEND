import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI, dealsAPI } from "../api";
import AdminLayout from "../components/AdminLayout";
import "../styles/SysmacProducts.scss";

const rowKey = (p) => p.row_id || `${p.code}-${p.barcode || "0"}`;

export default function SysmacProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);       // true only until page 1 arrives
  const [loadingMore, setLoadingMore] = useState(false); // true while remaining pages stream in
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bestsellerFilter, setBestsellerFilter] = useState("");
  const navigate = useNavigate();

  // ── Pagination ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Deal of the Day ──────────────────────────────────────────
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsPanelOpen, setDealsPanelOpen] = useState(false);
  const [dealModalProduct, setDealModalProduct] = useState(null); // product row being turned into a deal
  const [dealStart, setDealStart] = useState("");
  const [dealEnd, setDealEnd] = useState("");
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState("");

  const loadDeals = () => {
    setDealsLoading(true);
    dealsAPI.adminGetAll()
      .then((r) => setDeals(r.data?.results || []))
      .catch(() => {})
      .finally(() => setDealsLoading(false));
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const openDealModal = (product) => {
    setDealModalProduct(product);
    setDealStart("");
    setDealEnd("");
    setDealError("");
  };
  const closeDealModal = () => setDealModalProduct(null);

  const submitDeal = async () => {
    if (!dealModalProduct) return;
    if (!dealStart || !dealEnd) {
      setDealError("Pick both a start and an end date/time.");
      return;
    }
    if (new Date(dealEnd) <= new Date(dealStart)) {
      setDealError("End time must be after start time.");
      return;
    }
    setDealSaving(true);
    setDealError("");
    try {
      // `dealStart`/`dealEnd` come from <input type="datetime-local">, which
      // gives a timezone-less string (e.g. "2026-08-05T14:00") representing
      // whatever the ADMIN'S BROWSER clock says. Sending that raw string to
      // the backend used to cause it to be interpreted in the *server's*
      // timezone (often UTC) instead of the admin's local timezone — so a
      // deal meant to start "now" could actually get saved hours off, and
      // sit as "scheduled" instead of "active" (never showing on Home.jsx).
      // `new Date(...).toISOString()` converts using the browser's local
      // timezone and produces an unambiguous UTC timestamp the backend can
      // parse correctly regardless of server timezone settings.
      await dealsAPI.adminCreate({
        product_code: dealModalProduct.code,
        start_at: new Date(dealStart).toISOString(),
        end_at: new Date(dealEnd).toISOString(),
      });
      closeDealModal();
      loadDeals();
      setDealsPanelOpen(true);
    } catch (err) {
      setDealError(err?.response?.data?.detail || "Could not create the deal. Please try again.");
    } finally {
      setDealSaving(false);
    }
  };

  const removeDeal = async (id) => {
    if (!window.confirm("Remove this deal?")) return;
    await dealsAPI.adminDelete(id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const dealStatusLabel = {
    active: "Active",
    scheduled: "Scheduled",
    expired: "Expired",
    cancelled: "Cancelled",
  };
  const activeDealCount = deals.filter((d) => d.status === "active" || d.status === "scheduled").length;

  // ── Load all Sysmac products, paging through the API ───────────
  // NOTE: under React 18 StrictMode (dev only), React deliberately runs
  // this effect twice (mount → cleanup → mount) to surface bugs like the
  // one that used to live here. The old code used a *shared* `useRef` as
  // its cancellation flag, which both effect runs read/write — so the
  // 2nd run's mount would reset the flag the 1st run's cleanup had just
  // set to true, letting the 1st run's stale in-flight fetch keep
  // appending pages once it resolved. Net effect: everything got loaded
  // twice, and the product count doubled (e.g. 40 instead of 20).
  //
  // Fix: use a `cancelled` variable that's local to *this* effect
  // invocation (a closure variable, not a ref). Each run gets its own
  // private flag that only its own cleanup can set — so a stale run can
  // never be revived by a newer run. We also de-dupe by row key as a
  // defensive safety net in case pages ever overlap for any other reason.
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      let page = 1;
      let numPages = 1;

      while (page <= numPages && !cancelled) {
        try {
          const r = await productsAPI.adminGetSysmac(page);
          const data = r.data;
          numPages = data.num_pages || 1;

          if (cancelled) return;

          setProducts((prev) => {
            if (page === 1) return data.results;
            const seen = new Set(prev.map(rowKey));
            const fresh = data.results.filter((x) => !seen.has(rowKey(x)));
            return [...prev, ...fresh];
          });
          setTotalCount(data.count || 0);
          setLoadedCount((prev) => (page === 1 ? data.results.length : prev + data.results.length));

          if (page === 1) {
            setLoading(false);
            if (numPages > 1) setLoadingMore(true);
          }
        } catch {
          break;
        }
        page += 1;
      }

      if (!cancelled) setLoadingMore(false);
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // A product `code` can now appear as multiple rows (one per barcode/
  // variant from ProductBatch), so deleting by code removes ALL rows that
  // share that code — matching the backend, where the EditedAPIProduct
  // override being deleted applies to the whole product code, not just
  // one barcode/variant row.
  const deleteProduct = async (code) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    await productsAPI.adminDeleteSysmac(code);
    setProducts((p) => p.filter((x) => x.code !== code));
  };

  const brands = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const b = (p.edited_brand || p.brand || "").trim();
      if (b && b !== "-") s.add(b);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productTypes = useMemo(() => {
    const s = new Set();
    products.forEach((p) => {
      const pr = (p.edited_product || p.product || "").trim();
      if (pr && pr !== "-") s.add(pr);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // ── Search covers every visible column: code, barcode, name,
  //    product, category, company, brand, price, original price,
  //    status (active/inactive) and bestseller (bestseller/regular).
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return products.filter((p) => {
      const name = (p.edited_name || p.name || "").toLowerCase();
      const product = (p.edited_product || p.product || "").toLowerCase();
      const category = (p.edited_category || p.category || "").toLowerCase();
      const company = (p.edited_company || p.company || "").toLowerCase();
      const brand = (p.edited_brand || p.brand || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      const code = (p.code || "").toLowerCase();
      const price = String(p.edited_price ?? p.price ?? "").toLowerCase();
      const originalPrice = String(p.original_price ?? "").toLowerCase();
      const status = p.is_active ? "active" : "inactive";
      const bestseller = p.is_bestseller ? "bestseller" : "regular";

      const matchSearch = !term ||
        name.includes(term) || product.includes(term) ||
        category.includes(term) || company.includes(term) ||
        brand.includes(term) || barcode.includes(term) ||
        code.includes(term) || price.includes(term) ||
        originalPrice.includes(term) || status.includes(term) ||
        bestseller.includes(term);

      const matchBrand = !brandFilter || brand === brandFilter.toLowerCase();
      const matchProduct = !productFilter || product === productFilter.toLowerCase();
      const matchStatus = !statusFilter || (statusFilter === "active" ? p.is_active : !p.is_active);
      const matchBs = !bestsellerFilter || (bestsellerFilter === "yes" ? p.is_bestseller : !p.is_bestseller);

      return matchSearch && matchBrand && matchProduct && matchStatus && matchBs;
    });
  }, [products, search, brandFilter, productFilter, statusFilter, bestsellerFilter]);

  // Reset to page 1 whenever the result set could have changed shape.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, brandFilter, productFilter, statusFilter, bestsellerFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const paginated = filtered.slice(pageStart, pageEnd);

  // Windowed page-number list: 1 … (current-1, current, current+1) … last
  const pageNumbers = useMemo(() => {
    const pages = [];
    const add = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n); };
    add(1);
    add(safePage - 1);
    add(safePage);
    add(safePage + 1);
    add(totalPages);
    return pages.sort((a, b) => a - b);
  }, [safePage, totalPages]);

  const resetAll = () => {
    setSearch(""); setBrandFilter(""); setProductFilter("");
    setStatusFilter(""); setBestsellerFilter("");
  };

  return (
    <AdminLayout title="Sysmac Products">
      <div className="sp">

        {/* ── Page header ── */}
        <div className="sp-page-header">
          <div className="sp-breadcrumb">Admin › Products</div>
          <h1 className="sp-page-title">Sysmac Products</h1>
        </div>

        {/* ── Card ── */}
        <div className="sp-card">
          <div className="sp-card-head">
            <h2 className="sp-card-title">Product List</h2>

            <div className="sp-filters">
              {/* Search */}
              <div className="sp-search-wrap">
                <svg className="sp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="sp-search"
                  placeholder="Search by name, code, barcode, brand, price, status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="sp-clear" onClick={() => setSearch("")} title="Clear">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              <div className="sp-select-wrap">
                <select className="sp-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                  <option value="">All Brands</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <div className="sp-select-wrap">
                <select className="sp-select" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                  <option value="">All Products</option>
                  {productTypes.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <div className="sp-select-wrap">
                <select className="sp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <div className="sp-select-wrap">
                <select className="sp-select" value={bestsellerFilter} onChange={(e) => setBestsellerFilter(e.target.value)}>
                  <option value="">All Bestseller</option>
                  <option value="yes">Bestsellers</option>
                  <option value="no">Regular</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <button className="sp-reset" onClick={resetAll}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Reset
              </button>

              <button className="dotd-panel-toggle" onClick={() => setDealsPanelOpen((v) => !v)}>
                <i className="fas fa-bolt" />
                Deal of the Day
                {activeDealCount > 0 && <span className="dotd-panel-count">{activeDealCount}</span>}
              </button>
            </div>
          </div>

          {dealsPanelOpen && (
            <div className="dotd-panel">
              <div className="dotd-panel-head">
                <h3>Deal of the Day \u2014 active & scheduled offers</h3>
                <p>Use the \u26A1 button on any product row below to add a new deal.</p>
              </div>
              {dealsLoading ? (
                <div className="dotd-panel-loading">Loading deals\u2026</div>
              ) : deals.length === 0 ? (
                <div className="dotd-panel-empty">No deals yet. Search for a product below and click \u26A1 to create one.</div>
              ) : (
                <div className="dotd-panel-list">
                  {deals.map((d) => (
                    <div className="dotd-panel-row" key={d.id}>
                      {d.product?.image
                        ? <img src={d.product.image} alt="" className="dotd-panel-img" />
                        : <div className="dotd-panel-img dotd-panel-img-empty"><i className="fas fa-image" /></div>}
                      <div className="dotd-panel-info">
                        <div className="dotd-panel-name">{d.product?.name || `Product ${d.product_code} (removed)`}</div>
                        <div className="dotd-panel-times">
                          {new Date(d.start_at).toLocaleString()} \u2192 {new Date(d.end_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={"dotd-status dotd-status-" + d.status}>{dealStatusLabel[d.status]}</span>
                      <button className="dotd-panel-remove" title="Remove deal" onClick={() => removeDeal(d.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="sp-card-body">
            <div className="sp-count-row">
              <span className="sp-count-badge">{filtered.length} products</span>
              {loadingMore && (
                <span className="sp-loading-more">
                  <span className="sp-loading-more-spinner"></span>
                  Loading more… {loadedCount}{totalCount ? ` / ${totalCount}` : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div className="sp-loading">
                <div className="sp-spinner"></div>
                Loading products…
              </div>
            ) : filtered.length === 0 ? (
              <div className="sp-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <div className="sp-empty-title">No products found</div>
                <div className="sp-empty-sub">Try adjusting your search or filters</div>
              </div>
            ) : (
              <>
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Barcode</th>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Company</th>
                        <th>Brand</th>
                        <th>Price</th>
                        <th>Original Price</th>
                        <th>Status</th>
                        <th>Bestseller</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p) => (
                        <tr key={rowKey(p)}>
                          <td><code className="sp-code">{p.code}</code></td>
                          <td><code className="sp-code">{p.barcode || "—"}</code></td>
                          <td>
                            {p.edited_image || p.image
                              ? <img src={p.edited_image || p.image} alt="" className="sp-img" />
                              : <div className="sp-no-img">No image</div>}
                          </td>
                          <td className="sp-strong">{p.edited_name || p.name}</td>
                          <td>{p.edited_product || p.product}</td>
                          <td>{p.edited_category || p.category}</td>
                          <td>{p.edited_company || p.company}</td>
                          <td>{p.edited_brand || p.brand}</td>
                          <td className="sp-strong">₹{p.edited_price ?? p.price}</td>
                          <td className="sp-muted">₹{p.original_price}</td>
                          <td>
                            <span className={"sp-badge " + (p.is_active ? "active" : "inactive")}>
                              {p.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {p.is_bestseller
                              ? <span className="sp-bs">
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                  </svg>
                                  Bestseller
                                </span>
                              : <span className="sp-regular">Regular</span>}
                          </td>
                          <td>
                            <div className="sp-actions">
                              <button className="sp-act dotd-act" title="Set as Deal of the Day"
                                onClick={() => openDealModal(p)}>
                                <i className="fas fa-bolt" />
                                Deal
                              </button>
                              {/* <button className="sp-act edit" title="Edit"
                                onClick={() => navigate(`/admin/sysmac-products/edit/${p.code}`)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button> */}
                              {p.is_edited && (
                                <button className="sp-act del" title="Delete"
                                  onClick={() => deleteProduct(p.code)}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6"/><path d="M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                  </svg>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ── */}
                <div className="sp-pagination">
                  <div className="sp-pagination-info">
                    Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length}
                  </div>

                  <div className="sp-pagination-controls">
                    <button
                      className="sp-page-btn"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>

                    {pageNumbers.map((n, i) => {
                      const prev = pageNumbers[i - 1];
                      const showEllipsis = prev !== undefined && n - prev > 1;
                      return (
                        <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {showEllipsis && <span className="sp-page-ellipsis">…</span>}
                          <button
                            className={"sp-page-btn sp-page-num" + (n === safePage ? " active" : "")}
                            onClick={() => setCurrentPage(n)}
                          >
                            {n}
                          </button>
                        </span>
                      );
                    })}

                    <button
                      className="sp-page-btn"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>

                  <div className="sp-select-wrap sp-pagesize-wrap">
                    <select
                      className="sp-select"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={10}>10 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                    </select>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {dealModalProduct && (
        <div className="dotd-modal-overlay" onClick={closeDealModal}>
          <div className="dotd-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dotd-modal-close" onClick={closeDealModal}>&times;</button>
            <h3>Set as Deal of the Day</h3>

            <div className="dotd-modal-product">
              {dealModalProduct.edited_image || dealModalProduct.image
                ? <img src={dealModalProduct.edited_image || dealModalProduct.image} alt="" />
                : <div className="dotd-modal-product-noimg"><i className="fas fa-image" /></div>}
              <div>
                <div className="dotd-modal-product-name">
                  {dealModalProduct.edited_name || dealModalProduct.name}
                </div>
                <div className="dotd-modal-product-code">
                  Code: {dealModalProduct.code}
                  {dealModalProduct.barcode ? ` · Barcode: ${dealModalProduct.barcode}` : ""}
                </div>
              </div>
            </div>

            <label className="dotd-modal-label">
              Start
              <input
                type="datetime-local"
                value={dealStart}
                onChange={(e) => setDealStart(e.target.value)}
              />
            </label>
            <label className="dotd-modal-label">
              End
              <input
                type="datetime-local"
                value={dealEnd}
                onChange={(e) => setDealEnd(e.target.value)}
              />
            </label>

            {dealError && <div className="dotd-modal-error">{dealError}</div>}

            <div className="dotd-modal-actions">
              <button className="dotd-modal-cancel" onClick={closeDealModal} disabled={dealSaving}>Cancel</button>
              <button className="dotd-modal-save" onClick={submitDeal} disabled={dealSaving}>
                {dealSaving ? "Saving\u2026" : "Save Deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}