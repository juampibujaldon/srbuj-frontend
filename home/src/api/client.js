// Simple API client that prefixes calls with a configurable base URL.
// Configure via REACT_APP_API_BASE_URL (e.g., http://localhost:3001)

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") || "";

function buildHeaders(headers = {}, includeAuth = true) {
  const token = includeAuth ? localStorage.getItem("token") : null;
  const final = new Headers(headers);
  if (includeAuth && token && !final.has("Authorization")) {
    final.set("Authorization", `Token ${token}`);
  }
  return final;
}

export function apiUrl(path = "") {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, { headers, auth = true, json, ...options } = {}) {
  const url = apiUrl(path);
  const finalHeaders = buildHeaders(headers, auth);

  if (json !== undefined) {
    if (!(json instanceof FormData)) {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
      options.body = JSON.stringify(json);
    } else {
      options.body = json;
    }
  }

  const response = await fetch(url, { ...options, headers: finalHeaders });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  }

  return response;
}

export async function apiJson(path, options) {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.detail || data?.error || "Error al comunicarse con el backend";
    throw new Error(message);
  }
  return data;
}

export default apiFetch;
