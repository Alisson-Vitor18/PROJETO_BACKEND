// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { register, login, logout } from "./auth.controller";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { recuperarSenha, redefinirSenha } from "./auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", autenticarToken, logout);
router.post("/recuperar-senha", recuperarSenha);
router.post("/redefinir-senha", redefinirSenha);

router.get("/me", autenticarToken, (req, res) => {
  res.json({ message: "Token válido!", user: req.user });
});

export default router;
