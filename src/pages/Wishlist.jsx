import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cartAPI, wishlistAPI } from "../api";
import "../styles/Wishlist.scss";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const fetchWishlist = () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    setNeedsLogin(false);
    setLoading(true);
    wishlistAPI
      .get()
      .then((r) => setItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const buildPayload = (item) => ({
    is_custom: item.is_custom,
    product_id: item.is_custom ? item.product_id : undefined,
    api_product_code: !item.is_custom ? item.api_product_code : undefined,
  });

  // Wishlist items only ever come in two flavors — a locally-managed
  // CustomProduct (is_custom: true) or a Sysmac catalogue item pulled
  // from the live API feed (is_custom: false). This maps that flag to
  // the `:type` segment the /product/:type/:code route expects, the
  // same way AllProducts.jsx and Deals.jsx already do it.
  const productType = (item) => (item.is_custom ? "custom" : "sysmac");

  const goToProduct = (item) => {
    const pid = item.is_custom ? item.product_id : item.api_product_code;
    navigate(`/product/${productType(item)}/${pid}`);
  };

  const remove = async (item) => {
    try {
      await wishlistAPI.toggle(buildPayload(item));
      fetchWishlist();
      // Let the Navbar (and any other listeners) know the wishlist count changed.
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch (err) {
      showToast("Could not remove item");
    }
  };

  const addToCart = async (item) => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }
    setAddingId(item.id);
    try {
      await cartAPI.add(buildPayload(item));
      window.dispatchEvent(new Event("cart-updated"));
      showToast("Added to cart");
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        showToast("Product no longer available");
      } else if (status === 401) {
        navigate("/login");
      } else {
        showToast(err.response?.data?.detail || "Could not add to cart");
      }
    } finally {
      setAddingId(null);
    }
  };

  const moveToCart = async (item) => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }
    setMovingId(item.id);
    try {
      await cartAPI.add(buildPayload(item));
      await wishlistAPI.toggle(buildPayload(item));
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("wishlist-updated"));
      showToast("Moved to cart");
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        showToast("Product no longer available");
      } else if (status === 401) {
        navigate("/login");
      } else {
        showToast(err.response?.data?.detail || "Could not move item");
      }
    } finally {
      setMovingId(null);
    }
  };

  const moveAllToCart = async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      await Promise.all(
        items.map((item) =>
          cartAPI.add(buildPayload(item)).then(() =>
            wishlistAPI.toggle(buildPayload(item))
          )
        )
      );
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("wishlist-updated"));
      showToast("All items moved to cart");
    } catch {
      showToast("Could not move all items");
      fetchWishlist();
    }
  };

  const shareWishlist = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "My Wishlist", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    }
  };

  if (loading) return <div className="wishlist-loading">Loading wishlist...</div>;

  if (needsLogin) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty">
          <span>🤍</span>
          <h3>Please log in to view your wishlist</h3>
          <p>Sign in to see the items you've saved.</p>
          <Link to="/login" className="wishlist-shop-btn">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      {toast && <div className="wishlist-toast">{toast}</div>}

      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <div className="wishlist-title-row">
            <span className="wishlist-heart">♡</span>
            <h1>My Wishlist</h1>
            <span className="wishlist-count">({items.length} Items)</span>
          </div>
          <p>Save your favorite products and shop them anytime.</p>
        </div>
        {items.length > 0 && (
          <div className="wishlist-header-actions">
            <button className="wishlist-share-btn" onClick={shareWishlist}>
              <span className="icon">↗</span> Share Wishlist
            </button>
            <button className="wishlist-moveall-btn" onClick={moveAllToCart}>
              <span className="icon">🛒</span> Move All to Cart
            </button>
          </div>
        )}
      </div>

      {!items.length ? (
        <div className="wishlist-empty">
          <span>🤍</span>
          <h3>Your Wishlist is Empty</h3>
          <p>Save your favourite items to buy later</p>
          <Link to="/" className="wishlist-shop-btn">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="wishlist-grid">
            {items.map((item) => (
              <div key={item.id} className="wishlist-card">
                <button
                  className="wishlist-remove"
                  onClick={() => remove(item)}
                  aria-label="Remove"
                >
                  ✕
                </button>

                <div
                  className="wishlist-card-top"
                  onClick={() => goToProduct(item)}
                >
                  <div className="wishlist-img">
                    <img
                      src={item.image || "https://via.placeholder.com/200?text=No+Image"}
                      alt={item.name}
                    />
                  </div>
                  <div className="wishlist-info">
                    <div className="wishlist-name">{item.name}</div>
                    {item.spec && <div className="wishlist-spec">{item.spec}</div>}
                    <div className="wishlist-price">
                      {item.price ? `₹${Number(item.price).toLocaleString()}` : "Price on request"}
                    </div>
                    <div className="wishlist-stock">In Stock</div>
                  </div>
                </div>

                <div className="wishlist-card-actions">
                  <button
                    className="wishlist-add-btn"
                    disabled={addingId === item.id}
                    onClick={() => addToCart(item)}
                  >
                    <span className="icon">🛒</span>{" "}
                    {addingId === item.id ? "Adding..." : "Add to Cart"}
                  </button>
                  
                </div>
              </div>
            ))}
          </div>

          <div className="wishlist-footer-banner">
            <div className="wishlist-footer-left">
              <span className="wishlist-heart-sm">♡</span>
              <div>
                <div className="wishlist-footer-title">Don't see what you're looking for?</div>
                <div className="wishlist-footer-sub">
                  Browse our complete collection and find more products you love.
                </div>
              </div>
            </div>
            <Link to="/" className="wishlist-footer-btn">
              Continue Shopping <span className="arrow">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}