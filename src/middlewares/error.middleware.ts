import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err); // em produção, passe para um logger (winston/pino)

  const status = err.status || 500;
  const message = err.message || "Erro interno do servidor";

  res.status(status).json({ error: message });
}