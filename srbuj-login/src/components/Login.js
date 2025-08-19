import React, { useState } from "react";
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Stack
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Completá usuario y contraseña");
      return;
    }
    try {
      setError("");
      login(username, password); 
    } catch (err) {
      setError("No se pudo iniciar sesión");
    }
  };

  return (
    <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <Card sx={{ width: 360, p: 1 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <LockOpenIcon fontSize="large" />
              <Typography variant="h5" sx={{ mt: 1 }}>
                Iniciar sesión
              </Typography>
              <Typography variant="body2" color="text.secondary">
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <form onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large">
                  Entrar
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
