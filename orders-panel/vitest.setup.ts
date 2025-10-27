import "@testing-library/jest-dom/vitest";

vi.mock("next/dynamic", () => {
  return {
    __esModule: true,
    default: (importer: () => Promise<unknown>) => importer
  };
});

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
