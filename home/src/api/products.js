import { apiJson } from "./client";

const BASE = "/api/productos";

function normalizeProductsResponse(data) {
  const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  const meta = {
    count: data?.count ?? items.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };

  return { items, meta };
}

export async function fetchProducts({ admin = false } = {}) {
  const raw = await apiJson(`${BASE}/`, { auth: admin });
  const { items, meta } = normalizeProductsResponse(raw);
  if (admin) {
    return { results: items, meta };
  }
  return items;
}

export async function fetchProduct(id) {
  return apiJson(`${BASE}/${id}/`, { auth: false });
}

export async function createProduct(payload) {
  return apiJson(`${BASE}/`, {
    method: "POST",
    auth: true,
    body: payload,
  });
}

export async function updateProduct(id, payload) {
  return apiJson(`${BASE}/${id}/`, {
    method: "PUT",
    auth: true,
    body: payload,
  });
}

export async function deleteProduct(id) {
  return apiJson(`${BASE}/${id}/`, {
    method: "DELETE",
  });
}
