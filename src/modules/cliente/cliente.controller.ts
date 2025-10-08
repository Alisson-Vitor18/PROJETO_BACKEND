import { Request, Response } from "express";
import { atualizarCliente } from "./cliente.service"; // Service interno

export async function updateMe(req: Request, res: Response) {
  const userId = (req as any).user.id; // Pegando o id do token
  const { nome, telefone, documento } = req.body;

  try {
    const updatedUser = await atualizarCliente(userId, { nome, telefone, documento });
    res.json(updatedUser);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}
