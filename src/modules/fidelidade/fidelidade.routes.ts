import { Router } from "express";
import { autenticarToken } from "../../middlewares/auth.middleware";
import { autorizarTipos } from "../../middlewares/authz.middleware";
import { gerarQRCode, usarQRCode, consultarQRCode, getHistorico } from "./fidelidade.controller";

const router = Router();

// Histórico de pontos do cliente
router.get("/historico/:idCliente", autenticarToken, autorizarTipos("cliente", "funcionario"), getHistorico);

// QR Code
router.post("/qrcode/gerar", autenticarToken, autorizarTipos("funcionario"), gerarQRCode); //Rota para gerar QR CODE
router.post("/qrcode/usar", autenticarToken, usarQRCode); //Rota para cliente usar QR CODE
router.get("/qrcode/:token", autenticarToken, consultarQRCode); //Rota para verificar  o estado de um QR CODE
// rota de prêmio fixo removida por não ser necessária


export default router;
