import { Router } from "express";
import multer from "multer";
import { updateMe, getAllClientes, getClienteById, deleteCliente, updateMinhaFoto } from "./cliente.controller";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rota para o cliente atualizar os próprios dados
router.put("/me", autenticarToken, autorizarTipos("cliente", "funcionario"), updateMe);

// Rota para o usuário alterar sua foto de perfil
router.put(
  "/me/foto",
  autenticarToken,
  autorizarTipos("cliente", "funcionario"),
  upload.single("imagem"),
  updateMinhaFoto
);

// Rotas apenas para funcionários
router.get("/", autenticarToken, autorizarTipos("funcionario"), getAllClientes);
router.get("/:id", autenticarToken, autorizarTipos("funcionario"), getClienteById);
router.delete("/:id", autenticarToken, autorizarTipos("funcionario"), deleteCliente);

export default router;
