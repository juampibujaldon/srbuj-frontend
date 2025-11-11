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

function unwrapMediaValue(value, depth = 0) {
  if (!value || depth > 3) return null;
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

export function resolveImageUrl(input) {
  const rawValue = unwrapMediaValue(input);
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (/^data:|^blob:/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    if (typeof window !== "undefined" && window.location?.protocol === "https:" && trimmed.startsWith("http://")) {
      return trimmed.replace(/^http:\/\//i, "https://");
    }
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  let normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (/^\/images\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  if (!/^\/media\//i.test(normalizedPath)) {
    normalizedPath = `/media${normalizedPath}`;
  }
  normalizedPath = normalizedPath.replace(/\/{2,}/g, "/");
  if (process.env.REACT_APP_MEDIA_BASE_URL) {
    return `${process.env.REACT_APP_MEDIA_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
  if (process.env.REACT_APP_API_BASE_URL) {
    return `${process.env.REACT_APP_API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
  return apiUrl(normalizedPath);
}

export default resolveImageUrl;
