import { Button } from "@/components/ui/button";
import type { DashboardPeriod } from "@/lib/api/stlSales";

const options: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" }
];

export function SellerPeriodSelector({ value, onChange }: { value: DashboardPeriod; onChange: (period: DashboardPeriod) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-muted px-1 py-1">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
