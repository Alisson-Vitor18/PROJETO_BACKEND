// Ponto de entrada da aplicação.
// Carrega o app e inicia o servidor na porta definida no .env.

import express from "express";
import cors from "cors";
import authRoutes from "./src/modules/auth/auth.routes";
import clienteRoutes from "./src/modules/cliente/cliente.routes";


const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/cliente", clienteRoutes);

// Rotas
app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
  res.send('Servidor rodando');
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});


