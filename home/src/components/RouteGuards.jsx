import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function Protected({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) {
    return <div className="container py-5 text-center text-muted">Verificando sesión...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export function AdminOnly({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) {
    return <div className="container py-5 text-center text-muted">Verificando sesión...</div>;
  }
  return isAdmin ? children : <Navigate to="/" replace />;
}

export function CustomerOnly({ children }) {
  const { loading, user } = useAuth();
  if (loading) {
    return <div className="container py-5 text-center text-muted">Verificando rol...</div>;
  }
  const role = user?.role || localStorage.getItem("role");
  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
