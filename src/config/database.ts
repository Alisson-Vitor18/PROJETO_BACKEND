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
  try {
    // Cria tabela usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        telefone VARCHAR(20),
        documento VARCHAR(20) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL
      );
    `);

    // Adiciona coluna pontos, se não existir
    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pontos INT DEFAULT 0;
    `);

    //Adiciona coluna para guardar tokens dos usuários
    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_atual TEXT
    `);

    // Cria tabela historico_pontos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_pontos (
        id SERIAL PRIMARY KEY,
        id_cliente INT REFERENCES usuarios(id) ON DELETE CASCADE,
        id_funcionario INT REFERENCES usuarios(id) ON DELETE SET NULL,
        tipo VARCHAR(20) NOT NULL,
        pontos INT NOT NULL,
        descricao TEXT,
        data TIMESTAMP DEFAULT NOW()
      );
    `);

    // Cria tabela para funcionarios cadastrarem produtos 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos_fidelidade (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        pontos_necessarios INT NOT NULL CHECK (pontos_necessarios > 0),
        quantidade INT DEFAULT 0 CHECK (quantidade >= 0)
      );
    `);

    //Cria uma tabela para o QR-CODE de pontos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qrcodes_pontos (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(10) CHECK (tipo IN ('adicionar', 'resgatar')) NOT NULL,
        id_gerador INT REFERENCES usuarios(id) NOT NULL,
        pontos INT NOT NULL,
        titulo VARCHAR(100),
        descricao TEXT,
        token VARCHAR(255) UNIQUE NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT NOW()
      );  
    `);

    //Adiciona a coluna produto_id à tabela qrcodes_pontos
    await pool.query(`ALTER TABLE qrcodes_pontos
      ADD COLUMN IF NOT EXISTS produto_id INT REFERENCES produtos_fidelidade(id);
    `);

    console.log("Tabelas inicializadas com sucesso!");
  } catch (err) {
    console.error("Erro ao inicializar o banco:", err);
  }
}
