export const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";
export const JWT_SECRET = process.env.JWT_SECRET || "secretao";
export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const RATE_LIMIT_MAX = 100; // 100 requisições por window por IP