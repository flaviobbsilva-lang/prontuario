alter table public.agendamentos
  add column comparecimento text not null default 'agendado'
  check (comparecimento in ('agendado', 'compareceu', 'faltou'));
