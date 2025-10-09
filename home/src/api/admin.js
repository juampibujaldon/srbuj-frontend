import { apiJson } from "./client";

export function fetchOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.pageSize) query.set("page_size", params.pageSize);
  if (params.status?.length) query.set("status", params.status.join(","));

  return apiJson(`/api/orders/${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
  }).then((data) => ({
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
    meta: {
      count: data?.count ?? (Array.isArray(data?.results) ? data.results.length : Array.isArray(data) ? data.length : 0),
      featureFlags: data?.meta?.feature_flags ?? {},
    },
  }));
}

export function updateOrderStatus(id, status) {
  const normalize = (value) => {
    const raw = String(value || "").toLowerCase();
    switch (raw) {
      case "procesando":
      case "processing":
      case "en_proceso":
        return "pending";
      case "imprimiendo":
      case "printing":
      case "pagado":
        return "paid";
      case "finalizado":
      case "entregado":
      case "completado":
        return "fulfilled";
      case "cancelado":
        return "cancelled";
      case "borrador":
        return "draft";
      default:
        return raw || "pending";
    }
  };
  const normalized = normalize(status);
  return apiJson(`/api/orders/${id}/`, {
    method: "PATCH",
    json: { status: normalized },
  });
}

export function fetchDashboardSummary() {
  return apiJson("/api/dashboard/resumen", {
    method: "GET",
  });
}
