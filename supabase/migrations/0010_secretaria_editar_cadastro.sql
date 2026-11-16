begin;

create or replace function public.cadastros_para_secretaria()
returns table (id uuid, nome text, cpf text, endereco text, data_nascimento date, telefone text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nome, p.cpf::text, p.endereco, p.data_nascimento, p.telefone::text
  from public.pacientes p
  where p.ativo and exists (
    select 1 from public.profiles where profiles.id = auth.uid() and role::text = 'secretaria'
  );
$$;

create or replace function public.editar_cadastro_secretaria(
  paciente uuid, novo_cpf text, novo_endereco text, novo_nascimento date, novo_telefone text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role::text = 'secretaria'
  ) then
    raise exception 'Acesso restrito' using errcode = '42501';
  end if;
  if novo_nascimento is null or novo_nascimento > (now() at time zone 'America/Sao_Paulo')::date
    or novo_cpf is not null and novo_cpf !~ '^v1d:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$'
    or novo_endereco is not null and novo_endereco !~ '^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$'
    or novo_telefone is not null and novo_telefone !~ '^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$'
  then
    raise exception 'Dados cadastrais invalidos' using errcode = '22023';
  end if;
  update public.pacientes
    set cpf = novo_cpf, endereco = novo_endereco, data_nascimento = novo_nascimento, telefone = novo_telefone
    where id = paciente and ativo;
  return found;
end;
$$;

revoke all on function public.cadastros_para_secretaria() from public;
revoke all on function public.editar_cadastro_secretaria(uuid, text, text, date, text) from public;
grant execute on function public.cadastros_para_secretaria() to authenticated;
grant execute on function public.editar_cadastro_secretaria(uuid, text, text, date, text) to authenticated;

commit;
