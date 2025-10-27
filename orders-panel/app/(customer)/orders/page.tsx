"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FiltersBar } from "@/components/orders/FiltersBar";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { useOrdersInfiniteQuery, useOrderUpdatedSubscription, useCancelOrder } from "@/lib/api/orders";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { toast } from "@/components/ui/use-toast";
import type { OrderSummary } from "@/lib/api/orders";
import { downloadInvoicePdf } from "@/lib/invoice/downloadInvoice";

const OrderDetailDrawer = dynamic(() => import("@/components/orders/OrderDetailDrawer").then((mod) => mod.OrderDetailDrawer), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-muted-foreground">Cargando detalle...</div>
});

export default function CustomerOrdersPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useOrdersInfiniteQuery({ role: "customer", pageSize: 40 });
  useOrderUpdatedSubscription();
  const { detailDrawerId, openDetail } = useOrdersFilters((state) => ({ detailDrawerId: state.detailDrawerId, openDetail: state.openDetail }));
  const cancelOrder = useCancelOrder();

  const orders = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const handleTrack = (order: OrderSummary) => {
    if (order.trackingUrl) window.open(order.trackingUrl, "_blank", "noopener");
  };

  const handleInvoice = async (order: OrderSummary) => {
    try {
      if (order.invoiceUrl) {
        window.open(order.invoiceUrl, "_blank", "noopener,noreferrer");
        return;
      }
      await downloadInvoicePdf(order.id);
      toast({ title: "Factura generada", description: `Descargamos la factura de ${order.number}` });
    } catch (error) {
      toast({
        title: "No pudimos descargar la factura",
        description: error instanceof Error ? error.message : "Intentá nuevamente"
      });
    }
  };

  const handleRepeat = (order: OrderSummary) => {
    toast({ title: "Pedido agregado", description: `${order.number} se agregó al carrito` });
  };

  const handleCancel = async (order: OrderSummary) => {
    try {
      await cancelOrder.mutateAsync({ id: order.id });
      toast({ title: "Pedido cancelado", description: `${order.number} fue cancelado` });
    } catch (error) {
      toast({
        title: "No se pudo cancelar",
        description: error instanceof Error ? error.message : "Intentá nuevamente"
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis pedidos</h1>
          <p className="text-sm text-muted-foreground">Seguí el estado de tus compras y repetí tus favoritos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>Actualizar</Button>
          <Button variant="default" onClick={() => toast({ title: "Soporte", description: "Escribinos a hola@srbuj.com" })}>
            Necesito ayuda
          </Button>
        </div>
      </header>

      <FiltersBar role="customer" />

      <Suspense fallback={<div className="rounded-3xl border border-border bg-white p-6 text-sm text-muted-foreground">Cargando pedidos...</div>}>
        <OrdersTable
          role="customer"
          data={orders}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={Boolean(hasNextPage)}
          onLoadMore={() => fetchNextPage()}
          onViewDetail={(order) => openDetail(order.id)}
          onTrackShipment={handleTrack}
          onDownloadInvoice={handleInvoice}
          onRepeatOrder={handleRepeat}
          onCancelOrder={handleCancel}
        />
      </Suspense>

      <OrderDetailDrawer role="customer" orderId={detailDrawerId} open={Boolean(detailDrawerId)} onClose={() => openDetail(null)} />
    </div>
  );
}
