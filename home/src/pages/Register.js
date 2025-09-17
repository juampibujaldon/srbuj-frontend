// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { addUser } from "../utils/auth";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      addUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      // Redirige al login con aviso de registro ok
      navigate("/login?registered=1");
    } catch (err) {
      setError(err.message || "No se pudo registrar.");
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h1 className="h4 mb-3">Crear cuenta</h1>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <form onSubmit={onSubmit} className="row g-3">
                <div className="col-12">
                  <label className="form-label">Nombre de usuario *</label>
                  <input
                    name="username"
                    className="form-control"
                    value={form.username}
                    onChange={onChange}
                    placeholder="tu_nombre"
                    autoFocus
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={onChange}
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Repetir contraseña *</label>
                  <input
                    type="password"
                    name="confirm"
                    className="form-control"
                    value={form.confirm}
                    onChange={onChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="col-12 d-grid pt-2">
                  <button type="submit" className="btn btn-primary btn-lg">
                    Registrarme
                  </button>
                </div>
              </form>

              <p className="text-muted small mt-3 mb-0">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-muted small mt-3 mb-0">
            * Demo sin backend. Los datos se guardan en tu navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
