import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "212904",   // <--- senha correta
  database: process.env.DB_NAME || "PROJETO_CARTAO_FIDELIDADE", // <--- nome correto do DB
});

export default pool;

export async function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20),
      documento VARCHAR(20) UNIQUE NOT NULL,
      senha VARCHAR(255) NOT NULL,
      tipo VARCHAR(20) NOT NULL
    );
  `;
  await pool.query(schema);
  console.log("Tabelas inicializadas com sucesso!");
}
