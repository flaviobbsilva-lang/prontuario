alter table public.agendamentos
  alter column paciente_id drop not null,
  add column contato_nome text,
  add column contato_telefone text,
  add constraint agenda_paciente_ou_telefone
    check (paciente_id is not null or nullif(btrim(contato_telefone), '') is not null);
