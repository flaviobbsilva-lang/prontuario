"use client";

import { useState } from "react";

type Dados = { nome: string; telefone: string; nascimento: string };
type Paciente = Dados & { id: string };
const vazio = { nome: "", telefone: "", nascimento: "" };

export default function DadosAgendamento({ pacientes, pacienteId = "", inicial = vazio, hoje, campo }: {
  pacientes: Paciente[];
  pacienteId?: string;
  inicial?: Dados;
  hoje: string;
  campo: string;
}) {
  const [id, setId] = useState(pacienteId);
  const [dados, setDados] = useState(() => {
    const ficha = pacientes.find((p) => p.id === pacienteId);
    return {
      nome: inicial.nome || ficha?.nome || "",
      telefone: inicial.telefone || ficha?.telefone || "",
      nascimento: inicial.nascimento || ficha?.nascimento || "",
    };
  });

  return <>
    <label className="grid min-w-0 gap-1">Paciente
      <select className={campo} name="paciente" value={id} onChange={(event) => {
        const novoId = event.target.value;
        setId(novoId);
        setDados(pacientes.find((p) => p.id === novoId) ?? inicial);
      }}>
        <option value="">Primeira consulta</option>
        {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
    </label>
    <label className="grid gap-1">Nome completo
      <input className={campo} name="nome" maxLength={160} required={!id}
        value={dados.nome} onChange={(event) => setDados({ ...dados, nome: event.target.value })} />
    </label>
    <label className="grid gap-1">Data de nascimento
      <input className={campo} name="nascimento" type="date" max={hoje} required={!id}
        value={dados.nascimento} onChange={(event) => setDados({ ...dados, nascimento: event.target.value })} />
    </label>
    <label className="grid gap-1">Telefone de contato
      <input className={campo} name="telefone" type="tel" maxLength={40} required={!id}
        value={dados.telefone} onChange={(event) => setDados({ ...dados, telefone: event.target.value })} />
    </label>
  </>;
}
