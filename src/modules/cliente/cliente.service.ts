import pool from "../../config/database";

interface AtualizarData {
  nome?: string;
  telefone?: string;
  documento?: string;
}

export async function atualizarCliente(userId: number, { nome, telefone, documento }: AtualizarData) {
  const result = await pool.query(
    `UPDATE usuarios
     SET nome = COALESCE($1, nome),
         telefone = COALESCE($2, telefone),
         documento = COALESCE($3, documento)
     WHERE id = $4
     RETURNING id, nome, telefone, documento, tipo`,
    [nome, telefone, documento, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Usuário não encontrado");
  }

  return result.rows[0];
}

export async function listarClientes() {
  const result = await pool.query(
    `SELECT id, nome, telefone, documento, tipo
     FROM usuarios
     WHERE tipo = 'cliente'
     ORDER BY id ASC`
  );

  return result.rows;
}

export async function buscarClientePorId(id: number) {
  const result = await pool.query(
    `SELECT id, nome, telefone, documento, tipo
     FROM usuarios
     WHERE id = $1 AND tipo = 'cliente'`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Cliente não encontrado");
  }

  return result.rows[0];
}

export async function excluirCliente(id: number) {
  const result = await pool.query(
    `DELETE FROM usuarios
     WHERE id = $1 AND tipo = 'cliente'
     RETURNING id, nome, documento`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Cliente não encontrado ou não é um cliente válido");
  }

  return result.rows[0];
}



