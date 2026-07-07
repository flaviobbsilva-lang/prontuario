"use server";
// Server Actions. Toda escrita passa por aqui; o RLS garante que só equipe
// clínica autenticada grava. Scores são calculados no servidor a partir do
// núcleo testado (src/domain), nunca confiando no cliente. Campos sensíveis
// são criptografados aqui, antes de chegar ao banco (src/lib/crypto.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/domain/scoring";
import type { Answers } from "@/domain/scoring";
import type { ScaleScoring } from "@/domain/escalas";
import { encryptRandom, encryptDeterministic } from "@/lib/crypto";
import { cpfValido, emailValido, dataNascimentoValida, limparCPF } from "@/lib/validation";

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

  const nome = input.nome?.trim();
  if (!nome) throw new Error("Nome é obrigatório.");
  if (!dataNascimentoValida(input.dataNascimento)) throw new Error("Data de nascimento inválida.");
  if (input.cpf && !cpfValido(input.cpf)) throw new Error("CPF inválido. Confira os números digitados.");
  if (input.email && !emailValido(input.email)) throw new Error("E-mail inválido.");

  const { data, error } = await supabase.from("pacientes").insert({
    nome: encryptRandom(nome),
    data_nascimento: input.dataNascimento,
    cpf: input.cpf ? encryptDeterministic(limparCPF(input.cpf)) : null,
    telefone: input.telefone ? encryptRandom(input.telefone) : null,
    email: input.email ? encryptRandom(input.email) : null,
  }).select("id").single();
  if (error) {
    // unique constraint em cpf (determinístico) => já existe paciente com esse CPF
    if (error.code === "23505") throw new Error("Já existe um paciente cadastrado com esse CPF.");
    throw new Error(error.message);
  }
  revalidatePath("/pacientes");
  return data;
}

export async function salvarHistoria(pacienteId: string, dados: Record<string, string>) {
  const { supabase } = await meId();
  const cifrado = Object.fromEntries(
    Object.entries(dados).map(([campo, valor]) => [campo, encryptRandom(valor)]),
  );
  const { error } = await supabase.from("historia_clinica")
    .upsert({ paciente_id: pacienteId, ...cifrado }, { onConflict: "paciente_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function criarNota(pacienteId: string, dados: {
  subjetivo?: string; objetivo?: string; avaliacao?: string; plano?: string;
}) {
  const { supabase, userId } = await meId();
  const cifrado = {
    subjetivo: encryptRandom(dados.subjetivo),
    objetivo: encryptRandom(dados.objetivo),
    avaliacao: encryptRandom(dados.avaliacao),
    plano: encryptRandom(dados.plano),
  };
  const { error } = await supabase.from("notas_soap")
    .insert({ paciente_id: pacienteId, autor_id: userId, ...cifrado });
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
