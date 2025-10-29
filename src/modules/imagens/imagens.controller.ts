import { Request, Response } from "express";
import pool from "../../config/database";

export async function obterImagemPorId(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT mime_type, data FROM imagens WHERE id = $1`,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Imagem não encontrada" });
    }

    const row = result.rows[0];
    res.setHeader("Content-Type", row.mime_type);
    res.send(row.data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar imagem" });
  }
}


