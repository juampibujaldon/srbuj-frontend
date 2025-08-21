import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Box, Button, Card, CardContent, TextField, Typography, Stack
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/home";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", p: 2 }}>
      <Card sx={{ width: 360 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Iniciar sesión</Typography>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              name="email" label="Email" type="email" value={form.email}
              onChange={handleChange} fullWidth required
            />
            <TextField
              name="password" label="Contraseña" type="password" value={form.password}
              onChange={handleChange} fullWidth required
            />
            {error && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained">Entrar</Button>
          </Stack>

          <Typography variant="body2" sx={{ mt: 2 }}>
            ¿No tenés cuenta? <Link to="/register">Registrate</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
