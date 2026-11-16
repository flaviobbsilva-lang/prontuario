begin;

alter type public.user_role add value if not exists 'secretaria';

create or replace function public.pode_acessar_agenda()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('admin', 'physician', 'secretaria')
  );
$$;

revoke all on function public.pode_acessar_agenda() from public;
grant execute on function public.pode_acessar_agenda() to authenticated;

create or replace function public.pacientes_para_agenda()
returns table (id uuid, nome text, telefone text, data_nascimento date, ativo boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nome, p.telefone::text, p.data_nascimento, p.ativo
  from public.pacientes p
  where public.pode_acessar_agenda()
    and (p.ativo or exists (
      select 1 from public.agendamentos a
      where a.paciente_id = p.id and not a.cancelado
    ));
$$;

revoke all on function public.pacientes_para_agenda() from public;
grant execute on function public.pacientes_para_agenda() to authenticated;

alter policy agenda_leitura on public.agendamentos using (public.pode_acessar_agenda());
alter policy agenda_criacao on public.agendamentos
  with check (public.pode_acessar_agenda() and autor_id = auth.uid());
alter policy agenda_edicao on public.agendamentos
  using (public.pode_acessar_agenda()) with check (public.pode_acessar_agenda());

commit;
