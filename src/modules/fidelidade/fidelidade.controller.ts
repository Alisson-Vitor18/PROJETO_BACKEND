import { Request, Response } from "express";
import * as FidelidadeService from "./fidelidade.service";
import { z } from "zod";

// Gerar QR Code (adicionar pontos ou resgate de produto)
export async function gerarQRCode(req: Request, res: Response) {
  try {
    
    const gerarQrSchema = z.object({
      tipo: z.enum(["adicionar", "resgatar"]),
      pontos: z.number().int().positive().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      produtoId: z.number().int().positive().optional()
    });

    const parsed = gerarQrSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { tipo, pontos, titulo, descricao, produtoId } = parsed.data;
    
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
