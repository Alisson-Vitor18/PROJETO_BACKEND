import { Request, Response } from "express";
import * as ProdutoService from "./produtos.service";

export async function criarProduto(req: Request, res: Response) {
  try {
    const { nome, descricao, pontos, quantidade } = req.body;
    const produto = await ProdutoService.criarProduto(nome, descricao, pontos, quantidade);
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
