import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../api";
import logoImg from "../assets/LOGO-01.png";
import "../styles/Login.scss";

/**
 * Standalone /login route.
 *
 * This used to render the shared modal component with no onClose /
 * onLoginSuccess props supplied, which meant a SUCCESSFUL login still
 * threw ("onClose is not a function") right after saving the tokens,
 * and that throw got swallowed by the catch block and shown to the user
 * as "Invalid email or password." — even though login had already
 * succeeded. Fixed here by handling navigation directly with
 * react-router instead of relying on props nobody was passing in.
 *
 * goBack() returns the user to whatever page sent them to /login (e.g.
 * the "Please Login" prompt on AllProducts), so that page remounts and
 * picks up the fresh localStorage state. Falls back to "/" if there's
 * no in-app history (e.g. someone opened /login directly).
 */
export default function Login({ onClose, onLoginSuccess } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Dual-mode component:
  //  - Used as a controlled modal (Navbar passes onClose) -> call onClose(),
  //    let the PARENT flip its own showLoginModal state to false. Calling
  //    navigate() here instead was the bug: if the parent never finds out,
  //    its modal-visibility state never changes and the modal stays stuck
  //    on screen even after a fully successful login.
  //  - Used bare at the /login route (App.jsx passes nothing) -> no parent
  //    to notify, so navigate away ourselves. Whoever sent the user to
  //    /login should ideally do navigate("/login", { state: { from: location } })
  //    so we return them to the right place; falls back to home otherwise.
  const isModal = typeof onClose === "function";
  const from = location.state?.from;
  const goBack = () => {
    if (isModal) onClose();
    else navigate(from || "/", { replace: true });
  };

  // ── shared ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("login");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── login state ──────────────────────────────────────────────────────────
  // `identifier` can be either the user's email or phone number.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState("");

  // ── signup state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [focusedSu, setFocusedSu] = useState("");
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── handlers ─────────────────────────────────────────────────────────────
  const switchTab = (t) => {
    setTab(t);
    setError("");
    setDuplicateEmail(false);
    if (t !== "login") setSuccessMsg("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login(identifier, password);
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Let the rest of the app (cart/wishlist counts, navbar account state) know
      window.dispatchEvent(new Event("cart-updated"));

      if (res.data.user.is_superuser) {
        window.location.href = "/admin"; // full nav for admin area, same as before
      } else {
        if (onLoginSuccess) onLoginSuccess(res.data.user);
        goBack(); // close the modal (parent) or return to the sending page (route)
      }
    } catch {
      setError("Invalid email/phone or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setDuplicateEmail(false);
    setLoading(true);
    try {
      await authAPI.signup(form);
      // Success: go straight to the login tab on this same page
      setIdentifier(form.email);
      setPassword("");
      setSuccessMsg("Account created! Please sign in below.");
      setTab("login");
    } catch (err) {
      const d = err.response?.data;
      const emailErr = d?.email?.[0];
      const isDuplicate = emailErr && /exist/i.test(emailErr);
      if (isDuplicate) {
        setDuplicateEmail(true);
        setError("An account with this email already exists.");
      } else {
        setError(emailErr || d?.phone?.[0] || d?.password?.[0] || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── eye icon ─────────────────────────────────────────────────────────────
  const EyeOpen = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  const EyeOff = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  );

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card">
        <button type="button" className="login-modal-close" onClick={goBack} aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="form-logo">
          <img src={logoImg} alt="Sysmac" />
        </div>

        {/* ── LOGIN VIEW ── */}
        {tab === "login" && (
          <>
            <div className="card-header">
              <h1 className="card-title">Sign In</h1>
              <p className="card-subtitle">Access your Sysmac account</p>
            </div>

            <div className="tab-switcher">
              <button type="button" className="tab-btn active">User</button>
              <button type="button" className="tab-btn" onClick={() => switchTab("signup")}>
                New Account
              </button>
            </div>

            {successMsg && (
              <div className="success-box">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="error-box">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="field">
                <label className="field-label">Email or Phone Number</label>
                <div className={"input-wrap" + (focused === "identifier" ? " focused" : "")}>
                  <input
                    type="text" value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onFocus={() => setFocused("identifier")}
                    onBlur={() => setFocused("")}
                    placeholder="Enter your email or phone number"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <div className={"input-wrap" + (focused === "password" ? " focused" : "")}>
                  <input
                    type={showPw ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused("")}
                    placeholder="Enter your password"
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="remember"><input type="checkbox" /><span>Remember me</span></label>
                <a href="#" className="forgot">Forgot password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                <span className="btn-inner">
                  {!loading && (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                  {loading ? "Signing in..." : "Sign In"}
                </span>
              </button>
            </form>

            <div className="or-divider"><span>or</span></div>
            <div className="signup-link">
              <p>Don't have an account?{" "}
                <button type="button" className="link-btn" onClick={() => switchTab("signup")}>
                  Create one now
                </button>
              </p>
            </div>
          </>
        )}

        {/* ── SIGNUP VIEW ── */}
        {tab === "signup" && (
          <>
            <div className="card-header">
              <h1 className="card-title">Create Account</h1>
              <p className="card-subtitle">Join Sysmac and get started today</p>
            </div>

            <div className="tab-switcher">
              <button type="button" className="tab-btn" onClick={() => switchTab("login")}>
                Sign In
              </button>
              <button type="button" className="tab-btn active">New Account</button>
            </div>

            {error && (
              <div className="error-box">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>
                  {error}
                  {duplicateEmail && (
                    <>
                      {" "}
                      <button type="button" className="error-link" onClick={() => switchTab("login")}>
                        Sign in instead
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}

            <form onSubmit={handleSignup} className="login-form">
              <div className="name-row">
                <div className="field">
                  <label className="field-label">First name</label>
                  <div className={"input-wrap" + (focusedSu === "first_name" ? " focused" : "")}>
                    <input
                      type="text" value={form.first_name} onChange={setField("first_name")}
                      onFocus={() => setFocusedSu("first_name")} onBlur={() => setFocusedSu("")}
                      placeholder="First name" required
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Last name</label>
                  <div className={"input-wrap" + (focusedSu === "last_name" ? " focused" : "")}>
                    <input
                      type="text" value={form.last_name} onChange={setField("last_name")}
                      onFocus={() => setFocusedSu("last_name")} onBlur={() => setFocusedSu("")}
                      placeholder="Last name" required
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Email</label>
                <div className={"input-wrap" + (focusedSu === "su_email" ? " focused" : "")}>
                  <input
                    type="email" value={form.email} onChange={setField("email")}
                    onFocus={() => setFocusedSu("su_email")} onBlur={() => setFocusedSu("")}
                    placeholder="Enter your email address" required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Phone Number</label>
                <div className={"input-wrap" + (focusedSu === "su_phone" ? " focused" : "")}>
                  <input
                    type="tel" value={form.phone} onChange={setField("phone")}
                    onFocus={() => setFocusedSu("su_phone")} onBlur={() => setFocusedSu("")}
                    placeholder="Enter your phone number" required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <div className={"input-wrap" + (focusedSu === "su_password" ? " focused" : "")}>
                  <input
                    type={showSignupPw ? "text" : "password"}
                    value={form.password} onChange={setField("password")}
                    onFocus={() => setFocusedSu("su_password")} onBlur={() => setFocusedSu("")}
                    placeholder="Min 8 characters" required minLength={8}
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowSignupPw(!showSignupPw)}>
                    {showSignupPw ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                <span className="btn-inner">
                  {!loading && (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                  {loading ? "Creating..." : "Create Account"}
                </span>
              </button>
            </form>

            <div className="or-divider"><span>or</span></div>
            <div className="signup-link">
              <p>Already have an account?{" "}
                <button type="button" className="link-btn" onClick={() => switchTab("login")}>
                  Sign in
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}