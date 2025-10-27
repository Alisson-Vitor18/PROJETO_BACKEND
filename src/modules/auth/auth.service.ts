// Contém a lógica de negócios da autenticação, como validação de senha,
// criação de novo usuário e geração de token JWT.

import pool from "../../config/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {JWT_SECRET, BCRYPT_ROUNDS } from "../../config/constants";
import { randomInt } from "crypto";

interface RegisterData {
  nome: string;
  telefone: string;
  documento: string; // CPF ou CNPJ
  senha: string;
  tipo: "cliente" | "funcionario";
}

export async function register(data: RegisterData) {
  const { nome, senha, tipo } = data;
  let {documento, telefone} = data;

  if (!["cliente", "funcionario"].includes(tipo)) {
    throw new Error("Tipo inválido. Use cliente ou funcionario.");
  }

   // Remove qualquer caractere que não seja número
    documento = documento.replace(/\D/g, "");
    telefone = telefone.replace(/\D/g, "");

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

  try {
     const result = await pool.query(
        "INSERT INTO usuarios (nome, telefone, documento, senha, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, telefone, documento, tipo",
      [nome, telefone, documento, senhaHash, tipo]
    );
    return result.rows[0];;
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Documento já cadastrado");
    }
    throw new Error("Erro ao criar usuário");
  }
}

export async function login(documento: string, senha: string) {
  // Remove pontos, traços, barras etc
  documento = documento.replace(/\D/g, "");

  const result = await pool.query("SELECT * FROM usuarios WHERE documento = $1", [documento]);

  if (result.rows.length === 0) {
    throw new Error("Usuário não encontrado");
  }

  const user = result.rows[0];
  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    throw new Error("Senha incorreta");
  }

  // Gera token JWT
  const token = jwt.sign(
    { id: user.id, tipo: user.tipo },
    JWT_SECRET,
    { expiresIn: "30d" } //expiração do token de usuário
  );

  await pool.query("UPDATE usuarios SET token_atual = $1 WHERE id = $2", [token, user.id]);

  return token;
}

// Gera e salva um código de recuperação para o telefone informado
export async function gerarCodigoRecuperacaoPorTelefone(telefone: string) {
  telefone = telefone.replace(/\D/g, "");
  // procura usuário pelo telefone
  const userRes = await pool.query("SELECT id, nome FROM usuarios WHERE telefone = $1", [telefone]);
  if (userRes.rows.length === 0) {
    // para segurança, não revelar que telefone não existe — pode retornar ok genérico
    throw new Error("Se este telefone estiver cadastrado, um código foi enviado.");
}

const usuario = userRes.rows[0];

  // gera código numérico de 6 dígitos
  const codigo = String(randomInt(0, 1000000)).padStart(6, "0");

  // expira em 10 minutos
  const expiracao = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await pool.query(
    `INSERT INTO codigos_recuperacao (usuario_id, codigo, expiracao, usado)
     VALUES ($1, $2, $3, FALSE)`,
    [usuario.id, codigo, expiracao]
  );

  // Aqui você integra com serviço SMS (Twilio, etc). Por agora, print no console
  console.log(`[RECOVERY] Código para ${telefone}: ${codigo} (expira em ${expiracao.toISOString()})`);

  // Retornar mensagem genérica
  return { mensagem: "Se o telefone estiver cadastrado, um código foi enviado." };
}

// Redefine senha: telefone + codigo + novaSenha
export async function redefinirSenhaPorCodigo(telefone: string, codigo: string, novaSenha: string) {
  telefone = telefone.replace(/\D/g, "");
  // busca usuário
  const userRes = await pool.query("SELECT id FROM usuarios WHERE telefone = $1", [telefone]);
  if (userRes.rows.length === 0) {
    throw new Error("Código inválido ou expirado.");
  }
  const userId = userRes.rows[0].id;

  // busca código válido não usado e não expirado
  const codigoRes = await pool.query(
    `SELECT id, expiracao, usado FROM codigos_recuperacao
     WHERE usuario_id = $1 AND codigo = $2
     ORDER BY criado_em DESC
     LIMIT 1`,
    [userId, codigo]
  );

  if (codigoRes.rows.length === 0) throw new Error("Código inválido ou expirado.");

  const rec = codigoRes.rows[0];
  if (rec.usado) throw new Error("Código já utilizado.");
  if (new Date(rec.expiracao) < new Date()) throw new Error("Código expirado.");

  const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);

  await pool.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [senhaHash, userId]);
  await pool.query("UPDATE codigos_recuperacao SET usado = TRUE WHERE id = $1", [rec.id]);

  return { mensagem: "Senha redefinida com sucesso." };
}