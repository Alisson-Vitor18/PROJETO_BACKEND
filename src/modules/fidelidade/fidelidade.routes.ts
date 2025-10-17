import { Router } from "express";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";
import { gerarQRCode, usarQRCode, consultarQRCode, getHistorico } from "./fidelidade.controller";

const router = Router();

// Histórico de pontos do cliente
router.get("/historico/:idCliente", autenticarToken, autorizarTipos("cliente", "funcionario"), getHistorico);

// QR Code
router.post("/qrcode/gerar", autenticarToken, gerarQRCode);
router.post("/qrcode/usar", autenticarToken, usarQRCode);
router.get("/qrcode/:token", autenticarToken, consultarQRCode);

export default router;
