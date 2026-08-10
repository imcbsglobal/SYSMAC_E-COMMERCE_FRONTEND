import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ordersAPI, productsAPI } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../styles/OrderManagement.scss";

const STATUS_TABS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "delivered", label: "Delivered" },
];

const emptyItem = () => ({
  key: Math.random().toString(36).slice(2),
  is_custom: false,
  product_id: null,
  api_product_code: null,
  name: "",
  price: 0,
  quantity: 1,
});

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ordersAPI.adminGetAll(statusTab === "all" ? null : statusTab);
      setOrders(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (!search) return orders;
    const s = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(s) ||
        (o.customer_name || "").toLowerCase().includes(s) ||
        (o.customer_email || "").toLowerCase().includes(s) ||
        (o.contact_phone || "").toLowerCase().includes(s)
    );
  }, [orders, search]);

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, delivered: 0 };
    orders.forEach((o) => { if (c[o.status] !== undefined) c[o.status] += 1; });
    return c;
  }, [orders]);

  const handleAdvance = async (order) => {
    const next = order.status === "pending" ? "confirmed" : "delivered";
    setBusyId(order.id);
    try {
      await ordersAPI.adminUpdateStatus(order.id, next);
      await fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="om-layout">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="om-main">
        <div className="om-container">
          {/* Page header */}
          <div className="om-page-header">
            <button className="om-hamburger-btn" onClick={() => setSidebarOpen(true)} type="button" aria-label="Open menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="om-page-header__titles">
              <div className="om-breadcrumb">Admin › Orders</div>
              <h1 className="om-page-title">Order Management</h1>
            </div>
            <button className="om-add-btn" onClick={() => setShowCreate(true)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Order
            </button>
          </div>

          {/* Stat cards */}
          <div className="om-stats-row">
            <div className="om-stat-card om-stat-card--pending">
              <p className="om-stat-card__label">Pending</p>
              <p className="om-stat-card__value">{counts.pending}</p>
            </div>
            <div className="om-stat-card om-stat-card--confirmed">
              <p className="om-stat-card__label">Confirmed</p>
              <p className="om-stat-card__value">{counts.confirmed}</p>
            </div>
            <div className="om-stat-card om-stat-card--delivered">
              <p className="om-stat-card__label">Delivered</p>
              <p className="om-stat-card__value">{counts.delivered}</p>
            </div>
          </div>

          {/* Table card */}
          <div className="om-table-card">
            <div className="om-table-card__header">
              <div className="om-tabs">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.value}
                    className={`om-tab ${statusTab === t.value ? "om-tab--active" : ""}`}
                    onClick={() => setStatusTab(t.value)}
                    type="button"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="om-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search order #, name, email, phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="om-loading"><div className="om-spinner" /><span>Loading orders...</span></div>
            ) : error ? (
              <div className="om-error"><p>{error}</p><button onClick={fetchOrders}>Retry</button></div>
            ) : (
              <div className="om-table-wrapper">
                <table className="om-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Placed</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((o) => (
                      <tr key={o.id}>
                        <td className="om-table__number">{o.order_number}</td>
                        <td>
                          <div className="om-customer-cell">
                            <span className="om-customer-cell__name">{o.customer_name}</span>
                            <span className="om-customer-cell__email">{o.customer_email}</span>
                          </div>
                        </td>
                        <td>
                          <a className="om-phone-link" href={`tel:${o.contact_phone}`}>{o.contact_phone}</a>
                        </td>
                        <td className="om-table__items">
                          {o.items.map((it) => `${it.name} ×${it.quantity}`).join(", ")}
                        </td>
                        <td className="om-table__total">₹{o.total.toFixed(2)}</td>
                        <td>
                          <span className={`om-status-pill om-status-pill--${o.status}`}>
                            <span className="om-status-pill__dot" />
                            {o.status_display}
                          </span>
                        </td>
                        <td className="om-table__date">{formatDateTime(o.created_at)}</td>
                        <td className="om-table__actions">
                          {o.status !== "delivered" ? (
                            <button
                              className={`om-advance-btn om-advance-btn--${o.status === "pending" ? "confirm" : "deliver"}`}
                              onClick={() => handleAdvance(o)}
                              disabled={busyId === o.id}
                              type="button"
                            >
                              {busyId === o.id ? "…" : o.status === "pending" ? "Confirm" : "Mark Delivered"}
                            </button>
                          ) : (
                            <span className="om-done-check">✓ Done</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="om-table__empty">No orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchOrders(); }}
        />
      )}
    </div>
  );
};

// ── Create Order modal ──────────────────────────────────────────
const CreateOrderModal = ({ onClose, onCreated }) => {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [contactPhone, setContactPhone] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Debounced customer search
  useEffect(() => {
    if (!customerQuery.trim()) { setCustomerResults([]); return; }
    setSearchingCustomer(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await ordersAPI.adminSearchCustomers(customerQuery.trim());
        setCustomerResults(data.results || []);
      } catch {
        setCustomerResults([]);
      } finally {
        setSearchingCustomer(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // Debounced product search
  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return; }
    setSearchingProduct(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await productsAPI.getAll({ search: productQuery.trim() });
        const results = Array.isArray(data) ? data : data.results || [];
        setProductResults(results.slice(0, 8));
      } catch {
        setProductResults([]);
      } finally {
        setSearchingProduct(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [productQuery]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setContactPhone(c.phone || "");
    setCustomerQuery("");
    setCustomerResults([]);
  };

  const addProduct = (p) => {
    setItems((prev) => [
      ...prev,
      {
        key: Math.random().toString(36).slice(2),
        is_custom: p.type === "custom",
        product_id: p.type === "custom" ? p.id : null,
        api_product_code: p.type === "custom" ? null : p.code,
        name: p.name,
        price: p.price,
        quantity: 1,
      },
    ]);
    setProductQuery("");
    setProductResults([]);
  };

  const updateQty = (key, qty) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: Math.max(1, qty) } : it)));
  };

  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const handleSubmit = async () => {
    setError("");
    if (!selectedCustomer) return setError("Select a customer first.");
    if (!contactPhone.trim()) return setError("Contact phone is required.");
    if (items.length === 0) return setError("Add at least one item.");

    setSubmitting(true);
    try {
      await ordersAPI.adminCreate({
        user_id: selectedCustomer.id,
        contact_phone: contactPhone.trim(),
        notes,
        items: items.map((it) => ({
          is_custom: it.is_custom,
          product_id: it.product_id,
          api_product_code: it.api_product_code,
          quantity: it.quantity,
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="om-modal-overlay" onClick={onClose}>
      <div className="om-modal" onClick={(e) => e.stopPropagation()}>
        <div className="om-modal__header">
          <h2>New Order</h2>
          <button className="om-modal__close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="om-modal__body">
          {error && <div className="om-modal__error">{error}</div>}

          {/* Customer */}
          <div className="om-field">
            <label>Customer</label>
            {selectedCustomer ? (
              <div className="om-selected-customer">
                <div>
                  <strong>{selectedCustomer.full_name || selectedCustomer.email}</strong>
                  <span>{selectedCustomer.email}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</span>
                </div>
                <button type="button" onClick={() => setSelectedCustomer(null)}>Change</button>
              </div>
            ) : (
              <div className="om-autocomplete">
                <input
                  type="text"
                  placeholder="Search by email or phone…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
                {searchingCustomer && <div className="om-autocomplete__hint">Searching…</div>}
                {customerResults.length > 0 && (
                  <div className="om-autocomplete__list">
                    {customerResults.map((c) => (
                      <button type="button" key={c.id} onClick={() => selectCustomer(c)}>
                        <strong>{c.full_name || c.email}</strong>
                        <span>{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                      </button>
                    ))}
                  </div>
                )}
                {customerQuery && !searchingCustomer && customerResults.length === 0 && (
                  <div className="om-autocomplete__hint">
                    No account found — the customer needs to sign up before an order can be created.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact phone */}
          <div className="om-field">
            <label>Contact Phone (for the confirmation call)</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Delivery contact number"
            />
          </div>

          {/* Products */}
          <div className="om-field">
            <label>Items</label>
            <div className="om-autocomplete">
              <input
                type="text"
                placeholder="Search product to add…"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
              {searchingProduct && <div className="om-autocomplete__hint">Searching…</div>}
              {productResults.length > 0 && (
                <div className="om-autocomplete__list">
                  {productResults.map((p) => (
                    <button type="button" key={`${p.type}-${p.code}`} onClick={() => addProduct(p)}>
                      <strong>{p.name}</strong>
                      <span>₹{p.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="om-items-list">
                {items.map((it) => (
                  <div className="om-item-row" key={it.key}>
                    <span className="om-item-row__name">{it.name}</span>
                    <span className="om-item-row__price">₹{it.price}</span>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => updateQty(it.key, parseInt(e.target.value, 10) || 1)}
                    />
                    <button type="button" onClick={() => removeItem(it.key)}>✕</button>
                  </div>
                ))}
                <div className="om-items-total">Total: ₹{total.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="om-field">
            <label>Notes (optional — e.g. copied from WhatsApp)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="om-modal__footer">
          <button type="button" className="om-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="om-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;