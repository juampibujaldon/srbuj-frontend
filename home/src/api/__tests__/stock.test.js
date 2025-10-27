import {
  fetchStockSnapshot,
  adjustFilamentGrams,
  updateReorderPoint,
  addMachine,
  updateMachine,
  removeMachine,
  completeMaintenance,
  moveMachineJob,
  setMachineJobPosition,
  reserveFilamentForOrder,
  consumeReservation,
  releaseReservation,
  calculateAtpForSku,
} from "../stock";

jest.mock("../client", () => ({
  apiJson: jest.fn(() => Promise.resolve({ ok: true })),
}));

const { apiJson } = require("../client");

beforeEach(() => {
  apiJson.mockClear();
});

describe("stock API client", () => {
  it("fetches the stock snapshot", async () => {
    apiJson.mockResolvedValueOnce({ filaments: [] });
    await fetchStockSnapshot();
    expect(apiJson).toHaveBeenCalledWith("/api/stock", expect.objectContaining({ method: "GET" }));
  });

  it("ajusta gramos de filamento", async () => {
    await adjustFilamentGrams({ filamentId: "pla", delta: -50 });
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/filaments/pla/adjust",
      expect.objectContaining({
        method: "POST",
        json: { delta: -50 },
      }),
    );
  });

  it("actualiza punto de reorden", async () => {
    await updateReorderPoint({ filamentId: "pla", reorderPointGrams: 500 });
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/filaments/pla",
      expect.objectContaining({
        method: "PATCH",
        json: { reorderPointGrams: 500 },
      }),
    );
  });

  it("crea una nueva máquina", async () => {
    const payload = { id: "new", name: "Test" };
    await addMachine(payload);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines",
      expect.objectContaining({
        method: "POST",
        json: payload,
      }),
    );
  });

  it("actualiza una máquina", async () => {
    const payload = { name: "Actualizada" };
    await updateMachine("machine-1", payload);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines/machine-1",
      expect.objectContaining({
        method: "PATCH",
        json: payload,
      }),
    );
  });

  it("elimina una máquina", async () => {
    await removeMachine("machine-1");
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines/machine-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("registra mantenimiento", async () => {
    await completeMaintenance("machine-1");
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines/machine-1/maintenance",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("mueve un trabajo en la cola", async () => {
    await moveMachineJob("machine-1", "job-2", "up");
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines/machine-1/jobs/job-2/move",
      expect.objectContaining({
        method: "POST",
        json: { direction: "up" },
      }),
    );
  });

  it("asigna posición en la cola", async () => {
    await setMachineJobPosition("machine-1", "job-3", 2);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/machines/machine-1/jobs/job-3/position",
      expect.objectContaining({
        method: "POST",
        json: { position: 2 },
      }),
    );
  });

  it("crea reservas de filamento", async () => {
    apiJson.mockResolvedValueOnce({ reservation: [{ id: "res-1" }] });
    const reservation = await reserveFilamentForOrder("order-1", [{ sku: "PLA", qty: 1 }]);
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/reservations",
      expect.objectContaining({
        method: "POST",
        json: { orderId: "order-1", items: [{ sku: "PLA", qty: 1 }] },
      }),
    );
    expect(reservation).toEqual([{ id: "res-1" }]);
  });

  it("consume una reserva", async () => {
    await consumeReservation("order-1");
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/reservations/order-1/consume",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("libera una reserva", async () => {
    await releaseReservation("order-1");
    expect(apiJson).toHaveBeenCalledWith(
      "/api/stock/reservations/order-1/release",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calcula ATP para un sku", async () => {
    await calculateAtpForSku("PLA-123");
    expect(apiJson).toHaveBeenCalledWith("/api/stock/atp/PLA-123", expect.objectContaining({ method: "GET" }));
  });
});
