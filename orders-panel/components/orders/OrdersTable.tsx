"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, PackageSearch, Printer, RefreshCw, Truck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/i18n";
import { OrderSummary } from "@/lib/api/orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { cn } from "@/lib/utils";

interface OrdersTableProps {
  role: "customer" | "admin";
  data: OrderSummary[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onViewDetail: (order: OrderSummary) => void;
  onRepeatOrder?: (order: OrderSummary) => void;
  onDownloadInvoice?: (order: OrderSummary) => void;
  onTrackShipment?: (order: OrderSummary) => void;
  onCancelOrder?: (order: OrderSummary) => void;
  onResendEmail?: (order: OrderSummary) => void;
  onTransitionOrder?: (order: OrderSummary) => void;
  onEditTracking?: (order: OrderSummary) => void;
  onAddNote?: (order: OrderSummary) => void;
}

const ESTIMATED_ROW_HEIGHT = 72;

export function OrdersTable({
  role,
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onViewDetail,
  onRepeatOrder,
  onDownloadInvoice,
  onTrackShipment,
  onCancelOrder,
  onResendEmail
}: OrdersTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { selectedIds, toggleSelection, setSelection } = useOrdersFilters((state) => ({
    selectedIds: state.selectedIds,
    toggleSelection: state.toggleSelection,
    setSelection: state.setSelection
  }));

  const columns = useMemo<ColumnDef<OrderSummary>[]>(() => {
    const base: ColumnDef<OrderSummary>[] = [
      {
        accessorKey: "number",
        header: "Nº",
        cell: ({ row }) => (
          <div className="font-semibold text-sm">
            <div>{row.original.number}</div>
            <p className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</p>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />
      },
      {
        accessorKey: "totalCents",
        header: "Total",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalCents)}</span>
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <RowActions
            role={role}
            order={row.original}
            onViewDetail={onViewDetail}
            onTrackShipment={onTrackShipment}
            onDownloadInvoice={onDownloadInvoice}
            onRepeatOrder={onRepeatOrder}
            onCancelOrder={onCancelOrder}
            onResendEmail={onResendEmail}
            onTransitionOrder={onTransitionOrder}
            onEditTracking={onEditTracking}
            onAddNote={onAddNote}
          />
        ),
        enableSorting: false
      }
    ];

    if (role === "admin") {
      base.splice(1, 0, {
        accessorKey: "customerName",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="font-medium">{row.original.customerName}</p>
            <p className="text-xs text-muted-foreground">{row.original.customerEmail}</p>
          </div>
        )
      });
      base.splice(3, 0, {
        accessorKey: "payment",
        header: "Pago",
        cell: ({ row }) => (
          <div className="text-xs uppercase text-muted-foreground">
            {row.original.payment.method}
            <br />
            <span className="font-medium text-foreground">{row.original.payment.status}</span>
          </div>
        )
      });
      base.splice(4, 0, {
        accessorKey: "shipping",
        header: "Envío",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.shipping.carrier}
            {row.original.shipping.trackingCode && <p className="font-medium text-foreground">{row.original.shipping.trackingCode}</p>}
          </div>
        )
      });
    }

    if (role === "admin") {
      base.unshift({
        id: "select",
        header: () => (
          <Checkbox
            aria-label="Seleccionar todos"
            checked={data.length > 0 && selectedIds.length === data.length}
            indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onCheckedChange={(value) => {
              if (value) {
                setSelection(data.map((order) => order.id));
              } else {
                setSelection([]);
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Seleccionar pedido ${row.original.number}`}
            checked={selectedIds.includes(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onCheckedChange={() => toggleSelection(row.original.id)}
          />
        ),
        size: 48
      });
    }

    return base;
  }, [
    role,
    data,
    selectedIds,
    setSelection,
    toggleSelection,
    onViewDetail,
    onTrackShipment,
    onDownloadInvoice,
    onRepeatOrder,
    onCancelOrder,
    onResendEmail,
    onTransitionOrder,
    onEditTracking,
    onAddNote
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  const rows = table.getRowModel().rows;
  const count = hasNextPage ? rows.length + 1 : rows.length;

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 6
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const last = virtualRows[virtualRows.length - 1];
    if (!last) return;
    if (last.index >= rows.length - 1) {
      onLoadMore();
    }
  }, [virtualRows, hasNextPage, isFetchingNextPage, rows.length, onLoadMore]);

  return (
    <div className="relative flex-1">
      <div ref={parentRef} className="h-[560px] overflow-auto rounded-3xl border border-border">
        <Table role="table" className="relative">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-white">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() ?? undefined }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative" style={{ height: totalSize }}>
            {isLoading && rows.length === 0 ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="absolute left-0 right-0">
                  <TableCell colSpan={columns.length}>
                    <div className="flex items-center justify-between gap-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="absolute inset-x-0 top-24">
                <TableCell colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <PackageSearch className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No encontramos pedidos con estos filtros</p>
                    <span className="text-xs text-muted-foreground">Proba limpiar los filtros para ver todo el historial.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) {
                  return (
                    <TableRow
                      key={`loader-${virtualRow.index}`}
                      className="absolute left-0 right-0"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <TableCell colSpan={columns.length}>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          {isFetchingNextPage ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Cargando más pedidos...
                            </>
                          ) : (
                            <span>No hay más resultados</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow.index}
                    className={cn("absolute left-0 right-0 cursor-pointer", selectedIds.includes(row.original.id) && "bg-brand-soft/60")}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                    onClick={() => onViewDetail(row.original)}
                    role="row"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} role="cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface RowActionsProps {
  role: "customer" | "admin";
  order: OrderSummary;
  onViewDetail: (order: OrderSummary) => void;
  onTrackShipment?: (order: OrderSummary) => void;
  onDownloadInvoice?: (order: OrderSummary) => void;
  onRepeatOrder?: (order: OrderSummary) => void;
  onCancelOrder?: (order: OrderSummary) => void;
  onResendEmail?: (order: OrderSummary) => void;
  onTransitionOrder?: (order: OrderSummary) => void;
  onEditTracking?: (order: OrderSummary) => void;
  onAddNote?: (order: OrderSummary) => void;
}

function RowActions({
  role,
  order,
  onViewDetail,
  onTrackShipment,
  onDownloadInvoice,
  onRepeatOrder,
  onCancelOrder,
  onResendEmail,
  onTransitionOrder,
  onEditTracking,
  onAddNote
}: RowActionsProps) {
  const primaryActions = [
    {
      label: "Detalle",
      icon: <PackageSearch className="h-4 w-4" />,
      onClick: () => onViewDetail(order)
    },
    order.trackingUrl && onTrackShipment
      ? {
          label: "Seguir",
          icon: <Truck className="h-4 w-4" />,
          onClick: () => onTrackShipment(order)
        }
      : null,
    order.invoiceUrl && onDownloadInvoice
      ? {
          label: "Factura",
          icon: <Printer className="h-4 w-4" />,
          onClick: () => onDownloadInvoice(order)
        }
      : null
  ].filter(Boolean) as { label: string; icon: JSX.Element; onClick: () => void }[];

  const secondaryActions: { label: string; onClick: () => void }[] = [];

  if (onRepeatOrder) {
    secondaryActions.push({ label: "Repetir compra", onClick: () => onRepeatOrder(order) });
  }
  if (role === "customer" && onCancelOrder && order.status === "pending_payment") {
    secondaryActions.push({ label: "Cancelar pedido", onClick: () => onCancelOrder(order) });
  }
  if (role === "admin" && onResendEmail) {
    secondaryActions.push({ label: "Reenviar correo", onClick: () => onResendEmail(order) });
  }
  if (role === "admin" && onTransitionOrder) {
    secondaryActions.unshift({ label: "Cambiar estado", onClick: () => onTransitionOrder(order) });
  }
  if (role === "admin" && onEditTracking) {
    secondaryActions.push({ label: "Editar tracking", onClick: () => onEditTracking(order) });
  }
  if (role === "admin" && onAddNote) {
    secondaryActions.push({ label: "Nota interna", onClick: () => onAddNote(order) });
  }

  return (
    <div className="flex items-center gap-2">
      {primaryActions.slice(0, 3).map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            action.onClick();
          }}
          aria-label={action.label}
        >
          {action.icon}
          <span className="sr-only">{action.label}</span>
        </Button>
      ))}
      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => event.stopPropagation()}
              aria-label="Más acciones"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Más acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                onSelect={(event) => {
                  event.preventDefault();
                  action.onClick();
                }}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
