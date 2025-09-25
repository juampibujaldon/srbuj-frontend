import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import TopNav from "./components/Navbar.js";
import Home from "./pages/Home.jsx";
import Productos from "./pages/Productos.jsx";
import Carrito from "./pages/Carrito.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

function Protected({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading)
    return (
      <div className="container py-5 text-center text-muted">Verificando sesión...</div>
    );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading)
    return (
      <div className="container py-5 text-center text-muted">Verificando sesión...</div>
    );
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  const normalizeCartItem = (item = {}) => {
    const image =
      item.image || item.img || item.thumb || "/images/placeholder.png";
    const thumb = item.thumb || item.image || item.img || image;
    return {
      id: item.id,
      title: item.title ?? item.nombre ?? "Producto",
      price: item.price ?? item.precio ?? 0,
      weightGr: item.weightGr ?? item.peso_gr ?? 300,
      image,
      thumb,
    };
  };
  const [cart, setCart] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("cart");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizeCartItem(item))
        : [];
    } catch (error) {
      console.error("Failed to read cart from localStorage", error);
      return [];
    }
  });
  const clearCart = useCallback(() => setCart([]), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to persist cart to localStorage", error);
    }
  }, [cart]);
  const addToCart = (item) =>
    setCart((prev) => [...prev, normalizeCartItem(item)]);
  const removeFromCart = (id) => setCart((prev) => prev.filter((it) => it.id !== id));
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      clearCart();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, clearCart]);

  return (
    <Router>
      <TopNav cartCount={cart.length} onLogout={clearCart} />
      <Routes>
        <Route path="/" element={<Home addToCart={addToCart} />} />
        <Route path="/productos" element={<Productos addToCart={addToCart} />} />
        <Route path="/producto/:id" element={<ProductDetail addToCart={addToCart} />} />
        <Route path="/carrito" element={<Carrito cart={cart} removeFromCart={removeFromCart} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminOnly>
                <AdminDashboard />
              </AdminOnly>
            </Protected>
          }
        />
        <Route
          path="/admin/products"
          element={
            <Protected>
              <AdminOnly>
                <AdminProducts />
              </AdminOnly>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
