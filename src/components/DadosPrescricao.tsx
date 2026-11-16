"use client";

import { useState, type FormEvent } from "react";
import { atualizarDadosPrescricao } from "@/app/actions";

export default function DadosPrescricao({ id, cpf, endereco }: {
  id: string; cpf: string | null; endereco: string | null;
}) {
  const [status, setStatus] = useState("");
  const [pendente, setPendente] = useState(false);
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    setPendente(true);
    setStatus("");
    try {
      const resultado = await atualizarDadosPrescricao(id, dados);
      setStatus(resultado.erro ?? "Dados salvos.");
    } catch {
      setStatus("Não foi possível salvar os dados.");
    } finally {
      setPendente(false);
    }
  }
  return <details className="mt-4 rounded-lg border border-lilac p-3 text-sm">
    <summary className="cursor-pointer font-medium">Dados cadastrais para prescrição</summary>
    <form onSubmit={salvar} className="mt-3 grid gap-3">
      <label className="grid gap-1">CPF
        <input name="cpf" defaultValue={cpf ?? ""} inputMode="numeric" maxLength={14} className="rounded border border-lilac px-2 py-1" />
      </label>
      <label className="grid gap-1">Endereço completo
        <textarea name="endereco" rows={2} defaultValue={endereco ?? ""} maxLength={500} className="rounded border border-lilac px-2 py-1" />
      </label>
      <button disabled={pendente} className="justify-self-start rounded-lg bg-purple px-3 py-2 text-white">Salvar dados cadastrais</button>
      <p role="status">{status}</p>
    </form>
  </details>;
}
