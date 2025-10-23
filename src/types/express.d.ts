import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; tipo: string } & Record<string, any>;
    }
  }
}