"use client";
import { useState } from "react";
import type { ScaleDefinition } from "@/domain/escalas";
import EscalaForm from "@/components/EscalaForm";
import EvolutionChart, { type SeriePonto } from "@/components/EvolutionChart";
import { salvarHistoria, criarNota } from "@/app/actions";
import { brand } from "@/lib/brand";

const CAMPOS_HISTORIA: Array<[string, string]> = [
  ["queixa_principal", "Queixa principal"],
  ["historia_doenca_atual", "História da doença atual"],
  ["historia_pregressa", "História pregressa"],
  ["antecedentes_pessoais", "Antecedentes pessoais"],
  ["antecedentes_familiares", "Antecedentes familiares"],
  ["habitos", "Hábitos"],
  ["alergias", "Alergias"],
  ["medicamentos_em_uso", "Medicamentos em uso"],
];

function idade(nasc: string) {
  const d = new Date(nasc), h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}

export default function PacienteTabs({ paciente, historia, notas, respostas, escalas }: {
  paciente: any; historia: any; notas: any[]; respostas: any[]; escalas: ScaleDefinition[];
}) {
  const [aba, setAba] = useState<"historia" | "soap" | "escalas">("historia");
  const abas = [["historia", "História"], ["soap", "Evoluções"], ["escalas", "Escalas"]] as const;

  return (
    <div className="p-8 max-w-4xl">
      <header className="flex items-end justify-between border-b border-lilac/60 pb-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">{paciente.nome}</h1>
          <p className="text-sm text-muted mt-1">
            {idade(paciente.data_nascimento)} anos · {paciente.cpf ?? "sem CPF"} · {paciente.telefone ?? "—"}
          </p>
        </div>
        <a href={`/pacientes/${paciente.id}/pdf`} target="_blank"
          className="rounded-lg border border-purple px-4 py-2 text-sm text-purple">Exportar PDF</a>
      </header>

      <nav className="mt-4 flex gap-1">
        {abas.map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`rounded-lg px-4 py-2 text-sm ${aba === k ? "bg-purple text-white" : "text-ink hover:bg-lilac/30"}`}>
            {label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {aba === "historia" && <HistoriaTab pacienteId={paciente.id} historia={historia} />}
        {aba === "soap" && <SoapTab pacienteId={paciente.id} notas={notas} />}
        {aba === "escalas" && <EscalasTab pacienteId={paciente.id} escalas={escalas} respostas={respostas} />}
      </section>
    </div>
  );
}

function HistoriaTab({ pacienteId, historia }: { pacienteId: string; historia: any }) {
  const [h, setH] = useState<Record<string, string>>(
    Object.fromEntries(CAMPOS_HISTORIA.map(([k]) => [k, historia?.[k] ?? ""])),
  );
  const [salvo, setSalvo] = useState(false);
  return (
    <div className="space-y-4">
      {CAMPOS_HISTORIA.map(([k, label]) => (
        <label key={k} className="block text-sm text-ink">{label}
          <textarea rows={2} value={h[k]} onChange={(e) => { setH({ ...h, [k]: e.target.value }); setSalvo(false); }}
            className="mt-1 w-full rounded-lg border border-lilac bg-white px-3 py-2 outline-none focus:border-purple" />
        </label>
      ))}
      <button onClick={async () => { await salvarHistoria(pacienteId, h); setSalvo(true); }}
        className="rounded-lg bg-purple px-4 py-2 text-white text-sm font-medium">Salvar história</button>
      {salvo && <span className="ml-3 text-xs text-gold">Salvo.</span>}
    </div>
  );
}

function SoapTab({ pacienteId, notas }: { pacienteId: string; notas: any[] }) {
  const [n, setN] = useState({ subjetivo: "", objetivo: "", avaliacao: "", plano: "" });
  const campos = [["subjetivo", "S — Subjetivo"], ["objetivo", "O — Objetivo"], ["avaliacao", "A — Avaliação"], ["plano", "P — Plano"]] as const;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-lilac/60 bg-white p-4 space-y-3">
        {campos.map(([k, label]) => (
          <label key={k} className="block text-sm text-ink">{label}
            <textarea rows={2} value={(n as any)[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-lilac px-3 py-2 outline-none focus:border-purple" />
          </label>
        ))}
        <button onClick={async () => { await criarNota(pacienteId, n); setN({ subjetivo: "", objetivo: "", avaliacao: "", plano: "" }); }}
          className="rounded-lg bg-purple px-4 py-2 text-white text-sm font-medium">Adicionar evolução</button>
      </div>
      <div className="space-y-3">
        {notas.map((nota) => (
          <div key={nota.id} className="rounded-lg border border-lilac/50 bg-white p-4">
            <p className="text-xs text-muted">{new Date(nota.created_at).toLocaleString("pt-BR")}</p>
            <div className="mt-2 text-sm text-ink space-y-1">
              {nota.subjetivo && <p><b>S:</b> {nota.subjetivo}</p>}
              {nota.objetivo && <p><b>O:</b> {nota.objetivo}</p>}
              {nota.avaliacao && <p><b>A:</b> {nota.avaliacao}</p>}
              {nota.plano && <p><b>P:</b> {nota.plano}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscalasTab({ pacienteId, escalas, respostas }: { pacienteId: string; escalas: ScaleDefinition[]; respostas: any[] }) {
  const [codigo, setCodigo] = useState(escalas[0]?.code);
  const escala = escalas.find((e) => e.code === codigo)!;

  // série temporal: usa "total" quando existe; senão, primeiro número do score
  const serie: SeriePonto[] = respostas
    .filter((r) => r.escala_definicoes?.codigo === codigo)
    .map((r) => {
      const s = r.score_json || {};
      const valor = typeof s.total === "number"
        ? s.total
        : (Object.values(s).find((v) => typeof v === "number") as number) ?? 0;
      return { data: new Date(r.aplicado_em).toLocaleDateString("pt-BR"), valor };
    });

  return (
    <div className="space-y-6">
      <select value={codigo} onChange={(e) => setCodigo(e.target.value)}
        className="rounded-lg border border-lilac bg-white px-3 py-2 text-sm outline-none focus:border-purple">
        {escalas.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
      </select>

      <div className="rounded-xl border border-lilac/60 bg-white p-4">
        <EvolutionChart titulo={`Evolução — ${escala.name}`} serie={serie} />
      </div>

      <EscalaForm pacienteId={pacienteId} escala={escala} />
    </div>
  );
}
