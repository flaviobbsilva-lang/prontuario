"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { encryptRandom } from "@/lib/crypto";
import { dataNascimentoValida } from "@/lib/validation";

export async function salvarAgenda(dia: string, id: string | null, form: FormData) {
  const supabase = await createClient();
  const hora = String(form.get("hora") ?? "");
  const minutos = Number(form.get("duracao"));
  const data = String(form.get("data") ?? dia);
  const inicio = new Date(data + "T" + hora + ":00-03:00");
  const url = "/agenda?dia=" + encodeURIComponent(dia);
  const cancelar = id && form.get("acao") === "cancelar";
  if (!cancelar && (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora) || !Number.isFinite(+inicio) || !Number.isInteger(minutos) || minutos < 1 || minutos > 1440)) {
    redirect(url + "&erro=horario");
  }
  const tabela = supabase.from("agendamentos");
  const paciente = String(form.get("paciente") ?? "").trim();
  const nome = String(form.get("nome") ?? "").trim();
  const telefone = String(form.get("telefone") ?? "").trim();
  const nascimento = String(form.get("nascimento") ?? "").trim();
  if (!cancelar && ((!paciente && (!nome || !nascimento)) ||
      (nascimento && !dataNascimentoValida(nascimento)))) {
    redirect(url + "&erro=identificacao");
  }
  if (!cancelar && (nome.length > 160 || telefone.length > 40 ||
      (!paciente && !/^[+\d ().-]+$/.test(telefone)) ||
      (telefone && !/^\d{8,15}$/.test(telefone.replace(/\D/g, ""))))) {
    redirect(url + "&erro=contato");
  }
  const dados = cancelar ? null : {
    inicio: inicio.toISOString(),
    fim: new Date(+inicio + minutos * 60000).toISOString(),
    paciente_id: paciente || null,
    contato_nome: nome ? encryptRandom(nome) : null,
    contato_telefone: telefone ? encryptRandom(telefone) : null,
    contato_nascimento: nascimento ? encryptRandom(nascimento) : null,
  };
  const consulta = id
    ? tabela.update(dados ?? { cancelado: true }).eq("id", id).eq("cancelado", false)
    : tabela.insert(dados!);
  const { data: registro, error } = await consulta.select("id").single();
  if (error || !registro) redirect(url + "&erro=" + (error?.code === "23P01" ? "ocupado" : "salvar"));
  revalidatePath("/agenda");
  redirect(cancelar ? url : "/agenda?dia=" + encodeURIComponent(data));
}
