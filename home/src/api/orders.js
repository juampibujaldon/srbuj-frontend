import { apiFetch, apiJson, apiUrl } from "./client";

const DEFAULT_PAGE_SIZE = 10;

const STATUS_ORDER = ["draft", "pending", "paid", "fulfilled", "cancelled"];

const normalizeStatusValue = (status) => {
  const value = String(status || "").toLowerCase();
  switch (value) {
    case "en_proceso":
    case "procesando":
    case "processing":
      return "pending";
    case "printing":
    case "imprimiendo":
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
    case "draft":
    case "pending":
    case "paid":
    case "fulfilled":
    case "cancelled":
      return value;
    default:
      return value || "draft";
  }
};

const normalizeOrder = (order) => {
  if (!order) return null;
  return {
    ...order,
    status: normalizeStatusValue(order.status),
    customer: order.customer || "",
    items: Array.isArray(order.items) ? order.items : [],
    files: Array.isArray(order.files) ? order.files : [],
    created_at: order.created_at || order.createdAt,
    updated_at: order.updated_at || order.updatedAt,
    shipping_address: order.shipping_address || order.shipping || {},
    shipping_quote: order.shipping_quote || order.shippingQuote || {},
    shipping: order.shipping_address || order.shipping || {},
    shippingQuote: order.shipping_quote || order.shippingQuote || {},
  };
};

export async function fetchOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.pageSize) query.set("page_size", params.pageSize);
  if (params.status?.length) query.set("status", params.status.join(","));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const url = `/api/orders/${query.toString() ? `?${query.toString()}` : ""}`;
  const data = await apiJson(url, { method: "GET" });
  const results = Array.isArray(data?.results) ? data.results.map(normalizeOrder) : [];
  const meta = {
    count: data?.count ?? results.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    featureFlags: data?.meta?.feature_flags ?? {},
  };
  return { results, meta };
}

export async function fetchOrder(orderId) {
  const data = await apiJson(`/api/orders/${orderId}/`, { method: "GET" });
  return normalizeOrder(data);
}

export async function createOrder(payload = {}) {
  const prepared = prepareOrderPayload(payload);
  const data = await apiJson("/api/orders/", {
    method: "POST",
    json: prepared,
  });
  return normalizeOrder(data);
}

export async function updateOrder(orderId, payload = {}) {
  const normalizedStatus =
    payload.status !== undefined ? normalizeStatusValue(payload.status) : undefined;

  const needsPreparation = [
    "items",
    "shipping",
    "shipping_address",
    "billing_address",
    "payment_metadata",
    "payment",
    "shipping_quote",
    "shippingQuote",
    "notes",
  ].some((key) => Object.prototype.hasOwnProperty.call(payload, key));

  let body = {};
  if (needsPreparation) {
    body = prepareOrderPayload(payload);
  } else {
    body = { ...payload };
  }
  if (normalizedStatus !== undefined) {
    body.status = normalizedStatus;
  }

  const data = await apiJson(`/api/orders/${orderId}/`, {
    method: "PATCH",
    json: body,
  });
  return normalizeOrder(data);
}

export async function submitOrder(orderId) {
  const data = await apiJson(`/api/orders/${orderId}/submit/`, { method: "POST" });
  return normalizeOrder(data);
}

export async function uploadOrderFile(orderId, file, { notes, previewUrl, onProgress } = {}) {
  if (!file) {
    throw new Error("Adjuntá un archivo para subir.");
  }
  const formData = new FormData();
  formData.append("order", orderId);
  formData.append("file", file);
  if (notes) formData.append("notes", notes);
  if (previewUrl) formData.append("preview_url", previewUrl);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/files/uploads/"));

    const token = localStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Token ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      if (onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve(null);
        }
      } else {
        reject(new Error("No se pudo subir el archivo."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Error de red al subir el archivo."));
    };

    xhr.send(formData);
  });
}

export async function confirmPayment(paymentId) {
  const params = new URLSearchParams({ payment_id: paymentId });
  const data = await apiJson(`/api/payments/confirm?${params.toString()}`, { method: "GET" });
  return data;
}

export async function fetchFeatureFlags() {
  const data = await apiJson("/api/features/", { method: "GET" });
  return data?.flags ?? {};
}

function prepareOrderPayload(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const normalizedItems = items.map((item) => ({
    product_id: item.product_id ?? item.productId ?? item.product?.id ?? null,
    title: item.title ?? item.name ?? "Producto",
    sku: item.sku ?? item.id ?? "",
    quantity: item.quantity ?? item.qty ?? 1,
    unit_price: item.unit_price ?? item.price ?? 0,
    metadata: item.metadata ?? item.customization ?? {},
  }));

  return {
    items: normalizedItems,
    shipping_address: payload.shipping_address ?? payload.shipping ?? {},
    billing_address: payload.billing_address ?? payload.billing ?? {},
    shipping_quote: payload.shipping_quote ?? payload.shippingQuote ?? {},
    shipping_cost:
      payload.shipping_cost ??
      payload.shippingCost ??
      payload.shipping_quote?.precio ??
      payload.shippingQuote?.precio ??
      0,
    payment_metadata: payload.payment_metadata ?? payload.payment ?? {},
    notes: payload.notes ?? "",
    status: normalizeStatusValue(payload.status ?? "draft"),
  };
}

export function getStatusSortWeight(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

export default {
  fetchOrders,
  fetchOrder,
  createOrder,
  updateOrder,
  submitOrder,
  uploadOrderFile,
  confirmPayment,
  fetchFeatureFlags,
};
