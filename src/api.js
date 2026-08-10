import axios from "axios";
import { BASE_URL } from "./config";

const api = axios.create({ baseURL: BASE_URL });

const RETRYABLE_CODES = ["ERR_NETWORK", "ECONNABORTED", "ERR_CONNECTION_REFUSED", "ERR_CONNECTION_RESET"];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 700; // gives a restarting dev server / reconnecting WiFi time to come back

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    // ── Transient network failure (connection refused/reset, no response at all) ──
    // Covers: dev server auto-reload restart window, brief WiFi/network switch.
    const isNetworkFailure = !error.response && (
      RETRYABLE_CODES.includes(error.code) ||
      /network error/i.test(error.message || "") ||
      /ERR_CONNECTION/i.test(error.message || "")
    );

    if (isNetworkFailure) {
      original._retryCount = original._retryCount || 0;
      if (original._retryCount < MAX_RETRIES) {
        original._retryCount += 1;
        await delay(RETRY_DELAY_MS * original._retryCount); // gentle backoff
        return api(original);
      }
    }

    // ── 401 → try token refresh once, same as before ──
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const r = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
          localStorage.setItem("access", r.data.access);
          original.headers.Authorization = `Bearer ${r.data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  // `identifier` can be either the user's email or phone number —
  // the backend looks up the account by whichever one matches.
  login: (identifier, password) => api.post("/token/", { identifier, password }),
  signup: (data) => api.post("/signup/", data),
  me: () => api.get("/me/"),
};

// ── Products ──────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params = {}, config = {}) => api.get("/products/", { params, ...config }),
  getDetail: (identifier) => api.get(`/products/${identifier}/`),

  // Admin — custom products
  adminGetAll: () => api.get("/admin/custom-products/"),
  adminCreate: (formData) => api.post("/admin/custom-products/create/", formData),
  adminUpdate: (id, formData) => api.patch(`/admin/custom-products/${id}/`, formData),
  adminDelete: (id) => api.delete(`/admin/custom-products/${id}/delete/`),

  // Admin — sysmac (API) products
  // NOTE: previously this ignored the `page` argument entirely (always
  // fetched page 1), which meant SysmacProducts.jsx's page-by-page loop
  // in its `loadAll()` effect kept refetching page 1 forever instead of
  // paging through the real catalogue. Fixed here since Deal of the Day's
  // product search depends on the full catalogue actually loading.
  adminGetSysmac: (page = 1) => api.get("/admin/sysmac-products/", { params: { page } }),
  adminUpdateSysmac: (code, formData, config = {}) => api.patch(`/admin/sysmac-products/${code}/`, formData, config),
  adminDeleteSysmac: (code) => api.delete(`/admin/sysmac-products/${code}/delete/`),
  adminRefreshSysmacCache: () => api.post("/admin/sysmac-products/refresh/"),
};

// ── Categories ────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: (config = {}) => api.get("/categories/", config),
  adminGetAll: () => api.get("/admin/categories/"),
  adminCreate: (data) => api.post("/admin/categories/create/", data),
  adminUpdate: (id, data) => api.patch(`/admin/categories/${id}/`, data),
  adminDelete: (id) => api.delete(`/admin/categories/${id}/delete/`),
};

// ── Banners ───────────────────────────────────────────────────
export const bannersAPI = {
  getAll: (config = {}) => api.get("/banners/", config),
  adminGetAll: () => api.get("/admin/banners/list/"),
  adminCreate: (formData) => api.post("/admin/banners/", formData),
  adminUpdate: (id, formData) => api.patch(`/admin/banners/${id}/`, formData),
  adminDelete: (id) => api.delete(`/admin/banners/${id}/delete/`),
};

// ── Brands ────────────────────────────────────────────────────
// getAll() now hits the live Sysmac brand feed (public, unauthenticated)
// so the storefront Brands page shows real data instead of the empty
// local `Brand` table. getLegacy() still points at the local table in
// case the old admin CRUD (BrandManagement.jsx) needs it.
export const brandsAPI = {
  getAll: (config = {}) => api.get("/sysmac-brands/", config),
  getLegacy: (config = {}) => api.get("/brands/", config),
  adminCreate: (formData) => api.post("/admin/brands/", formData),
  adminUpdate: (id, formData) => api.patch(`/admin/brands/${id}/`, formData),
  adminDelete: (id) => api.delete(`/admin/brands/${id}/delete/`),
};

// ── Cart ──────────────────────────────────────────────────────
export const cartAPI = {
  get: () => api.get("/cart/"),
  add: (data) => api.post("/cart/add/", data),
  remove: (itemId) => api.delete(`/cart/remove/${itemId}/`),
  updateQuantity: (identifier, quantity) =>
    api.patch(`/cart/update/${identifier}/`, { quantity }),
};

// ── Wishlist ──────────────────────────────────────────────────
export const wishlistAPI = {
  get: (config = {}) => api.get("/wishlist/", config),
  toggle: (data) => api.post("/wishlist/toggle/", data),
  // NOTE: no /wishlist/count/ route exists in api_urls.py — this will 404 if called.
  // Add a matching Django path + view before using this, or remove it.
  getCount: () => api.get("/wishlist/count/"),
};

// ── Users (admin) ─────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get("/admin/users/"),
  toggleStatus: (userId) => api.post(`/admin/users/${userId}/toggle/`),
};

// ── Stats (admin) ─────────────────────────────────────────────
export const statsAPI = {
  get: () => api.get("/admin/stats/"),
};

// ── Deal of the Day ──────────────────────────────────────────
export const dealsAPI = {
  // Public — currently-live deals, for the homepage
  getActive: (config = {}) => api.get("/deals/", config),
  // Admin — every deal (active/scheduled/expired/cancelled)
  adminGetAll: () => api.get("/admin/deals/"),
  adminCreate: (data) => api.post("/admin/deals/", data),
  adminDelete: (id) => api.delete(`/admin/deals/${id}/delete/`),
};

// ── Orders ────────────────────────────────────────────────────
export const ordersAPI = {
  // Customer — my own orders
  getMine: () => api.get("/orders/"),

  // Admin — Order Management
  adminGetAll: (statusFilter) =>
    api.get("/admin/orders/", { params: statusFilter ? { status: statusFilter } : {} }),
  adminCreate: (data) => api.post("/admin/orders/", data),
  adminUpdateStatus: (id, statusValue) => api.patch(`/admin/orders/${id}/status/`, { status: statusValue }),
  // Search EXISTING customer accounts by email or phone — used when
  // manually creating an order from a WhatsApp message.
  adminSearchCustomers: (q) => api.get("/admin/customers/search/", { params: { q } }),
};

export default api;