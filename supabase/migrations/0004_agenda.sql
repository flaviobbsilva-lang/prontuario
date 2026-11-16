create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id),
  autor_id uuid not null default auth.uid() references public.profiles(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  cancelado boolean not null default false,
  check (fim > inicio),
  exclude using gist (tstzrange(inicio, fim, '[)') with &&) where (not cancelado)
);

alter table public.agendamentos enable row level security;
grant select, insert, update on public.agendamentos to authenticated;
create policy agenda_leitura on public.agendamentos for select to authenticated using (public.is_staff());
create policy agenda_criacao on public.agendamentos for insert to authenticated with check (public.is_staff() and autor_id = auth.uid());
create policy agenda_edicao on public.agendamentos for update to authenticated using (public.is_staff()) with check (public.is_staff());
create trigger audit_agenda after insert or update or delete on public.agendamentos
  for each row execute function public.audit_row();
