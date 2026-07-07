import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NovoPaciente from "@/components/NovoPaciente";
import { decryptField } from "@/lib/crypto";

function idade(nasc: string) {
  const d = new Date(nasc), h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}

export default async function Pacientes() {
  const supabase = await createClient();
  const { data: pacientesBrutos } = await supabase.from("pacientes")
    .select("id, nome, data_nascimento, cpf").eq("ativo", true);

  // nome e cpf são criptografados no banco (não dá para ordenar/buscar em
  // SQL); descriptografa aqui e ordena em memória. Ok para o volume de uma
  // clínica; se crescer muito, considerar índice cego (hash) para busca.
  const pacientes = (pacientesBrutos ?? [])
    .map((p) => ({ ...p, nome: decryptField(p.nome), cpf: p.cpf ? decryptField(p.cpf) : null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">Pacientes</h1>
        <NovoPaciente />
      </div>

      <div className="mt-6 rounded-xl border border-lilac/60 bg-white divide-y divide-lilac/40">
        {pacientes.map((p) => (
          <Link key={p.id} href={`/pacientes/${p.id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-lilac/20">
            <span className="text-ink">{p.nome}</span>
            <span className="text-sm text-muted">{idade(p.data_nascimento)} anos · {p.cpf ?? "sem CPF"}</span>
          </Link>
        ))}
        {pacientes.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted">Nenhum paciente ainda. Cadastre o primeiro.</p>
        )}
      </div>
    </div>
  );
}
