import path from "path";
import pool from "../../config/database";
import { RESOURCES_DIR } from "../../config/constants";
import {
  buildResourceFilePath,
  computeSha256,
  decodeBase64Image,
  ensureDir,
  fileExists,
  readFileAsBase64,
  writeFileIfNotExists,
} from "../../utils/file";

type OwnerType = "usuario" | "produto";

export async function saveImageFromBase64(params: {
  base64: string;
  ownerType: OwnerType;
  ownerId: number;
  originalName?: string;
}) {
  const { base64, ownerType, ownerId, originalName } = params;

  const decoded = decodeBase64Image(base64);
  const hash = computeSha256(decoded.buffer);

  ensureDir(RESOURCES_DIR);
  const filePath = buildResourceFilePath(RESOURCES_DIR, hash, decoded.extension);

  // Evita gravar novamente se já existir o arquivo deste hash
  writeFileIfNotExists(filePath, decoded.buffer);

  const result = await pool.query(
    `INSERT INTO imagens (owner_type, owner_id, mime_type, original_name, file_path, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, owner_type, owner_id, mime_type, original_name, file_path, content_hash, created_at`,
    [ownerType, ownerId, decoded.mimeType, originalName || null, filePath, hash]
  );

  return result.rows[0];
}

export async function getImageBase64ById(id: number) {
  const result = await pool.query(
    `SELECT id, mime_type, file_path FROM imagens WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0] as {
    id: number;
    mime_type: string;
    file_path: string | null;
  };

  let base64: string;
  if (row.file_path) {
    if (!fileExists(row.file_path)) {
      throw new Error("Arquivo de imagem não encontrado no disco");
    } else {
      base64 = readFileAsBase64(row.file_path);
    }
  } else {
    throw new Error("Imagem sem fonte de dados disponível");
  }

  return { id: row.id, mimeType: row.mime_type, base64 };
}

export async function getImageById(id: number) {
  const result = await pool.query(
    `SELECT id, mime_type, file_path FROM imagens WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0] as {
    id: number;
    mime_type: string;
    file_path: string | null;
  };

  if (!row.file_path) {
    throw new Error("Imagem sem fonte de dados disponível");
  }

  if (!fileExists(row.file_path)) {
    throw new Error("Arquivo de imagem não encontrado no disco");
  }

  return { id: row.id, mimeType: row.mime_type, filePath: row.file_path };
}


