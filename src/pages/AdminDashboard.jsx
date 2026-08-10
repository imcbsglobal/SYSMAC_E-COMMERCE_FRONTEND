import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../styles/AdminDashboard.scss";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/admin/stats/").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="dashboard-layout">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* ── Content ── */}
        <div className="content-area">
          <div className="page-heading">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen((o) => !o)}>
              <i className="fas fa-bars"></i>
            </button>
            <div>
              <h2>Overview</h2>
              <p>Product inventory and sales at a glance</p>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="stats-grid">
            <div className="stat-card card-blue">
              <div className="stat-header">
                <div className="stat-title">Total Products</div>
                <div className="stat-icon blue"><i className="fas fa-boxes"></i></div>
              </div>
              <div className="stat-value">{stats?.total_product_count ?? "—"}</div>
              <div className="stat-change">
                <i className="fas fa-box"></i>
                <span>Combined inventory</span>
              </div>
            </div>

            <div className="stat-card card-teal">
              <div className="stat-header">
                <div className="stat-title">Sysmac Products</div>
                <div className="stat-icon green"><i className="fas fa-microchip"></i></div>
              </div>
              <div className="stat-value">{stats?.api_product_count ?? "—"}</div>
              <div className="stat-change">
                <i className="fas fa-server"></i>
                <span>From API integration</span>
              </div>
            </div>

            <div className="stat-card card-violet">
              <div className="stat-header">
                <div className="stat-title">Custom Products</div>
                <div className="stat-icon purple"><i className="fas fa-tools"></i></div>
              </div>
              <div className="stat-value">{stats?.custom_product_count ?? "—"}</div>
              <div className="stat-change">
                <i className="fas fa-edit"></i>
                <span>Manually added</span>
              </div>
            </div>

            <div className="stat-card card-amber">
              <div className="stat-header">
                <div className="stat-title">Edited Products</div>
                <div className="stat-icon orange"><i className="fas fa-pencil-alt"></i></div>
              </div>
              <div className="stat-value">{stats?.edited_api_product_count ?? "—"}</div>
              <div className="stat-change">
                <i className="fas fa-sync-alt"></i>
                <span>Modified from original</span>
              </div>
            </div>
          </div>

          {/* ── Lower cards ── */}
          <div className="content-grid">
            <div className="content-card">
              <div className="card-header">
                <h3 className="card-title">Sales Performance</h3>
                <div className="total-value">
                  <span className="value-label">Total Sales:</span>
                  <span className="value-amount green">
                    ₹{Number(stats?.total_sales ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="card-content">
                <div className="chart-placeholder">
                  <i className="fas fa-chart-area"></i>
                  Sales Chart Visualization
                </div>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <h3 className="card-title">Recent Activity</h3>
                <div className="total-value">
                  <span className="value-label">Total Purchase:</span>
                  <span className="value-amount red">
                    ₹{Number(stats?.total_purchase ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="card-content">
                <ul className="activity-list">
                  <li className="activity-item">
                    <div className="activity-icon blue"><i className="fas fa-plus"></i></div>
                    <div className="activity-content">
                      <h4>New product added</h4>
                      <p>Sysmac NX1P2 Controller added to catalog</p>
                    </div>
                  </li>
                  <li className="activity-item">
                    <div className="activity-icon orange"><i className="fas fa-chart-bar"></i></div>
                    <div className="activity-content">
                      <h4>Monthly report generated</h4>
                      <p>Sales analytics report is ready</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}