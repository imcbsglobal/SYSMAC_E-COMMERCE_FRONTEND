import { useEffect, useState } from "react";
import { ordersAPI } from "../api";
import "../styles/MyOrders.scss";

const STEPS = ["pending", "confirmed", "delivered"];
const STEP_LABELS = { pending: "Placed", confirmed: "Confirmed", delivered: "Delivered" };

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ordersAPI.getMine();
      setOrders(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mo-page">
      <div className="mo-container">
        <div className="mo-header">
          <h1>My Orders</h1>
          <p>Track the status of orders placed with our team.</p>
        </div>

        {loading ? (
          <div className="mo-loading"><div className="mo-spinner" /><span>Loading your orders...</span></div>
        ) : error ? (
          <div className="mo-error">
            <p>{error}</p>
            <button onClick={fetchOrders}>Retry</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="mo-empty">
            <p>You don't have any orders yet.</p>
            <span>Orders placed with our team over WhatsApp will show up here once confirmed.</span>
          </div>
        ) : (
          <div className="mo-list">
            {orders.map((o) => {
              const currentIdx = STEPS.indexOf(o.status);
              return (
                <div className="mo-card" key={o.id}>
                  <div className="mo-card__top">
                    <div>
                      <span className="mo-card__number">{o.order_number}</span>
                      <span className="mo-card__date">Placed {formatDate(o.created_at)}</span>
                    </div>
                    <span className={`mo-status-pill mo-status-pill--${o.status}`}>{o.status_display}</span>
                  </div>

                  <div className="mo-timeline">
                    {STEPS.map((step, idx) => (
                      <div className="mo-timeline__step" key={step}>
                        <div className={`mo-timeline__dot ${idx <= currentIdx ? "mo-timeline__dot--done" : ""}`}>
                          {idx <= currentIdx ? "✓" : idx + 1}
                        </div>
                        <span className={idx <= currentIdx ? "mo-timeline__label--done" : ""}>
                          {STEP_LABELS[step]}
                        </span>
                        {idx < STEPS.length - 1 && (
                          <div className={`mo-timeline__line ${idx < currentIdx ? "mo-timeline__line--done" : ""}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mo-items">
                    {o.items.map((it) => (
                      <div className="mo-item" key={it.id}>
                        <span className="mo-item__name">{it.name}</span>
                        <span className="mo-item__qty">×{it.quantity}</span>
                        <span className="mo-item__price">₹{it.line_total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mo-card__footer">
                    <span>Contact number: {o.contact_phone}</span>
                    <span className="mo-card__total">Total: ₹{o.total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}