import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/crypto";
import DadosAgendamento from "@/components/DadosAgendamento";
import { registrarComparecimento, salvarAgenda } from "./actions";

const fuso = "America/Sao_Paulo";
const iso = (data: Date) => data.toISOString().slice(0, 10);
const hora = (data: string) => new Date(data).toLocaleTimeString("pt-BR", {
  timeZone: fuso, hour: "2-digit", minute: "2-digit",
});
const campo = "rounded-lg border border-lilac px-2 py-2";
type PacienteAgenda = { id: string; nome: string; telefone: string | null; data_nascimento: string; ativo: boolean };

export default async function Agenda({ searchParams }: {
  searchParams: Promise<{ dia?: string; erro?: string; hora?: string }>;
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
  const [agenda, pacientes, equipe] = await Promise.all([
    banco.from("agendamentos").select("id, paciente_id, inicio, fim, contato_nome, contato_telefone, contato_nascimento, comparecimento")
      .eq("cancelado", false).lt("inicio", new Date(+inicio + 86400000).toISOString())
      .gt("fim", inicio.toISOString()).order("inicio"),
    banco.rpc("pacientes_para_agenda"),
    banco.rpc("is_staff"),
  ]);
  const fichas = ((pacientes.data ?? []) as PacienteAgenda[]).map((p) => ({
    id: p.id, nome: decryptField(p.nome),
    telefone: p.telefone ? decryptField(p.telefone) : "",
    nascimento: p.data_nascimento ?? "",
    ativo: p.ativo,
  }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const nomes = fichas.filter((p) => p.ativo);
  const indisponivel = Boolean(agenda.error || pacientes.error);
  const consultas = agenda.data ?? [];
  const intervalo = 30 * 60_000;
  const primeiroHorario = Math.min(8 * 2, ...consultas.map((item) =>
    Math.max(0, Math.floor((Date.parse(item.inicio) - +inicio) / intervalo))));
  const ultimoHorario = Math.max(19 * 2, ...consultas.map((item) =>
    Math.min(48, Math.ceil((Date.parse(item.fim) - +inicio) / intervalo))));
  const erros: Record<string, string> = {
    identificacao: "Para a primeira consulta, informe o nome e uma data de nascimento válida.",
    contato: "Selecione um paciente ou informe um telefone válido para a primeira consulta.",
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
          <section aria-label="Grade de horários" className="space-y-2">
            <h3 className="font-medium">Grade de horários</h3>
            <div className="grid grid-cols-3 gap-1 text-center text-xs sm:grid-cols-5">
              {Array.from({ length: ultimoHorario - primeiroHorario }, (_, index) => {
                const instante = +inicio + (primeiroHorario + index) * intervalo;
                const horario = hora(new Date(instante).toISOString());
                const ocupadas = consultas.filter((item) =>
                  Date.parse(item.inicio) < instante + intervalo && Date.parse(item.fim) > instante);
                return ocupadas.length
                  ? <div key={instante} className="rounded border border-lilac bg-lilac/30 px-1 py-2">
                      <span className="block">{horario}</span>
                      {ocupadas.map((item) => <a key={item.id} href={"#consulta-" + item.id}
                        className="block text-purple underline">Ocupado</a>)}
                    </div>
                  : <Link key={instante} className="rounded border border-lilac px-1 py-2 hover:bg-lilac/20"
                      href={`/agenda?dia=${dia}&hora=${horario}#novo-agendamento`}>
                      <span className="block">{horario}</span>Livre
                    </Link>;
              })}
            </div>
          </section>
          <form id="novo-agendamento" key={dia + (params.hora ?? "")}
            action={salvarAgenda.bind(null, dia, null)} className="flex flex-wrap items-end gap-2 text-sm">
            <DadosAgendamento pacientes={nomes} hoje={hoje} campo={campo} />
            <label className="grid gap-1">Horário<input className={campo} name="hora" type="time" defaultValue={params.hora} required /></label>
            <label className="grid gap-1">Duração (min)<input className={campo + " w-24"} name="duracao" type="number" min="1" max="1440" defaultValue="30" required /></label>
            <button className="rounded-lg bg-purple px-3 py-2 text-white">Agendar</button>
          </form>
          <h3 className="font-medium">Consultas do dia</h3>
          {!consultas.length && <p className="text-sm text-muted">Nenhuma consulta agendada.</p>}
          {consultas.map((item) => {
            const paciente = fichas.find((ficha) => ficha.id === item.paciente_id);
            const nomeContato = item.contato_nome ? decryptField(item.contato_nome) : "";
            const telefone = item.contato_telefone ? decryptField(item.contato_telefone) : "";
            const nascimento = item.contato_nascimento ? decryptField(item.contato_nascimento) : "";
            const nome = paciente?.nome || nomeContato || "Primeira consulta";
            const dataInicio = new Intl.DateTimeFormat("sv-SE", { timeZone: fuso }).format(new Date(item.inicio));
            return <article key={item.id} id={"consulta-" + item.id} className="rounded-lg border border-lilac bg-white p-3 text-sm">
              <p>{hora(item.inicio)} às {hora(item.fim)} · {item.paciente_id && equipe.data === true
                ? <Link className="text-purple underline" href={"/pacientes/" + item.paciente_id}>{nome}</Link>
                : nome}{telefone && <> · {telefone}</>}{nascimento && <> · Nascimento: {nascimento.split("-").reverse().join("/")}</>}</p>
              <form action={registrarComparecimento.bind(null, dia, item.id)} className="mt-2 flex flex-wrap items-end gap-2">
                <label className="grid gap-1">Comparecimento
                  <select name="comparecimento" className={campo} key={item.comparecimento} defaultValue={item.comparecimento}>
                    <option value="agendado">Agendado</option>
                    <option value="compareceu">Compareceu</option>
                    <option value="faltou">Faltou</option>
                  </select>
                </label>
                <button className="rounded-lg border border-lilac px-3 py-2 text-purple">Salvar presença</button>
              </form>
              <details className="mt-2">
                <summary className="cursor-pointer">Editar consulta</summary>
                <form action={salvarAgenda.bind(null, dataInicio, item.id)} className="mt-2 flex flex-wrap items-end gap-2">
                  <DadosAgendamento pacienteId={item.paciente_id ?? ""}
                    pacientes={item.paciente_id && !nomes.some((p) => p.id === item.paciente_id)
                      ? [...nomes, { id: item.paciente_id, nome, telefone, nascimento }] : nomes}
                    inicial={{ nome: nomeContato, telefone, nascimento }} hoje={hoje} campo={campo} />
                  <label className="grid gap-1">Data<input className={campo} name="data" type="date" defaultValue={dataInicio} required /></label>
                  <label className="grid gap-1">Horário<input className={campo} name="hora" type="time" defaultValue={hora(item.inicio)} required /></label>
                  <label className="grid gap-1">Duração (min)<input className={campo + " w-24"} name="duracao" type="number" min="1" max="1440" defaultValue={(Date.parse(item.fim) - Date.parse(item.inicio)) / 60000} required /></label>
                  <button className="rounded-lg bg-purple px-3 py-2 text-white">Salvar</button>
                </form>
              </details>
              <form action={salvarAgenda.bind(null, dia, item.id)} className="mt-3">
                <button type="submit" name="acao" value="cancelar"
                  className="rounded-lg border border-lilac px-3 py-2 text-red-700">
                  Cancelar agendamento
                </button>
              </form>
            </article>;
          })}
        </>}
      </section>
    </div>
  </div>;
}
