// server.ts
import app from "./src/app";
import pool, { initializeDatabase } from "./src/config/database";

const PORT = process.env.PORT || 3000;

// Testa a conexão com o banco
async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Banco funcionando, horário do servidor:", res.rows[0]);
  } catch (err) {
    console.error("Erro ao conectar ao banco:", err);
    process.exit(1);
  }
}

// Inicializa o servidor
async function startServer() {
  await testDB();
  
  // Cria/atualiza as tabelas
  await initializeDatabase(); 

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
