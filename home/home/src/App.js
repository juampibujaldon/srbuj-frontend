// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import TopNav from "./components/navbar";           // Usa mayúscula: Navbar.js
import Home from "./pages/Home";
import Productos from "./pages/Productos";
import Carrito from "./pages/Carrito";
import Login from "./pages/Login";
import AnimatedCTA from "./components/AnimatedCTA"; // borra el import y JSX si no lo usas

export default function App() {
  const [cart, setCart] = useState([]);
  const addToCart = (item) => setCart((prev) => [...prev, item]);
  const removeFromCart = (id) => setCart((prev) => prev.filter((it) => it.id !== id));

  return (
    <Router>
      <TopNav cartCount={cart.length} />
      <Routes>
        <Route path="/" element={<Home addToCart={addToCart} />} />
        <Route path="/productos" element={<Productos addToCart={addToCart} />} />
        <Route path="/carrito" element={<Carrito cart={cart} removeFromCart={removeFromCart} />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnimatedCTA />
      <footer className="bg-dark text-white text-center py-4 mt-5">
        <p className="mb-0">© {new Date().getFullYear()} SrBuj 3D — Impresiones Personalizadas</p>
      </footer>
    </Router>
  );
}
