import { Request, Response } from "express";
import { atualizarCliente, salvarFotoPerfil } from "./cliente.service"; // Service interno

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

import { listarClientes, buscarClientePorId, excluirCliente} from "./cliente.service";

export async function getAllClientes(req: Request, res: Response) {
  try {
    const clientes = await listarClientes();
    res.json(clientes);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
}

export async function getClienteById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const cliente = await buscarClientePorId(Number(id));
    res.json(cliente);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function deleteCliente(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const clienteExcluido = await excluirCliente(Number(id));
    res.json({ message: "Cliente excluído com sucesso", clienteExcluido });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}


export async function updateMinhaFoto(req: Request, res: Response) {
  const userId = (req as any).user.id;
  const file = (req as any).file as Express.Multer.File | undefined;

  try {
    if (!file || !file.buffer) {
      return res.status(400).json({ error: "Imagem não enviada" });
    }

    const image = await salvarFotoPerfil(userId, file);
    res.json({ imagemId: image.id });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}


