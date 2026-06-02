// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import * as AuthService from "./auth.service";
import pool from "../../config/database";
import { z } from "zod";
import { cpf, cnpj } from "cpf-cnpj-validator";

const senhaSchema = z.string()
  .min(8, "A senha deve ter no minimo 8 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiuscula.")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minuscula.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um numero.");

const documentoSchema = z.string().refine((val) => {
  const numeros = val.replace(/\D/g, "");
  return cpf.isValid(numeros) || cnpj.isValid(numeros);
}, {
  message: "Documento invalido. Informe um CPF ou CNPJ valido.",
});

const cnpjSchema = z.string().refine((val) => {
  const numeros = val.replace(/\D/g, "");
  return cnpj.isValid(numeros);
}, {
  message: "CNPJ invalido.",
});

export async function register(req: Request, res: Response) {
  const schema = z.object({
    nome: z.string().min(2),
    telefone: z.string().min(8),
    documento: documentoSchema,
    senha: senhaSchema,
    tipo: z.enum(["cliente", "funcionario"]),
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

export async function loginComGoogle(req: Request, res: Response) {
  const schema = z.object({
    googleId: z.string().min(1).optional(),
    google_id: z.string().min(1).optional(),
    sub: z.string().min(1).optional(),
    email: z.string().email(),
    nome: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    fotoUrl: z.string().url().optional(),
    foto_url: z.string().url().optional(),
    picture: z.string().url().optional(),
  }).refine((data) => data.googleId || data.google_id || data.sub, {
    message: "Informe o identificador Google do usuario.",
    path: ["googleId"],
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const data = parsed.data;
    const resultado = await AuthService.loginComGoogle({
      googleId: data.googleId || data.google_id || data.sub || "",
      email: data.email,
      nome: data.nome || data.name,
      fotoUrl: data.fotoUrl || data.foto_url || data.picture,
    });

    res.json(resultado);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

export async function completarCadastroGoogle(req: Request, res: Response) {
  const empresaSchema = z.object({
    nome: z.string().min(2).optional(),
    cnpj: cnpjSchema,
  });

  const schema = z.object({
    nome: z.string().min(2).optional(),
    telefone: z.string().min(8),
    documento: documentoSchema.optional(),
    cpf: documentoSchema.optional(),
    tipo: z.enum(["cliente", "admin"]).optional(),
    admin: z.boolean().optional(),
    empresa: empresaSchema.optional(),
    empresaCnpj: cnpjSchema.optional(),
    cnpjEmpresa: cnpjSchema.optional(),
    cnpj: cnpjSchema.optional(),
    nomeEmpresa: z.string().min(2).optional(),
  }).refine((data) => data.documento || data.cpf, {
    message: "Informe o documento do usuario.",
    path: ["documento"],
  }).refine((data) => {
    const tipo = data.tipo || (data.admin ? "admin" : "cliente");
    return tipo !== "admin" || Boolean(data.empresa?.cnpj || data.empresaCnpj || data.cnpjEmpresa || data.cnpj);
  }, {
    message: "Informe o CNPJ da empresa para cadastrar um admin.",
    path: ["empresa"],
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuario nao autenticado" });

    const data = parsed.data;
    const tipo = data.tipo || (data.admin ? "admin" : "cliente");
    const empresaCnpj = data.empresa?.cnpj || data.empresaCnpj || data.cnpjEmpresa || data.cnpj;
    const empresaNome = data.empresa?.nome || data.nomeEmpresa;

    const resultado = await AuthService.completarCadastroGoogle(userId, {
      nome: data.nome,
      telefone: data.telefone,
      documento: data.documento || data.cpf || "",
      tipo,
      empresa: empresaCnpj ? { cnpj: empresaCnpj, nome: empresaNome } : undefined,
    });

    res.json(resultado);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Usuario nao autenticado" });
    await pool.query("UPDATE usuarios SET token_atual = NULL WHERE id = $1", [user.id]);
    res.json({ mensagem: "Logout realizado com sucesso" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer logout" });
  }
}

export async function recuperarSenha(req: Request, res: Response) {
  const schema = z.object({ telefone: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { telefone } = parsed.data;
    const resultado = await AuthService.gerarCodigoRecuperacaoPorTelefone(telefone);
    res.json(resultado);
  } catch (err: any) {
    res.json({ mensagem: "Se o telefone estiver cadastrado, um codigo foi enviado." });
  }
}

export async function redefinirSenha(req: Request, res: Response) {
  const schema = z.object({
    telefone: z.string().min(8),
    codigo: z.string().length(6),
    novaSenha: senhaSchema,
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

export async function getMeuPerfil(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuario nao autenticado" });

    const perfil = await AuthService.getMeuPerfil(userId);
    res.json(perfil);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
