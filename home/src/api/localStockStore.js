const STORAGE_KEY = "stock-store";

const defaultState = {
  filaments: [
    {
      id: "pla-verde-175",
      sku: "PLA-VERDE-175",
      material: "PLA",
      color: "Verde",
      diameter: 1.75,
      gramsPerUnit: 80,
      estPrintMinPerUnit: 35,
      reorderPointGrams: 600,
      lots: [
        { id: "lot-pla-verde-1", grams: 1200, reserved: 200, receivedAt: "2024-06-01T10:00:00Z" },
        { id: "lot-pla-verde-2", grams: 800, reserved: 0, receivedAt: "2024-08-05T10:00:00Z" },
      ],
    },
    {
      id: "pla-negro-175",
      sku: "PLA-NEGRO-175",
      material: "PLA",
      color: "Negro",
      diameter: 1.75,
      gramsPerUnit: 90,
      estPrintMinPerUnit: 40,
      reorderPointGrams: 800,
      lots: [
        { id: "lot-pla-negro-1", grams: 900, reserved: 150, receivedAt: "2024-05-20T10:00:00Z" },
        { id: "lot-pla-negro-2", grams: 600, reserved: 0, receivedAt: "2024-09-10T10:00:00Z" },
      ],
    },
    {
      id: "petg-rojo-175",
      sku: "PETG-ROJO-175",
      material: "PETG",
      color: "Rojo",
      diameter: 1.75,
      gramsPerUnit: 110,
      estPrintMinPerUnit: 45,
      reorderPointGrams: 500,
      lots: [
        { id: "lot-petg-rojo-1", grams: 500, reserved: 0, receivedAt: "2024-07-15T10:00:00Z" },
      ],
    },
  ],
  machines: [
    {
      id: "bambu-a1-combo",
      name: "Bambu Lab A1 Combo",
      model: "A1 Combo",
      status: "online",
      nozzle: "0.4",
      compatibleMaterials: ["PLA", "PETG"],
      avgSpeedFactor: 1.15,
      maintenanceEveryHours: 150,
      maintenanceHoursUsed: 110,
      lastMaintenanceAt: "2024-09-10T09:00:00Z",
      queue: [
        { id: "job-101", sku: "PLA-VERDE-175", qty: 2, estMinutesPerUnit: 32, remainingMinutes: 40 },
        { id: "job-102", sku: "PLA-NEGRO-175", qty: 1, estMinutesPerUnit: 50, remainingMinutes: 50 },
      ],
    },
    {
      id: "ender-pro",
      name: "Ender Pro",
      model: "Ender 3",
      status: "online",
      nozzle: "0.4",
      compatibleMaterials: ["PLA"],
      avgSpeedFactor: 0.95,
      maintenanceEveryHours: 120,
      maintenanceHoursUsed: 40,
      lastMaintenanceAt: "2024-08-28T10:00:00Z",
      queue: [
        { id: "job-201", sku: "PLA-NEGRO-175", qty: 3, estMinutesPerUnit: 45, remainingMinutes: 90 },
      ],
    },
    {
      id: "ender-flex",
      name: "Ender Flex",
      model: "Ender 5",
      status: "maintenance",
      nozzle: "0.6",
      compatibleMaterials: ["PETG", "TPU"],
      avgSpeedFactor: 0.9,
      maintenanceEveryHours: 100,
      maintenanceHoursUsed: 98,
      lastMaintenanceAt: "2024-07-20T10:00:00Z",
      queue: [],
    },
  ],
  reservations: {},
};

const CONFIG = {
  maintenanceThresholdPct: Number(process.env.REACT_APP_MAINTENANCE_THRESHOLD_PCT || 0.9),
  freeMinutesWarn24h: Number(process.env.REACT_APP_QUEUE_FREE_MINUTES_WARN_24H || 120),
  defaultEstPrintMin: Number(process.env.REACT_APP_DEFAULT_EST_PRINT_MIN_PER_UNIT || 30),
};

const storage = typeof window !== "undefined" ? window.localStorage : null;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const loadState = () => {
  try {
    if (!storage) return deepClone(defaultState);
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return deepClone(defaultState);
    const parsed = JSON.parse(saved);
    return {
      ...defaultState,
      ...parsed,
      filaments: parsed.filaments || defaultState.filaments,
      machines: parsed.machines || defaultState.machines,
      reservations: parsed.reservations || {},
    };
  } catch (error) {
    console.warn("[stock local] error leyendo storage", error);
    return deepClone(defaultState);
  }
};

let state = loadState();

const persistState = () => {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[stock local] error persistiendo storage", error);
  }
};

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

const getLotTotals = (filament) => {
  const gramsAvailable = filament.lots.reduce((acc, lot) => acc + lot.grams, 0);
  const gramsReserved = filament.lots.reduce((acc, lot) => acc + lot.reserved, 0);
  const freeGrams = Math.max(gramsAvailable - gramsReserved, 0);
  return { gramsAvailable, gramsReserved, freeGrams };
};

const mapFilamentView = (filament) => {
  const totals = getLotTotals(filament);
  return {
    ...filament,
    gramsAvailable: totals.gramsAvailable,
    gramsReserved: totals.gramsReserved,
    freeGrams: totals.freeGrams,
    lots: filament.lots.map((lot) => ({ ...lot })),
  };
};

const mapMachineView = (machine) => {
  const queueMinutes = getMachineQueueMinutes(machine, 24 * 60);
  return {
    ...machine,
    queueEtaMinutes: queueMinutes,
    queue: (machine.queue || []).map((job) => ({ ...job })),
  };
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function getMachineQueueMinutes(machine, windowMinutes = 24 * 60) {
  const total = (machine.queue || []).reduce((acc, job) => {
    const perUnit = job.estMinutesPerUnit || CONFIG.defaultEstPrintMin;
    const remaining = job.remainingMinutes ?? perUnit * Math.max(job.qty || 1, 1);
    return acc + remaining;
  }, 0);
  return Math.max(0, Math.min(total / (machine.avgSpeedFactor || 1), windowMinutes));
}

function findFilament(filamentId) {
  const filament = state.filaments.find((f) => f.id === filamentId);
  if (!filament) {
    throw new Error("Filamento no encontrado");
  }
  return filament;
}

function findFilamentBySku(sku) {
  const filament = state.filaments.find((f) => f.sku === sku);
  if (!filament) {
    throw new Error(`No encontramos filamento para SKU ${sku}`);
  }
  return filament;
}

function findMachine(machineId) {
  const machine = state.machines.find((m) => m.id === machineId);
  if (!machine) {
    throw new Error("Máquina no encontrada");
  }
  return machine;
}

function computeAlerts(snapshot) {
  const alerts = [];
  snapshot.filaments.forEach((filament) => {
    if (filament.freeGrams <= filament.reorderPointGrams) {
      alerts.push({ type: "stock", message: `${filament.sku}: stock bajo (${filament.freeGrams}g)` });
    }
  });
  snapshot.machines.forEach((machine) => {
    const ratio = machine.maintenanceHoursUsed / machine.maintenanceEveryHours;
    if (ratio >= CONFIG.maintenanceThresholdPct) {
      alerts.push({ type: "maintenance", message: `${machine.name}: mantenimiento pendiente` });
    }
    const freeMinutes = Math.max(24 * 60 - getMachineQueueMinutes(machine, 24 * 60), 0);
    if (freeMinutes < CONFIG.freeMinutesWarn24h && machine.status === "online") {
      alerts.push({ type: "queue", message: `${machine.name}: cola saturada (< ${CONFIG.freeMinutesWarn24h} min libres)` });
    }
  });
  return alerts;
}

export async function fetchStockSnapshot() {
  await delay();
  const filaments = state.filaments.map(mapFilamentView);
  const machines = state.machines.map(mapMachineView);
  return {
    filaments,
    machines,
    alerts: computeAlerts({ filaments, machines }),
    config: CONFIG,
  };
}

export async function adjustFilamentGrams({ filamentId, delta }) {
  if (!delta) return fetchStockSnapshot();
  const filament = findFilament(filamentId);
  const totals = getLotTotals(filament);
  const newTotal = totals.gramsAvailable + delta;
  if (newTotal < totals.gramsReserved) {
    throw new Error("No podés dejar el stock por debajo de las reservas");
  }
  const targetLot = filament.lots[0];
  targetLot.grams = Math.max(targetLot.grams + delta, 0);
  persistState();
  return fetchStockSnapshot();
}

export async function updateReorderPoint({ filamentId, reorderPointGrams }) {
  const filament = findFilament(filamentId);
  filament.reorderPointGrams = Math.max(0, Number(reorderPointGrams || 0));
  persistState();
  return fetchStockSnapshot();
}

export async function createFilament(payload = {}) {
  await delay();
  const sku = (payload.sku || "").trim().toUpperCase();
  if (!sku) throw new Error("El SKU es obligatorio.");
  if (state.filaments.some((item) => item.sku === sku)) {
    throw new Error("Ya existe un filamento con ese SKU.");
  }
  const material = (payload.material || "").trim();
  if (!material) throw new Error("El material es obligatorio.");
  const color = (payload.color || "").trim();
  if (!color) throw new Error("El color es obligatorio.");
  const baseId =
    (payload.id || "").trim() ||
    slugify(`${material}-${color}-${sku}`) ||
    `filament-${Date.now()}`;
  if (state.filaments.some((item) => item.id === baseId)) {
    throw new Error("Ya existe un filamento con ese identificador.");
  }
  const diameter = Number(payload.diameter) || 1.75;
  const gramsAvailable = Math.max(Number(payload.gramsAvailable) || 0, 0);
  let gramsReserved = Math.max(Number(payload.gramsReserved) || 0, 0);
  if (gramsReserved > gramsAvailable) {
    gramsReserved = gramsAvailable;
  }
  const reorderPointGrams = Math.max(Number(payload.reorderPointGrams) || 0, 0);
  const gramsPerUnit = Math.max(Number(payload.gramsPerUnit) || 0, 0);
  const estPrintMinPerUnit = Math.max(
    Number(payload.estPrintMinPerUnit) || CONFIG.defaultEstPrintMin,
    1,
  );
  const receivedAt =
    payload.receivedAt ||
    (payload.lot && payload.lot.receivedAt) ||
    new Date().toISOString();

  const lotId =
    (payload.lot && payload.lot.id) ||
    (payload.lotId || "").trim() ||
    `lot-${baseId}-${Date.now()}`;

  const filament = {
    id: baseId,
    sku,
    material,
    color,
    diameter,
    gramsPerUnit,
    estPrintMinPerUnit,
    reorderPointGrams,
    notes: (payload.notes || "").trim() || undefined,
    lots: [
      {
        id: lotId,
        grams: gramsAvailable,
        reserved: gramsReserved,
        receivedAt,
      },
    ],
  };

  state = {
    ...state,
    filaments: [...state.filaments, filament],
  };
  persistState();
  return mapFilamentView(filament);
}

function ensureReservationSpace(filament, gramsNeeded) {
  const totals = getLotTotals(filament);
  if (totals.freeGrams < gramsNeeded) {
    throw new Error(`No hay suficiente stock libre para ${filament.sku}`);
  }
}

export async function reserveFilamentForOrder(orderId, items = []) {
  if (!orderId) throw new Error("Falta el ID de pedido");
  if (state.reservations[orderId]) {
    return state.reservations[orderId];
  }
  const reservation = [];
  for (const item of items) {
    const filament = findFilamentBySku(item.sku);
    const gramsPerUnit = item.gramsPerUnit || filament.gramsPerUnit || 0;
    const gramsNeeded = gramsPerUnit * (item.qty || 1);
    ensureReservationSpace(filament, gramsNeeded);
    let remaining = gramsNeeded;
    const lots = [...filament.lots].sort(
      (a, b) => new Date(a.receivedAt) - new Date(b.receivedAt)
    );
    for (const lot of lots) {
      if (remaining <= 0) break;
      const available = lot.grams - lot.reserved;
      const take = Math.min(available, remaining);
      lot.reserved += take;
      reservation.push({ orderId, filamentId: filament.id, lotId: lot.id, grams: take });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new Error(`No pudimos reservar todo el material para ${filament.sku}`);
    }
  }
  state.reservations[orderId] = reservation;
  persistState();
  return reservation;
}

export async function consumeReservation(orderId) {
  const reservation = state.reservations[orderId];
  if (!reservation) return fetchStockSnapshot();
  reservation.forEach((entry) => {
    const filament = findFilament(entry.filamentId);
    const lot = filament.lots.find((l) => l.id === entry.lotId);
    if (!lot) return;
    lot.reserved = Math.max(lot.reserved - entry.grams, 0);
    lot.grams = Math.max(lot.grams - entry.grams, 0);
  });
  delete state.reservations[orderId];
  persistState();
  return fetchStockSnapshot();
}

export async function releaseReservation(orderId) {
  const reservation = state.reservations[orderId];
  if (!reservation) return fetchStockSnapshot();
  reservation.forEach((entry) => {
    const filament = findFilament(entry.filamentId);
    const lot = filament.lots.find((l) => l.id === entry.lotId);
    if (lot) {
      lot.reserved = Math.max(lot.reserved - entry.grams, 0);
    }
  });
  delete state.reservations[orderId];
  persistState();
  return fetchStockSnapshot();
}

export async function completeMaintenance(machineId) {
  const machine = findMachine(machineId);
  machine.maintenanceHoursUsed = 0;
  machine.lastMaintenanceAt = new Date().toISOString();
  machine.status = "online";
  persistState();
  return fetchStockSnapshot();
}

export async function moveMachineJob(machineId, jobId, direction) {
  const machine = findMachine(machineId);
  const index = machine.queue.findIndex((q) => q.id === jobId);
  if (index === -1) return fetchStockSnapshot();
  const newIndex = direction === "up" ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= machine.queue.length) {
    return fetchStockSnapshot();
  }
  const [job] = machine.queue.splice(index, 1);
  machine.queue.splice(newIndex, 0, job);
  persistState();
  return fetchStockSnapshot();
}

export async function setMachineJobPosition(machineId, jobId, position) {
  const machine = findMachine(machineId);
  const queue = machine.queue || [];
  const index = queue.findIndex((job) => job.id === jobId);
  if (index === -1) return fetchStockSnapshot();
  const clamped = Math.max(0, Math.min(Number(position), queue.length - 1));
  if (Number.isNaN(clamped) || clamped === index) return fetchStockSnapshot();
  const [job] = queue.splice(index, 1);
  queue.splice(clamped, 0, job);
  queue.forEach((item, idx) => {
    item.position = idx;
  });
  persistState();
  return fetchStockSnapshot();
}

export async function addMachine(machine) {
  if (!machine?.id) {
    throw new Error("La máquina necesita un ID");
  }
  if (state.machines.some((m) => m.id === machine.id)) {
    throw new Error("Ya existe una máquina con ese ID");
  }
  state.machines.push({
    ...machine,
    status: machine.status || "online",
    queue: machine.queue || [],
    maintenanceHoursUsed: machine.maintenanceHoursUsed || 0,
    maintenanceEveryHours: machine.maintenanceEveryHours || 120,
    avgSpeedFactor: machine.avgSpeedFactor || 1,
    compatibleMaterials: machine.compatibleMaterials || ["PLA"],
  });
  persistState();
  return fetchStockSnapshot();
}

export async function updateMachine(machineId, updates = {}) {
  const machine = findMachine(machineId);
  Object.assign(machine, updates, {
    avgSpeedFactor: updates.avgSpeedFactor ?? machine.avgSpeedFactor,
    maintenanceEveryHours: updates.maintenanceEveryHours ?? machine.maintenanceEveryHours,
    maintenanceHoursUsed: updates.maintenanceHoursUsed ?? machine.maintenanceHoursUsed,
    compatibleMaterials: updates.compatibleMaterials ?? machine.compatibleMaterials,
  });
  persistState();
  return fetchStockSnapshot();
}

export async function removeMachine(machineId) {
  state.machines = state.machines.filter((machine) => machine.id !== machineId);
  persistState();
  return fetchStockSnapshot();
}

export function calculateAtpForSku(sku) {
  const filament = findFilamentBySku(sku);
  const filaments = state.filaments.filter((f) => f.sku === sku);
  const gramsPerUnit = filament.gramsPerUnit || Number(process.env.REACT_APP_DEFAULT_GRAMS_PER_UNIT || 80);
  const materialGrams = filaments.reduce((acc, fil) => acc + getLotTotals(fil).freeGrams, 0);
  const unitsByMaterials = Math.floor(materialGrams / gramsPerUnit);

  const machines = state.machines.filter((machine) =>
    machine.compatibleMaterials?.includes(filament.material)
  );
  const freeMinutes24 = machines.reduce((acc, machine) => {
    if (machine.status !== "online") return acc;
    const queueMinutes = getMachineQueueMinutes(machine, 24 * 60);
    return acc + Math.max(24 * 60 - queueMinutes, 0);
  }, 0);
  const freeMinutes72 = machines.reduce((acc, machine) => {
    if (machine.status !== "online") return acc;
    const queueMinutes = getMachineQueueMinutes(machine, 72 * 60);
    return acc + Math.max(72 * 60 - queueMinutes, 0);
  }, 0);
  const machineUnits24 = Math.floor(freeMinutes24 / (filament.estPrintMinPerUnit || CONFIG.defaultEstPrintMin));
  const machineUnits72 = Math.floor(freeMinutes72 / (filament.estPrintMinPerUnit || CONFIG.defaultEstPrintMin));
  const atpNow = Math.min(unitsByMaterials, machineUnits24);
  return {
    sku,
    atpNow,
    unitsByMaterials,
    unitsByMachines24h: machineUnits24,
    unitsByMachines72h: machineUnits72,
    bottleneck: unitsByMaterials <= machineUnits24 ? "material" : "maquinas",
  };
}

export function getConfig() {
  return CONFIG;
}

export const __testing = {
  reset: () => {
    state = deepClone(defaultState);
    persistState();
  },
  getState: () => state,
};
