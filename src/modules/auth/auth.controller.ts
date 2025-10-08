// Responsável por receber as requisições HTTP relacionadas à autenticação,
// chamar os serviços correspondentes e devolver a resposta ao cliente.

import {Request, Response} from "express";
import * as AuthService from "./auth.service";

export async function register(req: Request, res: Response) {
    try {
        const {nome, telefone, documento, senha, tipo} = req.body;
        const user = await AuthService.register({nome, telefone, documento, senha, tipo});
        res.status(201).json(user);
    } catch (err: any) {
        console.error(err);
        res.status(400).json({error: err.message});
    }   
}

export async function login(req: Request, res: Response) {
  try {
    const { documento, senha } = req.body;
    const token = await AuthService.login(documento, senha);
    res.json({ token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}