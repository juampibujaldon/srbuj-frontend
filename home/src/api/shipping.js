import { apiJson } from "./client";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_WEIGHT_GR = 300;

const shouldMockAndreani =
  process.env.REACT_APP_MOCK_ANDREANI === "true" || !process.env.REACT_APP_API_BASE_URL;

function computeEta(cp = "") {
  const digits = cp.replace(/\D/g, "");
  const seed = digits ? Number(digits.slice(-2)) : 7;
  const min = 2 + (seed % 3);
  const max = min + 2;
  return `${min}-${max} días hábiles`;
}

function mockAndreaniQuote(payload = {}) {
  const totalWeightGr = Number(payload?.cartSummary?.totalWeightGr || DEFAULT_WEIGHT_GR);
  const weightKg = Math.max(totalWeightGr / 1000, 0.2);
  const cp = String(payload?.cp || "0000");
  const base = 2300 + (Number(cp.slice(-2)) || 0) * 6;
  const variable = 900 * weightKg;
  const precio = Math.round(base + variable);
  return {
    precio,
    eta: computeEta(cp),
    simulado: true,
    detalle: "Tarifa estimada por tabla local"
  };
}

export async function quoteAndreani(payload, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!payload) {
    throw new Error("Faltan datos para cotizar el envío");
  }

  if (shouldMockAndreani) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return mockAndreaniQuote(payload);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await apiJson("/api/shipping/andreani/quote", {
      method: "POST",
      json: payload,
      signal: signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export { mockAndreaniQuote };
