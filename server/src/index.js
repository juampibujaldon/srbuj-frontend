const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("./seed");

const stockRouter = require("./routes/stock");

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.get("/", (_req, res) => {
  res.json({
    name: "srbuj-stock-server",
    version: "0.1.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/stock", stockRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[stock] error", err);
  const status = err.status || 400;
  const message = err.message || "Error inesperado";
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[stock] API escuchando en http://localhost:${PORT}`);
});
