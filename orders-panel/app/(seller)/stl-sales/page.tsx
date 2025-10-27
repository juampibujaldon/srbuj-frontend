"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SellerPeriodSelector } from "@/components/seller/SellerPeriodSelector";
import { SellerStats } from "@/components/seller/SellerStats";
import { SellerProductsTable } from "@/components/seller/SellerProductsTable";
import { SellerHistoryList } from "@/components/seller/SellerHistoryList";
import { useStlDashboard } from "@/lib/api/stlSales";
import type { DashboardPeriod } from "@/lib/api/stlSales";
import { downloadStlSalesCsv } from "@/lib/csv/exportStlSales";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

export default function SellerStlSalesPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const { data, isLoading, refetch, isFetching } = useStlDashboard(period);

  const summary = data?.summary;
  const products = data?.products ?? [];
  const history = data?.history ?? [];

  const topPerformer = useMemo(() => products[0], [products]);

  const handleExport = () => {
    if (!products.length) {
      toast({ title: "Sin datos", description: "No hay ventas registradas en el período seleccionado." });
      return;
    }
    downloadStlSalesCsv(products);
    toast({ title: "Descarga lista", description: "Exportamos tus ventas STL." });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dashboard de creador</p>
          <h1 className="text-2xl font-semibold">Mis STL vendidos</h1>
          <p className="text-sm text-muted-foreground">Seguimiento de descargas, ingresos y desempeño por modelo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SellerPeriodSelector value={period} onChange={setPeriod} />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button variant="default" onClick={handleExport}>Exportar CSV</Button>
          <Button variant="ghost" onClick={() => toast({ title: "Tip", description: "Usá imágenes reales impresas para subir tu conversión." })}>
            Tips de venta
          </Button>
        </div>
      </header>

      {isLoading || !summary ? (
        <Skeleton className="h-40 w-full rounded-3xl" />
      ) : (
        <SellerStats summary={summary} />
      )}

      {isLoading && !products.length ? (
        <Skeleton className="h-[420px] w-full rounded-3xl" />
      ) : (
        <section className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Rendimiento por STL</h2>
              {topPerformer && (
                <span className="text-xs text-muted-foreground">Top: {topPerformer.name}</span>
              )}
            </div>
            <SellerProductsTable products={products} />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <SellerHistoryList points={history} />
            {topPerformer && (
              <div className="rounded-3xl border border-border bg-white/90 p-4">
                <p className="text-xs uppercase text-muted-foreground">Consejo rápido</p>
                <p className="mt-2 text-sm">
                  {topPerformer.name} convierte {(topPerformer.conversionRate * 100).toFixed(1)}% de visitas. Replicá su galería y pricing para otros modelos.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
