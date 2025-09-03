import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import TopNav from "./components/Navbar";
import Home from "./pages/Home";
import Productos from "./pages/Productos";
import Carrito from "./pages/Carrito";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ProductDetail from "./pages/ProductDetail";
import AdminProducts from "./pages/AdminProducts";
import Register from "./pages/Register";

// Guards
function Protected({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}
function AdminOnly({ children }) {
  const role = localStorage.getItem("role");
  return role === "admin" ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [cart, setCart] = useState([]);

  // Persist cart in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const addToCart = (item) => setCart((prev) => [...prev, item]);
  // Remove a single unit of a given product id
  const removeFromCart = (id) =>
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

  return (
    <>
      <TopNav cartCount={cart.length} />

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
    </>
  );
}
