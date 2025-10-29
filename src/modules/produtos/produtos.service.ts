import pool from "../../config/database";

export async function criarProduto(
  nome: string,
  descricao: string,
  pontos: number,
  quantidade?: number,
  file?: Express.Multer.File,
  nomeDaPromocao?: string,
  expiraEm?: Date
) {
  if (pontos <= 0) throw new Error("Valores inválidos para pontos");
  if (typeof quantidade !== "undefined" && quantidade < 0) throw new Error("Quantidade inválida");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO produtos_fidelidade (nome, descricao, pontos_necessarios, quantidade, nome_da_promocao, expira_em)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nome,
        descricao ?? null,
        pontos,
        typeof quantidade === "number" ? quantidade : null,
        nomeDaPromocao ?? null,
        expiraEm ? expiraEm.toISOString().substring(0, 10) : null
      ]
    );

    const produto = result.rows[0];
    let imagemId: number | undefined;

    if (file && file.buffer && file.mimetype) {
      const img = await client.query(
        `INSERT INTO imagens (owner_type, owner_id, mime_type, original_name, data)
         VALUES ('produto', $1, $2, $3, $4)
         RETURNING id`,
        [produto.id, file.mimetype, file.originalname, file.buffer]
      );
      imagemId = img.rows[0]?.id;

      // Atualiza a imagem atual do produto
      if (imagemId) {
        await client.query(
          `UPDATE produtos_fidelidade SET imagem_id = $1 WHERE id = $2`,
          [imagemId, produto.id]
        );
      }
    }

    await client.query("COMMIT");
    return imagemId ? { ...produto, imagem_id: imagemId } : produto;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listarProdutos() {
  const result = await pool.query(
    `SELECT * FROM produtos_fidelidade
     WHERE (quantidade IS NULL OR quantidade > 0)
       AND (expira_em IS NULL OR expira_em >= CURRENT_DATE)
     ORDER BY pontos_necessarios ASC`
  );

  return result.rows;
}
