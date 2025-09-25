import { apiJson } from "./client";

const BASE = "/api/productos";

export async function fetchProducts({ admin = false } = {}) {
  return apiJson(`${BASE}/`, { auth: admin });
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
