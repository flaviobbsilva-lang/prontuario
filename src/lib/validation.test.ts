import { describe, it, expect } from "vitest";
import { cpfValido, emailValido, dataNascimentoValida, limparCPF } from "./validation";

describe("validação de CPF", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(cpfValido("111.444.777-35")).toBe(true);
    expect(cpfValido("11144477735")).toBe(true);
  });
  it("rejeita CPF com dígito verificador errado", () => {
    expect(cpfValido("111.444.777-36")).toBe(false);
  });
  it("rejeita sequências repetidas", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("000.000.000-00")).toBe(false);
  });
  it("rejeita tamanho errado", () => {
    expect(cpfValido("123")).toBe(false);
  });
  it("limparCPF remove máscara", () => {
    expect(limparCPF("111.444.777-35")).toBe("11144477735");
  });
});

describe("validação de e-mail", () => {
  it("aceita e-mails válidos", () => {
    expect(emailValido("medico@clinica.com.br")).toBe(true);
  });
  it("rejeita e-mails sem @ ou domínio", () => {
    expect(emailValido("invalido")).toBe(false);
    expect(emailValido("sem@dominio")).toBe(false);
  });
});

describe("validação de data de nascimento", () => {
  it("aceita datas passadas no formato AAAA-MM-DD", () => {
    expect(dataNascimentoValida("1990-05-20")).toBe(true);
  });
  it("rejeita datas futuras", () => {
    expect(dataNascimentoValida("2099-01-01")).toBe(false);
  });
  it("rejeita formato errado", () => {
    expect(dataNascimentoValida("20/05/1990")).toBe(false);
  });
});
