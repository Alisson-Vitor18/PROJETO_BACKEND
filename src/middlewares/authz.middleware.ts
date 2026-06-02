// src/middlewares/authz.middleware.ts

import { Request, Response, NextFunction } from "express";

// Middleware que verifica se o usuário tem o tipo permitido
export function autorizarTipos(...tiposPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const tiposDoUsuario = user.tipo === "admin" ? ["admin", "funcionario"] : [user.tipo];
    const autorizado = tiposDoUsuario.some((tipo) => tiposPermitidos.includes(tipo));

    if (!autorizado) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
}
