"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { downloadOrdersCsv } from "@/lib/csv/exportOrders";
import { OrderSummary, useUpdateOrderStatus } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS, OrderStatus, STATUS_ORDER, isTransitionAllowed } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BulkActionsProps {
  selectedOrders: OrderSummary[];
  visibleOrders: OrderSummary[];
  onExpose?: (api: { openTransitions: () => void }) => void;
}

export function BulkActions({ selectedOrders, visibleOrders, onExpose }: BulkActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const { clearSelection } = useOrdersFilters((state) => ({ clearSelection: state.clearSelection }));

  const availableTransitions = useMemo(() => {
    if (selectedOrders.length === 0) return [];
    return STATUS_ORDER.filter((status) =>
      selectedOrders.every((order) => order.status !== status && isTransitionAllowed(order.status, status))
    );
  }, [selectedOrders]);

  const handleOpenConfirm = (status: OrderStatus) => {
    setTargetStatus(status);
    setConfirmOpen(true);
    setMenuOpen(false);
  };

  const handleConfirm = async () => {
    if (!targetStatus) return;
    try {
      await Promise.all(
        selectedOrders.map((order) => updateStatus.mutateAsync({ id: order.id, nextStatus: targetStatus, note: note || undefined }))
      );
      toast({
        title: "Estados actualizados",
        description: `Actualizamos ${selectedOrders.length} pedidos a ${ORDER_STATUS_LABELS[targetStatus]}`
      });
    } catch (error) {
      toast({
        title: "No pudimos actualizar",
        description: error instanceof Error ? error.message : "Reintentá en unos minutos"
      });
    } finally {
      setConfirmOpen(false);
      setNote("");
      clearSelection();
    }
  };

  useEffect(() => {
    if (!onExpose) return;
    onExpose({
      openTransitions: () => {
        if (selectedOrders.length === 0 || availableTransitions.length === 0) {
          toast({
            title: "Seleccioná pedidos",
            description: "Elegí al menos un pedido con una transición válida."
          });
          return;
        }
        setMenuOpen(true);
      }
    });
  }, [onExpose, selectedOrders.length, availableTransitions.length]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-white/60 p-4">
      <div className="text-sm text-muted-foreground">
        {selectedOrders.length > 0 ? `${selectedOrders.length} pedidos seleccionados` : "Seleccioná filas para acciones masivas"}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={visibleOrders.length === 0}
          onClick={() => downloadOrdersCsv(visibleOrders, { filename: "pedidos-visibles.csv" })}
        >
          <Upload className="mr-2 h-4 w-4" /> Exportar visibles
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedOrders.length === 0}
          onClick={() => downloadOrdersCsv(selectedOrders, { filename: "pedidos-seleccionados.csv" })}
        >
          <Upload className="mr-2 h-4 w-4" /> Exportar selección
        </Button>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={selectedOrders.length === 0 || availableTransitions.length === 0}>
              Cambiar estado
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableTransitions.length === 0 ? (
              <DropdownMenuItem disabled>Sin cambios válidos</DropdownMenuItem>
            ) : (
              availableTransitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleOpenConfirm(status);
                  }}
                >
                  {ORDER_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
            <DialogDescription>
              Vamos a mover {selectedOrders.length} pedidos a {targetStatus ? ORDER_STATUS_LABELS[targetStatus] : ""}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Nota opcional"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
