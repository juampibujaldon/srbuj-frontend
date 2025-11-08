// Simple API client that prefixes calls with a configurable base URL.
// Configure via REACT_APP_API_BASE_URL (e.g., http://localhost:3001)

const stripTrailingSlash = (value) => (typeof value === "string" ? value.replace(/\/$/, "") : "");

const sanitizeBaseUrl = (value) => {
  const stripped = stripTrailingSlash(value);
  if (!stripped) return "";
  return stripped.toLowerCase().endsWith("/api") ? stripped.slice(0, -4) : stripped;
};

const DEFAULT_BASES = {
  development: "http://localhost:3001",
  production: "https://srbuj3d-production.up.railway.app",
  test: "http://localhost:3001",
};

const inferNetlifyFallback = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname || "";
  if (!host) return "";
  const overrides = {
    "srbuj3d.netlify.app": "https://srbuj3d-production.up.railway.app",
  };
  if (overrides[host]) {
    return overrides[host];
  }
  if (host.endsWith(".netlify.app")) {
    return overrides["srbuj3d.netlify.app"];
  }
  return "";
};

const inferDefaultBase = () => {
  const envBase = sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
  if (envBase) return envBase;

  if (typeof window !== "undefined") {
    const runtime = sanitizeBaseUrl(window.__ENV__?.API_BASE_URL);
    if (runtime) return runtime;
  }

  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="app-backend-origin"]');
    const metaBase = sanitizeBaseUrl(meta?.getAttribute("content"));
    if (metaBase) return metaBase;
  }

  const netlifyFallback = sanitizeBaseUrl(inferNetlifyFallback());
  if (netlifyFallback) return netlifyFallback;

  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host);
    if (!isLocalHost) {
      const prodFallback = sanitizeBaseUrl(
        process.env.REACT_APP_FALLBACK_API_BASE || DEFAULT_BASES.production
      );
      if (prodFallback) return prodFallback;
    }
  }

  const inferred = DEFAULT_BASES[process.env.NODE_ENV] || DEFAULT_BASES.production;
  return sanitizeBaseUrl(inferred);
};

export const API_BASE = inferDefaultBase();

if (process.env.NODE_ENV === "development") {
  // Helpful to verify where requests are sent during dev.
  console.debug(`[api] Base URL: ${API_BASE || "(relative)"}`);
} else if (!API_BASE) {
  console.warn(
    "[api] No API base URL detectada. Configurá REACT_APP_API_BASE_URL, window.__ENV__.API_BASE_URL o la meta tag app-backend-origin."
  );
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
    if (!message) {
      if (res.status === 404) {
        message =
          "El backend devolvió 404. Verificá que la API esté desplegada y que REACT_APP_API_BASE_URL apunte al dominio correcto.";
      } else if (res.status === 0) {
        message = "No pudimos comunicarnos con el servidor. Revisá tu conexión.";
      } else {
        message = `Error ${res.status} al comunicarse con el backend`;
      }
    }
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
