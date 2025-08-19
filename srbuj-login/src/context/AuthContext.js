import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

const USERS = [
  { username: "admin", password: "1234" },
  { username: "test",  password: "abcd" },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = (username, password) => {
    const found = USERS.find(u => u.username === username && u.password === password);
    if (found) { setUser(found); navigate("/home"); }
    else { alert("Usuario o contraseña incorrectos"); }
  };

  const logout = () => { setUser(null); navigate("/login"); };

  const register = (username, password) => {
    USERS.push({ username, password });
    alert("Registrado!");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
