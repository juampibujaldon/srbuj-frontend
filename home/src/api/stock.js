import { apiJson } from "./client";
import * as localStore from "./localStockStore";

const BASE_PATH = "/api/stock";

const shouldFallback = (error) => {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
};

async function withFallback(remoteCall, fallbackCall) {
  try {
    return await remoteCall();
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    console.warn("[stock] fallback a almacenamiento local por error remoto:", error.message);
    return fallbackCall();
  }
}

export async function fetchStockSnapshot() {
  return withFallback(
    () => apiJson(`${BASE_PATH}`, { method: "GET" }),
    () => localStore.fetchStockSnapshot(),
  );
}

export async function adjustFilamentGrams({ filamentId, delta }) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/filaments/${encodeURIComponent(filamentId)}/adjust`, {
        method: "POST",
        json: { delta },
      }),
    () => localStore.adjustFilamentGrams({ filamentId, delta }),
  );
}

export async function updateReorderPoint({ filamentId, reorderPointGrams }) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/filaments/${encodeURIComponent(filamentId)}`, {
        method: "PATCH",
        json: { reorderPointGrams },
      }),
    () => localStore.updateReorderPoint({ filamentId, reorderPointGrams }),
  );
}

export async function addMachine(payload) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/machines`, {
        method: "POST",
        json: payload,
      }),
    () => localStore.addMachine(payload),
  );
}

export async function updateMachine(machineId, payload) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/machines/${encodeURIComponent(machineId)}`, {
        method: "PATCH",
        json: payload,
      }),
    () => localStore.updateMachine(machineId, payload),
  );
}

export async function removeMachine(machineId) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/machines/${encodeURIComponent(machineId)}`, {
        method: "DELETE",
      }),
    () => localStore.removeMachine(machineId),
  );
}

export async function completeMaintenance(machineId) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/machines/${encodeURIComponent(machineId)}/maintenance`, {
        method: "POST",
      }),
    () => localStore.completeMaintenance(machineId),
  );
}

export async function moveMachineJob(machineId, jobId, direction) {
  return withFallback(
    () =>
      apiJson(
        `${BASE_PATH}/machines/${encodeURIComponent(machineId)}/jobs/${encodeURIComponent(jobId)}/move`,
        {
          method: "POST",
          json: { direction },
        },
      ),
    () => localStore.moveMachineJob(machineId, jobId, direction),
  );
}

export async function setMachineJobPosition(machineId, jobId, position) {
  return withFallback(
    () =>
      apiJson(
        `${BASE_PATH}/machines/${encodeURIComponent(machineId)}/jobs/${encodeURIComponent(jobId)}/position`,
        {
          method: "POST",
          json: { position },
        },
      ),
    () => localStore.setMachineJobPosition(machineId, jobId, position),
  );
}

export async function reserveFilamentForOrder(orderId, items = []) {
  return withFallback(
    async () => {
      const response = await apiJson(`${BASE_PATH}/reservations`, {
        method: "POST",
        json: { orderId, items },
      });
      return response?.reservation ?? [];
    },
    () => localStore.reserveFilamentForOrder(orderId, items),
  );
}

export async function consumeReservation(orderId) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/reservations/${encodeURIComponent(orderId)}/consume`, {
        method: "POST",
      }),
    () => localStore.consumeReservation(orderId),
  );
}

export async function releaseReservation(orderId) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/reservations/${encodeURIComponent(orderId)}/release`, {
        method: "POST",
      }),
    () => localStore.releaseReservation(orderId),
  );
}

export async function calculateAtpForSku(sku) {
  return withFallback(
    () =>
      apiJson(`${BASE_PATH}/atp/${encodeURIComponent(sku)}`, {
        method: "GET",
      }),
    () => Promise.resolve(localStore.calculateAtpForSku(sku)),
  );
}

export function getConfig() {
  return localStore.getConfig();
}
