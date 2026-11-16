"use client";

import { useState, type FormEvent } from "react";
import { editarCadastroSecretaria } from "@/app/actions";

export default function EditarCadastroSecretaria({ id, cpf, endereco, nascimento, telefone }: {
  id: string; cpf: string; endereco: string; nascimento: string; telefone: string;
}) {
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setMensagem("");
    try {
      const resultado = await editarCadastroSecretaria(id, new FormData(event.currentTarget));
      setMensagem(resultado.erro ?? "Cadastro atualizado.");
    } catch {
      setMensagem("Não foi possível atualizar o cadastro.");
    } finally {
      setSalvando(false);
    }
  }
  const campo = "w-full rounded border border-lilac bg-white px-2 py-1";
  return <details>
    <summary className="cursor-pointer text-purple">Editar cadastro</summary>
    <form onSubmit={salvar} className="mt-2 grid gap-2">
      <label>CPF<input name="cpf" className={campo} maxLength={14} defaultValue={cpf} /></label>
      <label>Endereço completo<textarea name="endereco" className={campo} maxLength={500} defaultValue={endereco} /></label>
      <label>Data de nascimento<input name="nascimento" type="date" className={campo} required defaultValue={nascimento} /></label>
      <label>Telefone<input name="telefone" type="tel" className={campo} maxLength={40} defaultValue={telefone} /></label>
      <button disabled={salvando} className="rounded bg-purple px-3 py-2 text-white disabled:opacity-50">{salvando ? "Salvando…" : "Salvar cadastro"}</button>
      <p role="status">{mensagem}</p>
    </form>
  </details>;
}
