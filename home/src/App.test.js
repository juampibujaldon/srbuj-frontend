import { render, screen } from "@testing-library/react";

jest.mock("./context/AuthContext.jsx", () => {
  const authStub = {
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    token: null,
    user: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
  };
  return {
    __esModule: true,
    AuthProvider: ({ children }) => children,
    useAuth: () => authStub,
  };
});

jest.mock("./hooks/useProducts", () => ({
  __esModule: true,
  useProducts: () => ({
    items: [],
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));

jest.mock("./hooks/useFeaturedClients", () => ({
  __esModule: true,
  useFeaturedClients: () => [[
    { id: "test-client", name: "Cliente", href: "#", logo: "/logo.png" },
  ], jest.fn()],
}));

jest.mock("./pages/UploadModel.jsx", () => () => null);
jest.mock("./pages/Configurator.jsx", () => () => null);
jest.mock("./pages/Orders.jsx", () => () => null);

import App from "./App";

test("renderiza la cabecera principal", async () => {
  render(<App />);
  const heading = await screen.findByRole("heading", { name: /piezas 3d para destacar tu marca/i });
  expect(heading).toBeInTheDocument();
});
