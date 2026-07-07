/**
 * Criptografa em produção os dados que hoje estão em texto puro
 * (nome, cpf, telefone, email, história clínica, notas SOAP).
 *
 * Idempotente: pula qualquer campo que já esteja no formato cifrado
 * (prefixo "v1:" ou "v1d:"), então pode rodar mais de uma vez sem risco.
 *
 * ANTES DE RODAR:
 *   1. Faça um backup/snapshot do banco no painel do Supabase.
 *   2. Rode a migration 0003_field_encryption_columns.sql.
 *   3. Defina FIELD_ENCRYPTION_KEY (a mesma que vai usar em produção).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... FIELD_ENCRYPTION_KEY=... \
 *     npm run encrypt-existing
 */
import { createClient } from "@supabase/supabase-js";
import { encryptRandom, encryptDeterministic, jaCriptografado } from "../src/lib/crypto";
import { limparCPF } from "../src/lib/validation";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
if (!process.env.FIELD_ENCRYPTION_KEY) throw new Error("Defina FIELD_ENCRYPTION_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function migrarPacientes() {
  const { data, error } = await supabase.from("pacientes").select("id, nome, cpf, telefone, email");
  if (error) throw error;
  let n = 0;
  for (const p of data ?? []) {
    const update: Record<string, string | null> = {};
    if (p.nome && !jaCriptografado(p.nome)) update.nome = encryptRandom(p.nome);
    if (p.cpf && !jaCriptografado(p.cpf)) update.cpf = encryptDeterministic(limparCPF(p.cpf));
    if (p.telefone && !jaCriptografado(p.telefone)) update.telefone = encryptRandom(p.telefone);
    if (p.email && !jaCriptografado(p.email)) update.email = encryptRandom(p.email);
    if (Object.keys(update).length === 0) continue;
    const { error: e2 } = await supabase.from("pacientes").update(update).eq("id", p.id);
    if (e2) throw e2;
    n++;
  }
  console.log(`pacientes: ${n} registro(s) atualizado(s)`);
}

async function migrarHistoria() {
  const campos = [
    "queixa_principal", "historia_doenca_atual", "historia_pregressa",
    "antecedentes_pessoais", "antecedentes_familiares", "habitos",
    "alergias", "medicamentos_em_uso",
  ] as const;
  const { data, error } = await supabase.from("historia_clinica").select(`paciente_id, ${campos.join(", ")}`);
  if (error) throw error;
  let n = 0;
  for (const h of (data ?? []) as any[]) {
    const update: Record<string, string | null> = {};
    for (const campo of campos) {
      const valor = h[campo];
      if (valor && !jaCriptografado(valor)) update[campo] = encryptRandom(valor);
    }
    if (Object.keys(update).length === 0) continue;
    const { error: e2 } = await supabase.from("historia_clinica").update(update).eq("paciente_id", h.paciente_id);
    if (e2) throw e2;
    n++;
  }
  console.log(`historia_clinica: ${n} registro(s) atualizado(s)`);
}

async function migrarNotas() {
  const campos = ["subjetivo", "objetivo", "avaliacao", "plano"] as const;
  const { data, error } = await supabase.from("notas_soap").select(`id, ${campos.join(", ")}`);
  if (error) throw error;
  let n = 0;
  for (const nota of (data ?? []) as any[]) {
    const update: Record<string, string | null> = {};
    for (const campo of campos) {
      const valor = nota[campo];
      if (valor && !jaCriptografado(valor)) update[campo] = encryptRandom(valor);
    }
    if (Object.keys(update).length === 0) continue;
    const { error: e2 } = await supabase.from("notas_soap").update(update).eq("id", nota.id);
    if (e2) throw e2;
    n++;
  }
  console.log(`notas_soap: ${n} registro(s) atualizado(s)`);
}

async function main() {
  await migrarPacientes();
  await migrarHistoria();
  await migrarNotas();
  console.log("Concluído.");
}

main().catch((e) => { console.error(e); process.exit(1); });
