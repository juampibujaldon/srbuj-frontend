import { apiJson } from "./client";

export function fetchOrders() {
  return apiJson("/api/ordenes/admin", {
    method: "GET",
  });
}

export function updateOrderStatus(id, estado) {
  return apiJson(`/api/ordenes/${id}/estado`, {
    method: "PATCH",
    json: { estado },
  });
}

export function fetchDashboardSummary() {
  return apiJson("/api/dashboard/resumen", {
    method: "GET",
  });
}
