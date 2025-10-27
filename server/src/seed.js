const { db } = require("./db");

const nowIso = () => new Date().toISOString();

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS filaments (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      material TEXT NOT NULL,
      color TEXT NOT NULL,
      diameter REAL NOT NULL,
      grams_per_unit INTEGER NOT NULL,
      est_print_min_per_unit INTEGER NOT NULL,
      reorder_point_grams INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS filament_lots (
      id TEXT PRIMARY KEY,
      filament_id TEXT NOT NULL REFERENCES filaments(id) ON DELETE CASCADE,
      grams INTEGER NOT NULL,
      reserved INTEGER NOT NULL DEFAULT 0,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'online',
      nozzle TEXT NOT NULL,
      avg_speed_factor REAL NOT NULL DEFAULT 1,
      maintenance_every_hours INTEGER NOT NULL DEFAULT 120,
      maintenance_hours_used INTEGER NOT NULL DEFAULT 0,
      last_maintenance_at TEXT
    );

    CREATE TABLE IF NOT EXISTS machine_jobs (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      est_minutes_per_unit INTEGER NOT NULL DEFAULT 30,
      remaining_minutes INTEGER,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machine_materials (
      machine_id TEXT PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
      compatible_materials TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      filament_id TEXT NOT NULL,
      lot_id TEXT NOT NULL,
      grams INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(order_id, lot_id)
    );
  `);
}

function seedDefaults() {
  const filamentCount = db.prepare("SELECT COUNT(*) as count FROM filaments").get().count;
  if (filamentCount === 0) {
    const insertFilament = db.prepare(`
      INSERT INTO filaments (id, sku, material, color, diameter, grams_per_unit, est_print_min_per_unit, reorder_point_grams)
      VALUES (@id, @sku, @material, @color, @diameter, @grams_per_unit, @est_print_min_per_unit, @reorder_point_grams)
    `);
    const insertLot = db.prepare(`
      INSERT INTO filament_lots (id, filament_id, grams, reserved, received_at)
      VALUES (@id, @filament_id, @grams, @reserved, @received_at)
    `);

    const defaults = [
      {
        filament: {
          id: "pla-verde-175",
          sku: "PLA-VERDE-175",
          material: "PLA",
          color: "Verde",
          diameter: 1.75,
          grams_per_unit: 80,
          est_print_min_per_unit: 35,
          reorder_point_grams: 600,
        },
        lots: [
          { id: "lot-pla-verde-1", grams: 1200, reserved: 200, received_at: "2024-06-01T10:00:00Z" },
          { id: "lot-pla-verde-2", grams: 800, reserved: 0, received_at: "2024-08-05T10:00:00Z" },
        ],
      },
      {
        filament: {
          id: "pla-negro-175",
          sku: "PLA-NEGRO-175",
          material: "PLA",
          color: "Negro",
          diameter: 1.75,
          grams_per_unit: 90,
          est_print_min_per_unit: 40,
          reorder_point_grams: 800,
        },
        lots: [
          { id: "lot-pla-negro-1", grams: 900, reserved: 150, received_at: "2024-05-20T10:00:00Z" },
          { id: "lot-pla-negro-2", grams: 600, reserved: 0, received_at: "2024-09-10T10:00:00Z" },
        ],
      },
      {
        filament: {
          id: "petg-rojo-175",
          sku: "PETG-ROJO-175",
          material: "PETG",
          color: "Rojo",
          diameter: 1.75,
          grams_per_unit: 110,
          est_print_min_per_unit: 45,
          reorder_point_grams: 500,
        },
        lots: [
          { id: "lot-petg-rojo-1", grams: 500, reserved: 0, received_at: "2024-07-15T10:00:00Z" },
        ],
      },
    ];

    const insertMany = db.transaction((records) => {
      records.forEach(({ filament, lots }) => {
        insertFilament.run(filament);
        lots.forEach((lot) => insertLot.run({ ...lot, filament_id: filament.id }));
      });
    });

    insertMany(defaults);
  }

  const machineCount = db.prepare("SELECT COUNT(*) as count FROM machines").get().count;
  if (machineCount === 0) {
    const insertMachine = db.prepare(`
      INSERT INTO machines (id, name, model, status, nozzle, avg_speed_factor, maintenance_every_hours, maintenance_hours_used, last_maintenance_at)
      VALUES (@id, @name, @model, @status, @nozzle, @avg_speed_factor, @maintenance_every_hours, @maintenance_hours_used, @last_maintenance_at)
    `);
    const insertMaterials = db.prepare(`
      INSERT INTO machine_materials (machine_id, compatible_materials)
      VALUES (?, ?)
    `);
    const insertJob = db.prepare(`
      INSERT INTO machine_jobs (id, machine_id, sku, qty, est_minutes_per_unit, remaining_minutes, position)
      VALUES (@id, @machine_id, @sku, @qty, @est_minutes_per_unit, @remaining_minutes, @position)
    `);

    const defaults = [
      {
        machine: {
          id: "bambu-a1-combo",
          name: "Bambu Lab A1 Combo",
          model: "A1 Combo",
          status: "online",
          nozzle: "0.4",
          avg_speed_factor: 1.15,
          maintenance_every_hours: 150,
          maintenance_hours_used: 110,
          last_maintenance_at: "2024-09-10T09:00:00Z",
          compatibleMaterials: ["PLA", "PETG"],
        },
        jobs: [
          { id: "job-101", sku: "PLA-VERDE-175", qty: 2, est_minutes_per_unit: 32, remaining_minutes: 40 },
          { id: "job-102", sku: "PLA-NEGRO-175", qty: 1, est_minutes_per_unit: 50, remaining_minutes: 50 },
        ],
      },
      {
        machine: {
          id: "ender-pro",
          name: "Ender Pro",
          model: "Ender 3",
          status: "online",
          nozzle: "0.4",
          avg_speed_factor: 0.95,
          maintenance_every_hours: 120,
          maintenance_hours_used: 40,
          last_maintenance_at: "2024-08-28T10:00:00Z",
          compatibleMaterials: ["PLA"],
        },
        jobs: [
          { id: "job-201", sku: "PLA-NEGRO-175", qty: 3, est_minutes_per_unit: 45, remaining_minutes: 90 },
        ],
      },
      {
        machine: {
          id: "ender-flex",
          name: "Ender Flex",
          model: "Ender 5",
          status: "maintenance",
          nozzle: "0.6",
          avg_speed_factor: 0.9,
          maintenance_every_hours: 100,
          maintenance_hours_used: 98,
          last_maintenance_at: "2024-07-20T10:00:00Z",
          compatibleMaterials: ["PETG", "TPU"],
        },
        jobs: [],
      },
    ];

    const insertMany = db.transaction((records) => {
      records.forEach(({ machine, jobs }) => {
        insertMachine.run(machine);
        insertMaterials.run(machine.id, JSON.stringify(machine.compatibleMaterials || ["PLA"]));
        jobs.forEach((job, index) =>
          insertJob.run({
            ...job,
            machine_id: machine.id,
            position: index,
          })
        );
      });
    });

    insertMany(defaults);
  }
}

runMigrations();
seedDefaults();

console.log(`[stock] Migraciones aplicadas (${nowIso()})`);
