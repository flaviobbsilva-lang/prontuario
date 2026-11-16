import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/crypto";
import { salvarAgenda } from "./actions";

const fuso = "America/Sao_Paulo";
const iso = (data: Date) => data.toISOString().slice(0, 10);
const hora = (data: string) => new Date(data).toLocaleTimeString("pt-BR", {
  timeZone: fuso, hour: "2-digit", minute: "2-digit",
});
const campo = "rounded-lg border border-lilac px-2 py-2";

export default async function Agenda({ searchParams }: {
  searchParams: Promise<{ dia?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const hoje = new Intl.DateTimeFormat("sv-SE", { timeZone: fuso }).format(new Date());
  const candidato = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "") ? params.dia! : hoje;
  const data = new Date(candidato + "T00:00:00Z");
  const dia = Number.isFinite(+data) && iso(data) === candidato ? candidato : hoje;
  const selecionado = new Date(dia + "T00:00:00Z");
  const ano = selecionado.getUTCFullYear(), mes = selecionado.getUTCMonth();
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const dias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const inicio = new Date(dia + "T00:00:00-03:00");
  const banco = await createClient();
  const [agenda, pacientes] = await Promise.all([
    banco.from("agendamentos").select("id, paciente_id, inicio, fim, pacientes(nome)")
      .eq("cancelado", false).lt("inicio", new Date(+inicio + 86400000).toISOString())
      .gt("fim", inicio.toISOString()).order("inicio"),
    banco.from("pacientes").select("id, nome").eq("ativo", true),
  ]);
  const nomes = (pacientes.data ?? []).map((p) => ({ ...p, nome: decryptField(p.nome) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const opcoes = nomes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>);
  const indisponivel = Boolean(agenda.error || pacientes.error);
  const erros: Record<string, string> = {
    ocupado: "Já existe uma consulta nesse horário.",
    horario: "Confira o horário e a duração.",
    salvar: "Não foi possível salvar a alteração.",
  };

  return <div className="p-4 sm:p-8">
    <h1 className="text-3xl text-ink">Agenda</h1>
    <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
      <section aria-label="Calendário mensal">
        <div className="flex items-center justify-between">
          <Link aria-label="Mês anterior" href={"/agenda?dia=" + iso(new Date(Date.UTC(ano, mes - 1, 1)))}><ChevronLeft /></Link>
          <h2 className="capitalize">{primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
          <Link aria-label="Próximo mês" href={"/agenda?dia=" + iso(new Date(Date.UTC(ano, mes + 1, 1)))}><ChevronRight /></Link>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <span key={d}>{d}</span>)}
          {Array.from({ length: primeiro.getUTCDay() }, (_, i) => <span key={i} />)}
          {Array.from({ length: dias }, (_, i) => {
            const valor = iso(new Date(Date.UTC(ano, mes, i + 1)));
            return <Link key={valor} aria-current={dia === valor ? "date" : undefined}
              className={dia === valor ? "rounded bg-purple py-2 text-white" : "rounded py-2 hover:bg-lilac/30"}
              href={"/agenda?dia=" + valor}>{i + 1}</Link>;
          })}
        </div>
        <Link className="mt-3 inline-block text-sm text-purple" href="/agenda">Hoje</Link>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Agenda de {dia.split("-").reverse().join("/")}</h2>
        {params.erro && erros[params.erro] && <p role="alert" className="text-red-700">{erros[params.erro]}</p>}
        {indisponivel ? <p role="alert">Agenda indisponível. Verifique a configuração do banco.</p> : <>
          <form action={salvarAgenda.bind(null, dia, null)} className="flex flex-wrap items-end gap-2 text-sm">
            <label className="grid gap-1">Paciente<select className={campo} name="paciente" required defaultValue=""><option value="" disabled>Selecione</option>{opcoes}</select></label>
            <label className="grid gap-1">Horário<input className={campo} name="hora" type="time" required /></label>
            <label className="grid gap-1">Duração (min)<input className={campo + " w-24"} name="duracao" type="number" min="1" max="1440" defaultValue="30" required /></label>
            <button className="rounded-lg bg-purple px-3 py-2 text-white">Agendar</button>
          </form>
          {!agenda.data?.length && <p className="text-sm text-muted">Nenhuma consulta agendada.</p>}
          {agenda.data?.map((item) => {
            const paciente = Array.isArray(item.pacientes) ? item.pacientes[0] : item.pacientes;
            const nome = paciente ? decryptField(paciente.nome) : "Paciente";
            const dataInicio = new Intl.DateTimeFormat("sv-SE", { timeZone: fuso }).format(new Date(item.inicio));
            return <article key={item.id} className="rounded-lg border border-lilac bg-white p-3 text-sm">
              <p>{hora(item.inicio)} às {hora(item.fim)} · <Link className="text-purple underline" href={"/pacientes/" + item.paciente_id}>{nome}</Link></p>
              <details className="mt-2">
                <summary className="cursor-pointer">Editar consulta</summary>
                <form action={salvarAgenda.bind(null, dataInicio, item.id)} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="paciente" value={item.paciente_id} />
                  <label className="grid gap-1">Data<input className={campo} name="data" type="date" defaultValue={dataInicio} required /></label>
                  <label className="grid gap-1">Horário<input className={campo} name="hora" type="time" defaultValue={hora(item.inicio)} required /></label>
                  <label className="grid gap-1">Duração (min)<input className={campo + " w-24"} name="duracao" type="number" min="1" max="1440" defaultValue={(Date.parse(item.fim) - Date.parse(item.inicio)) / 60000} required /></label>
                  <button className="rounded-lg bg-purple px-3 py-2 text-white">Salvar</button>
                  <button className="rounded-lg border border-lilac px-3 py-2 text-red-700" name="acao" value="cancelar" formNoValidate>Cancelar consulta</button>
                </form>
              </details>
            </article>;
          })}
        </>}
      </section>
    </div>
  </div>;
}
