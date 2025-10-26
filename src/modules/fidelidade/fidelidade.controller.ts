import { Request, Response } from "express";
import * as FidelidadeService from "./fidelidade.service";
import { z } from "zod";

// Esquema Zod de geração de QR Code
const gerarQrSchema = z.object({
  tipo: z.enum(["adicionar", "resgatar"]),
  pontos: z.number().int().positive().optional(),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  produtoId: z.number().int().positive().optional(),
  expiraEm: z.string().optional()
});

// Gerar QR Code (adicionar pontos ou resgate)
export async function gerarQRCode(req: Request, res: Response) {
  try {
    const parsed = gerarQrSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const funcionario = (req as any).user;
    if (!funcionario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { tipo, pontos, titulo, descricao, produtoId, expiraEm } = parsed.data;

    // chama o serviço
    const qrcode = await FidelidadeService.gerarQRCode(
      funcionario.id,
      tipo,
      pontos,
      titulo,
      descricao,
      produtoId,
      expiraEm
    );

    return res.json(qrcode);
  } catch (err: any) {
    console.error("Erro ao gerar QR Code:", err);
    res.status(500).json({ error: err.message });
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

// === Gerar QR Code de prêmio fixo (50, 100, 200, 300) ===
const gerarPremioSchema = z.object({
  valor: z.number().int().refine(v => [50, 100, 200, 300].includes(v), {
    message: "valor deve ser 50,100,200 ou 300",
  }),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  expiraEm: z.string().optional(),
});

export async function gerarPremioQRCodeController(req: Request, res: Response) {
  const parsed = gerarPremioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const funcionario = (req as any).user;
    const { valor, titulo, descricao, expiraEm } = parsed.data;
    const resultado = await FidelidadeService.gerarPremioQRCode(
      funcionario.id,
      valor,
      titulo,
      descricao,
      expiraEm
    );
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
