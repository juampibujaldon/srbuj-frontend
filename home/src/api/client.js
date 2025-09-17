// Simple API client that prefixes calls with a configurable base URL.
// Configure via REACT_APP_API_BASE_URL (e.g., http://localhost:3001)

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") || "";

export function apiUrl(path = "") {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, options) {
  const url = apiUrl(path);
  return fetch(url, options);
}

export default apiFetch;

