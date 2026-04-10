import { Router } from "express";
import { getImagem } from "./imagens.controller";

const router = Router();

router.get("/:id", getImagem);

export default router;
