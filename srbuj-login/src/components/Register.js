import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      await register({ email: form.email, password: form.password });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message || "Error al registrarse");
    }
  };

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", p: 2 }}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Crear cuenta</Typography>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField name="email" label="Email" type="email" value={form.email} onChange={handleChange} required />
            <TextField name="password" label="Contraseña" type="password" value={form.password} onChange={handleChange} required />
            <TextField name="confirm" label="Repetir contraseña" type="password" value={form.confirm} onChange={handleChange} required />
            {error && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained">Registrarme</Button>
          </Stack>
          <Typography variant="body2" sx={{ mt: 2 }}>
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
