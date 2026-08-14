import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cartAPI } from "../api";
import "../styles/Cart.scss";

export default function Cart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchCart = () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    setNeedsLogin(false);
    cartAPI
      .get()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const remove = async (itemId) => {
    await cartAPI.remove(itemId);
    fetchCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQty = async (itemId, quantity) => {
    if (quantity < 1) return;
    try {
      await cartAPI.updateQuantity(itemId, quantity);
    } catch {
      /* adjust endpoint if needed */
    }
    fetchCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  const sendWhatsApp = () => {
    if (!data?.items?.length) return;
    let msg = "🛒 *ORDER ENQUIRY*\n\n";
    data.items.forEach((it) => {
      msg += `➡️ *${it.name}*\n   Qty: ${it.quantity}  Price: ₹${it.price}\n   Total: ₹${it.line_total}\n\n`;
    });
    msg += `💵 Grand Total: ₹${data.grand_total}`;
    window.open(
      `https://wa.me/917591907004?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  if (loading) return <div className="cart-loading">Loading cart...</div>;

  if (needsLogin) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <p>Please log in to view your cart</p>
          <Link to="/login" className="cart-shop-btn">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-topbar">
        <h1>
          Your Cart <span className="cart-count-inline">({data?.count || 0} Items)</span>
        </h1>
        <Link to="/" className="cart-continue-top">
          <span className="chev">‹</span> Continue Shopping
        </Link>
      </div>

      {!data?.items?.length ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <p>Your cart is empty</p>
          <Link to="/" className="cart-shop-btn">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-main">
            <div className="cart-table">
              <div className="cart-row cart-head">
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Total</span>
              </div>

              {data.items.map((item) => (
                <div key={item.id} className="cart-row cart-line">
                  <div className="cart-product">
                    {item.image ? (
                      <img className="cart-thumb" src={item.image} alt={item.name} />
                    ) : (
                      <div className="cart-thumb cart-thumb-empty">🔧</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="cart-item-name">{item.name}</div>
                      {item.color && (
                        <div className="cart-item-color">{item.color}</div>
                      )}
                      <div className="cart-item-stock">In Stock</div>
                    </div>
                  </div>

                  <div className="cart-price" data-label="Price">
                    ₹{item.price}
                  </div>

                  <div className="cart-qty-cell" data-label="Quantity">
                    <div className="cart-qty">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="cart-qty-val">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="cart-remove-btn"
                      onClick={() => remove(item.id)}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      🗑
                    </button>
                  </div>

                  <div className="cart-subtotal" data-label="Total">
                    ₹{item.line_total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="cart-summary">
            <div className="cart-summary-title">Order Summary</div>
            <div className="cart-summary-body">
              <div className="cart-summary-row">
                <span>Subtotal ({data.count} Items)</span>
                <span>₹{data.total_price}</span>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span className={data.delivery_charge === 0 ? "free" : ""}>
                  {data.delivery_charge === 0 ? "FREE" : `₹${data.delivery_charge}`}
                </span>
              </div>
              <div className="cart-summary-row">
                <span>Tax (18% GST)</span>
                <span>₹{data.taxes ?? "0.00"}</span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-row total">
                <span>Total</span>
                <span>₹{data.grand_total}</span>
              </div>
              <div className="cart-summary-row save">
                <span>You Save</span>
                <span>₹{data.coupon_discount ?? "0.00"}</span>
              </div>

              <button className="cart-order-btn" onClick={sendWhatsApp}>
                Proceed to Checkout <span className="arrow">→</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}