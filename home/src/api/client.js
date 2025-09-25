// Simple API client that prefixes calls with a configurable base URL.
// Configure via REACT_APP_API_BASE_URL (e.g., http://localhost:3001)

const inferDefaultBase = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001";
  }
  return "";
};

export const API_BASE = inferDefaultBase();

if (process.env.NODE_ENV === "development") {
  // Helpful to verify where requests are sent during dev.
  console.debug(`[api] Base URL: ${API_BASE || "(relative)"}`);
}

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

  let response;
  try {
    response = await fetch(url, { ...options, headers: finalHeaders });
  } catch (networkError) {
    console.error("apiFetch network error", { url, error: networkError });
    throw networkError;
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  }

  return response;
}

export async function apiJson(path, options) {
  const res = await apiFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (parseError) {
    if (!res.ok) {
      console.error("apiJson parse error", {
        url: apiUrl(path),
        status: res.status,
        statusText: res.statusText,
        parseError,
      });
    }
  }
  if (!res.ok) {
    let message = data?.detail || data?.error || data?.message;
    if (!message && data && typeof data === "object") {
      const [firstKey] = Object.keys(data);
      if (firstKey) {
        const value = data[firstKey];
        if (Array.isArray(value)) message = value.join(". ");
        else if (value != null) message = String(value);
      }
    }
    message = message || `Error ${res.status || "al comunicarse con el backend"}`;
    console.error("apiJson error", {
      url: apiUrl(path),
      status: res.status,
      body: data,
    });
    throw new Error(message);
  }
  return data;
}
export default apiFetch;
