-- =====================================================================
--  Ajuste de colunas para caber valores criptografados (maiores que o
--  texto original em claro). Rodar ANTES de aplicar a criptografia de
--  campo no código e ANTES de rodar scripts/encrypt-existing-data.ts.
-- =====================================================================
alter table public.pacientes alter column cpf type text;
alter table public.pacientes alter column telefone type text;
-- nome e email já são "text" (sem limite), não precisam de ajuste.
