// Este arquivo é responsável por configurar a conexão com o banco de dados PostgreSQL.
// Aqui definimos as credenciais, host, porta, nome do banco e exportamos a instância
// que será usada nos models e serviços do projeto.

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config(); // lê variáveis do .env

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "sua_senha",
  database: process.env.DB_NAME || "cartao_fidelidade",
});

pool.on("connect", () => {
  console.log("Conectado ao PostgreSQL com sucesso!");
});

pool.on("error", (err) => {
  console.error("Erro no PostgreSQL:", err);
});

export default pool;

