import { Request, Response } from "express";
import * as FidelidadeService from "./fidelidade.service";

// Funcionário adiciona pontos
export async function addPontos(req: Request, res: Response) {
  try {
    const { idCliente, pontos, descricao } = req.body;
    const funcionarioId = (req as any).user.id;

    const resultado = await FidelidadeService.adicionarPontos(funcionarioId, idCliente, pontos, descricao);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Cliente ou funcionário vê saldo
export async function getSaldo(req: Request, res: Response) {
  try {
    const { idCliente } = req.params;
    const user = (req as any).user;

    if (user.tipo === "cliente" && user.id !== Number(idCliente)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const saldo = await FidelidadeService.verSaldo(Number(idCliente));
    res.json({ idCliente, saldo });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Cliente resgata produto
export async function resgatar(req: Request, res: Response) {
  try {
    const clienteId = (req as any).user.id;
    const { produtoId } = req.body;

    const resultado = await FidelidadeService.resgatarPontos(clienteId, produtoId);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Histórico de pontos
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
