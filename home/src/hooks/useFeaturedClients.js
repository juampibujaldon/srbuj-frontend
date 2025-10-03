import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "srbuj.featuredClients.v1";
const SYNC_EVENT = "srbuj:featured-clients-updated";

const DEFAULT_CLIENTS = [
  {
    id: "iconoviajes",
    name: "Icono Viajes",
    href: "https://www.iconoviajes.tur.ar/buscarxpaquetes",
    logo: "/images/iconoviajes_logo.png",
  },
];

const getDefaultClients = () => DEFAULT_CLIENTS.map((client) => ({ ...client }));

const normalizeClients = (value) => {
  if (!Array.isArray(value)) return getDefaultClients();
  const normalized = value
    .map((raw, index) => {
      if (!raw) return null;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const href = typeof raw.href === "string" ? raw.href.trim() : "";
      const logo = typeof raw.logo === "string" ? raw.logo.trim() : "";
      if (!href || !logo) return null;
      const id =
        raw.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `client-${Date.now()}-${index}`);
      return {
        id,
        name: name || "Cliente",
        href,
        logo,
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : getDefaultClients();
};

const readClients = () => {
  if (typeof window === "undefined") return getDefaultClients();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultClients();
    const parsed = JSON.parse(raw);
    return normalizeClients(parsed);
  } catch (error) {
    console.warn("No se pudieron leer los clientes destacados", error);
    return getDefaultClients();
  }
};

const persistClients = (clients) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch (error) {
    console.warn("No se pudieron guardar los clientes destacados", error);
  }
};

export function useFeaturedClients() {
  const [clients, setClients] = useState(() => readClients());

  const persistState = useCallback((updater) => {
    setClients((previous) => {
      const candidate = typeof updater === "function" ? updater(previous) : updater;
      const normalized = normalizeClients(candidate);
      persistClients(normalized);
      return normalized;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStorage = (event) => {
      if (event.key && event.key !== STORAGE_KEY) return;
      setClients(readClients());
    };

    const handleSync = () => {
      setClients(readClients());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SYNC_EVENT, handleSync);
    };
  }, []);

  return [clients, persistState];
}

export function resetFeaturedClients() {
  const defaults = getDefaultClients();
  persistClients(defaults);
  return defaults;
}
