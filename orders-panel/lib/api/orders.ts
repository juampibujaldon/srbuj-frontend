"use client";

import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { z } from "zod";
import { OrderStatus, STATUS_ORDER, isTransitionAllowed } from "@/lib/utils";
import { useOrdersFilters } from "@/lib/state/ordersFilters";
import { buildSocket } from "@/lib/ws";

export const ordersFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(STATUS_ORDER)).optional(),
  customer: z.string().optional(),
  paymentStatus: z.array(z.enum(["approved", "pending", "rejected"])).optional(),
  carrier: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

export type OrdersFilters = z.infer<typeof ordersFiltersSchema>;

export interface OrdersListParams {
  role: "customer" | "admin";
  pageSize?: number;
}

export interface OrderTimelineEvent {
  id: string;
  createdAt: string;
  actor: "system" | "customer" | "admin";
  note: string;
  status: OrderStatus;
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface OrderPayment {
  method: string;
  status: "approved" | "pending" | "rejected";
  externalId?: string;
}

export interface OrderShipping {
  carrier: string;
  trackingCode?: string;
  eta?: string;
  url?: string;
  status: "pending" | "in_transit" | "delivered";
}

export interface OrderNote {
  id: string;
  createdAt: string;
  author: string;
  internal: boolean;
  content: string;
}

export interface OrderSummary {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  status: OrderStatus;
  totalCents: number;
  payment: OrderPayment;
  shipping: OrderShipping;
  invoiceUrl?: string;
  trackingUrl?: string;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
  notes: OrderNote[];
}

export interface OrdersPage {
  data: OrderSummary[];
  nextCursor?: string;
}

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

function buildQueryString(params: Record<string, string | undefined | string[]>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry));
    } else {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
}

async function getOrdersPage(
  role: "customer" | "admin",
  cursor?: string,
  filters?: OrdersFilters,
  pageSize = 30
) {
  const qs = buildQueryString({
    role,
    cursor,
    pageSize: String(pageSize),
    search: filters?.search,
    carrier: filters?.carrier,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    customer: filters?.customer,
    paymentStatus: filters?.paymentStatus,
    status: filters?.status
  });
  return fetchJSON<OrdersPage>(`/api/orders?${qs}`);
}

export function useOrdersInfiniteQuery(params: OrdersListParams) {
  const filters = useOrdersFilters((state) => state.filters);
  const pageSize = params.pageSize ?? 30;
  return useInfiniteQuery({
    queryKey: ["orders", params.role, filters, pageSize],
    queryFn: ({ pageParam }) => getOrdersPage(params.role, pageParam, filters, pageSize),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
}

async function getOrderDetail(id: string) {
  return fetchJSON<OrderDetail>(`/api/orders/${id}`);
}

export function useOrderDetail(id: string | null) {
  return useQuery({
    queryKey: ["order", id],
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) throw new Error("order id requerido");
      return getOrderDetail(id);
    }
  });
}

interface UpdateOrderStatusInput {
  id: string;
  nextStatus: OrderStatus;
  note?: string;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nextStatus, note }: UpdateOrderStatusInput) => {
      return fetchJSON<OrderDetail>(`/api/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note })
      });
    },
    onMutate: async ({ id, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData(["orders"]);
      queryClient.setQueriesData({ queryKey: ["orders"] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        const pages = oldData.pages.map((page: OrdersPage) => ({
          ...page,
          data: page.data.map((order) =>
            order.id === id
              ? {
                  ...order,
                  status: nextStatus
                }
              : order
          )
        }));
        return { ...oldData, pages };
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["orders"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}

interface CancelOrderInput {
  id: string;
  reason?: string;
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: CancelOrderInput) => {
      return fetchJSON<OrderDetail>(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["order", data.id], data);
    }
  });
}

interface UpdateTrackingInput {
  id: string;
  carrier: string;
  trackingCode: string;
  eta?: string;
}

export function useUpdateTracking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, carrier, trackingCode, eta }: UpdateTrackingInput) => {
      return fetchJSON<OrderDetail>(`/api/orders/${id}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, trackingCode, eta })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["order", data.id], data);
    }
  });
}

interface AddNoteInput {
  id: string;
  content: string;
  internal?: boolean;
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, internal }: AddNoteInput) => {
      return fetchJSON<OrderDetail>(`/api/orders/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, internal })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["order", data.id], data);
    }
  });
}

interface ResendEmailInput {
  id: string;
  template: "order_confirmation" | "shipping_update" | "custom";
}

export function useResendEmail() {
  return useMutation({
    mutationFn: ({ id, template }: ResendEmailInput) => {
      return fetchJSON<{ success: true }>(`/api/orders/${id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template })
      });
    }
  });
}

export function useOrderUpdatedSubscription() {
  const queryClient = useQueryClient();
  const filters = useOrdersFilters((state) => state.filters);

  useEffect(() => {
    const socket = buildSocket();
    const listener = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "order.updated") {
          return;
        }
        const matchesFilters = !filters || Object.keys(filters).length === 0;
        if (!matchesFilters) {
          // We optimistically refetch even if filters exist; complex matching can be added later.
        }
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } catch (error) {
        console.error("ws parse error", error);
      }
    };
    socket.addEventListener("message", listener);
    return () => {
      socket.removeEventListener("message", listener);
      socket.close();
    };
  }, [queryClient, filters]);
}

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!isTransitionAllowed(from, to)) {
    throw new Error(`Transición inválida de ${from} a ${to}`);
  }
}
