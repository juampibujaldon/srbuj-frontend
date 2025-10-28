import React, { useEffect, useMemo, useState } from "react";
import "./AdminStock.css";
import {
  fetchStockSnapshot,
  adjustFilamentGrams,
  updateReorderPoint,
  completeMaintenance,
  moveMachineJob,
  addMachine,
  updateMachine,
  removeMachine,
  setMachineJobPosition,
  createFilament,
} from "../api/stock";

const formatNumber = (value) => Number(value || 0).toLocaleString("es-AR");

export default function AdminStock() {
  const [snapshot, setSnapshot] = useState({ filaments: [], machines: [], alerts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", low: false });
  const [adjustDrafts, setAdjustDrafts] = useState({});
  const [reorderDrafts, setReorderDrafts] = useState({});
  const [filamentForm, setFilamentForm] = useState(() => ({
    id: "",
    sku: "",
    material: "",
    color: "",
    diameter: "1.75",
    gramsAvailable: "",
    gramsReserved: "",
    reorderPointGrams: "600",
    gramsPerUnit: "",
    estPrintMinPerUnit: "",
    notes: "",
  }));
  const [creatingFilament, setCreatingFilament] = useState(false);
  const [machineForm, setMachineForm] = useState({
    id: "",
    name: "",
    model: "",
    nozzle: "0.4",
    avgSpeedFactor: "1",
    maintenanceEveryHours: "120",
    compatibleMaterials: "PLA",
  });
  const [editingMachineId, setEditingMachineId] = useState("");
  const [machineEditForm, setMachineEditForm] = useState(null);
  const [jobPositions, setJobPositions] = useState({});

  const loadSnapshot = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStockSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err.message || "No pudimos cargar el stock");
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  useEffect(() => {
    const nextPositions = {};
    snapshot.machines.forEach((machine) => {
      (machine.queue || []).forEach((job, index) => {
        nextPositions[`${machine.id}-${job.id}`] = index + 1;
      });
    });
    setJobPositions(nextPositions);
  }, [snapshot.machines]);

  const resetMachineForm = () => {
    setMachineForm({
      id: "",
      name: "",
      model: "",
      nozzle: "0.4",
      avgSpeedFactor: "1",
      maintenanceEveryHours: "120",
      compatibleMaterials: "PLA",
    });
  };

  const resetFilamentForm = () => {
    setFilamentForm({
      id: "",
      sku: "",
      material: "",
      color: "",
      diameter: "1.75",
      gramsAvailable: "",
      gramsReserved: "",
      reorderPointGrams: "600",
      gramsPerUnit: "",
      estPrintMinPerUnit: "",
      notes: "",
    });
  };

  const handleFilamentInput = (field, value) => {
    setFilamentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateFilament = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const sku = filamentForm.sku.trim();
    const material = filamentForm.material.trim();
    const color = filamentForm.color.trim();
    const gramsAvailableValue = filamentForm.gramsAvailable;
    if (!sku || !material || !color) {
      setError("Completá SKU, material y color para agregar el filamento.");
      return;
    }
    if (gramsAvailableValue === "" || Number.isNaN(Number(gramsAvailableValue))) {
      setError("Indicá los gramos disponibles.");
      return;
    }
    setCreatingFilament(true);
    try {
      await createFilament({
        id: filamentForm.id.trim() || undefined,
        sku,
        material,
        color,
        diameter: filamentForm.diameter,
        gramsAvailable: Number(gramsAvailableValue),
        gramsReserved: filamentForm.gramsReserved === "" ? 0 : Number(filamentForm.gramsReserved),
        reorderPointGrams:
          filamentForm.reorderPointGrams === "" ? 0 : Number(filamentForm.reorderPointGrams),
        gramsPerUnit: filamentForm.gramsPerUnit === "" ? undefined : Number(filamentForm.gramsPerUnit),
        estPrintMinPerUnit:
          filamentForm.estPrintMinPerUnit === ""
            ? undefined
            : Number(filamentForm.estPrintMinPerUnit),
        notes: filamentForm.notes?.trim(),
      });
      resetFilamentForm();
      setMessage("Filamento agregado correctamente.");
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo agregar el filamento");
      setMessage("");
    } finally {
      setCreatingFilament(false);
    }
  };

  const totals = useMemo(() => {
    return snapshot.filaments.reduce(
      (acc, filament) => {
        acc.available += Number(filament.gramsAvailable || 0);
        acc.reserved += Number(filament.gramsReserved || 0);
        acc.free += Number(filament.freeGrams || 0);
        if (filament.freeGrams <= filament.reorderPointGrams) {
          acc.low += 1;
        }
        return acc;
      },
      { available: 0, reserved: 0, free: 0, low: 0 },
    );
  }, [snapshot.filaments]);

  const filteredFilaments = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const tokens = normalizedSearch ? normalizedSearch.split(/\s+/).filter(Boolean) : [];
    return snapshot.filaments.filter((filament) => {
      if (filters.low && filament.freeGrams > filament.reorderPointGrams) return false;
      if (tokens.length === 0) return true;
      const haystack = `${filament.sku} ${filament.material} ${filament.color}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [snapshot.filaments, filters.low, filters.search]);

  const handleAdjust = async (filamentId) => {
    const delta = Number(adjustDrafts[filamentId]);
    if (!delta) return;
    try {
      await adjustFilamentGrams({ filamentId, delta });
      setAdjustDrafts((prev) => ({ ...prev, [filamentId]: "" }));
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo ajustar el stock");
      setMessage("");
    }
  };

  const handleReorderPoint = async (filamentId) => {
    const nextValue = Number(reorderDrafts[filamentId]);
    if (Number.isNaN(nextValue)) return;
    try {
      await updateReorderPoint({ filamentId, reorderPointGrams: nextValue });
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el punto de reposición");
      setMessage("");
    }
  };

  const handleMaintenance = async (machineId) => {
    try {
      await completeMaintenance(machineId);
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo registrar el mantenimiento");
      setMessage("");
    }
  };

  const handleMoveJob = async (machineId, jobId, direction) => {
    try {
      await moveMachineJob(machineId, jobId, direction);
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo reordenar la cola");
      setMessage("");
    }
  };

  const handleSetPosition = async (machineId, jobId) => {
    const key = `${machineId}-${jobId}`;
    const target = Number(jobPositions[key]);
    if (!Number.isFinite(target) || target < 1) return;
    try {
      await setMachineJobPosition(machineId, jobId, target - 1);
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo actualizar la posición");
      setMessage("");
    }
  };

  const startEditingMachine = (machine) => {
    setEditingMachineId(machine.id);
    setMachineEditForm({
      name: machine.name || "",
      model: machine.model || "",
      nozzle: machine.nozzle || "",
      status: machine.status || "online",
      avgSpeedFactor: String(machine.avgSpeedFactor ?? ""),
      maintenanceEveryHours: String(machine.maintenanceEveryHours ?? ""),
      maintenanceHoursUsed: String(machine.maintenanceHoursUsed ?? ""),
      compatibleMaterials: (machine.compatibleMaterials || []).join(", "),
    });
  };

  const cancelEditingMachine = () => {
    setEditingMachineId("");
    setMachineEditForm(null);
  };

  const handleUpdateMachine = async () => {
    if (!editingMachineId || !machineEditForm) return;
    try {
      await updateMachine(editingMachineId, {
        ...machineEditForm,
        avgSpeedFactor: Number(machineEditForm.avgSpeedFactor),
        maintenanceEveryHours: Number(machineEditForm.maintenanceEveryHours),
        maintenanceHoursUsed: Number(machineEditForm.maintenanceHoursUsed),
        compatibleMaterials: machineEditForm.compatibleMaterials
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      cancelEditingMachine();
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo actualizar la máquina");
      setMessage("");
    }
  };

  const handleRemoveMachine = async (machineId) => {
    const machine = snapshot.machines.find((item) => item.id === machineId);
    const machineName = machine?.name || machineId;
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(`¿Seguro que querés eliminar la máquina "${machineName}"?`);
    if (!confirmed) return;
    try {
      await removeMachine(machineId);
      if (editingMachineId === machineId) {
        cancelEditingMachine();
      }
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo eliminar la máquina");
      setMessage("");
    }
  };

  const handleAddMachine = async () => {
    if (!machineForm.id.trim() || !machineForm.name.trim()) return;
    try {
      await addMachine({
        id: machineForm.id.trim(),
        name: machineForm.name.trim(),
        model: machineForm.model.trim(),
        nozzle: machineForm.nozzle.trim(),
        avgSpeedFactor: Number(machineForm.avgSpeedFactor) || 1,
        maintenanceEveryHours: Number(machineForm.maintenanceEveryHours) || 120,
        compatibleMaterials: machineForm.compatibleMaterials
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      resetMachineForm();
      await loadSnapshot();
    } catch (err) {
      setError(err.message || "No se pudo agregar la máquina");
      setMessage("");
    }
  };

  return (
    <div className="stock-container">
      <header className="stock-header">
        <h1>Gestión de stock</h1>
        <p className="stock-subtitle">Controlá en un vistazo el material disponible y las impresoras.</p>
      </header>

      {error && (
        <div className="stock-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="stock-feedback" role="status">
          {message}
        </div>
      )}

      {snapshot.alerts?.length > 0 && (
        <div className="stock-alerts" aria-live="polite">
          {snapshot.alerts.map((alert, index) => (
            <div key={`${alert.type}-${index}`} className={`stock-alert stock-alert--${alert.type}`}>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="stock-card">Cargando datos...</div>
      ) : (
        <>
          <section className="stock-summary">
            <div className="stock-summary__card">
              <span className="stock-summary__label">Total disponible</span>
              <strong>{formatNumber(totals.available)} g</strong>
            </div>
            <div className="stock-summary__card">
              <span className="stock-summary__label">Reservado</span>
              <strong>{formatNumber(totals.reserved)} g</strong>
            </div>
            <div className="stock-summary__card">
              <span className="stock-summary__label">Libre</span>
              <strong>{formatNumber(totals.free)} g</strong>
            </div>
            <div className="stock-summary__card">
              <span className="stock-summary__label">Alertas de stock</span>
              <strong>{totals.low}</strong>
            </div>
          </section>

          <section className="stock-card stock-card--form">
            <header className="stock-section-header">
              <div>
                <h2>Agregar filamento</h2>
                <p className="stock-section-subtitle">
                  Registrá manualmente un nuevo material y su stock inicial.
                </p>
              </div>
            </header>
            <form className="stock-form" onSubmit={handleCreateFilament}>
              <div className="stock-form__grid">
                <label className="stock-form__field">
                  <span>ID interno</span>
                  <input
                    type="text"
                    value={filamentForm.id}
                    onChange={(event) => handleFilamentInput("id", event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <label className="stock-form__field">
                  <span>SKU *</span>
                  <input
                    type="text"
                    value={filamentForm.sku}
                    onChange={(event) => handleFilamentInput("sku", event.target.value)}
                    placeholder="PLA-NEGRO-175"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Material *</span>
                  <input
                    type="text"
                    value={filamentForm.material}
                    onChange={(event) => handleFilamentInput("material", event.target.value)}
                    placeholder="PLA, PETG..."
                  />
                </label>
                <label className="stock-form__field">
                  <span>Color *</span>
                  <input
                    type="text"
                    value={filamentForm.color}
                    onChange={(event) => handleFilamentInput("color", event.target.value)}
                    placeholder="Negro mate"
                  />
                </label>
              </div>

              <div className="stock-form__grid">
                <label className="stock-form__field">
                  <span>Diámetro (mm)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={filamentForm.diameter}
                    onChange={(event) => handleFilamentInput("diameter", event.target.value)}
                    placeholder="1.75"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Disponible (g) *</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={filamentForm.gramsAvailable}
                    onChange={(event) => handleFilamentInput("gramsAvailable", event.target.value)}
                    placeholder="1500"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Reservado (g)</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={filamentForm.gramsReserved}
                    onChange={(event) => handleFilamentInput("gramsReserved", event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Reorden (g)</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={filamentForm.reorderPointGrams}
                    onChange={(event) =>
                      handleFilamentInput("reorderPointGrams", event.target.value)
                    }
                    placeholder="600"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Gramos por unidad</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={filamentForm.gramsPerUnit}
                    onChange={(event) => handleFilamentInput("gramsPerUnit", event.target.value)}
                    placeholder="80"
                  />
                </label>
                <label className="stock-form__field">
                  <span>Min. por pieza</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={filamentForm.estPrintMinPerUnit}
                    onChange={(event) =>
                      handleFilamentInput("estPrintMinPerUnit", event.target.value)
                    }
                    placeholder="30"
                  />
                </label>
              </div>

              <label className="stock-form__field stock-form__field--full">
                <span>Notas</span>
                <textarea
                  rows="2"
                  value={filamentForm.notes}
                  onChange={(event) => handleFilamentInput("notes", event.target.value)}
                  placeholder="Observaciones, lote o proveedor"
                />
              </label>

              <div className="stock-form__actions">
                <button type="submit" disabled={creatingFilament}>
                  {creatingFilament ? "Guardando..." : "Agregar filamento"}
                </button>
                <button type="button" onClick={resetFilamentForm} disabled={creatingFilament}>
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          <section className="stock-card">
            <div className="stock-filters">
              <input
                type="search"
                placeholder="Buscar por SKU, material o color"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
              />
              <label className="stock-low-toggle">
                <input
                  type="checkbox"
                  checked={filters.low}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, low: event.target.checked }))
                  }
                />
                Sólo bajo stock
              </label>
            </div>

            <div className="stock-table-wrapper">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Material</th>
                    <th>Color</th>
                    <th>Disponible</th>
                    <th>Reservado</th>
                    <th>Libre</th>
                    <th>Reorden (g)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilaments.map((filament) => (
                    <tr key={filament.id} className={filament.freeGrams <= filament.reorderPointGrams ? "is-low" : ""}>
                      <td>{filament.sku}</td>
                      <td>{filament.material}</td>
                      <td>{filament.color}</td>
                      <td>{formatNumber(filament.gramsAvailable)}</td>
                      <td>{formatNumber(filament.gramsReserved)}</td>
                      <td>{formatNumber(filament.freeGrams)}</td>
                      <td>
                        <div className="stock-inline-field">
                          <input
                            type="number"
                            value={reorderDrafts[filament.id] ?? filament.reorderPointGrams}
                            onChange={(event) =>
                              setReorderDrafts((prev) => ({
                                ...prev,
                                [filament.id]: event.target.value,
                              }))
                            }
                          />
                          <button type="button" onClick={() => handleReorderPoint(filament.id)}>
                            Guardar
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="stock-inline-field">
                          <input
                            type="number"
                            placeholder="Δ g"
                            value={adjustDrafts[filament.id] ?? ""}
                            onChange={(event) =>
                              setAdjustDrafts((prev) => ({
                                ...prev,
                                [filament.id]: event.target.value,
                              }))
                            }
                          />
                          <button type="button" onClick={() => handleAdjust(filament.id)}>
                            Aplicar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFilaments.length === 0 && (
                    <tr>
                      <td colSpan="8" className="stock-table__empty">
                        No encontramos filamentos con ese criterio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stock-secondary">
            <div className="stock-card">
              <header className="stock-section-header">
                <div>
                  <h2>Máquinas</h2>
                  <p className="stock-section-subtitle">
                    Revisá el estado, editá o reordená las impresiones.
                  </p>
                </div>
              </header>
              <ul className="machines-list">
                {snapshot.machines.map((machine) => (
                  <li key={machine.id} className="machines-list__item">
                    <div className="machines-list__head">
                      <div>
                        <strong>{machine.name}</strong>
                        <span className="machines-list__meta">Nozzle {machine.nozzle} · {machine.model}</span>
                      </div>
                      <span className={`machine-status machine-status--${machine.status}`}>
                        {machine.status}
                      </span>
                    </div>
                    <div className="machines-list__body">
                      <div>
                        <span>Horas desde mantenimiento:</span>
                        <strong>
                          {machine.maintenanceHoursUsed} / {machine.maintenanceEveryHours}
                        </strong>
                      </div>
                      <button type="button" onClick={() => handleMaintenance(machine.id)}>
                        Registrar mantenimiento
                      </button>
                      <button type="button" onClick={() => startEditingMachine(machine)}>
                        Editar
                      </button>
                    </div>
                    {editingMachineId === machine.id && machineEditForm && (
                      <div className="machines-edit">
                        <div className="machines-edit__grid">
                          <label>
                            <span>Nombre</span>
                            <input
                              type="text"
                              value={machineEditForm.name}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({ ...prev, name: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            <span>Modelo</span>
                            <input
                              type="text"
                              value={machineEditForm.model}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({ ...prev, model: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            <span>Nozzle</span>
                            <input
                              type="text"
                              value={machineEditForm.nozzle}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({ ...prev, nozzle: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            <span>Estado</span>
                            <select
                              value={machineEditForm.status}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({ ...prev, status: event.target.value }))
                              }
                            >
                              <option value="online">Online</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="offline">Offline</option>
                            </select>
                          </label>
                          <label>
                            <span>Velocidad</span>
                            <input
                              type="number"
                              step="0.1"
                              value={machineEditForm.avgSpeedFactor}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({
                                  ...prev,
                                  avgSpeedFactor: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Horas entre mantenimiento</span>
                            <input
                              type="number"
                              value={machineEditForm.maintenanceEveryHours}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({
                                  ...prev,
                                  maintenanceEveryHours: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Horas usadas</span>
                            <input
                              type="number"
                              value={machineEditForm.maintenanceHoursUsed}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({
                                  ...prev,
                                  maintenanceHoursUsed: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="machines-edit__span">
                            <span>Materiales compatibles</span>
                            <input
                              type="text"
                              value={machineEditForm.compatibleMaterials}
                              onChange={(event) =>
                                setMachineEditForm((prev) => ({
                                  ...prev,
                                  compatibleMaterials: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="machines-edit__actions">
                          <button type="button" onClick={handleUpdateMachine}>
                            Guardar cambios
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => handleRemoveMachine(machine.id)}
                          >
                            Eliminar máquina
                          </button>
                          <button type="button" onClick={cancelEditingMachine}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="machines-queue">
                      <span className="machines-queue__title">Cola de trabajos</span>
                      <ul>
                        {(machine.queue || []).map((job) => (
                          <li key={job.id}>
                            <div className="machines-queue__job">
                              <div>
                                {job.sku} × {job.qty}
                                <span>{job.remainingMinutes || job.estMinutesPerUnit} min</span>
                              </div>
                              <div className="queue-actions">
                                <button
                                  type="button"
                                  onClick={() => handleMoveJob(machine.id, job.id, "up")}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveJob(machine.id, job.id, "down")}
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                            <div className="machines-queue__order">
                              <label htmlFor={`${machine.id}-${job.id}-position`}>
                                Posición:
                              </label>
                              <div className="machines-queue__order-controls">
                                <input
                                  id={`${machine.id}-${job.id}-position`}
                                  type="number"
                                  min="1"
                                  max={(machine.queue || []).length}
                                  value={jobPositions[`${machine.id}-${job.id}`] ?? ""}
                                  onChange={(event) =>
                                    setJobPositions((prev) => ({
                                      ...prev,
                                      [`${machine.id}-${job.id}`]: event.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSetPosition(machine.id, job.id)}
                                >
                                  Asignar
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                        {(!machine.queue || machine.queue.length === 0) && (
                          <li className="machines-queue__empty">Sin trabajos pendientes.</li>
                        )}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="stock-card">
              <header className="stock-section-header">
                <div>
                  <h2>Agregar máquina</h2>
                  <p className="stock-section-subtitle">
                    Cargá nuevas impresoras para seguir el stock y la capacidad.
                  </p>
                </div>
              </header>
              <div className="machines-new">
                <input
                  type="text"
                  placeholder="ID único"
                  value={machineForm.id}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, id: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Nombre"
                  value={machineForm.name}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={machineForm.model}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, model: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Nozzle"
                  value={machineForm.nozzle}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, nozzle: event.target.value }))
                  }
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Velocidad relativa"
                  value={machineForm.avgSpeedFactor}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, avgSpeedFactor: event.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="Horas entre mantenimiento"
                  value={machineForm.maintenanceEveryHours}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, maintenanceEveryHours: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Materiales (CSV)"
                  value={machineForm.compatibleMaterials}
                  onChange={(event) =>
                    setMachineForm((prev) => ({ ...prev, compatibleMaterials: event.target.value }))
                  }
                />
                <div className="machines-new__actions">
                  <button type="button" onClick={handleAddMachine}>
                    Agregar máquina
                  </button>
                  <button type="button" onClick={resetMachineForm}>
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
