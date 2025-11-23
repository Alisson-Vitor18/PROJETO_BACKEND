import pool from "../../config/database";
import { saveImageFromBase64 } from "../imagens/imagens.service";

export async function criarProduto(
  nome: string,
  descricao: string,
  pontos: number,
  quantidade?: number,
  file?: Express.Multer.File,
  nomeDaPromocao?: string,
  expiraEm?: Date,
  base64Image?: string,
  imagemOriginalName?: string
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

    // Prioridade 1: base64 enviado diretamente no body
    if (base64Image && typeof base64Image === "string") {
      const created = await saveImageFromBase64({
        base64: base64Image,
        ownerType: "produto",
        ownerId: produto.id,
        originalName: imagemOriginalName || undefined,
      });
      imagemId = created.id;
    } else if (file && file.buffer && file.mimetype) {
      // Prioridade 2: arquivo multipart - converte para base64 e usa o fluxo novo (resources)
      const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const created = await saveImageFromBase64({
        base64: dataUrl,
        ownerType: "produto",
        ownerId: produto.id,
        originalName: file.originalname,
      });
      imagemId = created.id;
    }

    // Atualiza imagem atual do produto (se criada)
    if (imagemId) {
      await client.query(
        `UPDATE produtos_fidelidade SET imagem_id = $1 WHERE id = $2`,
        [imagemId, produto.id]
      );
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

// Obter produto específico
export async function getProdutoById(id: number) {
  const result = await pool.query(
    `SELECT * FROM produtos_fidelidade WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// Editar produto
export async function updateProduto(
  id: number,
  nome?: string,
  descricao?: string,
  pontos?: number,
  quantidade?: number,
  file?: Express.Multer.File,
  nomeDaPromocao?: string,
  expiraEm?: Date,
  base64Image?: string,
  imagemOriginalName?: string
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Atualiza campos básicos
    const result = await client.query(
      `UPDATE produtos_fidelidade SET
        nome = COALESCE($2, nome),
        descricao = COALESCE($3, descricao),
        pontos_necessarios = COALESCE($4, pontos_necessarios),
        quantidade = COALESCE($5, quantidade),
        nome_da_promocao = COALESCE($6, nome_da_promocao),
        expira_em = COALESCE($7, expira_em)
      WHERE id = $1 RETURNING *`,
      [id, nome, descricao, pontos, quantidade, nomeDaPromocao, expiraEm ? expiraEm.toISOString().substring(0, 10) : null]
    );
    const produto = result.rows[0];
    if (!produto) throw new Error("Produto não encontrado");

    let imagemId: number | undefined;
    if (base64Image && typeof base64Image === "string") {
      const created = await saveImageFromBase64({
        base64: base64Image,
        ownerType: "produto",
        ownerId: produto.id,
        originalName: imagemOriginalName || undefined,
      });
      imagemId = created.id;
    } else if (file && file.buffer && file.mimetype) {
      const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const created = await saveImageFromBase64({
        base64: dataUrl,
        ownerType: "produto",
        ownerId: produto.id,
        originalName: file.originalname,
      });
      imagemId = created.id;
    }
    if (imagemId) {
      await client.query(
        `UPDATE produtos_fidelidade SET imagem_id = $1 WHERE id = $2`,
        [imagemId, produto.id]
      );
      produto.imagem_id = imagemId;
    }
    await client.query("COMMIT");
    return produto;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Excluir produto
export async function deleteProduto(id: number) {
  const result = await pool.query(
    `DELETE FROM produtos_fidelidade WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rowCount === 0) throw new Error("Produto não encontrado");
  return true;
}
