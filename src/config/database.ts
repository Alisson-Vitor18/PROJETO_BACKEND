import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres", // <--- Usuário do banco de dados
  password: process.env.DB_PASSWORD || "212904",   // <--- Senha do banco de dados
  database: process.env.DB_NAME || "PROJETO_CARTAO_FIDELIDADE", // <--- Nome do banco de dados
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
        documento VARCHAR(20) UNIQUE,
        senha VARCHAR(255),
        tipo VARCHAR(20) NOT NULL DEFAULT 'cliente'
      );
    `);

    await pool.query(`
      ALTER TABLE usuarios ALTER COLUMN documento DROP NOT NULL;
    `);

    await pool.query(`
      ALTER TABLE usuarios ALTER COLUMN senha DROP NOT NULL;
    `);

    await pool.query(`
      ALTER TABLE usuarios ALTER COLUMN tipo SET DEFAULT 'cliente';
    `);

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
    `);

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cadastro_completo BOOLEAN DEFAULT TRUE;
    `);

    await pool.query(`
      UPDATE usuarios SET cadastro_completo = TRUE WHERE cadastro_completo IS NULL;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_unique
      ON usuarios (LOWER(email))
      WHERE email IS NOT NULL;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_id_unique
      ON usuarios (google_id)
      WHERE google_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150),
        cnpj VARCHAR(14) UNIQUE NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios_empresas (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        empresa_cnpj VARCHAR(14) NOT NULL REFERENCES empresas(cnpj) ON UPDATE CASCADE ON DELETE CASCADE,
        papel VARCHAR(20) NOT NULL DEFAULT 'admin',
        criado_em TIMESTAMP DEFAULT NOW(),
        UNIQUE (usuario_id),
        UNIQUE (usuario_id, empresa_cnpj)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario
      ON usuarios_empresas (usuario_id);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario_unique
      ON usuarios_empresas (usuario_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_cnpj
      ON usuarios_empresas (empresa_cnpj);
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
    // Ajustes de colunas em produtos_fidelidade: opcionais, expiração e promoção
    await pool.query(`ALTER TABLE produtos_fidelidade
      ALTER COLUMN descricao DROP NOT NULL;
    `);

    await pool.query(`ALTER TABLE produtos_fidelidade
      ALTER COLUMN quantidade DROP NOT NULL;
    `);

    await pool.query(`ALTER TABLE produtos_fidelidade
      ADD COLUMN IF NOT EXISTS expira_em DATE;
    `);

    await pool.query(`ALTER TABLE produtos_fidelidade
      ADD COLUMN IF NOT EXISTS nome_da_promocao VARCHAR(100);
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

    //Adiciona a coluna de expiração do QR code
    await pool.query(`ALTER TABLE qrcodes_pontos
      ADD COLUMN IF NOT EXISTS expira_em TIMESTAMP
    `);

    await pool.query(`CREATE TABLE IF NOT EXISTS codigos_recuperacao (
      id SERIAL PRIMARY KEY,
      usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo VARCHAR(6) NOT NULL,
      expiracao TIMESTAMP NOT NULL,
      usado BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMP DEFAULT NOW()
      );
`   );

    // Cria tabela para armazenar imagens (perfil e produtos)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imagens (
        id SERIAL PRIMARY KEY,
        owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('usuario','produto')),
        owner_id INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        original_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Índice para buscas por dono
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imagens_owner ON imagens (owner_type, owner_id);
    `);

    // Novas colunas para armazenamento em disco
    await pool.query(`
      ALTER TABLE imagens
      ADD COLUMN IF NOT EXISTS file_path TEXT;
    `);

    await pool.query(`
      ALTER TABLE imagens
      ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imagens_content_hash ON imagens (content_hash);
    `);

    // Remover coluna antiga de dados binários
    await pool.query(`
      ALTER TABLE imagens
      DROP COLUMN IF EXISTS data;
    `);

    // Coluna para imagem atual do produto (referência para imagens.id)
    await pool.query(`
      ALTER TABLE produtos_fidelidade
      ADD COLUMN IF NOT EXISTS imagem_id INT REFERENCES imagens(id);
    `);

    // Coluna para foto de perfil atual do usuário (referência para imagens.id)
    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS foto_imagem_id INT REFERENCES imagens(id);
    `);

    console.log("Tabelas inicializadas com sucesso!");
  } catch (err) {
    console.error("Erro ao inicializar o banco:", err);
  }
}
