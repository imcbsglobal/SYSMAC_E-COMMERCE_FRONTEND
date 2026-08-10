import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { dealsAPI } from "../api";
import "../styles/Deals.scss";

import dealHero from "../assets/deal.png";

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  const loadDeals = () => {
    dealsAPI.getActive()
      .then((r) => { setDeals(r.data?.results || []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  // Same pattern as Home.jsx: poll every 60s so a deal the admin just
  // created (or that just expired) shows up here without a page reload.
  useEffect(() => {
    loadDeals();
    const poll = setInterval(loadDeals, 60000);
    return () => clearInterval(poll);
  }, []);

  // Ticks every second to drive the countdown and drop an expired deal
  // card client-side the instant its timer hits zero.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const liveDeals = useMemo(
    () => deals.filter((d) => new Date(d.end_at).getTime() > now),
    [deals, now]
  );

  const formatCountdown = (endAt) => {
    const diff = new Date(endAt).getTime() - now;
    if (diff <= 0) return "00:00:00";
    const pad = (n) => String(n).padStart(2, "0");
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const goProduct = (p) => navigate(`/product/${p.type}/${p.code}`);

  return (
    <div className="deals-page">
      <div className="deals-page-crumb">
        <span>Home</span> <i className="fas fa-chevron-right" /> <span className="crumb-current">Deals</span>
      </div>

      <div className="deals-page-header">
        <div className="deals-page-header-text">
          <h1><i className="fas fa-bolt" /> <em>Deal</em> of the Day</h1>
          <p>Limited-time offers — grab them before the timer runs out.</p>
        </div>
        <div className="deals-page-header-visual">
          <img src={dealHero} alt="Deal of the Day" />
        </div>
      </div>

      {loading ? (
        <div className="deals-page-state">
          <i className="fas fa-spinner fa-spin" />
          <span>Loading deals…</span>
        </div>
      ) : error ? (
        <div className="deals-page-state">
          <i className="fas fa-triangle-exclamation" />
          <span>Couldn't load deals right now.</span>
          <button onClick={loadDeals}>Retry</button>
        </div>
      ) : liveDeals.length === 0 ? (
        <div className="deals-page-state">
          <i className="fas fa-box-open" />
          <span>No active deals right now — check back soon.</span>
        </div>
      ) : (
        <div className="deals-page-grid">
          {liveDeals.map((p) => {
            const original = p.original_price;
            const hasDiscount = !!(original && original > p.price);

            return (
              <div className="deals-page-card" key={p.id} onClick={() => goProduct(p)}>
                <div className="deals-page-card-dots" aria-hidden="true" />

                <div className="deals-page-card-timer">
                  <i className="fas fa-clock" /> {formatCountdown(p.end_at)}
                </div>

                <div className="deals-page-card-head">
                  <span className="deals-page-card-save-label">Today's deal</span>
                  <span className="deals-page-card-save-amount">₹{p.price.toLocaleString()}</span>
                  <p className="deals-page-card-desc" title={p.name}>on select</p>
                  <p className="deals-page-card-name" title={p.name}>{p.name}</p>
                  {hasDiscount && (
                    <div className="deals-page-card-price-row">
                      <span className="deals-page-card-price-original">₹{original.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="deals-page-card-image">
                  <div className="deals-page-card-image-glow" aria-hidden="true" />
                  {p.image ? (
                    <img src={p.image} alt={p.name} loading="lazy" />
                  ) : (
                    <div className="deals-page-card-image-placeholder"><i className="fas fa-image" /></div>
                  )}
                </div>

                <button
                  className="deals-page-card-cta"
                  onClick={(e) => { e.stopPropagation(); goProduct(p); }}
                >
                  Shop now <i className="fas fa-arrow-right" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}