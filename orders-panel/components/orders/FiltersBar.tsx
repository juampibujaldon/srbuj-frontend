"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { ORDER_STATUS_LABELS, OrderStatus, STATUS_ORDER } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Filter, Search, X } from "lucide-react";

const PAYMENT_OPTIONS = [
  { value: "approved", label: "Aprobado" },
  { value: "pending", label: "Pendiente" },
  { value: "rejected", label: "Rechazado" }
] as const;

const CARRIERS = ["Andreani", "Correo Argentino", "OCA", "Moto Flex"];

interface FiltersBarProps {
  role: "customer" | "admin";
  onExpose?: (api: { toggleAdvanced: () => void; openAdvanced: () => void }) => void;
}

export function FiltersBar({ role, onExpose }: FiltersBarProps) {
  const { filters, setFilters, clearFilters } = useOrdersFilters((state) => ({
    filters: state.filters,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters
  }));
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({ search: searchValue || undefined });
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchValue, setFilters]);

  const quickFilters = useMemo(() => {
    if (role === "customer") {
      return [
        { label: "Todos", value: undefined },
        { label: "Pendientes", value: "pending_payment" },
        { label: "Enviados", value: "shipped" },
        { label: "Entregados", value: "delivered" }
      ] as { label: string; value: OrderStatus | undefined }[];
    }
    return [];
  }, [role]);

  useEffect(() => {
    if (!onExpose) return;
    onExpose({
      toggleAdvanced: () => setShowAdvanced((prev) => !prev),
      openAdvanced: () => setShowAdvanced(true)
    });
  }, [onExpose]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar pedidos"
              placeholder="Buscar Nº, producto o email"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="pl-9"
            />
          </div>
          {role === "admin" && (
            <Button variant="outline" onClick={() => setShowAdvanced((prev) => !prev)}>
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          )}
        </div>
        {filters.search || filters.status || filters.paymentStatus || filters.dateFrom || filters.dateTo || filters.carrier || filters.customer ? (
          <Button variant="ghost" className="text-sm" onClick={() => clearFilters()}>
            <X className="mr-1 h-4 w-4" /> Limpiar filtros
          </Button>
        ) : null}
      </div>

      {quickFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => {
            const isActive = filters.status?.[0] === filter.value || (!filter.value && !filters.status);
            return (
              <button
                key={filter.label}
                type="button"
                className={cn(
                  buttonVariants({ variant: isActive ? "default" : "outline", size: "sm" }),
                  "rounded-full"
                )}
                onClick={() => {
                  if (!filter.value) {
                    setFilters({ status: undefined });
                  } else {
                    setFilters({ status: [filter.value] });
                  }
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {role === "admin" && showAdvanced && (
        <Card className="border-dashed bg-white/80">
          <CardContent className="grid gap-6 pt-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Estados</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Seleccionar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Estados</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_ORDER.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={filters.status?.includes(status)}
                      onCheckedChange={(checked) => {
                        const current = new Set(filters.status ?? []);
                        if (checked) {
                          current.add(status);
                        } else {
                          current.delete(status);
                        }
                        setFilters({ status: current.size ? Array.from(current) : undefined });
                      }}
                    >
                      {ORDER_STATUS_LABELS[status]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label>Rango de fechas</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(event) => setFilters({ dateFrom: event.target.value || undefined })}
                />
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(event) => setFilters({ dateTo: event.target.value || undefined })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Carrier</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.carrier ?? "Cualquiera"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem checked={!filters.carrier} onCheckedChange={() => setFilters({ carrier: undefined })}>
                    Cualquiera
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {CARRIERS.map((carrier) => (
                    <DropdownMenuCheckboxItem
                      key={carrier}
                      checked={filters.carrier === carrier}
                      onCheckedChange={(checked) => setFilters({ carrier: checked ? carrier : undefined })}
                    >
                      {carrier}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label>Pago</Label>
              <div className="flex flex-col gap-2">
                {PAYMENT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.paymentStatus?.includes(option.value) ?? false}
                      onCheckedChange={(checked) => {
                        const current = new Set(filters.paymentStatus ?? []);
                        if (checked) {
                          current.add(option.value);
                        } else {
                          current.delete(option.value);
                        }
                        setFilters({ paymentStatus: current.size ? Array.from(current) : undefined });
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente / Email</Label>
              <Input
                placeholder="Buscar por cliente"
                value={filters.customer ?? ""}
                onChange={(event) => setFilters({ customer: event.target.value || undefined })}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
