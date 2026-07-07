// Criptografia de campo para dados clínicos sensíveis (AES-256-GCM).
// A chave nunca fica no banco: vive só em variável de ambiente
// (FIELD_ENCRYPTION_KEY, 32 bytes em base64 — gere com `openssl rand -base64 32`).
//
// Duas variantes:
// - encryptRandom: IV aleatório a cada chamada. Mais seguro (o mesmo valor
//   nunca produz o mesmo texto cifrado duas vezes), mas não permite busca
//   exata nem restrição de unicidade no banco. Use em texto livre: nome,
//   telefone, e-mail, história clínica, notas SOAP.
// - encryptDeterministic: IV derivado por HMAC do próprio valor. Permite
//   restrição de unicidade e busca exata (ex.: CPF), ao custo de dois
//   registros iguais gerarem o mesmo texto cifrado (um observador do banco
//   percebe repetição, mas não o valor). Use só onde já havia índice único.
//
// ATENÇÃO: perder a FIELD_ENCRYPTION_KEY torna os dados já gravados
// permanentemente ilegíveis. Guarde uma cópia da chave em local seguro
// (gerenciador de senhas), fora do .env.local e fora do Git.
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const VERSOES_SUPORTADAS = new Set(["v1", "v1d"]);

function getKey(): Buffer {
  const b64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY não definida. Gere com `openssl rand -base64 32` e configure em .env.local e nas Environment Variables da Vercel.",
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY inválida: precisa decodificar para 32 bytes (256 bits) em base64.");
  }
  return key;
}

/** true se o valor já está no formato cifrado deste módulo (evita cifrar duas vezes). */
export function jaCriptografado(valor: string | null | undefined): boolean {
  if (!valor) return false;
  const versao = valor.split(":")[0];
  return VERSOES_SUPORTADAS.has(versao);
}

export function encryptRandom(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function encryptDeterministic(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const key = getKey();
  const iv = crypto.createHmac("sha256", key).update(plain).digest().subarray(0, 12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1d", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/**
 * Descriptografa um campo. Se o valor não estiver no formato cifrado
 * (dado legado gravado antes desta mudança, ou vazio), devolve como veio —
 * isso permite migrar dados aos poucos sem quebrar a leitura.
 */
export function decryptField(stored: string | null | undefined): string {
  if (!stored) return "";
  const partes = stored.split(":");
  const versao = partes[0];
  if (!VERSOES_SUPORTADAS.has(versao)) return stored;
  const [, ivB64, tagB64, dataB64] = partes;
  try {
    const key = getKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "[não foi possível descriptografar — verifique FIELD_ENCRYPTION_KEY]";
  }
}

/** Descriptografa vários campos de um objeto vindo do banco, de uma vez. */
export function decryptObjeto<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  campos: (keyof T)[],
): T | null {
  if (!obj) return null;
  const copia = { ...obj };
  for (const campo of campos) {
    (copia as Record<string, unknown>)[campo as string] = decryptField(copia[campo] as string | null);
  }
  return copia;
}
