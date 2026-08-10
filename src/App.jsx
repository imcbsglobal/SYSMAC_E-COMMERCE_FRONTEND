import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import ProductView from "./pages/ProductView";
import AllProducts from "./pages/AllProducts";
import Brands from "./pages/Brands";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import CancellationRefundPolicy from "./pages/CancellationRefundPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import SysmacProducts from "./pages/SysmacProducts";
import CustomProducts from "./pages/CustomProducts";
import EditApiProduct from "./pages/EditApiProduct";
import EditCustomProduct from "./pages/EditCustomProduct";
import BannerManagement from "./pages/BannerManagement";
import BrandManagement from "./pages/BrandManagement";
import CategoryManagement from "./pages/CategoryManagement";
import UserManagement from "./pages/UserManagement";
import OrderManagement from "./pages/OrderManagement";
import MyOrders from "./pages/Myorders";
import Deals from "./pages/Deals";

function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || !user.is_superuser) return <Navigate to="/login" replace />;
  return children;
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem("access");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin pages (no public layout) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/sysmac-products" element={<AdminRoute><SysmacProducts /></AdminRoute>} />
        <Route path="/admin/custom-products" element={<AdminRoute><CustomProducts /></AdminRoute>} />
        <Route path="/admin/custom-products/add" element={<AdminRoute><EditCustomProduct /></AdminRoute>} />
        <Route path="/admin/sysmac-products/edit/:code" element={<AdminRoute><EditApiProduct /></AdminRoute>} />
        <Route path="/admin/custom-products/edit/:id" element={<AdminRoute><EditCustomProduct /></AdminRoute>} />
        <Route path="/admin/banners" element={<AdminRoute><BannerManagement /></AdminRoute>} />
        <Route path="/admin/brands" element={<AdminRoute><BrandManagement /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><OrderManagement /></AdminRoute>} />

        {/* Public pages with layout */}
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/products" element={<AllProducts />} />
              <Route path="/products/:category" element={<AllProducts />} />
              <Route path="/product/:type/:code" element={<ProductView />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/cancellation-refund" element={<CancellationRefundPolicy />} />
              <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
              <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
              <Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}