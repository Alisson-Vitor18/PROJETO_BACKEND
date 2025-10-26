// src/modules/fidelidade/fidelidade.service.ts
import pool from "../../config/database";
import { randomUUID } from 'crypto';

// ... manter gerarQRCode e consultarQRCode (sem alteração) ...

export async function gerarQRCode(
  funcionarioId: number,
  tipo: "adicionar" | "resgatar",
  pontos?: number,
  titulo?: string,
  descricao?: string,
  produtoId?: number,
  expiraEm?: string
) {
  const token = randomUUID();
  let expira: Date | null = null;

  if (expiraEm) {
    expira = new Date(expiraEm);
    if (isNaN(expira.getTime())) throw new Error("Data de expiração inválida");
  }

  const result = await pool.query(
    `INSERT INTO qrcodes_pontos (tipo, id_gerador, pontos, titulo, descricao, produto_id, token, expira_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [tipo, funcionarioId, pontos || null, titulo || null, descricao || null, produtoId || null, token, expira ? expira.toISOString() : null]
  );

  return {
    mensagem: "QR Code gerado com sucesso",
    qrcode: result.rows[0],
    link: `/fidelidade/qrcode/${token}`,
  };
}

export async function usarQRCode(userId: number, tipoUsuario: string, token: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // bloqueia a row do qrcode
    const qrRes = await client.query("SELECT * FROM qrcodes_pontos WHERE token = $1 FOR UPDATE", [token]);
    
    if (qrRes.rows.length === 0) throw new Error("QR Code inválido");
    const qr = qrRes.rows[0];

    if (qr.expira_em) {
      const agora = new Date();
      const expira = new Date(qr.expira_em);
      if (agora > expira) throw new Error("Este QR Code expirou.");
    }

    if (qr.usado) throw new Error("QR Code já foi utilizado");

    if (qr.tipo === "adicionar") {
      if (tipoUsuario !== "cliente") throw new Error("Somente clientes podem usar este QR Code");

      // bloqueia o usuário
      await client.query("UPDATE usuarios SET pontos = pontos + $1 WHERE id = $2", [qr.pontos, userId]);
      await client.query(
        `INSERT INTO historico_pontos (id_cliente, id_funcionario, tipo, pontos, descricao)
         VALUES ($1, $2, 'adicao', $3, $4)`,
        [userId, qr.id_gerador, qr.pontos, qr.descricao]
      );
    } else if (qr.tipo === "resgatar") {
      // Cliente usando QR Code de resgate (produto)
      if (tipoUsuario !== "cliente") throw new Error("Somente clientes podem usar QR Codes de resgate de produto");

      // lock no saldo do cliente
      const saldoRes = await client.query("SELECT pontos FROM usuarios WHERE id = $1 FOR UPDATE", [userId]);
      if (saldoRes.rows.length === 0) throw new Error("Cliente não encontrado");
      const saldo = Number(saldoRes.rows[0].pontos || 0);

      if (saldo < qr.pontos) throw new Error("Saldo insuficiente para resgatar o produto");

      // se houver produto vinculado, bloquear e decrementar
      if (qr.produto_id) {
        const produtoRes = await client.query("SELECT quantidade FROM produtos_fidelidade WHERE id = $1 FOR UPDATE", [qr.produto_id]);
        if (produtoRes.rows.length === 0) throw new Error("Produto não encontrado");
        const quantidade = Number(produtoRes.rows[0].quantidade || 0);
        if (quantidade <= 0) throw new Error("Produto indisponível");

        await client.query("UPDATE produtos_fidelidade SET quantidade = quantidade - 1 WHERE id = $1", [qr.produto_id]);
      }

      // debita pontos do cliente
      await client.query("UPDATE usuarios SET pontos = pontos - $1 WHERE id = $2", [qr.pontos, userId]);

      // registra histórico
      await client.query(
        `INSERT INTO historico_pontos (id_cliente, id_funcionario, tipo, pontos, descricao)
         VALUES ($1, $2, 'resgate', $3, $4)`,
        [userId, qr.id_gerador, qr.pontos, qr.descricao]
      );
    } else {
      throw new Error("Tipo de QR Code desconhecido");
    }

    // marca QR como usado
    await client.query("UPDATE qrcodes_pontos SET usado = TRUE WHERE token = $1", [token]);

    await client.query("COMMIT");
    return { mensagem: "QR Code processado com sucesso!", detalhes: qr };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Consultar QR Code pelo token
export async function consultarQRCode(token: string) {
  const result = await pool.query("SELECT * FROM qrcodes_pontos WHERE token = $1", [token]);
  if (result.rows.length === 0) {
    throw new Error("QR Code não encontrado");
  }
  return result.rows[0];
}

// Listar histórico de pontos de um cliente
export async function listarHistorico(idCliente: number) {
  const result = await pool.query(
    `SELECT * FROM historico_pontos WHERE id_cliente = $1 ORDER BY data DESC`,
    [idCliente]
  );
  return result.rows;
}

const PREMIOS_FIXOS = [50, 100, 200, 300] as const;
type PremioValor = typeof PREMIOS_FIXOS[number];

export async function gerarPremioQRCode(
  funcionarioId: number,
  valor: number,
  titulo?: string,
  descricao?: string,
  expiraEm?: string // ISO date string opcional
) {
  if (!PREMIOS_FIXOS.includes(valor as PremioValor)) throw new Error("Valor de prêmio inválido");
  
  // opcional: validar expiraEm formato ISO ou null
  let expira: Date | null = null;
  if (expiraEm) {
    expira = new Date(expiraEm);
    if (isNaN(expira.getTime())) throw new Error("Data de expiração inválida");
  }

  // Reaproveita a função gerarQRCode (tipo 'adicionar')
  const token = randomUUID();
  const result = await pool.query(
    `INSERT INTO qrcodes_pontos (tipo, id_gerador, pontos, titulo, descricao, produto_id, token, expira_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    ['adicionar', funcionarioId, valor, titulo || `Prêmio ${valor}`, descricao || null, null, token, expira ? expira.toISOString() : null]
  );

  return {
    mensagem: "QR Code de prêmio gerado com sucesso",
    qrcode: result.rows[0],
    link: `/fidelidade/qrcode/${token}`,
  };
}