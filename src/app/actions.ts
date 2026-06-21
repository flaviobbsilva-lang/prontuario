"use server";
// Server Actions. Toda escrita passa por aqui; o RLS garante que só equipe
// clínica autenticada grava. Scores são calculados no servidor a partir do
// núcleo testado (src/domain), nunca confiando no cliente.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/domain/scoring";
import type { Answers } from "@/domain/scoring";
import type { ScaleScoring } from "@/domain/escalas";

async function meId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

export async function criarPaciente(input: {
  nome: string; dataNascimento: string; cpf?: string; telefone?: string; email?: string;
}) {
  const { supabase } = await meId();
  const { data, error } = await supabase.from("pacientes").insert({
    nome: input.nome,
    data_nascimento: input.dataNascimento,
    cpf: input.cpf || null,
    telefone: input.telefone || null,
    email: input.email || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/pacientes");
  return data;
}

export async function salvarHistoria(pacienteId: string, dados: Record<string, string>) {
  const { supabase } = await meId();
  const { error } = await supabase.from("historia_clinica")
    .upsert({ paciente_id: pacienteId, ...dados }, { onConflict: "paciente_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function criarNota(pacienteId: string, dados: {
  subjetivo?: string; objetivo?: string; avaliacao?: string; plano?: string;
}) {
  const { supabase, userId } = await meId();
  const { error } = await supabase.from("notas_soap")
    .insert({ paciente_id: pacienteId, autor_id: userId, ...dados });
  if (error) throw new Error(error.message);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function aplicarEscala(input: {
  pacienteId: string; escalaCodigo: string; respostas: Answers;
}) {
  const { supabase, userId } = await meId();
  const { data: escala, error: e1 } = await supabase
    .from("escala_definicoes").select("id, nome, schema_json").eq("codigo", input.escalaCodigo).single();
  if (e1 || !escala) throw new Error("Escala não encontrada");

  const scoring = (escala.schema_json as { scoring: ScaleScoring }).scoring;
  const score = computeScore(scoring, input.respostas);

  const { error: e2 } = await supabase.from("escala_respostas").insert({
    paciente_id: input.pacienteId, escala_id: escala.id, autor_id: userId,
    respostas_json: input.respostas, score_json: score,
  });
  if (e2) throw new Error(e2.message);
  revalidatePath(`/pacientes/${input.pacienteId}`);
  return score;
}
