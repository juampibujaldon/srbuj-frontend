import { useCallback, useEffect, useState } from "react";
import { fetchProducts } from "../api/products";

export function useProducts({ autoFetch = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setItems(data);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      load();
    }
  }, [autoFetch, load]);

  return { items, loading, error, reload: load };
}
