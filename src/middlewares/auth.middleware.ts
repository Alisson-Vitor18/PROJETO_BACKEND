// Middleware de autenticação.
// Intercepta requisições e verifica se o usuário enviou um token JWT válido.

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/database"

interface JwtPayload {
  id: number;
  tipo: string;
  empresaCnpj?: string;
}

// Middleware para verificar se o token JWT é válido
export async function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Verifica se o cabeçalho "Authorization" existe e começa com "Bearer"
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const secret = process.env.JWT_SECRET || "secretao";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    //Busca o token atual do usuário no banco de dados
    const result = await pool.query("SELECT token_atual FROM usuarios WHERE id = $1", [decoded.id]);

    if(result.rows.length == 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const tokenAtivo = result.rows[0].token_atual

    //Se o token enviado for diferente do salvo, o usuário fez login novamente
    if(tokenAtivo !== token) {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }

    // Adiciona o payload decodificado ao objeto `req`
    (req as any).user = decoded;
    next(); // Continua para a próxima função (rota)
    
  } catch (err) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}
