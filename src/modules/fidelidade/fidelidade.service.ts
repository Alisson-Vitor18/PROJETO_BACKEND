import pool from "../../config/database";
import { randomUUID } from "crypto";

// ---------- GERAR QR CODE ----------
export async function gerarQRCode(
  userId: number,
  tipoUsuario: string,
  tipo: "adicionar" | "resgatar",
  pontos: number,
  titulo: string,
  descricao: string,
  produtoId?: number // só para QR Code de resgate de produto
) {
  if (pontos <= 0) throw new Error("Os pontos devem ser maiores que zero");

  // valida quem pode gerar
  if (tipo === "adicionar" && tipoUsuario !== "funcionario")
    throw new Error("Somente funcionários podem gerar QR Codes de adição");
  if (tipo === "resgatar" && tipoUsuario !== "funcionario")
    throw new Error("Somente funcionários podem gerar QR Codes de resgate de produto");

  // se for resgate, valida produto
  let produto = null;
  if (tipo === "resgatar") {
    if (!produtoId) throw new Error("Produto é necessário para QR Code de resgate");
    const produtoRes = await pool.query("SELECT * FROM produtos_fidelidade WHERE id = $1", [produtoId]);
    if (produtoRes.rows.length === 0) throw new Error("Produto não encontrado");
    produto = produtoRes.rows[0];
    pontos = produto.pontos_necessarios; // ajusta pontos para o necessário do produto
    descricao = `Resgate do produto: ${produto.nome}`;
  }

  const token = randomUUID();

  const result = await pool.query(
    `INSERT INTO qrcodes_pontos (tipo, id_gerador, pontos, titulo, descricao, produto_id, token)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [tipo, userId, pontos, titulo, descricao, produtoId || null, token]
  );

  return {
    mensagem: "QR Code gerado com sucesso",
    qrcode: result.rows[0],
    link: `/fidelidade/qrcode/${token}`,
  };
}

// ---------- USAR QR CODE ----------
export async function usarQRCode(userId: number, tipoUsuario: string, token: string) {
  const result = await pool.query("SELECT * FROM qrcodes_pontos WHERE token = $1", [token]);
  if (result.rows.length === 0) throw new Error("QR Code inválido");
  const qr = result.rows[0];

  if (qr.usado) throw new Error("QR Code já foi utilizado");

  // ADICIONAR PONTOS (funcionario → cliente)
  if (qr.tipo === "adicionar") {
    if (tipoUsuario !== "cliente") throw new Error("Somente clientes podem usar este QR Code");

    await pool.query("UPDATE usuarios SET pontos = pontos + $1 WHERE id = $2", [qr.pontos, userId]);
    await pool.query(
      `INSERT INTO historico_pontos (id_cliente, id_funcionario, tipo, pontos, descricao)
       VALUES ($1, $2, 'adicao', $3, $4)`,
      [userId, qr.id_gerador, qr.pontos, qr.descricao]
    );
  }

  // RESGATE DE PRODUTO (cliente → funcionário)
  if (qr.tipo === "resgatar") {
    if (tipoUsuario !== "cliente") throw new Error("Somente clientes podem usar QR Codes de resgate de produto");

    // verifica saldo do cliente
    const saldoRes = await pool.query("SELECT pontos FROM usuarios WHERE id = $1", [userId]);
    if (saldoRes.rows.length === 0) throw new Error("Cliente não encontrado");

    const saldo = saldoRes.rows[0].pontos;
    if (saldo < qr.pontos) throw new Error("Saldo insuficiente para resgatar o produto");

    // decrementa pontos do cliente
    await pool.query("UPDATE usuarios SET pontos = pontos - $1 WHERE id = $2", [qr.pontos, userId]);

    // decrementa quantidade do produto
    if (qr.produto_id) {
      const produtoRes = await pool.query("SELECT * FROM produtos_fidelidade WHERE id = $1", [qr.produto_id]);
      const produto = produtoRes.rows[0];
      if (produto.quantidade <= 0) throw new Error("Produto indisponível");

      await pool.query("UPDATE produtos_fidelidade SET quantidade = quantidade - 1 WHERE id = $1", [qr.produto_id]);
    }

    // registra histórico
    await pool.query(
      `INSERT INTO historico_pontos (id_cliente, id_funcionario, tipo, pontos, descricao)
       VALUES ($1, $2, 'resgate', $3, $4)`,
      [userId, qr.id_gerador, qr.pontos, qr.descricao]
    );
  }

  // marca QR Code como usado
  await pool.query("UPDATE qrcodes_pontos SET usado = TRUE WHERE token = $1", [token]);

  return { mensagem: "QR Code processado com sucesso!", detalhes: qr };
}

// ---------- CONSULTAR QR CODE ----------
export async function consultarQRCode(token: string) {
  const result = await pool.query("SELECT * FROM qrcodes_pontos WHERE token = $1", [token]);
  if (result.rows.length === 0) throw new Error("QR Code não encontrado");
  return result.rows[0];
}

//===== HISTÓRICO DE PONTOS ======

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