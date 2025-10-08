import { Router } from "express";
import { updateMe } from "./cliente.controller"; // Controller correto
import { autenticarToken } from "../../middlewares/auth.middleware";

const router = Router();

// Rota para atualizar dados do próprio usuário
router.put("/me", autenticarToken, updateMe);

export default router;
