import React, { useEffect, useState, useMemo } from "react";
import { usersAPI } from "../api";
import AdminSidebar from "../components/AdminSidebar";
import "../styles/UserManagement.scss";

const ITEMS_PER_PAGE = 10;

const UserManagement = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await usersAPI.getAll();
      setAllUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await usersAPI.toggleStatus(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
    setActionMenuOpen(null);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handler = () => setActionMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return (
      <>
        <span>{d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span>
        <span className="um-time">{d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
      </>
    );
  };

  const getInitials = (user) => {
    const name = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
    if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return user.email[0].toUpperCase();
  };

  const getDisplayName = (user) => {
    const name = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return name || user.email.split("@")[0];
  };

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.is_active).length;
  const inactiveUsers = allUsers.filter((u) => !u.is_active).length;

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const matchSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || "").toLowerCase().includes(search.toLowerCase()) ||
        getDisplayName(u).toLowerCase().includes(search.toLowerCase());
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "superuser" && u.is_superuser) ||
        (roleFilter === "regular" && !u.is_superuser);
      return matchSearch && matchRole;
    });
  }, [allUsers, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const avatarColor = (user) => {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    const idx = user.email.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="um-loading">
          <div className="um-spinner" />
          <span>Loading users...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="um-error">
          <p>{error}</p>
          <button onClick={fetchUsers}>Retry</button>
        </div>
      );
    }

    return (
      <>
        {/* Page header */}
        <div className="um-page-header">
          <button className="um-hamburger-btn" onClick={() => setSidebarOpen(true)} type="button" aria-label="Open menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div>
            <div className="um-breadcrumb">Admin › Users</div>
            <h1 className="um-page-title">User Management</h1>
          </div>
        </div>

        {/* Stat cards */}
        <div className="um-stats-row">
          <div className="um-stat-card um-stat-card--blue">
            <div className="um-stat-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="um-stat-card__body">
              <p className="um-stat-card__label">Total Users</p>
              <p className="um-stat-card__value">{totalUsers}</p>
            </div>
          </div>

          <div className="um-stat-card um-stat-card--green">
            <div className="um-stat-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <polyline points="16 11 18 13 22 9"/>
              </svg>
            </div>
            <div className="um-stat-card__body">
              <p className="um-stat-card__label">Active Users</p>
              <p className="um-stat-card__value">{activeUsers}</p>
            </div>
          </div>

          <div className="um-stat-card um-stat-card--orange">
            <div className="um-stat-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="18" y1="8" x2="23" y2="13"/>
                <line x1="23" y1="8" x2="18" y2="13"/>
              </svg>
            </div>
            <div className="um-stat-card__body">
              <p className="um-stat-card__label">Inactive Users</p>
              <p className="um-stat-card__value">{inactiveUsers}</p>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="um-table-card">
          <div className="um-table-card__header">
            <h2 className="um-table-card__title">All Users</h2>
            <div className="um-table-card__controls">
              <span className="um-count-badge">{filtered.length} users</span>

              {/* Search */}
              <div className="um-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search name, email or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="um-search__clear" onClick={() => setSearch("")}>✕</button>
                )}
              </div>

              {/* Role filter */}
              <div className="um-filter-select">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All Users</option>
                  <option value="superuser">Superusers</option>
                  <option value="regular">Regular Users</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              
            </div>
          </div>

          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map((user, idx) => (
                  <tr key={user.id}>
                    <td className="um-table__num">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td>
                      <div className="um-user-cell">
                        <div className="um-avatar" style={{ background: avatarColor(user) }}>
                          {getInitials(user)}
                        </div>
                        <div className="um-user-cell__info">
                          <span className="um-user-cell__name">{getDisplayName(user)}</span>
                          {currentUser?.id === user.id && (
                            <span className="um-you-badge">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="um-table__email">{user.email}</td>
                    <td className="um-table__phone">{user.phone || "—"}</td>
                    <td>
                      <span className={`um-role-badge ${user.is_superuser ? "um-role-badge--super" : "um-role-badge--user"}`}>
                        {user.is_superuser ? "Superuser" : "User"}
                      </span>
                    </td>
                    <td>
                      <span className={`um-status-pill ${user.is_active ? "um-status-pill--active" : "um-status-pill--inactive"}`}>
                        <span className="um-status-pill__dot" />
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="um-table__date">{formatDate(user.date_joined)}</td>
                    <td className="um-table__datetime">{formatDateTime(user.date_joined)}</td>
                    <td className="um-table__actions">
                      {!user.is_superuser && (
                        <div className="um-action-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="um-action-menu__trigger"
                            onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                          >
                            ⋮
                          </button>
                          {actionMenuOpen === user.id && (
                            <div className="um-action-menu__dropdown">
                              <button
                                className={user.is_active ? "um-action-menu__item--danger" : "um-action-menu__item--success"}
                                onClick={() => handleToggleStatus(user.id)}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="9" className="um-table__empty">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="um-table-footer">
            <span className="um-table-footer__info">
              Showing {filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
            </span>
            <div className="um-pagination">
              <button
                className="um-pagination__arrow"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                &lsaquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`um-pagination__page ${p === page ? "um-pagination__page--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="um-pagination__arrow"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="um-layout">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="um-main">
        <div className="um-container">
          {renderBody()}
        </div>
      </main>
    </div>
  );
};

export default UserManagement;