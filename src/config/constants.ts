import path from "path";

export const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";
export const JWT_SECRET = process.env.JWT_SECRET || "secretao";
export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const RATE_LIMIT_MAX = 100; // 100 requisições por window por IP

// Diretório para armazenar arquivos binários (imagens) na raiz do projeto
// Resolvido a partir do diretório atual do processo (raiz do projeto ao iniciar via node)
export const RESOURCES_DIR = process.env.RESOURCES_DIR || path.resolve(process.cwd(), "resources");

// Caminho da imagem de perfil padrão
export const DEFAULT_PROFILE_IMAGE_PATH = process.env.DEFAULT_PROFILE_IMAGE_PATH || path.join(RESOURCES_DIR, "default_profile.png");