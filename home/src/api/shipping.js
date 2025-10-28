import { apiJson } from "./client";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_WEIGHT_GR = 300;
const DEFAULT_VOLUME_CM3 = 20 * 20 * 15; // volumen de respaldo (cm3)

const SHIPPING_PROVIDERS = {
  ANDREANI: "andreani",
  CORREO_ARGENTINO: "correo_argentino",
};

const PROVIDER_LABELS = {
  [SHIPPING_PROVIDERS.ANDREANI]: "Andreani",
  [SHIPPING_PROVIDERS.CORREO_ARGENTINO]: "Correo Argentino",
};

const shouldMockAndreani =
  process.env.REACT_APP_MOCK_ANDREANI === "true" || !process.env.REACT_APP_API_BASE_URL;
const shouldMockCorreoArgentino =
  process.env.REACT_APP_MOCK_CORREO_ARGENTINO === "true" || !process.env.REACT_APP_API_BASE_URL;

const ZONE_CONFIG = {
  amba: { id: "amba", label: "AMBA", multiplier: 1 },
  pampeana: { id: "pampeana", label: "Zona Centro", multiplier: 1.1 },
  cuyo: { id: "cuyo", label: "Cuyo", multiplier: 1.18 },
  nea: { id: "nea", label: "NEA", multiplier: 1.22 },
  noa: { id: "noa", label: "NOA", multiplier: 1.25 },
  patagonia: { id: "patagonia", label: "Patagonia", multiplier: 1.38 },
  interior: { id: "interior", label: "Interior", multiplier: 1.15 },
};

const CP_PREFIX_ZONE = {
  0: "amba",
  1: "amba",
  2: "pampeana",
  3: "pampeana",
  4: "cuyo",
  5: "noa",
  6: "nea",
  7: "nea",
  8: "patagonia",
  9: "patagonia",
};

const RATE_TABLES = {
  [SHIPPING_PROVIDERS.ANDREANI]: [
    { upto: 0.5, price: 2200 },
    { upto: 1, price: 2600 },
    { upto: 3, price: 3200 },
    { upto: 5, price: 3900 },
    { upto: 10, price: 5200 },
  ],
  [SHIPPING_PROVIDERS.CORREO_ARGENTINO]: [
    { upto: 0.5, price: 2100 },
    { upto: 1, price: 2500 },
    { upto: 3, price: 3050 },
    { upto: 5, price: 3600 },
    { upto: 10, price: 4700 },
  ],
};

const EXTRA_PER_KG = {
  [SHIPPING_PROVIDERS.ANDREANI]: 420,
  [SHIPPING_PROVIDERS.CORREO_ARGENTINO]: 360,
};

const ETA_TABLE = {
  [SHIPPING_PROVIDERS.ANDREANI]: {
    amba: "2-3 días hábiles",
    pampeana: "3-4 días hábiles",
    cuyo: "3-5 días hábiles",
    nea: "4-6 días hábiles",
    noa: "4-6 días hábiles",
    patagonia: "5-7 días hábiles",
    interior: "4-6 días hábiles",
  },
  [SHIPPING_PROVIDERS.CORREO_ARGENTINO]: {
    amba: "3-4 días hábiles",
    pampeana: "4-5 días hábiles",
    cuyo: "4-6 días hábiles",
    nea: "5-7 días hábiles",
    noa: "5-7 días hábiles",
    patagonia: "6-8 días hábiles",
    interior: "5-7 días hábiles",
  },
};

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderLabel(provider) {
  return PROVIDER_LABELS[provider] || "el operador seleccionado";
}

function normalizeCartSummary(summary = {}) {
  const totalWeightGr = Number(summary.totalWeightGr ?? summary.weightGr ?? DEFAULT_WEIGHT_GR) || DEFAULT_WEIGHT_GR;
  const totalVolumeCm3 =
    Number(summary.totalVolumeCm3 ?? summary.volumeCm3 ?? DEFAULT_VOLUME_CM3) || DEFAULT_VOLUME_CM3;
  const weightKg = Math.max(totalWeightGr / 1000, DEFAULT_WEIGHT_GR / 1000);
  return { totalWeightGr, totalVolumeCm3, weightKg };
}

function determineZone(cp = "") {
  const digits = String(cp || "").replace(/\D/g, "");
  const prefix = digits ? Number(digits[0]) : null;
  const zoneKey = prefix != null && CP_PREFIX_ZONE[prefix] ? CP_PREFIX_ZONE[prefix] : "interior";
  return ZONE_CONFIG[zoneKey] || ZONE_CONFIG.interior;
}

function computeChargeableWeight(summary, provider) {
  const volumetricFactor = provider === SHIPPING_PROVIDERS.CORREO_ARGENTINO ? 4000 : 5000;
  const volumetricKg = summary.totalVolumeCm3 > 0 ? summary.totalVolumeCm3 / volumetricFactor : 0;
  const minKg = provider === SHIPPING_PROVIDERS.CORREO_ARGENTINO ? 0.35 : 0.25;
  const chargeable = Math.max(summary.weightKg, volumetricKg, minKg);
  return {
    chargeableKg: Number(chargeable.toFixed(2)),
    volumetricKg: Number(volumetricKg.toFixed(2)),
    weightKg: Number(summary.weightKg.toFixed(2)),
  };
}

function computeBaseRate(provider, chargeableKg) {
  const table = RATE_TABLES[provider] || RATE_TABLES[SHIPPING_PROVIDERS.ANDREANI];
  for (const tier of table) {
    if (chargeableKg <= tier.upto) {
      return tier.price;
    }
  }
  const lastTier = table[table.length - 1];
  const extraKg = Math.max(0, Math.ceil(chargeableKg - lastTier.upto));
  const extraPrice = extraKg * (EXTRA_PER_KG[provider] || 400);
  return lastTier.price + extraPrice;
}

function roundPrice(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 10) * 10;
}

function computeEtaForZone(provider, zoneId) {
  const table = ETA_TABLE[provider] || ETA_TABLE[SHIPPING_PROVIDERS.ANDREANI];
  return table[zoneId] || "4-8 días hábiles";
}

function buildSimulatedQuote(provider, payload = {}, { fallbackReason } = {}) {
  const summary = normalizeCartSummary(payload.cartSummary);
  const zone = determineZone(payload.cp);
  const weightData = computeChargeableWeight(summary, provider);
  const baseCost = computeBaseRate(provider, weightData.chargeableKg);
  const precio = roundPrice(baseCost * zone.multiplier);
  const providerLabel = getProviderLabel(provider);
  const detalleParts = [
    `Tarifa estimada ${providerLabel}`,
    `Zona ${zone.label}`,
    `Peso facturable ${weightData.chargeableKg.toFixed(2)} kg`,
  ];
  if (fallbackReason) {
    detalleParts.push(fallbackReason);
  }
  return {
    precio,
    eta: computeEtaForZone(provider, zone.id),
    simulado: true,
    detalle: detalleParts.join(" · "),
    provider,
    metadata: {
      ...weightData,
      zone: zone.id,
      zoneMultiplier: zone.multiplier,
    },
  };
}

function mockAndreaniQuote(payload = {}) {
  return buildSimulatedQuote(SHIPPING_PROVIDERS.ANDREANI, payload);
}

function mockCorreoArgentinoQuote(payload = {}) {
  return buildSimulatedQuote(SHIPPING_PROVIDERS.CORREO_ARGENTINO, payload);
}

export async function quoteAndreani(payload, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!payload) {
    throw new Error("Faltan datos para cotizar el envío");
  }

  if (shouldMockAndreani) {
    await delay();
    return mockAndreaniQuote(payload);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const data = await apiJson("/api/shipping/andreani/quote", {
      method: "POST",
      json: payload,
      signal: signal || controller.signal,
    });
    return { ...data, provider: SHIPPING_PROVIDERS.ANDREANI };
  } finally {
    clearTimeout(timeout);
  }
}

export async function quoteCorreoArgentino(
  payload,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  if (!payload) {
    throw new Error("Faltan datos para cotizar el envío");
  }

  if (shouldMockCorreoArgentino) {
    await delay();
    return mockCorreoArgentinoQuote(payload);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const data = await apiJson("/api/shipping/correo-argentino/quote", {
      method: "POST",
      json: payload,
      signal: signal || controller.signal,
    });
    return { ...data, provider: SHIPPING_PROVIDERS.CORREO_ARGENTINO };
  } finally {
    clearTimeout(timeout);
  }
}

export function mockShippingQuote(provider = SHIPPING_PROVIDERS.ANDREANI, payload = {}) {
  return provider === SHIPPING_PROVIDERS.CORREO_ARGENTINO
    ? mockCorreoArgentinoQuote(payload)
    : mockAndreaniQuote(payload);
}

export async function quoteShipping(
  provider = SHIPPING_PROVIDERS.ANDREANI,
  payload,
  options = {},
) {
  if (provider === SHIPPING_PROVIDERS.CORREO_ARGENTINO) {
    try {
      return await quoteCorreoArgentino(payload, options);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Fallo cotización Correo Argentino, usando estimado local", error);
      }
      return mockCorreoArgentinoQuote(payload);
    }
  }

  try {
    return await quoteAndreani(payload, options);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Fallo cotización Andreani, usando estimado local", error);
    }
    return mockAndreaniQuote(payload);
  }
}

export { mockAndreaniQuote };
export { SHIPPING_PROVIDERS, getProviderLabel, mockCorreoArgentinoQuote };
