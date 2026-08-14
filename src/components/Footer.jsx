import { Link } from "react-router-dom";
import "../styles/Footer.scss";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">

        <div className="footer-main">
          <div className="footer-brand">
            <h3 className="footer-logo">IMC BUSINESS SOLUTIONS</h3>
            <p className="footer-logo-sub">Hardware. Redefined.</p>
            <p className="footer-desc">
              Your trusted partner for premium hardware solutions. Quality products, reliable service, every time.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in" /></a>
              <a href="#" aria-label="YouTube"><i className="fab fa-youtube" /></a>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Shop</h4>
            <ul className="footer-nav">
              <li><Link to="/products">All Products</Link></li>
              <li><Link to="/category/power-tools">Power Tools</Link></li>
              <li><Link to="/category/hand-tools">Hand Tools</Link></li>
              <li><Link to="/category/fasteners-fixings">Fasteners</Link></li>
              <li><Link to="/category/electricals">Electricals</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-nav">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/bulk-orders">Bulk Orders</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Customer Service</h4>
            <ul className="footer-nav">
              <li><Link to="/track-order">Track Order</Link></li>
              <li><Link to="/returns-refunds">Returns &amp; Refunds</Link></li>
              <li><Link to="/shipping-delivery">Shipping Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            </ul>
          </div>

          <div className="footer-col footer-newsletter-col">
            <h4 className="footer-heading">Get in Touch</h4>
            <ul className="footer-contact">
              <li><strong>Phone:</strong> +91 9072791379</li>
              <li><strong>Email:</strong> info@imcbusinesssolutions.com</li>
              <li><strong>Mon - Saturday:</strong> 9AM - 6PM</li>
            </ul>

            <h4 className="footer-heading">Newsletter</h4>
            <p className="footer-newsletter-text">
              Stay updated with our latest offers and new arrivals.
            </p>
            <form
              className="footer-newsletter-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input type="email" placeholder="Enter your email" required />
              <button type="submit" aria-label="Subscribe">
                <i className="fas fa-paper-plane" />
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} IMC BUSINESS SOLUTIONS. All Rights Reserved.
          </p>

          <div className="footer-payments">
            <span className="footer-payment-badge">VISA</span>
            <span className="footer-payment-badge">MC</span>
            <span className="footer-payment-badge">RuPay</span>
            <span className="footer-payment-badge">UPI</span>
          </div>
        </div>

      </div>
    </footer>
  );
}