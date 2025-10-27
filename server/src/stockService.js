const { randomUUID } = require("crypto");
const { db } = require("./db");

const CONFIG = {
  maintenanceThresholdPct: Number(process.env.MAINTENANCE_THRESHOLD_PCT || 0.9),
  freeMinutesWarn24h: Number(process.env.QUEUE_FREE_MINUTES_WARN_24H || 120),
  defaultEstPrintMin: Number(process.env.DEFAULT_EST_PRINT_MIN_PER_UNIT || 30),
};

function rowsToFilament(row) {
  return {
    id: row.id,
    sku: row.sku,
    material: row.material,
    color: row.color,
    diameter: row.diameter,
    gramsPerUnit: row.grams_per_unit,
    estPrintMinPerUnit: row.est_print_min_per_unit,
    reorderPointGrams: row.reorder_point_grams,
  };
}

function getLotTotals(filamentId) {
  const totals = db
    .prepare(
      `
      SELECT
        SUM(grams) as gramsAvailable,
        SUM(reserved) as gramsReserved,
        SUM(grams - reserved) as freeGrams
      FROM filament_lots
      WHERE filament_id = ?
    `
    )
    .get(filamentId);
  return {
    gramsAvailable: totals?.gramsAvailable || 0,
    gramsReserved: totals?.gramsReserved || 0,
    freeGrams: Math.max(totals?.freeGrams || 0, 0),
  };
}

function getFilaments() {
  const rows = db.prepare("SELECT * FROM filaments ORDER BY sku ASC").all();
  return rows.map((row) => {
    const lots = db
      .prepare(
        "SELECT id, grams, reserved, received_at FROM filament_lots WHERE filament_id = ? ORDER BY datetime(received_at) ASC"
      )
      .all(row.id)
      .map((lot) => ({
        ...lot,
        receivedAt: lot.received_at,
      }));
    const totals = getLotTotals(row.id);
    return {
      ...rowsToFilament(row),
      gramsAvailable: totals.gramsAvailable,
      gramsReserved: totals.gramsReserved,
      freeGrams: totals.freeGrams,
      lots,
    };
  });
}

function getMachineQueueMinutes(machine, windowMinutes = 24 * 60) {
  const queue = db
    .prepare(
      "SELECT est_minutes_per_unit, remaining_minutes, qty FROM machine_jobs WHERE machine_id = ? ORDER BY position ASC"
    )
    .all(machine.id);
  const total = queue.reduce((acc, job) => {
    const perUnit = job.est_minutes_per_unit || CONFIG.defaultEstPrintMin;
    const remaining =
      job.remaining_minutes ?? perUnit * Math.max(job.qty || 1, 1);
    return acc + remaining;
  }, 0);
  return Math.max(0, Math.min(total / (machine.avg_speed_factor || 1), windowMinutes));
}

function getMachines() {
  const machines = db
    .prepare("SELECT * FROM machines ORDER BY name ASC")
    .all()
    .map((machine) => {
      const queue = db
        .prepare(
          "SELECT id, sku, qty, est_minutes_per_unit, remaining_minutes, position FROM machine_jobs WHERE machine_id = ? ORDER BY position ASC"
        )
        .all(machine.id)
        .map((job) => ({
          ...job,
        }));
      return {
        id: machine.id,
        name: machine.name,
        model: machine.model,
        status: machine.status,
        nozzle: machine.nozzle,
        avgSpeedFactor: machine.avg_speed_factor,
        maintenanceEveryHours: machine.maintenance_every_hours,
        maintenanceHoursUsed: machine.maintenance_hours_used,
        lastMaintenanceAt: machine.last_maintenance_at,
        compatibleMaterials: getMachineMaterials(machine.id),
        queue,
        queueEtaMinutes: getMachineQueueMinutes(machine),
      };
    });
  return machines;
}

function getMachineMaterials(machineId) {
  const row = db
    .prepare("SELECT compatible_materials FROM machine_materials WHERE machine_id = ?")
    .get(machineId);
  if (!row) return [];
  try {
    return JSON.parse(row.compatible_materials);
  } catch (error) {
    return [];
  }
}

function upsertMachineMaterials(machineId, materials = []) {
  const payload = JSON.stringify(materials);
  db.prepare(
    `
      INSERT INTO machine_materials (machine_id, compatible_materials)
      VALUES (?, ?)
      ON CONFLICT(machine_id) DO UPDATE SET compatible_materials = excluded.compatible_materials
    `
  ).run(machineId, payload);
}

function ensureMaterialTableExists() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS machine_materials (
      machine_id TEXT PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
      compatible_materials TEXT NOT NULL
    );
  `);
}

ensureMaterialTableExists();

function computeAlerts({ filaments, machines }) {
  const alerts = [];
  filaments.forEach((filament) => {
    if (filament.freeGrams <= filament.reorderPointGrams) {
      alerts.push({
        type: "stock",
        message: `${filament.sku}: stock bajo (${filament.freeGrams}g)`,
      });
    }
  });
  machines.forEach((machine) => {
    const ratio =
      machine.maintenanceEveryHours === 0
        ? 0
        : machine.maintenanceHoursUsed / machine.maintenanceEveryHours;
    if (ratio >= CONFIG.maintenanceThresholdPct) {
      alerts.push({
        type: "maintenance",
        message: `${machine.name}: mantenimiento pendiente`,
      });
    }
    const freeMinutes =
      24 * 60 - getMachineQueueMinutes(
        {
          ...machine,
          avg_speed_factor: machine.avgSpeedFactor,
        },
        24 * 60
      );
    if (freeMinutes < CONFIG.freeMinutesWarn24h && machine.status === "online") {
      alerts.push({
        type: "queue",
        message: `${machine.name}: cola saturada (< ${CONFIG.freeMinutesWarn24h} min libres)`,
      });
    }
  });
  return alerts;
}

function getSnapshot() {
  const filaments = getFilaments();
  const machines = getMachines();
  return {
    filaments,
    machines,
    alerts: computeAlerts({ filaments, machines }),
    config: CONFIG,
  };
}

function adjustFilament({ filamentId, delta }) {
  if (!delta) return getSnapshot();
  const lots = db
    .prepare(
      "SELECT id, grams, reserved FROM filament_lots WHERE filament_id = ? ORDER BY datetime(received_at) ASC"
    )
    .all(filamentId);
  if (lots.length === 0) {
    throw new Error("Filamento no encontrado");
  }
  const totals = getLotTotals(filamentId);
  const newTotal = totals.gramsAvailable + delta;
  if (newTotal < totals.gramsReserved) {
    throw new Error("No podés dejar el stock por debajo de las reservas");
  }
  const targetLot = lots[0];
  const nextValue = Math.max(targetLot.grams + delta, 0);
  db.prepare("UPDATE filament_lots SET grams = ? WHERE id = ?").run(nextValue, targetLot.id);
  return getSnapshot();
}

function updateReorderPoint({ filamentId, reorderPointGrams }) {
  db.prepare("UPDATE filaments SET reorder_point_grams = ? WHERE id = ?").run(
    Math.max(0, Number(reorderPointGrams || 0)),
    filamentId
  );
  return getSnapshot();
}

function completeMaintenance(machineId) {
  db.prepare(
    "UPDATE machines SET maintenance_hours_used = 0, last_maintenance_at = ? , status = 'online' WHERE id = ?"
  ).run(new Date().toISOString(), machineId);
  return getSnapshot();
}

function moveMachineJob(machineId, jobId, direction) {
  const job = db
    .prepare("SELECT position FROM machine_jobs WHERE machine_id = ? AND id = ?")
    .get(machineId, jobId);
  if (!job) return getSnapshot();
  const delta = direction === "up" ? -1 : 1;
  const target = job.position + delta;
  const sibling = db
    .prepare(
      "SELECT id, position FROM machine_jobs WHERE machine_id = ? AND position = ?"
    )
    .get(machineId, target);
  if (!sibling) return getSnapshot();
  const updatePosition = db.prepare(
    "UPDATE machine_jobs SET position = ? WHERE machine_id = ? AND id = ?"
  );
  const swapPositions = db.transaction(() => {
    updatePosition.run(target, machineId, jobId);
    updatePosition.run(job.position, machineId, sibling.id);
  });
  swapPositions();
  return getSnapshot();
}

function setMachineJobPosition(machineId, jobId, position) {
  const job = db
    .prepare("SELECT id, position FROM machine_jobs WHERE machine_id = ? AND id = ?")
    .get(machineId, jobId);
  if (!job) return getSnapshot();
  const numericPosition = Number(position);
  if (!Number.isFinite(numericPosition)) return getSnapshot();
  const queue = db
    .prepare(
      "SELECT id FROM machine_jobs WHERE machine_id = ? ORDER BY position ASC"
    )
    .all(machineId);
  const clamped = Math.max(0, Math.min(numericPosition, queue.length - 1));
  if (clamped === job.position) return getSnapshot();
  const updatePosition = db.prepare(
    "UPDATE machine_jobs SET position = ? WHERE machine_id = ? AND id = ?"
  );
  const reorder = db.transaction(() => {
    const ordered = queue.filter((item) => item.id !== jobId);
    ordered.splice(clamped, 0, { id: jobId });
    ordered.forEach((item, index) => updatePosition.run(index, machineId, item.id));
  });
  reorder();
  return getSnapshot();
}

function addMachine(machine) {
  const exists = db.prepare("SELECT 1 FROM machines WHERE id = ?").get(machine.id);
  if (exists) {
    throw new Error("Ya existe una máquina con ese ID");
  }
  db.prepare(
    `
    INSERT INTO machines (id, name, model, status, nozzle, avg_speed_factor, maintenance_every_hours, maintenance_hours_used, last_maintenance_at)
    VALUES (@id, @name, @model, @status, @nozzle, @avg_speed_factor, @maintenance_every_hours, @maintenance_hours_used, @last_maintenance_at)
  `
  ).run({
    id: machine.id,
    name: machine.name || machine.id,
    model: machine.model || "",
    status: machine.status || "online",
    nozzle: machine.nozzle || "0.4",
    avg_speed_factor: machine.avgSpeedFactor || machine.avg_speed_factor || 1,
    maintenance_every_hours: machine.maintenanceEveryHours || machine.maintenance_every_hours || 120,
    maintenance_hours_used: machine.maintenanceHoursUsed || machine.maintenance_hours_used || 0,
    last_maintenance_at: machine.lastMaintenanceAt || new Date().toISOString(),
  });

  upsertMachineMaterials(machine.id, machine.compatibleMaterials || ["PLA"]);
  return getSnapshot();
}

function updateMachine(machineId, updates) {
  const fields = [];
  const params = [];
  const map = {
    name: "name",
    model: "model",
    status: "status",
    nozzle: "nozzle",
    avgSpeedFactor: "avg_speed_factor",
    avg_speed_factor: "avg_speed_factor",
    maintenanceEveryHours: "maintenance_every_hours",
    maintenance_every_hours: "maintenance_every_hours",
    maintenanceHoursUsed: "maintenance_hours_used",
    maintenance_hours_used: "maintenance_hours_used",
    lastMaintenanceAt: "last_maintenance_at",
    last_maintenance_at: "last_maintenance_at",
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (key === "compatibleMaterials" || key === "compatible_materials") {
      upsertMachineMaterials(machineId, value);
      return;
    }
    const column = map[key];
    if (column) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  });

  if (fields.length > 0) {
    params.push(machineId);
    db.prepare(`UPDATE machines SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  return getSnapshot();
}

function removeMachine(machineId) {
  db.prepare("DELETE FROM machines WHERE id = ?").run(machineId);
  return getSnapshot();
}

function findFilamentBySku(sku) {
  const row = db.prepare("SELECT * FROM filaments WHERE sku = ?").get(sku);
  if (!row) {
    throw new Error(`No encontramos filamento para SKU ${sku}`);
  }
  return row;
}

function ensureReservationSpace(filamentId, gramsNeeded) {
  const totals = getLotTotals(filamentId);
  if (totals.freeGrams < gramsNeeded) {
    throw new Error("No hay suficiente stock libre para este SKU");
  }
}

function reserveFilament(orderId, items = []) {
  if (!orderId) throw new Error("Falta el ID de pedido");
  const reservationCheck = db
    .prepare("SELECT 1 FROM reservations WHERE order_id = ? LIMIT 1")
    .get(orderId);
  if (reservationCheck) {
    return db
      .prepare("SELECT * FROM reservations WHERE order_id = ?")
      .all(orderId);
  }

  const insertReservation = db.prepare(
    `
    INSERT INTO reservations (id, order_id, filament_id, lot_id, grams, created_at)
    VALUES (@id, @order_id, @filament_id, @lot_id, @grams, @created_at)
  `
  );
  const updateLot = db.prepare("UPDATE filament_lots SET reserved = reserved + ? WHERE id = ?");

  const process = db.transaction((records) => {
    records.forEach((item) => {
      const filament = findFilamentBySku(item.sku);
      const gramsPerUnit = item.gramsPerUnit || filament.grams_per_unit || 0;
      const gramsNeeded = gramsPerUnit * (item.qty || 1);
      ensureReservationSpace(filament.id, gramsNeeded);
      let remaining = gramsNeeded;
      const lots = db
        .prepare(
          "SELECT id, grams, reserved FROM filament_lots WHERE filament_id = ? ORDER BY datetime(received_at) ASC"
        )
        .all(filament.id);
      lots.forEach((lot) => {
        if (remaining <= 0) return;
        const available = lot.grams - lot.reserved;
        if (available <= 0) return;
        const take = Math.min(available, remaining);
        insertReservation.run({
          id: randomUUID(),
          order_id: orderId,
          filament_id: filament.id,
          lot_id: lot.id,
          grams: take,
          created_at: new Date().toISOString(),
        });
        updateLot.run(take, lot.id);
        remaining -= take;
      });
      if (remaining > 0) {
        throw new Error(`No pudimos reservar todo el material para ${filament.sku}`);
      }
    });
  });

  process(items);
  return db.prepare("SELECT * FROM reservations WHERE order_id = ?").all(orderId);
}

function consumeReservation(orderId) {
  const reservation = db.prepare("SELECT * FROM reservations WHERE order_id = ?").all(orderId);
  if (reservation.length === 0) return getSnapshot();
  const updateLot = db.prepare(
    "UPDATE filament_lots SET reserved = MAX(reserved - ?, 0), grams = MAX(grams - ?, 0) WHERE id = ?"
  );
  const deleteReservation = db.prepare("DELETE FROM reservations WHERE order_id = ?");
  const consume = db.transaction(() => {
    reservation.forEach((entry) => {
      updateLot.run(entry.grams, entry.grams, entry.lot_id);
    });
    deleteReservation.run(orderId);
  });
  consume();
  return getSnapshot();
}

function releaseReservation(orderId) {
  const reservation = db.prepare("SELECT * FROM reservations WHERE order_id = ?").all(orderId);
  if (reservation.length === 0) return getSnapshot();
  const updateLot = db.prepare(
    "UPDATE filament_lots SET reserved = MAX(reserved - ?, 0) WHERE id = ?"
  );
  const deleteReservation = db.prepare("DELETE FROM reservations WHERE order_id = ?");
  const release = db.transaction(() => {
    reservation.forEach((entry) => {
      updateLot.run(entry.grams, entry.lot_id);
    });
    deleteReservation.run(orderId);
  });
  release();
  return getSnapshot();
}

function calculateAtp(sku) {
  const filament = findFilamentBySku(sku);
  const gramsPerUnit = filament.grams_per_unit || Number(process.env.DEFAULT_GRAMS_PER_UNIT || 80);
  const filaments = db
    .prepare("SELECT id FROM filaments WHERE sku = ?")
    .all(sku)
    .map((row) => row.id);
  const materialGrams = filaments.reduce((acc, filamentId) => {
    const { freeGrams } = getLotTotals(filamentId);
    return acc + freeGrams;
  }, 0);
  const unitsByMaterials = Math.floor(materialGrams / gramsPerUnit);

  const machines = getMachines().filter((machine) =>
    machine.compatibleMaterials.includes(filament.material)
  );
  const freeMinutes24 = machines.reduce((acc, machine) => {
    if (machine.status !== "online") return acc;
    const queueMinutes = getMachineQueueMinutes(
      {
        ...machine,
        avg_speed_factor: machine.avgSpeedFactor,
      },
      24 * 60
    );
    return acc + Math.max(24 * 60 - queueMinutes, 0);
  }, 0);
  const freeMinutes72 = machines.reduce((acc, machine) => {
    if (machine.status !== "online") return acc;
    const queueMinutes = getMachineQueueMinutes(
      {
        ...machine,
        avg_speed_factor: machine.avgSpeedFactor,
      },
      72 * 60
    );
    return acc + Math.max(72 * 60 - queueMinutes, 0);
  }, 0);
  const machineUnits24 = Math.floor(freeMinutes24 / (filament.est_print_min_per_unit || CONFIG.defaultEstPrintMin));
  const machineUnits72 = Math.floor(freeMinutes72 / (filament.est_print_min_per_unit || CONFIG.defaultEstPrintMin));
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

module.exports = {
  getSnapshot,
  adjustFilament,
  updateReorderPoint,
  completeMaintenance,
  moveMachineJob,
  setMachineJobPosition,
  addMachine,
  updateMachine,
  removeMachine,
  reserveFilament,
  consumeReservation,
  releaseReservation,
  calculateAtp,
};
