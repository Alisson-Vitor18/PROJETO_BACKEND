import { Router } from "express";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";
import { addPontos, getSaldo, resgatar, getHistorico } from "./fidelidade.controller";

const router = Router();

// Funcionário adiciona pontos
router.post("/adicionar", autenticarToken, autorizarTipos("funcionario"), addPontos);

// Cliente ou funcionário vê saldo
router.get("/saldo/:idCliente", autenticarToken, autorizarTipos("cliente", "funcionario"), getSaldo);

// Cliente resgata produto
router.post("/resgatar", autenticarToken, autorizarTipos("cliente"), resgatar);

// Cliente ou funcionário vê histórico
router.get("/historico/:idCliente", autenticarToken, autorizarTipos("cliente", "funcionario"), getHistorico);

export default router;
