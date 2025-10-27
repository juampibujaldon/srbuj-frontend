"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/i18n";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { useOrderDetail, useAddNote } from "@/lib/api/orders";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { generateInvoicePdf } from "@/lib/invoice/generateInvoicePdf";

interface OrderDetailDrawerProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  role: "customer" | "admin";
}

export function OrderDetailDrawer({ orderId, open, onClose, role }: OrderDetailDrawerProps) {
  const { data, isLoading } = useOrderDetail(orderId);
  const [helpOpen, setHelpOpen] = useState(false);
  const addNote = useAddNote();

  const totals = useMemo(() => {
    if (!data) return null;
    const subtotal = data.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    return {
      subtotal,
      total: data.totalCents
    };
  }, [data]);

  const handleSubmitHelp = async (formData: FormData) => {
    if (!orderId) return;
    const content = formData.get("message")?.toString().trim();
    if (!content) {
      toast({ title: "Escribí tu mensaje", description: "El mensaje no puede estar vacío" });
      return;
    }
    await addNote.mutateAsync({ id: orderId, content, internal: role === "admin" });
    toast({ title: "Nota enviada", description: "Responderemos a la brevedad" });
    setHelpOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent side="right" className="sm:max-w-xl">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data ? (
          <ScrollArea className="h-[90vh] pr-2">
            <div className="flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Pedido</p>
                    <h2 className="text-xl font-semibold">{data.number}</h2>
                  </div>
                  <OrderStatusBadge status={data.status} />
                </div>
                <p className="text-sm text-muted-foreground">Creado el {formatDateTime(data.createdAt)}</p>
              </header>

              <Tabs defaultValue="resumen" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="pago">Pago</TabsTrigger>
                  <TabsTrigger value="envio">Envío</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="notas">Notas</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Cliente</h3>
                    <p className="text-sm">{data.customerName}</p>
                    <p className="text-sm text-muted-foreground">{data.customerEmail}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-soft p-4">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-semibold">{formatCurrency(data.totalCents)}</p>
                  </div>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <div className="space-y-3">
                    {data.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-muted text-xs font-semibold uppercase text-muted-foreground">
                          {item.imageUrl ? <span className="truncate">{item.imageUrl.split("/").pop()}</span> : item.name.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU {item.sku}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>x{item.quantity}</p>
                          <p className="text-muted-foreground">{formatCurrency(item.unitPrice * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totals && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pago" className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Método</p>
                    <p>{data.payment.method}</p>
                    <p className="text-muted-foreground">Estado: {data.payment.status}</p>
                  </div>
                  {data.payment.externalId && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`https://www.mercadopago.com.ar/activity/${data.payment.externalId}`, "_blank")}
                    >
                      Ver en MercadoPago
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      if (data.invoiceUrl) {
                        window.open(data.invoiceUrl, "_blank", "noopener,noreferrer");
                        return;
                      }
                      generateInvoicePdf(data);
                      toast({ title: "Factura generada", description: data.number });
                    }}
                  >
                    Descargar factura
                  </Button>
                </TabsContent>

                <TabsContent value="envio" className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Carrier</p>
                    <p>{data.shipping.carrier}</p>
                    {data.shipping.trackingCode && <p>Tracking: {data.shipping.trackingCode}</p>}
                    {data.shipping.eta && <p className="text-muted-foreground">ETA {formatDate(data.shipping.eta)}</p>}
                  </div>
                  {data.trackingUrl && (
                    <Button variant="outline" className="w-full" onClick={() => window.open(data.trackingUrl ?? "#", "_blank")}>
                      Seguir envío
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="space-y-3">
                  <div className="space-y-4">
                    {data.timeline.map((event) => (
                      <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-border p-3">
                        <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                          <span>{event.actor}</span>
                          <span>{formatDateTime(event.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{event.note}</p>
                          <OrderStatusBadge status={event.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notas" className="space-y-4">
                  <div className="space-y-3">
                    {data.notes.map((note) => (
                      <div key={note.id} className="rounded-2xl bg-muted/60 p-3 text-sm">
                        <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                          <span>{note.author}</span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm">{note.content}</p>
                        {note.internal && <span className="mt-2 inline-flex text-xs text-brand">Interna</span>}
                      </div>
                    ))}
                  </div>

                  <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">Necesito ayuda</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear nota</DialogTitle>
                        <DialogDescription>Contanos en qué podemos ayudarte.</DialogDescription>
                      </DialogHeader>
                      <form
                        className="space-y-4"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          await handleSubmitHelp(formData);
                          event.currentTarget.reset();
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="message">Mensaje</Label>
                          <Textarea id="message" name="message" required aria-required rows={4} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose asChild>
                            <Button variant="ghost" type="button">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button type="submit" disabled={addNote.isPending}>
                            Enviar
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">Seleccioná un pedido para ver el detalle.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
