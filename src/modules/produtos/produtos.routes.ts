import { Router } from "express";
import multer from "multer";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";
import { criarProduto, listarProdutos, getProdutoById, updateProduto, deleteProduto } from "./produtos.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Funcionário cadastra produto (aceita multipart/form-data com campo 'imagem')
router.post("/", autenticarToken, autorizarTipos("funcionario"), upload.single("imagem"), criarProduto);

// Qualquer usuário lista produtos disponíveis
router.get("/", autenticarToken, listarProdutos);

// Obter produto específico
router.get("/:id", autenticarToken, getProdutoById);

// Editar produto (aceita multipart/form-data com campo 'imagem')
router.put("/:id", autenticarToken, autorizarTipos("funcionario"), upload.single("imagem"), updateProduto);

// Excluir produto
router.delete("/:id", autenticarToken, autorizarTipos("funcionario"), deleteProduto);

export default router;
