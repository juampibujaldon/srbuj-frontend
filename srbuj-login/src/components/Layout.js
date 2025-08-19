import React from "react";
import { AppBar, Toolbar, Typography, Button, Container, Box } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../context/AuthContext";

const Layout = ({ title = "Panel", children }) => {
  const { user, logout } = useAuth();

  return (
    <Box>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2">👤 {user.username}</Typography>
              <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
                Salir
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
};

export default Layout;
