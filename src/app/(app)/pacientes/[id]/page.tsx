import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ESCALAS } from "@/domain/escalas";
import PacienteTabs from "@/components/PacienteTabs";

export default async function PacienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase.from("pacientes")
    .select("id, nome, data_nascimento, cpf, telefone, email").eq("id", id).single();
  if (!paciente) notFound();

  // LGPD: registra a leitura do prontuário
  await supabase.rpc("log_read", { p_entidade: "paciente", p_entidade_id: id });

  const { data: historia } = await supabase.from("historia_clinica")
    .select("*").eq("paciente_id", id).maybeSingle();
  const { data: notas } = await supabase.from("notas_soap")
    .select("*").eq("paciente_id", id).order("created_at", { ascending: false });
  const { data: respostas } = await supabase.from("escala_respostas")
    .select("escala_id, aplicado_em, score_json, escala_definicoes(codigo, nome)")
    .eq("paciente_id", id).order("aplicado_em", { ascending: true });

  return (
    <PacienteTabs
      paciente={paciente}
      historia={historia ?? null}
      notas={notas ?? []}
      respostas={respostas ?? []}
      escalas={ESCALAS}
    />
  );
}
