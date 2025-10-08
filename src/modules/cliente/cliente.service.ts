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
