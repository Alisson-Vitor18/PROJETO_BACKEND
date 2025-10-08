// src/app.ts
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import clienteRoutes from "./modules/cliente/cliente.routes";

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/cliente", clienteRoutes);

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor rodando! 😎");
});

export default app;
