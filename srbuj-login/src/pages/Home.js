import React from "react";
import { Grid, Card, CardContent, Typography, Button, Stack } from "@mui/material";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <Layout title="SrBuj - Panel de control">
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                ¡Bienvenido, {user?.username}!
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained">panel de pedidos</Button>
                <Button variant="outlined">Productos</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Estado de tu sesión
              </Typography>
              <Typography variant="body2">Usuario: <b>{user?.username}</b></Typography>
              <Typography variant="body2">Rol: <b>tester</b></Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Home;
