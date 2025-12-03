// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { register, login, logout, getMeuPerfil } from "./auth.controller";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { recuperarSenha, redefinirSenha } from "./auth.controller";
import { loginRateLimiter } from "../../middlewares/rateLimitLogin.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", loginRateLimiter, login);
router.post("/logout", autenticarToken, logout);
router.post("/recuperar-senha", recuperarSenha);
router.post("/redefinir-senha", redefinirSenha);

router.get("/me", autenticarToken, getMeuPerfil);

export default router;
