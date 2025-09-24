import React, { useState } from "react";
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
  const [cart, setCart] = useState([]);
  const addToCart = (item) => setCart((prev) => [...prev, item]);
  const removeFromCart = (id) => setCart((prev) => prev.filter((it) => it.id !== id));

  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}
