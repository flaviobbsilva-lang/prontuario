-- Seed de DEMONSTRAÇÃO (opcional). Cria um paciente fictício com histórico de
-- escalas, para o teste já mostrar a curva de evolução preenchida.
-- Rode DEPOIS de: aplicar as migrations, popular escala_definicoes (npm run seed)
-- e criar/promover seu usuário. Para remover, apague o paciente "DEMO".
-- Idempotente: não duplica se já existir.
do $$
declare
  v_autor uuid;
  v_pac uuid;
  v_hads uuid;
begin
  select id into v_autor from public.profiles where role in ('physician','admin') order by created_at limit 1;
  if v_autor is null then
    raise exception 'Crie e promova um usuário (physician/admin) antes de rodar o seed de demo.';
  end if;

  select id into v_hads from public.escala_definicoes where codigo = 'HADS';
  if v_hads is null then
    raise exception 'Rode o seed das escalas (npm run seed) antes do seed de demo.';
  end if;

  if exists (select 1 from public.pacientes where nome = 'Marina Alves (DEMO)') then
    raise notice 'Paciente de demonstração já existe; nada a fazer.';
    return;
  end if;

  insert into public.pacientes (nome, data_nascimento, cpf, telefone, email)
  values ('Marina Alves (DEMO)', '1982-05-10', null, '(21) 99999-0000', 'marina.demo@exemplo.com')
  returning id into v_pac;

  insert into public.historia_clinica
    (paciente_id, queixa_principal, historia_doenca_atual, antecedentes_pessoais, habitos)
  values (v_pac,
    'Enxaqueca crônica com aura, refratária.',
    'Quadro há 6 anos, piora nos últimos meses, em acompanhamento para neuromodulação.',
    'Hipotireoidismo controlado.',
    'Sono irregular; sedentária.');

  -- Três aplicações de HADS ao longo do tempo (total caindo = melhora)
  insert into public.escala_respostas (paciente_id, escala_id, autor_id, aplicado_em, respostas_json, score_json) values
    (v_pac, v_hads, v_autor, now() - interval '70 days', '{}'::jsonb, '{"total":22,"anxiety":13,"depression":9}'::jsonb),
    (v_pac, v_hads, v_autor, now() - interval '40 days', '{}'::jsonb, '{"total":18,"anxiety":10,"depression":8}'::jsonb),
    (v_pac, v_hads, v_autor, now() - interval '10 days', '{}'::jsonb, '{"total":13,"anxiety":7,"depression":6}'::jsonb);

  raise notice 'Paciente de demonstração criado.';
end $$;
