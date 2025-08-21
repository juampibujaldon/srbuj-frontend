import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // { email } o null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("auth:user");
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = async ({ email, password }) => {
    // TODO: Reemplazar por tu API real
    // const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({email,password}) })
    // const data = await res.json(); setUser(data.user)
    if (!email || !password) throw new Error("Completá email y contraseña");
    const fakeUser = { email };
    setUser(fakeUser);
    localStorage.setItem("auth:user", JSON.stringify(fakeUser));
    return true;
  };

  const register = async ({ email, password }) => {
    // TODO: Reemplazar por tu API real
    if (!email || !password) throw new Error("Completá email y contraseña");
    return true; // Simulamos OK y redirigimos a login
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth:user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
