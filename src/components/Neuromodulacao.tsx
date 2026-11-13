"use client";

import { useState, type FormEvent } from "react";
import { criarNota } from "@/app/actions";

const grupos = [
  ["Pré-frontal", "#a95191"], ["Frontal", "#704ab0"],
  ["Central / motor", "#287e73"], ["Parietal", "#93651f"],
  ["Temporal", "#ab5939"], ["Occipital", "#376ca6"],
] as const;
const pontos = [
  ["Fp1", 40, 23, 0], ["Fp2", 60, 23, 0],
  ["F3", 35, 37, 1], ["F4", 65, 37, 1], ["Bro", 22, 44, 1],
  ["SM1", 50, 41, 2], ["C3", 33, 50, 2], ["Cz", 50, 50, 2], ["C4", 67, 50, 2],
  ["T3", 16, 55, 4], ["T4", 84, 55, 4], ["Wer", 25, 65, 4],
  ["P3", 35, 73, 3], ["P4", 65, 73, 3],
  ["O1", 41, 86, 5], ["Oz", 50, 88, 5], ["O2", 59, 86, 5],
] as const;
const titulo = "Sessão de neuromodulação";
const campo = "mt-1 w-full rounded-lg border border-lilac bg-white px-3 py-2";

export default function Neuromodulacao({ pacienteId, notas, salvarSessao }: {
  pacienteId: string;
  notas: { id: string; subjetivo?: string; objetivo?: string; created_at: string }[];
  salvarSessao?: (pacienteId: string, nota: { subjetivo: string; objetivo: string }) => Promise<void>;
}) {
  const [areas, setAreas] = useState<string[]>([]);
  const [modalidade, setModalidade] = useState<"TMS" | "tDCS">("TMS");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [falhou, setFalhou] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando || (modalidade === "TMS" && !areas.length)) return;
    const form = event.currentTarget;
    const dados = new FormData(form);
    setSalvando(true);
    setMensagem("");
    setFalhou(false);
    try {
      await (salvarSessao ?? criarNota)(pacienteId, {
        subjetivo: titulo,
        objetivo: [`Modalidade: ${modalidade}`, ...(modalidade === "TMS" ? [
          `Áreas tratadas: ${areas.join(", ")}`,
          `Limiar motor: ${dados.get("limiar")}`,
          `Córtices: ${dados.get("cortices")}`,
          `Pulsos totais: ${dados.get("total")}`,
          `Pulsos por série: ${dados.get("serie")}`,
          `Número de séries: ${dados.get("numeroSeries")}`,
        ] : [
          `Áreas tratadas: ${areas.join(", ") || "Não informadas"}`,
          `Intensidade: ${dados.get("intensidade")} mA`,
          `Frequência: ${dados.get("frequencia") || "Não informada"}${dados.get("frequencia") ? " Hz" : ""}`,
          `Tempo de rampa: ${dados.get("rampa")} s`,
          `Duração da sessão: ${dados.get("duracao")} min`,
        ])].join("\n"),
      });
      form.reset();
      setAreas([]);
      setMensagem("Sessão registrada.");
    } catch {
      setFalhou(true);
      setMensagem("Não foi possível salvar a sessão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Modalidade de neuromodulação" className="flex gap-1">
        {(["TMS", "tDCS"] as const).map((opcao) => (
          <button key={opcao} type="button" aria-pressed={modalidade === opcao} disabled={salvando}
            onClick={() => { setModalidade(opcao); setMensagem(""); }}
            className={`rounded-lg border border-lilac px-4 py-2 text-sm ${modalidade === opcao ? "bg-purple text-white" : "bg-white text-ink"}`}>
            {opcao}
          </button>
        ))}
      </div>
      <form onSubmit={salvar}>
        <fieldset disabled={salvando} className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div>
            <div className="relative mx-auto aspect-[4/5] max-w-md">
              <div className="absolute inset-x-0 top-0 flex justify-between text-xs text-muted">
                <span>Esquerdo</span><span>Anterior</span><span>Direito</span>
              </div>
              <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d="M46 13 L50 7 L54 13 M9 55 C3 52 3 66 9 65 M91 55 C97 52 97 66 91 65" fill="none" stroke="#b8a4ce" strokeWidth=".65" />
                <ellipse cx="50" cy="63" rx="41" ry="50" fill="#f7f3fb" stroke="#b8a4ce" strokeWidth=".65" />
                <path d="M50 14 V112 M10 62.5 H90" stroke="#d9c9e8" strokeWidth=".45" strokeDasharray="1.5 1.5" />
              </svg>
              {pontos.map(([id, x, y, grupo]) => {
                const marcado = areas.includes(id);
                return <button key={id} type="button" aria-pressed={marcado}
                  title={id === "Bro" ? "Área de Broca" : id === "Wer" ? "Área de Wernicke" : id}
                  onClick={() => setAreas((atuais) => marcado ? atuais.filter((item) => item !== id) : [...atuais, id])}
                  style={{ left: `${x}%`, top: `${y}%`, backgroundColor: marcado ? grupos[grupo][1] : `${grupos[grupo][1]}30` }}
                  className={`absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border text-xs font-bold sm:size-9 ${marcado ? "border-ink text-white ring-2 ring-ink" : "border-white text-ink"}`}>
                  {id}
                </button>;
              })}
              <span className="absolute inset-x-0 bottom-0 text-center text-xs text-muted">Posterior</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {grupos.map(([nome, cor]) => <li key={nome} className="flex items-center gap-1">
                <span className="size-3 rounded-sm" style={{ backgroundColor: cor }} />{nome}
              </li>)}
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-ink" aria-live="polite">Áreas tratadas: {areas.join(", ") || "Nenhuma selecionada"}</p>
            {modalidade === "TMS" ? <div className="space-y-4" key="tms">
            <label className="block text-sm">Limiar motor<input className={campo} name="limiar" required maxLength={100} /></label>
            <label className="block text-sm">Córtices tratados<textarea className={campo} name="cortices" required rows={2} maxLength={500} /></label>
            <label className="block text-sm">Pulsos totais<input className={campo} name="total" type="number" min={1} step={1} required /></label>
            <label className="block text-sm">Pulsos por série<input className={campo} name="serie" type="number" min={1} step={1} required /></label>
            <label className="block text-sm">Número de séries<input className={campo} name="numeroSeries" type="number" min={1} step={1} required /></label>
            </div> : <div className="space-y-4" key="tdcs">
              <label className="block text-sm">Intensidade (mA)<input className={campo} name="intensidade" type="number" min={0} step="any" required /></label>
              <label className="block text-sm">Frequência (Hz, se aplicável)<input className={campo} name="frequencia" type="number" min={0} step="any" /></label>
              <label className="block text-sm">Tempo de rampa (s)<input className={campo} name="rampa" type="number" min={0} step="any" required /></label>
              <label className="block text-sm">Duração da sessão (min)<input className={campo} name="duracao" type="number" min={0} step="any" required /></label>
            </div>}
            <button type="submit" disabled={(modalidade === "TMS" && !areas.length) || salvando}
              className="rounded-lg bg-purple px-4 py-2 text-sm text-white disabled:opacity-50">
              {salvando ? "Salvando..." : "Registrar sessão"}
            </button>
            <p role={falhou ? "alert" : "status"} className="text-sm">{mensagem}</p>
          </div>
        </fieldset>
      </form>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sessões registradas</h2>
        {notas.filter((nota) => nota.subjetivo === titulo).map((nota) => (
          <article key={nota.id} className="rounded-lg border border-lilac bg-white p-4">
            <time className="text-xs text-muted" dateTime={nota.created_at}>{new Date(nota.created_at).toLocaleString("pt-BR")}</time>
            <p className="mt-2 whitespace-pre-line break-words text-sm">{nota.objetivo}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
