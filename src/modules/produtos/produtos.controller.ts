import { Request, Response } from "express";
import * as ProdutoService from "./produtos.service";

export async function criarProduto(req: Request, res: Response) {
  try {
    const { nome, descricao, pontos, quantidade, nome_da_promocao, dia_expira, mes_expira, ano_expira, base64Image, imagem_nome } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

    console.log('Received body:', req.body);
    console.log('Received file:', file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : 'No file');

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
    console.error('Error in criarProduto:', err);
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

// Obter produto específico
export async function getProdutoById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const produto = await ProdutoService.getProdutoById(id);
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(produto);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Editar produto
export async function updateProduto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const { nome, descricao, pontos, quantidade, nome_da_promocao, dia_expira, mes_expira, ano_expira, base64Image, imagem_nome } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

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

    const produto = await ProdutoService.updateProduto(
      id,
      nome,
      descricao,
      pontos,
      quantidade,
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

// Excluir produto
export async function deleteProduto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await ProdutoService.deleteProduto(id);
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
