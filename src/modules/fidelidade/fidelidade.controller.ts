import { Request, Response } from "express";
import * as FidelidadeService from "./fidelidade.service";

// Gerar QR Code (adicionar pontos ou resgate de produto)
export async function gerarQRCode(req: Request, res: Response) {
  try {
    const usuario = (req as any).user;
    const { tipo, pontos, titulo, descricao, produtoId } = req.body;

    //Descrição do QR CODE
    const qrcode = await FidelidadeService.gerarQRCode(
      usuario.id,
      usuario.tipo,
      tipo,
      pontos,
      titulo,
      descricao,
      produtoId
    );
    res.json(qrcode);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Usar QR Code
export async function usarQRCode(req: Request, res: Response) {
  try {
    const usuario = (req as any).user;
    const { token } = req.body;

    const resultado = await FidelidadeService.usarQRCode(usuario.id, usuario.tipo, token);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Consultar QR Code
export async function consultarQRCode(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const qrcode = await FidelidadeService.consultarQRCode(token);
    res.json(qrcode);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getHistorico(req: Request, res: Response) {
  try {
    const { idCliente } = req.params;
    const user = (req as any).user;

    if (user.tipo === "cliente" && user.id !== Number(idCliente)) {
      return res.status(403).json({ error: "Acesso negado ao histórico de outro cliente" });
    }

    const historico = await FidelidadeService.listarHistorico(Number(idCliente));
    res.json(historico);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
