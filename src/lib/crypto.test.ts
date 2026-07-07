import { describe, it, expect, beforeAll } from "vitest";
import { encryptRandom, encryptDeterministic, decryptField, jaCriptografado } from "./crypto";

beforeAll(() => {
  // chave de teste fixa (32 bytes em base64) — nunca usar em produção
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("criptografia de campo", () => {
  it("cifra e decifra mantendo o valor original (modo aleatório)", () => {
    const original = "Maria da Silva";
    const cifrado = encryptRandom(original)!;
    expect(cifrado).not.toBe(original);
    expect(decryptField(cifrado)).toBe(original);
  });

  it("modo aleatório produz textos cifrados diferentes para o mesmo valor", () => {
    const a = encryptRandom("mesmo valor");
    const b = encryptRandom("mesmo valor");
    expect(a).not.toBe(b);
  });

  it("modo determinístico produz sempre o mesmo texto cifrado (permite unicidade)", () => {
    const a = encryptDeterministic("12345678901");
    const b = encryptDeterministic("12345678901");
    expect(a).toBe(b);
    expect(decryptField(a)).toBe("12345678901");
  });

  it("valores vazios/nulos não são cifrados", () => {
    expect(encryptRandom("")).toBeNull();
    expect(encryptRandom(undefined)).toBeNull();
    expect(encryptRandom(null)).toBeNull();
  });

  it("reconhece o que já está cifrado e o que é texto legado", () => {
    expect(jaCriptografado(encryptRandom("x")!)).toBe(true);
    expect(jaCriptografado("texto em claro antigo")).toBe(false);
  });

  it("dado legado em texto puro é devolvido como está (migração incremental)", () => {
    expect(decryptField("texto legado sem cifrar")).toBe("texto legado sem cifrar");
  });
});
