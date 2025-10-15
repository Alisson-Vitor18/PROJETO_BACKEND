import pool from "../../config/database";

export async function criarProduto(nome: string, descricao: string, pontos: number, quantidade: number) {
  if (pontos <= 0 || quantidade < 0) throw new Error("Valores inválidos para pontos ou quantidade");

  const result = await pool.query(
    `INSERT INTO produtos_fidelidade (nome, descricao, pontos_necessarios, quantidade)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nome, descricao, pontos, quantidade]
  );

  return result.rows[0];
}

export async function listarProdutos() {
  const result = await pool.query(
    `SELECT * FROM produtos_fidelidade
     WHERE quantidade > 0
     ORDER BY pontos_necessarios ASC`
  );

  return result.rows;
}
