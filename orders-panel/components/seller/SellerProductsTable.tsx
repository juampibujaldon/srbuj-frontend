"use client";

import { useMemo, useRef } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import Image from "next/image";
import { StlProduct } from "@/lib/api/stlSales";
import { formatCurrency, formatDate } from "@/lib/i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ESTIMATED_HEIGHT = 72;

export function SellerProductsTable({ products }: { products: StlProduct[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<StlProduct>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Modelo",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted/60">
              {row.original.thumbnailUrl ? (
                <Image src={row.original.thumbnailUrl} alt={row.original.name} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  {row.original.name.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.sku}</p>
            </div>
          </div>
        )
      },
      {
        accessorKey: "unitsSold",
        header: "Unidades",
        cell: ({ row }) => <span className="text-sm font-semibold">{row.original.unitsSold.toLocaleString("es-AR")}</span>
      },
      {
        accessorKey: "revenueCents",
        header: "Ingresos",
        cell: ({ row }) => <span>{formatCurrency(row.original.revenueCents)}</span>
      },
      {
        accessorKey: "conversionRate",
        header: "Conversión",
        cell: ({ row }) => <Badge variant="outline">{(row.original.conversionRate * 100).toFixed(1)}%</Badge>
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <span>{row.original.rating.toFixed(1)} ⭐️</span>
      },
      {
        accessorKey: "lastSaleAt",
        header: "Última venta",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.lastSaleAt)}</span>
      }
    ],
    []
  );

  const table = useReactTable({ data: products, columns, getCoreRowModel: getCoreRowModel() });

  const virtualizer = useVirtualizer({
    getScrollElement: () => parentRef.current,
    count: table.getRowModel().rows.length,
    estimateSize: () => ESTIMATED_HEIGHT,
    overscan: 6
  });

  const rows = table.getRowModel().rows;
  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="h-[420px] overflow-auto rounded-3xl border border-border">
      <Table role="table" className="relative">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-white">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="relative" style={{ height: totalSize }}>
          {rows.length === 0 ? (
            <TableRow className="absolute inset-x-0 top-24 text-center">
              <TableCell colSpan={columns.length}>
                <p className="text-sm text-muted-foreground">Todavía no hay ventas en este período.</p>
              </TableCell>
            </TableRow>
          ) : (
            virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <TableRow
                  key={row.id}
                  className="absolute left-0 right-0"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
