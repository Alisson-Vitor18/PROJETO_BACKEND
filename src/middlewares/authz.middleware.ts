// src/middlewares/authz.middleware.ts

import { Request, Response, NextFunction } from "express";

// Middleware que verifica se o usuário tem o tipo permitido
export function autorizarTipos(...tiposPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!tiposPermitidos.includes(user.tipo)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
}
