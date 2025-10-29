import { Router } from "express";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { obterImagemPorId } from "./imagens.controller";

const router = Router();

// Servir imagem por id (qualquer usuário autenticado)
router.get("/:id", autenticarToken, obterImagemPorId);

export default router;


