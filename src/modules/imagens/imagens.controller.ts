import { Request, Response } from "express";
import path from "path";
import { getImageById } from "./imagens.service";

export async function getImagem(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const imagem = await getImageById(id);
    if (!imagem) {
      return res.status(404).json({ error: "Imagem não encontrada" });
    }

    res.type(imagem.mimeType);
    res.sendFile(path.resolve(imagem.filePath));
  } catch (err: any) {
    if (err.message === "Arquivo de imagem não encontrado no disco") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "Erro ao buscar imagem" });
  }
}
