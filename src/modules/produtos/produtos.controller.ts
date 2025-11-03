import { Request, Response } from "express";
import * as ProdutoService from "./produtos.service";

export async function criarProduto(req: Request, res: Response) {
  try {
    const { nome, descricao, pontos, quantidade, nome_da_promocao, dia_expira, mes_expira, ano_expira, base64Image, imagem_nome } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

    const quantidadeNum = quantidade !== undefined && quantidade !== null && quantidade !== ""
      ? Number(quantidade)
      : undefined;

    const pontosNum = Number(pontos);
    if (Number.isNaN(pontosNum)) {
      return res.status(400).json({ error: "Campo 'pontos' inválido" });
    }

    let expiraEm: Date | undefined = undefined;
    if (dia_expira || mes_expira || ano_expira) {
      const d = Number(dia_expira);
      const m = Number(mes_expira);
      const a = Number(ano_expira);
      if ([d, m, a].some((v) => Number.isNaN(v))) {
        return res.status(400).json({ error: "Data de expiração inválida" });
      }
      const temp = new Date(a, m - 1, d);
      if (temp.getFullYear() !== a || temp.getMonth() !== m - 1 || temp.getDate() !== d) {
        return res.status(400).json({ error: "Data de expiração inválida" });
      }
      expiraEm = temp;
    }

    const produto = await ProdutoService.criarProduto(
      nome,
      descricao,
      pontosNum,
      quantidadeNum,
      file,
      nome_da_promocao,
      expiraEm,
      base64Image,
      imagem_nome
    );
    res.json(produto);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function listarProdutos(req: Request, res: Response) {
  try {
    const produtos = await ProdutoService.listarProdutos();
    res.json(produtos);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
}
