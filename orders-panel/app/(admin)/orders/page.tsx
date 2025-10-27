"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FiltersBar } from "@/components/orders/FiltersBar";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { BulkActions } from "@/components/orders/BulkActions";
import {
  useOrdersInfiniteQuery,
  useOrderUpdatedSubscription,
  useUpdateOrderStatus,
  useUpdateTracking,
  useAddNote,
  useResendEmail
} from "@/lib/api/orders";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { toast } from "@/components/ui/use-toast";
import { downloadOrdersCsv } from "@/lib/csv/exportOrders";
import { downloadInvoicePdf } from "@/lib/invoice/downloadInvoice";
import { OrderSummary } from "@/lib/api/orders";
import { ORDER_STATUS_LABELS, OrderStatus, STATUS_ORDER, isTransitionAllowed } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const OrderDetailDrawer = dynamic(() => import("@/components/orders/OrderDetailDrawer").then((mod) => mod.OrderDetailDrawer), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-muted-foreground">Cargando detalle...</div>
});

interface FiltersApi {
  toggleAdvanced: () => void;
  openAdvanced: () => void;
}

interface BulkApi {
  openTransitions: () => void;
}

export default function AdminOrdersPage() {
  const query = useOrdersInfiniteQuery({ role: "admin", pageSize: 50 });
  useOrderUpdatedSubscription();
  const { detailDrawerId, openDetail, selectedIds } = useOrdersFilters((state) => ({
    detailDrawerId: state.detailDrawerId,
    openDetail: state.openDetail,
    selectedIds: state.selectedIds
  }));

  const updateStatus = useUpdateOrderStatus();
  const updateTracking = useUpdateTracking();
  const addNote = useAddNote();
  const resendEmail = useResendEmail();

  const orders = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const selectedOrders = useMemo(() => orders.filter((order) => selectedIds.includes(order.id)), [orders, selectedIds]);

  const [filtersApi, setFiltersApi] = useState<FiltersApi | null>(null);
  const [bulkApi, setBulkApi] = useState<BulkApi | null>(null);

  const [transitionOrder, setTransitionOrder] = useState<OrderSummary | null>(null);
  const [transitionStatus, setTransitionStatus] = useState<OrderStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState("");

  const [trackingOrder, setTrackingOrder] = useState<OrderSummary | null>(null);
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingEta, setTrackingEta] = useState("");

  const [noteOrder, setNoteOrder] = useState<OrderSummary | null>(null);
  const [noteContent, setNoteContent] = useState("");

  const availableRowTransitions = transitionOrder
    ? STATUS_ORDER.filter((status) => isTransitionAllowed(transitionOrder.status, status) && transitionOrder.status !== status)
    : [];

  const handleSubmitTransition = async () => {
    if (!transitionOrder || !transitionStatus) return;
    try {
      await updateStatus.mutateAsync({ id: transitionOrder.id, nextStatus: transitionStatus, note: transitionNote || undefined });
      toast({
        title: "Estado actualizado",
        description: `${transitionOrder.number} ahora está ${ORDER_STATUS_LABELS[transitionStatus]}`
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: error instanceof Error ? error.message : "Reintentá en unos minutos"
      });
    } finally {
      setTransitionOrder(null);
      setTransitionStatus(null);
      setTransitionNote("");
    }
  };

  const handleSubmitTracking = async () => {
    if (!trackingOrder) return;
    try {
      await updateTracking.mutateAsync({
        id: trackingOrder.id,
        carrier: trackingCarrier,
        trackingCode,
        eta: trackingEta || undefined
      });
      toast({ title: "Tracking actualizado", description: trackingCode });
    } catch (error) {
      toast({
        title: "No pudimos actualizar",
        description: error instanceof Error ? error.message : "Intentá nuevamente"
      });
    } finally {
      setTrackingOrder(null);
      setTrackingCarrier("");
      setTrackingCode("");
      setTrackingEta("");
    }
  };

  const handleSubmitNote = async () => {
    if (!noteOrder || !noteContent.trim()) return;
    try {
      await addNote.mutateAsync({ id: noteOrder.id, content: noteContent, internal: true });
      toast({ title: "Nota agregada", description: noteOrder.number });
    } catch (error) {
      toast({
        title: "No se pudo agregar la nota",
        description: error instanceof Error ? error.message : "Intentá nuevamente"
      });
    } finally {
      setNoteOrder(null);
      setNoteContent("");
    }
  };

  const handleResendEmail = async (order: OrderSummary) => {
    try {
      await resendEmail.mutateAsync({ id: order.id, template: "order_confirmation" });
      toast({ title: "Correo reenviado", description: order.number });
    } catch (error) {
      toast({
        title: "No pudimos enviar el correo",
        description: error instanceof Error ? error.message : "Intentá nuevamente"
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gestioná el flujo completo en una sola vista.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => bulkApi?.openTransitions()}>Cambiar estado</Button>
          <Button variant="outline" onClick={() => downloadOrdersCsv(orders, { filename: "pedidos.csv" })}>
            Exportar CSV
          </Button>
          <Button variant="ghost" onClick={() => filtersApi?.openAdvanced()}>
            Filtrar
          </Button>
        </div>
      </header>

      <FiltersBar role="admin" onExpose={(api) => setFiltersApi(api)} />

      <BulkActions selectedOrders={selectedOrders} visibleOrders={orders} onExpose={(api) => setBulkApi(api)} />

      <Suspense fallback={<div className="rounded-3xl border border-border bg-white p-6 text-sm text-muted-foreground">Cargando pedidos...</div>}>
        <OrdersTable
          role="admin"
          data={orders}
          isLoading={query.isLoading}
          isFetchingNextPage={query.isFetchingNextPage}
          hasNextPage={Boolean(query.hasNextPage)}
          onLoadMore={() => query.fetchNextPage()}
          onViewDetail={(order) => openDetail(order.id)}
          onTrackShipment={(order) => order.trackingUrl && window.open(order.trackingUrl, "_blank", "noopener")}
          onDownloadInvoice={async (order) => {
            try {
              if (order.invoiceUrl) {
                window.open(order.invoiceUrl, "_blank", "noopener,noreferrer");
                return;
              }
              await downloadInvoicePdf(order.id);
              toast({ title: "Factura generada", description: order.number });
            } catch (error) {
              toast({
                title: "No pudimos generar la factura",
                description: error instanceof Error ? error.message : "Intentá nuevamente"
              });
            }
          }}
          onResendEmail={handleResendEmail}
          onTransitionOrder={(order) => {
            setTransitionOrder(order);
            setTransitionStatus(null);
            setTransitionNote("");
          }}
          onEditTracking={(order) => {
            setTrackingOrder(order);
            setTrackingCarrier(order.shipping.carrier);
            setTrackingCode(order.shipping.trackingCode ?? "");
            setTrackingEta(order.shipping.eta ? order.shipping.eta.slice(0, 10) : "");
          }}
          onAddNote={(order) => {
            setNoteOrder(order);
            setNoteContent("");
          }}
        />
      </Suspense>

      <OrderDetailDrawer role="admin" orderId={detailDrawerId} open={Boolean(detailDrawerId)} onClose={() => openDetail(null)} />

      <Dialog open={transitionOrder !== null} onOpenChange={(open) => !open && setTransitionOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado</DialogTitle>
            <DialogDescription>Seleccioná el nuevo estado para {transitionOrder?.number}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {availableRowTransitions.map((status) => (
              <Button
                key={status}
                variant={transitionStatus === status ? "default" : "outline"}
                onClick={() => setTransitionStatus(status)}
              >
                {ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          <Textarea placeholder="Nota opcional" value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTransitionOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitTransition} disabled={!transitionStatus || updateStatus.isPending}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={trackingOrder !== null} onOpenChange={(open) => !open && setTrackingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tracking</DialogTitle>
            <DialogDescription>Actualizá los datos de envío para {trackingOrder?.number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Carrier</Label>
              <Input value={trackingCarrier} onChange={(event) => setTrackingCarrier(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Código</Label>
              <Input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ETA</Label>
              <Input type="date" value={trackingEta} onChange={(event) => setTrackingEta(event.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTrackingOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitTracking} disabled={updateTracking.isPending || !trackingCarrier || !trackingCode}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOrder !== null} onOpenChange={(open) => !open && setNoteOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nota interna</DialogTitle>
            <DialogDescription>La nota sólo será visible para el equipo.</DialogDescription>
          </DialogHeader>
          <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Detalle de la nota" rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitNote} disabled={addNote.isPending || noteContent.trim().length === 0}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
