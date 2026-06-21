-- Log de LEITURA de prontuário (LGPD). Postgres não tem trigger de SELECT,
-- então a leitura é registrada pela aplicação via esta função. SECURITY
-- DEFINER permite inserir no audit_log sem dar INSERT direto ao usuário
-- (assim ninguém forja entradas arbitrárias).
create or replace function public.log_read(p_entidade text, p_entidade_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    insert into public.audit_log (user_id, acao, entidade, entidade_id)
    values (auth.uid(), 'READ', p_entidade, p_entidade_id);
  end if;
end; $$;
