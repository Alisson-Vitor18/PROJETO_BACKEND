import { Pool } from 'pg';

// constantes para a conexao do banco de dados
const DB_NAME = 'PROJETO_CARTAO_FIDELIDADE';
const DB_USER = 'postgres';
const DB_PASSWORD = `212904`; // senha do PostgreSQL do local host.
const DB_HOST = 'localhost';
const DB_PORT = 5432;

// dados da conexao inicial para criar o banco de dados do zero caso o mesmo nao exista
const adminPool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: 'postgres',
    password: DB_PASSWORD,
    port: DB_PORT,
    max: 1
});

// dados conexao final do banco de dados do projeto
export const appPool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: DB_NAME,
    password: DB_PASSWORD,
    port: DB_PORT,
});

// estruturas das tabelas contendo as informacoes
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
`; // as senhas foram limitadas a 10 caracteres, mas pode ser mudada conforme nescessidade

// funcao que inicializa o banco de dados
export async function initializeDatabase() {
    console.log(`Verificando existencia do Banco de Dados: ${DB_NAME}`);

    // tenta conectar ao Postgre admin e criar apartir dai o banco de dados
    try {
        await adminPool.query(`CREATE DATABASE ${DB_NAME} IF NOT EXISTS`);
        console.log(`Database "${DB_NAME}" verificado/criado com sucesso.`);

    // captura o erro de criacao caso haja (o alerta de banco ja existente e ignorado) finaliza a conexao e sai do processo.
    } catch (error: any) {
        if (error.code !== '42P04') {
             console.error("ERRO ao criar o database:", error);
             adminPool.end();
             process.exit(1);
        }

        console.log(`Database "${DB_NAME}" ja existe. Prosseguindo...`);

    // finaliza a conexao com o Postgre admin
    } finally {
        await adminPool.end();
    }

    // tenta criar as tabelesa
    try {
        console.log("Conectando ao database do projeto e criando schemas...");
        await appPool.query(schemaInitScript);
        console.log("Schema inicializado com sucesso.");

    // captura erros, finaliza conexao com o BD, e sai do processo.
    } catch (error) {
        console.error("ERRO ao inicializar o Schema:", error);
        await appPool.end();
        process.exit(1);
    }
}