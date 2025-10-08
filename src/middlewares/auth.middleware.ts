// Middleware de autenticação.
// Intercepta requisições e verifica se o usuário enviou um token JWT válido.

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: number;
  tipo: string;
}

// Middleware para verificar se o token JWT é válido
export function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Verifica se o cabeçalho "Authorization" existe e começa com "Bearer"
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const secret = process.env.JWT_SECRET || "secretao";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Adiciona o payload decodificado ao objeto `req`
    (req as any).user = decoded;

    next(); // Continua para a próxima função (rota)
  } catch (err) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}
