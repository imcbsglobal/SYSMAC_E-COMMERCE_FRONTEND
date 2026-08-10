import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../api";
import "../styles/Signup.scss";

export default function Signup() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authAPI.signup(form);
      navigate("/login");
    } catch (err) {
      const d = err.response?.data;
      setError(d?.email?.[0] || d?.phone?.[0] || d?.password?.[0] || "Registration failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="glass-card">
          <div className="back-row">
            <button type="button" className="back-btn" onClick={() => navigate("/")}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Home
            </button>
          </div>
          <div className="header"><h1>Create Account</h1></div>
          {error && <div className="error-box"><span>{error}</span></div>}
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="name-row">
              <div className="field">
                <label>First Name</label>
                <input type="text" value={form.first_name} onChange={set("first_name")} placeholder="First name" required />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="Last name" required />
              </div>
            </div>
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="Enter your email" required />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="Enter your phone number" required />
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password} onChange={set("password")}
                  placeholder="Min 8 characters" required minLength={8}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          <div className="login-link">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
        <div className="signup-footer"><p>© 2025 Sysmac. Secure &amp; Reliable.</p></div>
      </div>
    </div>
  );
}