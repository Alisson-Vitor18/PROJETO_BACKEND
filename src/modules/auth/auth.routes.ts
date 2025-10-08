// Define as rotas relacionadas à autenticação (ex: POST /login, POST /register)
// e conecta essas rotas aos controladores.

import { Router } from "express";
import { register, login } from "./auth.controller";
import { autenticarToken } from "../../middlewares/auth.middleware";

const router = Router();

// Rotas públicas
router.post("/register", register);
router.post("/login", login);

// Rota protegida — só acessa quem tiver um token válido
router.get("/me", autenticarToken, (req, res) => {
  const user = (req as any).user;
  res.json({ message: "Token válido!", user });
});

export default router;
