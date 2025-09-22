// Carregar as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const app = express();

// Usar a variável PORT do arquivo .env, ou 3000 como fallback
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Alguma outra coisa');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});