import pool from "../../config/database";
import { readFileAsDataUrl } from "../../utils/file";
import { saveImageFromBase64 } from "../imagens/imagens.service";

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
    `SELECT u.id, u.nome, u.telefone, u.documento, u.tipo,
            u.foto_imagem_id, i.mime_type, i.file_path
     FROM usuarios u
     LEFT JOIN imagens i ON i.id = u.foto_imagem_id
     WHERE u.tipo = 'cliente'
     ORDER BY u.id ASC`
  );

  // Monta data URL se houver file_path
  const mapped = result.rows.map((row: any) => {
    let fotoDataUrl: string | null = null;
    if (row.file_path) {
      try {
        fotoDataUrl = readFileAsDataUrl(row.file_path);
      } catch {}
    }
    return {
      id: row.id,
      nome: row.nome,
      telefone: row.telefone,
      documento: row.documento,
      tipo: row.tipo,
      foto_imagem_id: row.foto_imagem_id,
      foto_data_url: fotoDataUrl,
    };
  });

  return mapped;
}

export async function listarClientesParaExibicao(telefone?: string, nome?: string) {
  // Normaliza telefone para dígitos
  const telDigits = (telefone || "").replace(/\D/g, "");
  const nomeQuery = (nome || "").trim();

  let query =
    `SELECT u.id, u.nome, i.file_path
     FROM usuarios u
     LEFT JOIN imagens i ON i.id = u.foto_imagem_id
     WHERE u.tipo = 'cliente'`;
  const params: any[] = [];

  if (telDigits.length > 0) {
    if (telDigits.length >= 10) {
      // número completo: igualdade
      query += ` AND regexp_replace(u.telefone, '[^0-9]+', '', 'g') = $${params.length + 1}`;
      params.push(telDigits);
    } else {
      // parcial: like
      query += ` AND regexp_replace(u.telefone, '[^0-9]+', '', 'g') LIKE $${params.length + 1}`;
      params.push(`%${telDigits}%`);
    }
  }

  if (nomeQuery.length > 0) {
    // busca case-insensitive por nome
    query += ` AND u.nome ILIKE $${params.length + 1}`;
    params.push(`%${nomeQuery}%`);
  }

  query += ` ORDER BY u.id ASC`;
  const result = await pool.query(query, params);

  return result.rows.map((row: any) => {
    let fotoDataUrl: string | null = null;
    if (row.file_path) {
      try {
        fotoDataUrl = readFileAsDataUrl(row.file_path);
      } catch {}
    }
    return {
      id: row.id,
      nome: row.nome,
      foto_data_url: fotoDataUrl,
    };
  });
}

export async function buscarClientePorId(id: number) {
  const result = await pool.query(
    `SELECT u.id, u.nome, u.telefone, u.documento, u.tipo,
            u.foto_imagem_id, i.mime_type, i.file_path
     FROM usuarios u
     LEFT JOIN imagens i ON i.id = u.foto_imagem_id
     WHERE u.id = $1 AND u.tipo = 'cliente'`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Cliente não encontrado");
  }

  const row = result.rows[0];
  let fotoDataUrl: string | null = null;
  if (row.file_path) {
    try {
      fotoDataUrl = readFileAsDataUrl(row.file_path);
    } catch {}
  }

  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    documento: row.documento,
    tipo: row.tipo,
    foto_imagem_id: row.foto_imagem_id,
    foto_data_url: fotoDataUrl,
  };
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



export async function salvarFotoPerfil(userId: number, file: Express.Multer.File) {
  const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const created = await saveImageFromBase64({
    base64: dataUrl,
    ownerType: "usuario",
    ownerId: userId,
    originalName: file.originalname,
  });

  await pool.query(
    `UPDATE usuarios SET foto_imagem_id = $1 WHERE id = $2`,
    [created.id, userId]
  );

  return { id: created.id };
}


