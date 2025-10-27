import { formatCurrency } from "@/lib/i18n";
import { StlProduct } from "@/lib/api/stlSales";

export function buildStlSalesCsv(products: StlProduct[]) {
  const header = ["Producto", "SKU", "Unidades", "Ingresos", "Última venta", "Conversión", "Rating"];
  const rows = products.map((product) =>
    [
      product.name,
      product.sku,
      product.unitsSold,
      formatCurrency(product.revenueCents),
      product.lastSaleAt,
      `${(product.conversionRate * 100).toFixed(1)}%`,
      product.rating.toFixed(1)
    ].join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadStlSalesCsv(products: StlProduct[], filename = "ventas-stl.csv") {
  if (typeof window === "undefined") return;
  const csv = buildStlSalesCsv(products);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
