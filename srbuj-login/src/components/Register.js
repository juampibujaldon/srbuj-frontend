// src/components/Register.js
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
const Register = () => {
  const { register } = useAuth();
  const [u, setU] = useState(""), [p, setP] = useState("");
  const onSubmit = e => { e.preventDefault(); register(u, p); };
  return (
    <form onSubmit={onSubmit} style={{ margin: 40 }}>
      <h2>Registro</h2>
      <input value={u} onChange={e=>setU(e.target.value)} placeholder="Usuario" />
      <input value={p} onChange={e=>setP(e.target.value)} placeholder="Contraseña" type="password" />
      <button>Crear</button>
    </form>
  );
};
export default Register;
