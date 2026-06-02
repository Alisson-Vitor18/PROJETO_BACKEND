// Logica de negocio da autenticacao.

import pool from "../../config/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES, BCRYPT_ROUNDS, DEFAULT_PROFILE_IMAGE_PATH } from "../../config/constants";
import { randomInt } from "crypto";
import { readFileAsDataUrl } from "../../utils/file";
import { saveImageFromBase64, getImageBase64ById } from "../imagens/imagens.service";

type TipoUsuario = "cliente" | "funcionario" | "admin";

interface RegisterData {
  nome: string;
  telefone: string;
  documento: string; // CPF ou CNPJ
  senha: string;
  tipo: "cliente" | "funcionario";
}

interface GoogleLoginData {
  googleId: string;
  email: string;
  nome?: string;
  fotoUrl?: string;
}

interface CompletarCadastroGoogleData {
  nome?: string;
  telefone: string;
  documento: string;
  tipo?: "cliente" | "admin";
  empresa?: {
    nome?: string;
    cnpj: string;
  };
}

interface AuthTokenPayload {
  id: number;
  tipo: TipoUsuario;
  empresaCnpj?: string;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function tokenTipo(tipo: string, empresaCnpj?: string | null): TipoUsuario {
  if (empresaCnpj) return "admin";
  if (tipo === "funcionario") return "funcionario";
  return "cliente";
}

async function aplicarImagemPadrao(userId: number) {
  try {
    const dataUrl = readFileAsDataUrl(DEFAULT_PROFILE_IMAGE_PATH);
    const img = await saveImageFromBase64({
      base64: dataUrl,
      ownerType: "usuario",
      ownerId: userId,
      originalName: "default_profile",
    });
    await pool.query("UPDATE usuarios SET foto_imagem_id = $1 WHERE id = $2", [img.id, userId]);
  } catch (e) {
    console.warn("Imagem de perfil padrao nao aplicada:", (e as any)?.message || e);
  }
}

async function gerarTokenParaUsuario(userId: number) {
  const result = await pool.query(
    `SELECT u.id, u.tipo, ue.empresa_cnpj
     FROM usuarios u
     LEFT JOIN usuarios_empresas ue ON ue.usuario_id = u.id AND ue.papel = 'admin'
     WHERE u.id = $1
     ORDER BY ue.criado_em ASC NULLS LAST
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Usuario nao encontrado");
  }

  const user = result.rows[0];
  const tipo = tokenTipo(user.tipo, user.empresa_cnpj);
  const payload: AuthTokenPayload = { id: user.id, tipo };

  if (user.empresa_cnpj) {
    payload.empresaCnpj = user.empresa_cnpj;
  }

  const signOptions: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES as jwt.SignOptions["expiresIn"],
  };

  const token = jwt.sign(payload, JWT_SECRET, signOptions);
  await pool.query("UPDATE usuarios SET token_atual = $1 WHERE id = $2", [token, user.id]);

  return token;
}

async function montarRespostaAutenticacao(userId: number) {
  const token = await gerarTokenParaUsuario(userId);
  const usuario = await getMeuPerfil(userId);

  return {
    token,
    usuario,
    cadastroCompleto: usuario.cadastroCompleto,
    precisaCompletarCadastro: !usuario.cadastroCompleto,
  };
}

export async function register(data: RegisterData) {
  const { nome, senha, tipo } = data;
  let { documento, telefone } = data;

  if (!["cliente", "funcionario"].includes(tipo)) {
    throw new Error("Tipo invalido. Use cliente ou funcionario.");
  }

  documento = onlyDigits(documento);
  telefone = onlyDigits(telefone);

  const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (nome, telefone, documento, senha, tipo, cadastro_completo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, nome, telefone, documento, tipo`,
      [nome, telefone, documento, senhaHash, tipo]
    );
    const createdUser = result.rows[0];

    await aplicarImagemPadrao(createdUser.id);

    return createdUser;
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Documento ja cadastrado");
    }
    throw new Error("Erro ao criar usuario");
  }
}

export async function login(documento: string, senha: string) {
  documento = onlyDigits(documento);

  const result = await pool.query("SELECT * FROM usuarios WHERE documento = $1", [documento]);

  if (result.rows.length === 0) {
    throw new Error("Usuario nao encontrado");
  }

  const user = result.rows[0];
  if (!user.senha) {
    throw new Error("Usuario cadastrado com Google. Use login com Google.");
  }

  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    throw new Error("Senha incorreta");
  }

  return gerarTokenParaUsuario(user.id);
}

export async function loginComGoogle(data: GoogleLoginData) {
  const email = normalizeEmail(data.email);
  const nome = data.nome?.trim() || email.split("@")[0];
  const googleId = data.googleId.trim();
  const fotoUrl = data.fotoUrl?.trim() || null;

  let result = await pool.query("SELECT * FROM usuarios WHERE google_id = $1", [googleId]);

  if (result.rows.length === 0) {
    result = await pool.query("SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)", [email]);
  }

  if (result.rows.length > 0) {
    const user = result.rows[0];

    if (user.google_id && user.google_id !== googleId) {
      throw new Error("Este email ja esta vinculado a outra conta Google.");
    }

    await pool.query(
      `UPDATE usuarios
       SET google_id = COALESCE(google_id, $1),
           email = COALESCE(email, $2),
           nome = CASE WHEN nome IS NULL OR nome = '' THEN $3 ELSE nome END,
           foto_url = COALESCE($4, foto_url)
       WHERE id = $5`,
      [googleId, email, nome, fotoUrl, user.id]
    );

    return montarRespostaAutenticacao(user.id);
  }

  const created = await pool.query(
    `INSERT INTO usuarios (nome, email, google_id, foto_url, tipo, cadastro_completo)
     VALUES ($1, $2, $3, $4, 'cliente', FALSE)
     RETURNING id`,
    [nome, email, googleId, fotoUrl]
  );

  await aplicarImagemPadrao(created.rows[0].id);

  return montarRespostaAutenticacao(created.rows[0].id);
}

export async function completarCadastroGoogle(userId: number, data: CompletarCadastroGoogleData) {
  const tipoSolicitado = data.tipo || "cliente";
  const telefone = onlyDigits(data.telefone);
  const documento = onlyDigits(data.documento);
  const nome = data.nome?.trim() || null;

  if (!telefone) {
    throw new Error("Telefone invalido");
  }

  if (!documento) {
    throw new Error("Documento invalido");
  }

  if (tipoSolicitado === "admin" && !data.empresa?.cnpj) {
    throw new Error("CNPJ da empresa e obrigatorio para cadastro de admin.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (tipoSolicitado === "admin" && data.empresa) {
      const empresaCnpj = onlyDigits(data.empresa.cnpj);
      const empresaNome = data.empresa.nome?.trim() || null;

      await client.query(
        `INSERT INTO empresas (nome, cnpj)
         VALUES ($1, $2)
         ON CONFLICT (cnpj) DO UPDATE
         SET nome = COALESCE(NULLIF(EXCLUDED.nome, ''), empresas.nome),
             atualizado_em = NOW()`,
        [empresaNome, empresaCnpj]
      );

      await client.query(
        `INSERT INTO usuarios_empresas (usuario_id, empresa_cnpj, papel)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (usuario_id) DO UPDATE
         SET empresa_cnpj = EXCLUDED.empresa_cnpj,
             papel = 'admin'`,
        [userId, empresaCnpj]
      );
    } else {
      await client.query("DELETE FROM usuarios_empresas WHERE usuario_id = $1", [userId]);
    }

    const tipoDb = tipoSolicitado === "admin" ? "admin" : "cliente";
    const userResult = await client.query(
      `UPDATE usuarios
       SET nome = COALESCE($1, nome),
           telefone = $2,
           documento = $3,
           tipo = $4,
           cadastro_completo = TRUE
       WHERE id = $5
       RETURNING id`,
      [nome, telefone, documento, tipoDb, userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error("Usuario nao encontrado");
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw new Error("Documento, email ou CNPJ ja cadastrado.");
    }
    throw err;
  } finally {
    client.release();
  }

  return montarRespostaAutenticacao(userId);
}

// Gera e salva um codigo de recuperacao para o telefone informado.
export async function gerarCodigoRecuperacaoPorTelefone(telefone: string) {
  telefone = onlyDigits(telefone);
  const userRes = await pool.query("SELECT id, nome FROM usuarios WHERE telefone = $1", [telefone]);
  if (userRes.rows.length === 0) {
    throw new Error("Se este telefone estiver cadastrado, um codigo foi enviado.");
  }

  const usuario = userRes.rows[0];
  const codigo = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiracao = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `INSERT INTO codigos_recuperacao (usuario_id, codigo, expiracao, usado)
     VALUES ($1, $2, $3, FALSE)`,
    [usuario.id, codigo, expiracao]
  );

  console.log(`[RECOVERY] Codigo para ${telefone}: ${codigo} (expira em ${expiracao.toISOString()})`);

  return { mensagem: "Se o telefone estiver cadastrado, um codigo foi enviado." };
}

// Redefine senha: telefone + codigo + novaSenha.
export async function redefinirSenhaPorCodigo(telefone: string, codigo: string, novaSenha: string) {
  telefone = onlyDigits(telefone);
  const userRes = await pool.query("SELECT id FROM usuarios WHERE telefone = $1", [telefone]);
  if (userRes.rows.length === 0) {
    throw new Error("Codigo invalido ou expirado.");
  }
  const userId = userRes.rows[0].id;

  const codigoRes = await pool.query(
    `SELECT id, expiracao, usado FROM codigos_recuperacao
     WHERE usuario_id = $1 AND codigo = $2
     ORDER BY criado_em DESC
     LIMIT 1`,
    [userId, codigo]
  );

  if (codigoRes.rows.length === 0) throw new Error("Codigo invalido ou expirado.");

  const rec = codigoRes.rows[0];
  if (rec.usado) throw new Error("Codigo ja utilizado.");
  if (new Date(rec.expiracao) < new Date()) throw new Error("Codigo expirado.");

  const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);

  await pool.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [senhaHash, userId]);
  await pool.query("UPDATE codigos_recuperacao SET usado = TRUE WHERE id = $1", [rec.id]);

  return { mensagem: "Senha redefinida com sucesso." };
}

// Obter dados completos do usuario logado com foto em base64.
export async function getMeuPerfil(userId: number) {
  const result = await pool.query(
    `SELECT u.id, u.nome, u.telefone, u.documento, u.email, u.google_id, u.foto_url,
            u.tipo, u.cadastro_completo, u.foto_imagem_id, u.pontos,
            e.id AS empresa_id, e.nome AS empresa_nome, e.cnpj AS empresa_cnpj,
            ue.papel AS empresa_papel
     FROM usuarios u
     LEFT JOIN usuarios_empresas ue ON ue.usuario_id = u.id AND ue.papel = 'admin'
     LEFT JOIN empresas e ON e.cnpj = ue.empresa_cnpj
     WHERE u.id = $1
     ORDER BY ue.criado_em ASC NULLS LAST
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error("Usuario nao encontrado");
  }
  const usuario = result.rows[0];

  let foto = null;
  if (usuario.foto_imagem_id) {
    try {
      foto = await getImageBase64ById(usuario.foto_imagem_id);
    } catch (e) {
      console.warn("Erro ao obter foto de perfil:", (e as any)?.message || e);
    }
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    telefone: usuario.telefone,
    documento: usuario.documento,
    email: usuario.email,
    googleId: usuario.google_id,
    tipo: tokenTipo(usuario.tipo, usuario.empresa_cnpj),
    cadastroCompleto: Boolean(usuario.cadastro_completo),
    pontos: usuario.pontos || 0,
    fotoUrl: usuario.foto_url,
    foto: foto ? { id: foto.id, mimeType: foto.mimeType, base64: foto.base64 } : null,
    empresa: usuario.empresa_cnpj
      ? {
          id: usuario.empresa_id,
          nome: usuario.empresa_nome,
          cnpj: usuario.empresa_cnpj,
          papel: usuario.empresa_papel,
        }
      : null,
  };
}
