import { Request, Response } from "express";
import * as FidelidadeService from "./fidelidade.service";
import { z } from "zod";

// Esquema Zod de geração de QR Code (campos opcionais e expiração flexível)
const gerarQrSchema = z.object({
  tipo: z.enum(["adicionar", "resgatar"]),
  pontos: z.union([z.number(), z.string()]).optional(),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  produtoId: z.union([z.number().int().positive(), z.string()]).optional(),
  expiraEm: z.string().optional(),
  dia_expira: z.union([z.number().int().positive(), z.string()]).optional(),
  mes_expira: z.union([z.number().int().positive(), z.string()]).optional(),
  ano_expira: z.union([z.number().int().positive(), z.string()]).optional(),
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

    const { tipo, pontos, titulo, descricao, produtoId, expiraEm, dia_expira, mes_expira, ano_expira } = parsed.data;

    // Normalização de pontos e produtoId vindos como string
    const pontosNum = pontos !== undefined && pontos !== null && `${pontos}` !== ""
      ? Number(pontos)
      : undefined;
    if (pontosNum !== undefined && (Number.isNaN(pontosNum) || !Number.isFinite(pontosNum))) {
      return res.status(400).json({ error: "Campo 'pontos' inválido" });
    }

    const produtoIdNum = produtoId !== undefined && produtoId !== null && `${produtoId}` !== ""
      ? Number(produtoId)
      : undefined;
    if (produtoIdNum !== undefined && (!Number.isInteger(produtoIdNum) || produtoIdNum <= 0)) {
      return res.status(400).json({ error: "Campo 'produtoId' inválido" });
    }

    // Monta expiração a partir de dia/mes/ano ou usa expiraEm ISO diretamente
    let expiraEmIso: string | undefined = undefined;
    if (expiraEm) {
      expiraEmIso = expiraEm;
    } else if (dia_expira || mes_expira || ano_expira) {
      const d = Number(dia_expira);
      const m = Number(mes_expira);
      const a = Number(ano_expira);
      if ([d, m, a].some(v => Number.isNaN(v))) {
        return res.status(400).json({ error: "Data de expiração inválida" });
      }
      const dt = new Date(a, m - 1, d);
      if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
        return res.status(400).json({ error: "Data de expiração inválida" });
      }
      expiraEmIso = dt.toISOString();
    }

    // chama o serviço
    const qrcode = await FidelidadeService.gerarQRCode(
      funcionario.id,
      tipo,
      pontosNum,
      titulo,
      descricao,
      produtoIdNum,
      expiraEmIso
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

// endpoints de prêmio fixo removidos (frontend enviará JSON conforme necessidade)
