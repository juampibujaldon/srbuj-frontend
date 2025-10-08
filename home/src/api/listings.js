import { apiJson } from "./client";

const LOCAL_KEY = "listingDrafts";

const loadLocalDrafts = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("No se pudieron leer las propuestas guardadas", error);
    return [];
  }
};

const persistLocalDrafts = (drafts) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.warn("No se pudieron persistir las propuestas", error);
  }
};

export async function fetchListingDrafts() {
  try {
    const data = await apiJson("/api/listings/", { method: "GET", auth: true });
    if (Array.isArray(data)) {
      persistLocalDrafts(data);
      return data;
    }
  } catch (error) {
    console.warn("Fallo al obtener propuestas del backend", error);
  }
  return loadLocalDrafts();
}

/** Crea un borrador de publicación (estado pendente). */
export async function createListingDraft(payload) {
  const body = payload instanceof FormData ? payload : buildFormData(payload);
  if (!body.has("status")) {
    body.append("status", "pending");
  }
  try {
    const created = await apiJson("/api/listings/", {
      method: "POST",
      json: body,
    });
    if (created) {
      const list = loadLocalDrafts();
      persistLocalDrafts([created, ...list]);
    }
    return created;
  } catch (error) {
    console.warn("Fallo la creación en backend, guardando localmente", error);
    const localDraft = formDataToObject(body);
    localDraft.id = localDraft.id || `draft-${Date.now()}`;
    const list = loadLocalDrafts();
    persistLocalDrafts([localDraft, ...list]);
    return localDraft;
  }
}

export async function updateListingDraftStatus(id, status) {
  try {
    const updated = await apiJson(`/api/listings/${id}/`, {
      method: "PATCH",
      auth: true,
      json: { status },
    });
    mergeLocalDraft(updated);
    return updated;
  } catch (error) {
    console.warn("No se pudo actualizar la propuesta en backend", error);
    const drafts = loadLocalDrafts();
    const updated = drafts.find((draft) => draft.id === id) || { id };
    const merged = { ...updated, status, updated_at: new Date().toISOString() };
    mergeLocalDraft(merged);
    return merged;
  }
}

const mergeLocalDraft = (draft) => {
  const drafts = loadLocalDrafts();
  const next = drafts.map((item) => (item.id === draft.id ? draft : item));
  if (!next.some((item) => item.id === draft.id)) {
    next.unshift(draft);
  }
  persistLocalDrafts(next);
};

function buildFormData(data = {}) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
    } else {
      formData.append(key, value);
    }
  });
  return formData;
}

function formDataToObject(formData) {
  const obj = {};
  formData.forEach((value, key) => {
    let normalized = value;
    if (typeof File !== "undefined" && value instanceof File) {
      normalized = { name: value.name, size: value.size, type: value.type };
    }
    if (obj[key] !== undefined) {
      const current = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
      current.push(normalized);
      obj[key] = current;
    } else {
      obj[key] = normalized;
    }
  });
  return obj;
}

export default createListingDraft;
