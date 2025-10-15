import { Router } from "express";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";
import { criarProduto, listarProdutos } from "./produtos.controller";

const router = Router();

// Funcionário cadastra produto
router.post("/", autenticarToken, autorizarTipos("funcionario"), criarProduto);

// Qualquer usuário lista produtos disponíveis
router.get("/", autenticarToken, listarProdutos);

export default router;
