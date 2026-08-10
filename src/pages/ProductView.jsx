import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsAPI, cartAPI, wishlistAPI } from "../api";
import "../styles/ProductView.scss";

export default function ProductView() {
  const { type, code, id } = useParams();
  const identifier = code || id;

  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [mainImg, setMainImg] = useState("");
  const [loading, setLoading] = useState(true);
  const [cartMsg, setCartMsg] = useState("");
  const [wishMsg, setWishMsg] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }
    setLoading(true);
    productsAPI.getDetail(identifier)
      .then((r) => { setProduct(r.data); setMainImg(r.data.image || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identifier]);

  const isLoggedIn = () => !!JSON.parse(localStorage.getItem("user") || "null");

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/products");
    }
  };

  const addToCart = async () => {
    if (!isLoggedIn()) { setShowLoginPopup(true); return; }
    try {
      await cartAPI.add({
        is_custom: product.type === "custom",
        product_id: product.type === "custom" ? product.id : undefined,
        api_product_code: product.type !== "custom" ? product.code : undefined,
      });
      setCartMsg("Added to cart!");
      setTimeout(() => setCartMsg(""), 2000);
    } catch { setCartMsg("Failed"); }
  };

  const toggleWishlist = async () => {
    if (!isLoggedIn()) { setShowLoginPopup(true); return; }
    try {
      const r = await wishlistAPI.toggle({
        is_custom: product.type === "custom",
        product_id: product.type === "custom" ? product.id : undefined,
        api_product_code: product.type !== "custom" ? product.code : undefined,
      });
      setWishMsg(r.data.added ? "Wishlisted!" : "Removed from wishlist");
      setTimeout(() => setWishMsg(""), 2000);
    } catch { setWishMsg("Failed"); }
  };

  const shareWhatsApp = () => {
    if (!product) return;
    const msg = `🛍️ *${product.name}*\n💰 ₹${product.price}\nBrand: ${product.brand || ""}\nCategory: ${product.category || ""}\n🔗 ${window.location.href}`;
    window.open(`https://wa.me/918129139506?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const openZoom = () => {
    if (mainImg) window.open(mainImg, "_blank");
  };

  if (loading) return <div className="pv-loading">Loading...</div>;
  if (!product) return <div className="pv-loading">Product not found.</div>;

  const allImages = [product.image, ...(product.images || [])].filter(Boolean);

  // Adjust this if your API uses a different field name for availability
  const inStock = product.in_stock !== false && product.stock !== 0;

  return (
    <div className="pv-page">
      <div className="pv-topbar">
        <button className="pv-back-link" onClick={goBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Products
        </button>

        <div className="pv-breadcrumb">
          <span>Home</span>
          {product.category && <><span className="pv-crumb-sep">›</span><span>{product.category}</span></>}
          {product.brand && <><span className="pv-crumb-sep">›</span><span>{product.brand}</span></>}
          <span className="pv-crumb-sep">›</span>
          <span className="pv-crumb-active">{product.name}</span>
        </div>
      </div>

      <div className="pv-container">
        <div className="pv-image-section">
          <div className="pv-main-image">
            <img src={mainImg || "https://via.placeholder.com/400?text=No+Image"} alt={product.name} />
            <button className="pv-zoom-btn" onClick={openZoom} aria-label="Zoom image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {allImages.length > 1 && (
            <div className="pv-thumbnails">
              {allImages.map((img, i) => (
                <div key={i} className={"pv-thumb" + (mainImg === img ? " active" : "")} onClick={() => setMainImg(img)}>
                  <img src={img} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pv-details">
          {inStock && (
            <span className="pv-stock-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              In Stock
            </span>
          )}

          <h1 className="pv-title">{product.name}</h1>

          <div className="pv-pricing">
            <span className="pv-price">₹{Number(product.price).toLocaleString()}</span>
          </div>

          <div className="pv-info">
            {product.brand && <div className="pv-info-row"><span>Brand</span><span>{product.brand}</span></div>}
            {product.company && <div className="pv-info-row"><span>Company</span><span>{product.company}</span></div>}
            {product.category && <div className="pv-info-row"><span>Category</span><span>{product.category}</span></div>}
            {product.unit && <div className="pv-info-row"><span>Unit</span><span>{product.unit}</span></div>}
            {product.description && <div className="pv-desc">{product.description}</div>}
          </div>

          <div className="pv-actions">
            <button className="pv-btn pv-btn-cart" onClick={addToCart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="21" r="1" fill="currentColor" />
                <circle cx="20" cy="21" r="1" fill="currentColor" />
                <path d="M1 1H5L7.68 14.39A2 2 0 0 0 9.64 16H19.4A2 2 0 0 0 21.36 14.39L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {cartMsg || "Add to Cart"}
            </button>

            <button className="pv-btn pv-btn-wishlist" onClick={toggleWishlist}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21l7.78-7.55 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {wishMsg || "Add to Wishlist"}
            </button>

            <button className="pv-btn pv-btn-whatsapp" onClick={shareWhatsApp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.27-.1-.46-.15-.66.15-.2.3-.76.94-.93 1.14-.17.2-.34.22-.63.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.3-.02-.46.13-.6.13-.14.3-.34.44-.5.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.5.07-.77.37-.26.3-1 .98-1 2.4 0 1.4 1.03 2.76 1.17 2.95.15.2 2 3.05 4.86 4.28.68.3 1.2.47 1.62.6.68.22 1.3.19 1.8.11.55-.08 1.7-.7 1.94-1.36.24-.68.24-1.26.17-1.38-.07-.13-.26-.2-.55-.34z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Enquiry via WhatsApp
            </button>
          </div>
        </div>
      </div>

      {showLoginPopup && (
        <div className="pv-modal-overlay" onClick={() => setShowLoginPopup(false)}>
          <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pv-modal-close" onClick={() => setShowLoginPopup(false)}>×</button>
            <h3>Login Required</h3>
            <p>Please login to your account to continue.</p>
            <button className="pv-btn pv-btn-cart pv-modal-login-btn" onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}