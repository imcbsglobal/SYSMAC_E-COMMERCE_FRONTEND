import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";   // adjust path to your actual files
import Footer from "./Footer";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/cart";

  return (
    <>
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}