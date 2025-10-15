import pool from "../../config/database";

// Funcionário adiciona pontos a um cliente
export async function adicionarPontos(funcionarioId: number, clienteId: number, pontos: number, descricao: string) {
  if (pontos <= 0) throw new Error("Os pontos devem ser maiores que zero");

  await pool.query(
    "UPDATE usuarios SET pontos = pontos + $1 WHERE id = $2 AND tipo = 'cliente'",
    [pontos, clienteId]
  );

  const result = await pool.query(
    `INSERT INTO historico_pontos (id_cliente, id_funcionario, tipo, pontos, descricao)
     VALUES ($1, $2, 'adicao', $3, $4)
     RETURNING *`,
    [clienteId, funcionarioId, pontos, descricao]
  );

  return result.rows[0];
}

// Cliente ou funcionário vê saldo
export async function verSaldo(clienteId: number) {
  const result = await pool.query(
    "SELECT pontos FROM usuarios WHERE id = $1 AND tipo = 'cliente'",
    [clienteId]
  );

  if (result.rows.length === 0) throw new Error("Cliente não encontrado");

  return result.rows[0].pontos;
}

// Cliente resgata produto (trocando pontos)
export async function resgatarPontos(clienteId: number, produtoId: number) {
  // Verifica se o produto existe
  const produtoRes = await pool.query("SELECT * FROM produtos_fidelidade WHERE id = $1", [produtoId]);
  if (produtoRes.rows.length === 0) throw new Error("Produto não encontrado");

  const produto = produtoRes.rows[0];
  if (produto.quantidade <= 0) throw new Error("Produto indisponível");

  // Busca saldo do cliente
  const clienteRes = await pool.query("SELECT pontos FROM usuarios WHERE id = $1 AND tipo = 'cliente'", [clienteId]);
  if (clienteRes.rows.length === 0) throw new Error("Cliente não encontrado");

  const saldo = clienteRes.rows[0].pontos;
  if (saldo < produto.pontos_necessarios)
    throw new Error("Saldo insuficiente para resgatar este produto");

  // Atualiza banco de dados
  await pool.query("UPDATE usuarios SET pontos = pontos - $1 WHERE id = $2", [produto.pontos_necessarios, clienteId]);
  await pool.query("UPDATE produtos_fidelidade SET quantidade = quantidade - 1 WHERE id = $1", [produtoId]);

  // Registra no histórico
  await pool.query(
    `INSERT INTO historico_pontos (id_cliente, tipo, pontos, descricao)
     VALUES ($1, 'resgate', $2, $3)`,
    [clienteId, produto.pontos_necessarios, `Resgate do produto: ${produto.nome}`]
  );

  return { mensagem: "Resgate realizado com sucesso!", produto: produto.nome };
}

// Listar histórico do cliente
export async function listarHistorico(clienteId: number) {
  const result = await pool.query(
    `SELECT h.id, h.tipo, h.pontos, h.descricao, h.data,
            f.nome AS funcionario_nome
     FROM historico_pontos h
     LEFT JOIN usuarios f ON h.id_funcionario = f.id
     WHERE h.id_cliente = $1
     ORDER BY h.data DESC`,
    [clienteId]
  );

  return result.rows;
}
