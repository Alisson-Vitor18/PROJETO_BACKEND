// Define as rotas relacionadas à autenticação (ex: POST /login, POST /register)
// e conecta essas rotas aos controladores.

import { Router } from "express";
import { register, login } from "./auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);

export default router;