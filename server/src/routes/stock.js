const express = require("express");
const {
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
} = require("../stockService");

const router = express.Router();

router.get("/", (_req, res, next) => {
  try {
    res.json(getSnapshot());
  } catch (error) {
    next(error);
  }
});

router.post("/filaments/:filamentId/adjust", (req, res, next) => {
  const { filamentId } = req.params;
  const { delta } = req.body || {};
  try {
    const snapshot = adjustFilament({ filamentId, delta: Number(delta) });
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.patch("/filaments/:filamentId", (req, res, next) => {
  const { filamentId } = req.params;
  const { reorderPointGrams } = req.body || {};
  try {
    const snapshot = updateReorderPoint({ filamentId, reorderPointGrams });
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/machines", (req, res, next) => {
  try {
    const snapshot = addMachine(req.body || {});
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.patch("/machines/:machineId", (req, res, next) => {
  const { machineId } = req.params;
  try {
    const snapshot = updateMachine(machineId, req.body || {});
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.delete("/machines/:machineId", (req, res, next) => {
  const { machineId } = req.params;
  try {
    const snapshot = removeMachine(machineId);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/machines/:machineId/maintenance", (req, res, next) => {
  const { machineId } = req.params;
  try {
    const snapshot = completeMaintenance(machineId);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/machines/:machineId/jobs/:jobId/move", (req, res, next) => {
  const { machineId, jobId } = req.params;
  const { direction } = req.body || {};
  try {
    const snapshot = moveMachineJob(machineId, jobId, direction);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/machines/:machineId/jobs/:jobId/position", (req, res, next) => {
  const { machineId, jobId } = req.params;
  const { position } = req.body || {};
  try {
    const snapshot = setMachineJobPosition(machineId, jobId, Number(position));
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/reservations", (req, res, next) => {
  const { orderId, items } = req.body || {};
  try {
    const reservation = reserveFilament(orderId, items || []);
    res.status(201).json({ reservation });
  } catch (error) {
    next(error);
  }
});

router.post("/reservations/:orderId/consume", (req, res, next) => {
  const { orderId } = req.params;
  try {
    const snapshot = consumeReservation(orderId);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.post("/reservations/:orderId/release", (req, res, next) => {
  const { orderId } = req.params;
  try {
    const snapshot = releaseReservation(orderId);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.get("/atp/:sku", (req, res, next) => {
  const { sku } = req.params;
  try {
    const payload = calculateAtp(sku);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
