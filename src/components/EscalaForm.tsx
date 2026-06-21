"use client";
import { useState } from "react";
import type { ScaleDefinition, ScaleOption } from "@/domain/escalas";
import { computeScore, formatScoreForPrint, type Answers } from "@/domain/scoring";
import { aplicarEscala } from "@/app/actions";

function opcoes(item: ScaleDefinition["items"][number]): ScaleOption[] {
  if (!item.options) return [];
  // opções "cruas" (números) viram {label,value}
  if (typeof item.options[0] === "number") {
    return (item.options as number[]).map((v) => ({ label: String(v), value: v }));
  }
  return item.options as ScaleOption[];
}

export default function EscalaForm({ pacienteId, escala }: { pacienteId: string; escala: ScaleDefinition }) {
  const [resp, setResp] = useState<Answers>({});
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // prévia do score, calculada localmente com o mesmo núcleo do servidor
  const previa = computeScore(escala.scoring, resp);
  const linhas = formatScoreForPrint(escala.name, previa);

  function set(id: string, v: unknown) { setResp((r) => ({ ...r, [id]: v })); setSalvo(false); }

  async function salvar() {
    setSalvando(true);
    await aplicarEscala({ pacienteId, escalaCodigo: escala.code, respostas: resp });
    setSalvando(false);
    setSalvo(true);
  }

  return (
    <div className="grid md:grid-cols-[1fr_260px] gap-6">
      <div className="space-y-4">
        {escala.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-lilac/50 bg-white p-3">
            <p className="text-sm text-ink mb-2">{item.text}</p>

            {item.type === "boolean" && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(resp[item.id])}
                  onChange={(e) => set(item.id, e.target.checked)} /> Presente
              </label>
            )}

            {item.type === "number" && (
              <input type="number" min={item.min} max={item.max}
                className="w-28 rounded-md border border-lilac px-2 py-1 text-sm outline-none focus:border-purple"
                value={resp[item.id] as number ?? ""}
                onChange={(e) => set(item.id, e.target.value === "" ? undefined : Number(e.target.value))} />
            )}

            {item.type === "radio" && (
              <div className="flex flex-wrap gap-2">
                {opcoes(item).map((op) => {
                  const sel = resp[item.id] === op.value;
                  return (
                    <button key={String(op.value)} type="button" onClick={() => set(item.id, op.value)}
                      className={`rounded-md border px-3 py-1 text-sm ${
                        sel ? "border-purple bg-purple text-white" : "border-lilac text-ink hover:bg-lilac/30"}`}>
                      {op.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <aside className="md:sticky md:top-6 h-fit rounded-xl border border-gold/40 bg-white p-4">
        <p className="font-[family-name:var(--font-display)] text-lg text-purple">Resultado</p>
        <div className="mt-2 space-y-1 text-sm text-ink">
          {linhas.map((l, i) => <p key={i}>{l}</p>)}
        </div>
        <button onClick={salvar} disabled={salvando}
          className="mt-4 w-full rounded-lg bg-purple px-3 py-2 text-white text-sm font-medium disabled:opacity-60">
          {salvando ? "Registrando..." : "Registrar aplicação"}
        </button>
        {salvo && <p className="mt-2 text-xs text-gold">Aplicação registrada.</p>}
      </aside>
    </div>
  );
}
