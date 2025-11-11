import { apiUrl } from "../api/client";

const MEDIA_KEYS = [
  "url",
  "href",
  "path",
  "location",
  "src",
  "download_url",
  "downloadUrl",
  "file_url",
  "fileUrl",
  "image",
  "file",
];

const stripTrailingSlash = (value = "") => value.replace(/\/+$/, "");

function unwrapMediaValue(value, depth = 0) {
  if (value == null || depth > 3) return null;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const unwrapped = unwrapMediaValue(entry, depth + 1);
      if (unwrapped) return unwrapped;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of MEDIA_KEYS) {
      if (value[key]) {
        const unwrapped = unwrapMediaValue(value[key], depth + 1);
        if (unwrapped) return unwrapped;
      }
    }
  }
  return null;
}

function ensureHttps(url) {
  if (
    typeof window !== "undefined" &&
    window.location?.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

export function resolveImageUrl(input) {
  const rawValue = unwrapMediaValue(input);
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (/^data:|^blob:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return ensureHttps(trimmed);
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const publicBase = stripTrailingSlash(process.env.PUBLIC_URL || "");
  const mediaBase =
    stripTrailingSlash(process.env.REACT_APP_MEDIA_BASE_URL) ||
    stripTrailingSlash(process.env.REACT_APP_API_BASE_URL) ||
    "";

  const hasImageExtension = /\.(png|jpe?g|gif|webp|svg)$/i.test(
    trimmed.split("?")[0],
  );

  let path = trimmed;
  if (path.startsWith("./")) {
    path = path.replace(/^\./, "");
  }

  if (path.startsWith("images/") || path.startsWith("/images/")) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${publicBase}${normalized}`;
  }

  if (!path.startsWith("/") && hasImageExtension) {
    return `${publicBase}/images/${path}`.replace(/\/{2,}/g, "/");
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (/^\/images\//i.test(path)) {
    return `${publicBase}${path}`;
  }

  if (/^\/media\//i.test(path) && mediaBase) {
    return `${mediaBase}${path}`;
  }

  if (mediaBase) {
    const normalized = `/media${path}`.replace(/\/{2,}/g, "/");
    return `${mediaBase}${normalized}`;
  }

  return apiUrl(path);
}

export default resolveImageUrl;
