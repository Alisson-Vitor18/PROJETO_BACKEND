import { Router } from "express";
import { updateMe, getAllClientes, getClienteById, deleteCliente } from "./cliente.controller";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";

const router = Router();

// Rota para o cliente atualizar os próprios dados
router.put("/me", autenticarToken, autorizarTipos("cliente", "funcionario"), updateMe);

// Rotas apenas para funcionários
router.get("/", autenticarToken, autorizarTipos("funcionario"), getAllClientes);
router.get("/:id", autenticarToken, autorizarTipos("funcionario"), getClienteById);
router.delete("/:id", autenticarToken, autorizarTipos("funcionario"), deleteCliente);

export default router;
