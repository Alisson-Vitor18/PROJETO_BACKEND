// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./modules/auth/auth.routes";
import clienteRoutes from "./modules/cliente/cliente.routes";
import fidelidadeRoutes from "./modules/fidelidade/fidelidade.routes";
import produtosRoutes from "./modules/produtos/produtos.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./config/constants";

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
}));

// Rotas
app.use("/api/fidelidade", fidelidadeRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cliente", clienteRoutes);

// health
app.get("/", (req, res) => res.send("Servidor rodando! 😎"));

// error handler (deve vir por último)
app.use(errorHandler);

export default app;
