import { Pool } from 'pg';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'PROJETO_CARTAO_FIDELIDADE',
    password: '212904',
    port: 5432,
});


const schemaInitScript = `
    CREATE TABLE IF NOT EXISTS CLIENTE (
        CPF VARCHAR(11) PRIMARY KEY,
        Nome VARCHAR(45) NOT NULL,
        Telefone VARCHAR(11) NOT NULL,
        Senha VARCHAR(10) NOT NULL,
        Entrou_EM TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS EMPRESA (
        CNPJ VARCHAR(14) PRIMARY KEY,
        Nome VARCHAR(135) NOT NULL,
        Telefone VARCHAR(11) NOT NULL,
        Senha VARCHAR(10) NOT NULL,
        Entreu_EM TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`;
/* Apenas as tabelas de usuarios foram criadas, precisase obter maior clareza das relacoes e das demais tabelas*/

export async function initializeDatabase() {
    try {
        console.log("Tentando conectar ao banco de dados...");
        await pool.query('SELECT 1'); 
        console.log("Conexão estabelecida com sucesso.");

        console.log("Verificando e criando o schema se necessário...");
        await pool.query(schemaInitScript);
        console.log("Schema inicializado com sucesso.");

    } catch (error) {
        console.error("ERRO FATAL ao inicializar o banco de dados:", error);
        process.exit(1);
        /* O sistema encerra aqui, futuramente deve se tratar melhor o erro de inicializacao */ 
    }
}

export default pool;