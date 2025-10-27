import { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOrdersFilters, initialOrdersFilters } from "@/lib/state/ordersFilters";

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  useOrdersFilters.setState({ filters: initialOrdersFilters, selectedIds: [], detailDrawerId: null });

  return render(ui, { wrapper: Wrapper, ...options });
}
