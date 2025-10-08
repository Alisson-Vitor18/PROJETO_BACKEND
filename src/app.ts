// Configurações principais do Express.
// Aqui são aplicados middlewares globais, rotas e tratamento de erros.

import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";

import pool from "./config/database";

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Banco funcionando, horário do servidor:", res.rows[0]);
  } catch (err) {
    console.error("Erro ao conectar ao banco:", err);
  }
}

testDB();


const app = express();
app.use(cors());

app.use(express.json());
app.use("/api/auth", authRoutes);

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor rodando! 😎");
});


app.use("/api/auth", authRoutes);

export default app;
