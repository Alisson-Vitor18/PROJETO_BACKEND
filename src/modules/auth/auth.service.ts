// Contém a lógica de negócios da autenticação, como validação de senha,
// criação de novo usuário e geração de token JWT.

import pool from "../../config/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

interface RegisterData {
  nome: string;
  telefone: string;
  documento: string; // CPF ou CNPJ
  senha: string;
  tipo: "cliente" | "funcionario";
}

export async function register(data: RegisterData) {
  const { nome, telefone, documento, senha, tipo } = data;

  if (!["cliente", "funcionario"].includes(tipo)) {
    throw new Error("Tipo inválido. Use cliente ou funcionario.");
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    //const result = await pool.query(
      /*"INSERT INTO usuarios (nome, telefone, documento, senha, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, telefone, documento, tipo",
      [nome, telefone, documento, senhaHash, tipo]*/
    //);
    return data;
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Documento já cadastrado");
    }
    throw new Error("Erro ao criar usuário");
  }
}

export async function login(documento: string, senha: string) {
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
    process.env.JWT_SECRET || "secretao",
    { expiresIn: "1d" }
  );

  return token;
}
