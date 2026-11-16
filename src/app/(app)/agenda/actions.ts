"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const dados = cancelar ? null : {
    inicio: inicio.toISOString(),
    fim: new Date(+inicio + minutos * 60000).toISOString(),
    paciente_id: String(form.get("paciente") ?? ""),
  };
  const consulta = id
    ? tabela.update(dados ?? { cancelado: true }).eq("id", id).eq("cancelado", false)
    : tabela.insert(dados!);
  const { data: registro, error } = await consulta.select("id").single();
  if (error || !registro) redirect(url + "&erro=" + (error?.code === "23P01" ? "ocupado" : "salvar"));
  revalidatePath("/agenda");
  redirect(cancelar ? url : "/agenda?dia=" + encodeURIComponent(data));
}
