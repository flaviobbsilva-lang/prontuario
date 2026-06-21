-- =====================================================================
--  Prontuário — schema inicial (Postgres / Supabase)
--  Segurança no nível do banco: RLS + papéis + auditoria por trigger.
-- =====================================================================

-- Papéis. 'pending' = recém-cadastrado, SEM acesso a dados de paciente
-- até um admin promover. Isso evita que um signup aberto veja prontuários.
create type user_role as enum ('pending', 'physician', 'admin');

-- ---------------------------------------------------------------------
-- profiles: espelha auth.users com o papel clínico
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: o usuário atual é equipe clínica (médico ou admin)?
-- SECURITY DEFINER para ler profiles sem recursão de RLS.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('physician', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------------------------------------------------------------------
-- Tabelas clínicas
-- ---------------------------------------------------------------------
create table public.pacientes (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  data_nascimento  date not null,
  cpf              varchar(14) unique,
  telefone         varchar(30),
  email            text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.pacientes (nome);

create table public.historia_clinica (
  paciente_id              uuid primary key references public.pacientes(id) on delete cascade,
  queixa_principal         text,
  historia_doenca_atual    text,
  historia_pregressa       text,
  antecedentes_pessoais    text,
  antecedentes_familiares  text,
  habitos                  text,
  alergias                 text,
  medicamentos_em_uso      text,
  updated_at               timestamptz not null default now()
);

create table public.notas_soap (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references public.pacientes(id) on delete cascade,
  autor_id     uuid not null references public.profiles(id),
  subjetivo    text,
  objetivo     text,
  avaliacao    text,
  plano        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.notas_soap (paciente_id);

create table public.escala_definicoes (
  id          uuid primary key default gen_random_uuid(),
  codigo      varchar(50) not null unique,
  nome        text not null,
  versao      varchar(50) not null default 'v1',
  schema_json jsonb not null,          -- itens + regras (vem de src/domain/escalas.ts)
  created_at  timestamptz not null default now()
);

create table public.escala_respostas (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id) on delete cascade,
  escala_id      uuid not null references public.escala_definicoes(id),
  autor_id       uuid not null references public.profiles(id),
  aplicado_em    timestamptz not null default now(),
  respostas_json jsonb not null,
  score_json     jsonb not null default '{}'::jsonb
);
create index on public.escala_respostas (paciente_id, escala_id, aplicado_em);

-- ---------------------------------------------------------------------
-- Auditoria por trigger (não pode ser burlada pela aplicação)
-- Observação LGPD: triggers capturam escrita (INSERT/UPDATE/DELETE).
-- Log de LEITURA precisa ser feito na aplicação (Postgres não tem
-- trigger de SELECT). Está documentado no README.
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid,
  acao        text not null,        -- INSERT | UPDATE | DELETE | READ
  entidade    text not null,
  entidade_id text,
  created_at  timestamptz not null default now()
);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  rid := coalesce(
    to_jsonb(case when tg_op = 'DELETE' then old else new end) ->> 'id',
    to_jsonb(case when tg_op = 'DELETE' then old else new end) ->> 'paciente_id');
  insert into public.audit_log (user_id, acao, entidade, entidade_id)
  values (auth.uid(), tg_op, tg_table_name, rid);
  return null;
end; $$;

create trigger audit_pacientes        after insert or update or delete on public.pacientes        for each row execute function public.audit_row();
create trigger audit_historia         after insert or update or delete on public.historia_clinica for each row execute function public.audit_row();
create trigger audit_notas            after insert or update or delete on public.notas_soap        for each row execute function public.audit_row();
create trigger audit_escala_respostas after insert or update or delete on public.escala_respostas  for each row execute function public.audit_row();

-- touch updated_at
create trigger t_pacientes  before update on public.pacientes        for each row execute function public.touch_updated_at();
create trigger t_historia   before update on public.historia_clinica for each row execute function public.touch_updated_at();
create trigger t_notas      before update on public.notas_soap       for each row execute function public.touch_updated_at();
create trigger t_profiles   before update on public.profiles         for each row execute function public.touch_updated_at();

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.pacientes         enable row level security;
alter table public.historia_clinica  enable row level security;
alter table public.notas_soap         enable row level security;
alter table public.escala_definicoes  enable row level security;
alter table public.escala_respostas   enable row level security;
alter table public.audit_log          enable row level security;

-- profiles: vê o próprio; admin vê todos; só admin altera papéis
create policy profiles_select_self  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_admin on public.profiles for update using (public.is_admin());

-- tabelas clínicas: acesso total para equipe (physician/admin)
create policy pac_all   on public.pacientes        for all using (public.is_staff()) with check (public.is_staff());
create policy hist_all  on public.historia_clinica for all using (public.is_staff()) with check (public.is_staff());
create policy soap_all  on public.notas_soap        for all using (public.is_staff()) with check (public.is_staff());
create policy resp_all  on public.escala_respostas  for all using (public.is_staff()) with check (public.is_staff());

-- definições de escala: equipe lê; admin escreve (via seed/sync)
create policy escdef_read  on public.escala_definicoes for select using (public.is_staff());
create policy escdef_write on public.escala_definicoes for all    using (public.is_admin()) with check (public.is_admin());

-- audit_log: apenas admin consulta; ninguém edita/apaga (trigger insere)
create policy audit_read_admin on public.audit_log for select using (public.is_admin());
