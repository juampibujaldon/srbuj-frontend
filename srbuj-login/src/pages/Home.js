import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { Link as RouterLink } from "react-router-dom";

export default function Home() {
  const { user } = useAuth();

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Hola, {user?.email}</Typography>
      <Typography sx={{ mb: 4 }}>Esta es una ruta protegida.</Typography>
      <Box>
        <Button component={RouterLink} to="/logout" variant="outlined">
          Cerrar sesión
        </Button>
      </Box>
    </Container>
  );
}
