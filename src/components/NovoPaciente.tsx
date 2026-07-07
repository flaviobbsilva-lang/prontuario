"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarPaciente } from "@/app/actions";

export default function NovoPaciente() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: "", dataNascimento: "", cpf: "", telefone: "", email: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const novo = await criarPaciente(f);
      setAberto(false);
      router.push(`/pacientes/${novo.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o paciente.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) return (
    <button onClick={() => setAberto(true)} className="rounded-lg bg-purple px-4 py-2 text-white text-sm font-medium">
      Novo paciente
    </button>
  );

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-ink/30 p-4" onClick={() => setAberto(false)}>
      <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-[family-name:var(--font-display)] text-xl text-purple">Novo paciente</p>
        <div className="mt-4 space-y-2 text-sm">
          {[
            ["nome", "Nome completo", "text"],
            ["dataNascimento", "Data de nascimento", "date"],
            ["cpf", "CPF", "text"],
            ["telefone", "Telefone", "text"],
            ["email", "E-mail", "email"],
          ].map(([k, label, type]) => (
            <label key={k} className="block text-ink">{label}
              <input type={type} value={(f as any)[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setErro(null); }}
                className="mt-1 w-full rounded-md border border-lilac px-2 py-1 outline-none focus:border-purple" />
            </label>
          ))}
        </div>
        {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setAberto(false)} className="rounded-lg px-3 py-2 text-sm text-muted">Cancelar</button>
          <button onClick={salvar} disabled={!f.nome || !f.dataNascimento || salvando}
            className="rounded-lg bg-purple px-4 py-2 text-white text-sm font-medium disabled:opacity-60">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
