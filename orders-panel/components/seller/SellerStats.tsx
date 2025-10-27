import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { StlSummary } from "@/lib/api/stlSales";

const statsConfig = [
  {
    key: "totalRevenueCents" as const,
    label: "Ingresos",
    description: "Ingresos totales del período"
  },
  {
    key: "unitsSold" as const,
    label: "Unidades",
    description: "STL vendidos"
  },
  {
    key: "activeListings" as const,
    label: "Publicaciones",
    description: "Modelos activos"
  },
  {
    key: "conversionRate" as const,
    label: "Conversión",
    description: "Visitas a compras"
  }
];

export function SellerStats({ summary }: { summary: StlSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statsConfig.map((stat) => {
        const value = summary[stat.key];
        const display = stat.key === "totalRevenueCents"
          ? formatCurrency(value)
          : stat.key === "conversionRate"
            ? `${(value * 100).toFixed(1)}%`
            : value.toLocaleString("es-AR");

        return (
          <Card key={stat.key} className="bg-white/90">
            <CardHeader>
              <CardDescription>{stat.description}</CardDescription>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-brand-contrast">{display}</p>
              {stat.key === "conversionRate" && (
                <p className="mt-2 text-xs text-muted-foreground">Promedio del período seleccionado.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
      <Card className="bg-brand-soft">
        <CardHeader>
          <CardDescription>Calidad promedio</CardDescription>
          <CardTitle>Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-brand-contrast">{summary.avgRating.toFixed(1)} ⭐️</p>
          <p className="mt-2 text-xs text-brand-emphasis/80">Tus compradores valoran el detalle y el acabado.</p>
        </CardContent>
      </Card>
    </div>
  );
}
