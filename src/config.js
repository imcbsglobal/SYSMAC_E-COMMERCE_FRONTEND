// src/api/config.js
// Single source of truth for the API base URL.
// Swap the env var (or the fallback) when deploying — nowhere else needs to change.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export default BASE_URL;