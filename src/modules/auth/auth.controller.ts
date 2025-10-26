// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import * as AuthService from "./auth.service";
import pool from "../../config/database";
import { z } from "zod";

const senhaSchema = z.string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número.");


export async function register(req: Request, res: Response) {
  const schema = z.object({
    nome: z.string().min(2),
    telefone: z.string().min(8),
    documento: z.string().min(5),
    senha: senhaSchema,
    tipo: z.enum(["cliente", "funcionario"])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const user = await AuthService.register(parsed.data);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}


export async function login(req: Request, res: Response) {
  try {
    const { documento, senha } = req.body;
    const token = await AuthService.login(documento, senha);
    res.json({ token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

// logout: limpa token_atual do usuário (faça logout do token atual)
export async function logout(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Usuário não autenticado" });
    await pool.query("UPDATE usuarios SET token_atual = NULL WHERE id = $1", [user.id]);
    res.json({ mensagem: "Logout realizado com sucesso" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer logout" });
  }
}

// POST /auth/recuperar-senha
export async function recuperarSenha(req: Request, res: Response) {
  const schema = z.object({ telefone: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { telefone } = parsed.data;
    const resultado = await AuthService.gerarCodigoRecuperacaoPorTelefone(telefone);
    // Mensagem genérica para segurança
    res.json(resultado);
  } catch (err: any) {
    // não revelar se telefone existe
    res.json({ mensagem: "Se o telefone estiver cadastrado, um código foi enviado." });
  }
}

// POST /auth/redefinir-senha
export async function redefinirSenha(req: Request, res: Response) {
  const schema = z.object({
    telefone: z.string().min(8),
    codigo: z.string().length(6),
    novaSenha: senhaSchema
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { telefone, codigo, novaSenha } = parsed.data;
    const resultado = await AuthService.redefinirSenhaPorCodigo(telefone, codigo, novaSenha);
    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}