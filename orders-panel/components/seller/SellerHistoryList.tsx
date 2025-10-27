import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { StlHistoryPoint } from "@/lib/api/stlSales";

export function SellerHistoryList({ points }: { points: StlHistoryPoint[] }) {
  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>Tendencia diaria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividad registrada en estos días.</p>
        ) : (
          points.slice(-10).map((point) => (
            <div key={point.date} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(point.date))}</p>
                <p className="text-xs text-muted-foreground">{point.unitsSold} descargas</p>
              </div>
              <p className="text-sm font-semibold text-brand-contrast">{formatCurrency(point.revenueCents)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
