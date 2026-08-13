import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api";
import logo from "../assets/LOGO-01.png";
import LoginModal from "../pages/Login";
import "../styles/Navbar.scss";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Deals", to: "/deals" },
  { label: "Brands", to: "/brands" },
  // { label: "Bulk Orders", to: "/bulk-orders" },
  // { label: "New Arrivals", to: "/new-arrivals" },
  // { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
];

const Icon = ({ name }) => {
  const icons = {
    search: <path d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />,
    cart: (
      <>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    menu: <path d="M3 12h18M3 6h18M3 18h18" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    chevronRight: <path d="M9 18l6-6-6-6" />,
    truck: (
      <>
        <rect x="1" y="6" width="14" height="10" rx="1" />
        <path d="M15 9h4l3 3v4h-7z" />
        <circle cx="6" cy="19" r="1.8" />
        <circle cx="17" cy="19" r="1.8" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.11 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    ),
    close: <path d="M18 6L6 18M6 6l12 12" />,
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
};

// Reads "user" from localStorage, but only trusts it if a matching "access"
// token also exists. If "user" is present without a valid "access" token,
// it's a stale leftover from a previous/expired/cleared session — treat as
// logged out and wipe the stale key so it doesn't keep tripping this check.
// This is what previously caused the Navbar to show a logged-in account
// (sometimes an old admin/test account) even when nobody was really
// authenticated.
const getStoredUser = () => {
  const token = localStorage.getItem("access");
  const raw = localStorage.getItem("user");
  if (!token || !raw) {
    if (raw && !token) localStorage.removeItem("user");
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginPopupOpen, setLoginPopupOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); // full login/signup modal
  const [catOpen, setCatOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutToast, setLogoutToast] = useState(false);
  const [loginToast, setLoginToast] = useState(false);

  // Mobile hamburger menu (nav links + categories + search, all collapsed
  // into a slide-down panel below the topbar on small screens).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);

  // Categories now come live from the Sysmac API (productproduct/) via
  // /sysmac-product-types/, instead of the old hardcoded CATEGORIES array.
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // "user" is now real React state, kept in sync with localStorage instead
  // of being re-read from localStorage on every render. It's seeded lazily
  // from getStoredUser() so the initial render is already correct, and it
  // self-heals stale localStorage (see getStoredUser above).
  const [user, setUser] = useState(getStoredUser);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const catRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const timer = useRef(null);

  // Keep `user` in sync with localStorage/session changes: login, logout,
  // token expiry cleanup elsewhere, or another tab changing storage. Reuses
  // the "cart-updated" event that login/logout already dispatch, so no new
  // event wiring is needed elsewhere in the app.
  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    window.addEventListener("cart-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("cart-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // Close open panels when clicking outside them
  useEffect(() => {
    const close = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
        setLoginPopupOpen(false);
        setLogoutConfirmOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target) &&
        !e.target.closest?.(".mobile-toggle-btn")
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Close the mobile menu automatically on route change.
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileCatOpen(false);
  }, [location.pathname]);

  // Auto-show the "New customer?" login popup on initial load for guests.
  useEffect(() => {
    if (!user) {
      setLoginPopupOpen(true);
    }
  }, []);

  // Let other parts of the app (e.g. the Home hero banner) know when the
  // categories panel is open, so they can resize/adjust their layout.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("categories-panel", { detail: { open: catOpen } }));
  }, [catOpen]);

  // Fetch "Shop by Categories" list from the live Sysmac API on mount.
  // Backed by /sysmac-product-types/, which pulls every page of
  // https://api.sysmac.in/api/productproduct/ and returns [{name, website}].
  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError(false);
      try {
        const res = await api.get("/sysmac-product-types/");
        if (cancelled) return;
        const results = res.data?.results || [];
        setCategories(results);
      } catch {
        if (!cancelled) setCatError(true);
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cart count — reads from the backend (same source as Cart.jsx), so it's
  // always correct per logged-in user instead of a stale localStorage value.
  // Re-fetches whenever something dispatches "cart-updated" (add/remove/qty
  // change/login/logout) or another tab changes localStorage.
  // Guests have no token, so we skip the authenticated call entirely instead
  // of firing it and eating a 401 on every page load.
  useEffect(() => {
    const fetchCartCount = () => {
      const token = localStorage.getItem("access");
      if (!token) {
        setCartCount(0);
        return;
      }
      api
        .get("/cart/")
        .then((r) => setCartCount(r.data?.count || 0))
        .catch(() => setCartCount(0));
    };
    fetchCartCount();
    window.addEventListener("cart-updated", fetchCartCount);
    window.addEventListener("storage", fetchCartCount);
    return () => {
      window.removeEventListener("cart-updated", fetchCartCount);
      window.removeEventListener("storage", fetchCartCount);
    };
  }, []);

  // Wishlist count — same pattern as cart count above, reading the "count"
  // field the /wishlist/ endpoint already returns. Re-fetches on
  // "wishlist-updated" (add/remove from Home or Wishlist page) and also on
  // "cart-updated" so it resets to 0 on logout without needing a separate
  // event there. Guests have no token, so skip the authenticated call.
  useEffect(() => {
    const fetchWishlistCount = () => {
      const token = localStorage.getItem("access");
      if (!token) {
        setWishlistCount(0);
        return;
      }
      api
        .get("/wishlist/")
        .then((r) => setWishlistCount(r.data?.count || 0))
        .catch(() => setWishlistCount(0));
    };
    fetchWishlistCount();
    window.addEventListener("wishlist-updated", fetchWishlistCount);
    window.addEventListener("cart-updated", fetchWishlistCount);
    window.addEventListener("storage", fetchWishlistCount);
    return () => {
      window.removeEventListener("wishlist-updated", fetchWishlistCount);
      window.removeEventListener("cart-updated", fetchWishlistCount);
      window.removeEventListener("storage", fetchWishlistCount);
    };
  }, []);

  const onSearchInput = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setShowDrop(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/products/?search=${encodeURIComponent(val.trim())}`);
        setSuggestions((res.data.results || []).slice(0, 6));
        setShowDrop(true);
      } catch { setShowDrop(false); }
    }, 250);
  };

  // Navigates to the full products listing with the search term applied —
  // AllProducts.jsx reads the ?search= param on mount/update and filters
  // its loaded catalogue by it, so this actually lands the user on a
  // populated results page instead of the bare home page.
  const doSearch = () => {
    setShowDrop(false);
    setMobileMenuOpen(false);
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  // Logged-in users get the account dropdown. Guests get a "New customer?"
  // popup with a Login button — they stay on the current page, never
  // force-redirected to /login just for clicking the account icon.
  const handleAccount = () => {
    if (!user) {
      setLoginPopupOpen((o) => !o);
      return;
    }
    setProfileOpen((o) => !o);
  };

  // Opens the login/signup modal instead of navigating to /login.
  // The guest dropdown stays open behind it; closing the modal (success,
  // overlay click, or the X button) just dismisses the modal itself.
  const goToLogin = () => {
    setLoginPopupOpen(false);
    setMobileMenuOpen(false);
    setShowLoginModal(true);
  };

  // Closing the modal can mean "logged in" or "dismissed" — we tell the two
  // apart by checking whether a valid user now exists (via getStoredUser,
  // which also requires a matching access token). If LoginModal writes the
  // user + tokens to localStorage on success before calling onClose(), this
  // updates local `user` state, fires the success toast, and refreshes
  // cart/wishlist for the new session; a plain overlay/X close leaves
  // localStorage empty and no toast shows.
  const closeLoginModal = () => {
    setShowLoginModal(false);
    const loggedInUser = getStoredUser();
    if (loggedInUser) {
      setUser(loggedInUser);
      window.dispatchEvent(new Event("cart-updated"));
      setLoginToast(true);
      setTimeout(() => setLoginToast(false), 1800);
    }
  };

  // Logout now requires confirmation instead of firing immediately, and
  // shows a brief toast before redirecting so the user gets feedback.
  const askLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    setLogoutConfirmOpen(false);
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
    localStorage.clear();
    setUser(null);
    window.dispatchEvent(new Event("cart-updated"));
    setLogoutToast(true);
    setTimeout(() => {
      setLogoutToast(false);
      navigate("/");
    }, 1200);
  };

  // Navigating with the raw category name (not a slug) because the backend
  // `products` view filters with p['category'].lower() == category.lower(),
  // and 'category' there is the Sysmac "product" field name (e.g. "BISCUIT"),
  // not a slug.
  const goToCategory = (name) => {
    setCatOpen(false);
    setMobileMenuOpen(false);
    setMobileCatOpen(false);
    navigate(`/products?category=${encodeURIComponent(name)}`);
  };

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <header className="header">
      {/* ── Top bar: logo, search, account, wishlist, cart ──────────── */}
      <div className="topbar">
        <div className="topbar-content">
          {/* Mobile hamburger — only visible under the small-screen breakpoint */}
          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} />
          </button>

          <Link to="/" className="logo-section">
            <img src={logo} alt="SYSMAC" className="logo-img" />
          </Link>

          <div className="search-container" ref={searchRef}>
            <div className="search-wrapper">
              <input
                className="search-input"
                placeholder="Search for products, brands and more…"
                value={query}
                onChange={(e) => onSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
              />
              <button className="search-btn" onClick={doSearch}>
                <Icon name="search" />
              </button>

              {showDrop && (
                <div className="autocomplete-dropdown">
                  {suggestions.length === 0 ? (
                    <div className="no-results">No products found</div>
                  ) : (
                    suggestions.map((it) => (
                      <div
                        className="autocomplete-item"
                        key={`${it.type}-${it.code}`}
                        onClick={() => {
                          setShowDrop(false);
                          setMobileMenuOpen(false);
                          // Product detail route is /product/:type/:code —
                          // it.id is the custom product's numeric id when
                          // type is "custom", otherwise it.code is the
                          // Sysmac product code. Matches ProductCard's
                          // navigation in AllProducts.jsx.
                          navigate(`/product/${it.type}/${it.type === "custom" ? it.id : it.code}`);
                        }}
                      >
                        <img src={it.image || "https://via.placeholder.com/40"} alt="" />
                        <div className="info">
                          <div className="name">{it.name}</div>
                          <div className="details">
                            <span>{it.brand}</span><span>{it.category}</span>
                            <span>{it.price ? "₹" + it.price : ""}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="topbar-actions">
            <div className="account-wrap" ref={profileRef}>
              <button className="account-btn" onClick={handleAccount}>
                <Icon name="user" />
                <span className="account-text">
                  {user ? (
                    <>
                      <small>Welcome</small>
                      <strong>{user.first_name || "My Account"}</strong>
                    </>
                  ) : (
                    <>
                      <small>Login / Register</small>
                      <strong>My Account</strong>
                    </>
                  )}
                </span>
                <Icon name="chevronDown" />
              </button>

              {/* Logged-in: account dropdown */}
              {user && profileOpen && !logoutConfirmOpen && (
                <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="profile-info">
                    <div className="profile-avatar">{(user.first_name || user.email || "U")[0].toUpperCase()}</div>
                    <div>
                      <div className="profile-name">{user.first_name || user.email}</div>
                      <div className="profile-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-menu">
                    <Link to="/orders" className="dropdown-item" onClick={() => setProfileOpen(false)}><Icon name="box" /> Orders</Link>
                    <Link to="/wishlist" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Icon name="heart" /> Wishlist
                      {wishlistCount > 0 && <span className="dropdown-item-count">{wishlistCount}</span>}
                    </Link>
                    <Link to="/cart" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Icon name="cart" /> Cart
                      {cartCount > 0 && <span className="dropdown-item-count">{cartCount}</span>}
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item logout-item" onClick={askLogout}>
                      <Icon name="logout" /> Logout
                    </button>
                  </div>
                </div>
              )}

              {/* Logout confirmation — replaces the dropdown in place */}
              {user && logoutConfirmOpen && (
                <div className="logout-confirm" onClick={(e) => e.stopPropagation()}>
                  <div className="logout-confirm__header">
                    <span>Logout?</span>
                    <button className="logout-confirm__close" onClick={cancelLogout}>
                      <Icon name="close" />
                    </button>
                  </div>
                  <p>Are you sure you want to logout of your account?</p>
                  <div className="logout-confirm__actions">
                    <button className="cancel-btn" onClick={cancelLogout}>Cancel</button>
                    <button className="confirm-btn" onClick={confirmLogout}>Logout</button>
                  </div>
                </div>
              )}

              {/* Guest: "New customer?" login popup — opens the login modal,
                 no route change. Auto-opens on page load for guests (see
                 useEffect above), and can still be toggled via the account
                 button or dismissed by clicking outside. */}
              {!user && loginPopupOpen && (
                <div className="profile-dropdown guest-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="guest-header">
                    <span className="guest-header__label">New Customer?</span>
                    <button className="login-cta-btn" onClick={goToLogin}>
                      Login
                    </button>
                  </div>
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={goToLogin}>
                      <Icon name="user" /> My Profile
                    </button>
                    <button className="dropdown-item" onClick={goToLogin}>
                      <Icon name="box" /> Orders
                    </button>
                    <button className="dropdown-item" onClick={goToLogin}>
                      <Icon name="heart" /> Wishlist
                    </button>
                    <button className="dropdown-item" onClick={goToLogin}>
                      <Icon name="cart" /> Cart
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link to="/wishlist" className="wishlist-btn">
              <div className="wishlist-icon-wrap">
                <Icon name="heart" />
                <span className="wishlist-badge">{wishlistCount}</span>
              </div>
            </Link>

            <Link to="/cart" className="cart-btn">
              <div className="cart-icon-wrap">
                <Icon name="cart" />
                <span className="cart-badge">{cartCount}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sub bar: categories + nav links + trust info ─── */}
      <div className="subbar">
        <div className="subbar-content">
          <div className="cat-wrap" ref={catRef}>
            <button className="cat-toggle" onClick={() => setCatOpen((o) => !o)}>
              <Icon name="menu" />
              Shop by Categories
              <Icon name="chevronDown" />
            </button>

            {catOpen && (
              <div className="cat-flyout">
                {catLoading ? (
                  <div className="cat-item cat-item--status">Loading categories…</div>
                ) : catError ? (
                  <div className="cat-item cat-item--status">Couldn't load categories</div>
                ) : categories.length === 0 ? (
                  <div className="cat-item cat-item--status">No categories found</div>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.name}
                      className="cat-item"
                      onClick={() => goToCategory(c.name)}
                    >
                      <span>{c.name}</span>
                      <Icon name="chevronRight" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <nav className="subbar-nav">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={`nav-link${isActive(l.to) ? " active" : ""}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="subbar-info">
            <div className="info-item">
              <Icon name="truck" />
              <span>Fast Delivery<small>Across India</small></span>
            </div>
            <div className="info-item">
              <Icon name="phone" />
              <span>Support<small>+91 98765 43210</small></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile slide-down menu: nav links + categories ──────────── */}
      {mobileMenuOpen && (
        <div className="mobile-menu" ref={mobileMenuRef} onClick={(e) => e.stopPropagation()}>
          <nav className="mobile-menu__links">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`mobile-menu__link${isActive(l.to) ? " active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-menu__cats">
            <button
              className="mobile-menu__cats-toggle"
              onClick={() => setMobileCatOpen((o) => !o)}
            >
              <span>Shop by Categories</span>
              <Icon name={mobileCatOpen ? "chevronDown" : "chevronRight"} />
            </button>

            {mobileCatOpen && (
              <div className="mobile-menu__cats-list">
                {catLoading ? (
                  <div className="cat-item cat-item--status">Loading categories…</div>
                ) : catError ? (
                  <div className="cat-item cat-item--status">Couldn't load categories</div>
                ) : categories.length === 0 ? (
                  <div className="cat-item cat-item--status">No categories found</div>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.name}
                      className="cat-item"
                      onClick={() => goToCategory(c.name)}
                    >
                      <span>{c.name}</span>
                      <Icon name="chevronRight" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mobile-menu__info">
            <div className="info-item">
              <Icon name="truck" />
              <span>Fast Delivery<small>Across India</small></span>
            </div>
            <div className="info-item">
              <Icon name="phone" />
              <span>Support<small>+91 98765 43210</small></span>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout toast ─────────────────────────────────── */}
      {logoutToast && (
        <div className="logout-toast">Logged out successfully</div>
      )}

      {/* ── Login success toast ──────────────────────────── */}
      {loginToast && (
        <div className="login-toast">Logged in successfully</div>
      )}

      {/* ── Login / signup modal ─────────────────────────── */}
      {showLoginModal && <LoginModal onClose={closeLoginModal} />}
    </header>
  );
}