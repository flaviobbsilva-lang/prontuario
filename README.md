# Prontuário — fundação reconstruída (Next.js + Supabase)

Reconstrução da fundação do prontuário no stack alvo, partindo das duas versões
anteriores (backend FastAPI em Python e app TS gerado no Manus). O objetivo desta
entrega é a **base correta e auditável**: dados, segurança e o núcleo clínico. A
camada de telas (UI) é o próximo passo, descrito no fim.

## Stack escolhido (e por quê)

| Camada | Escolha | Motivo |
| --- | --- | --- |
| App | Next.js 15 (App Router) + TypeScript | Um único projeto (front + back), deploy nativo na Vercel, que já é o seu fluxo |
| Banco + Auth | Supabase (Postgres, Auth, RLS, Storage) | Auth pronta, controle de acesso no banco (RLS) e compatível com o Lovable |
| UI | shadcn/ui + Tailwind + Recharts | Mesmos componentes do app anterior, reaproveitáveis |
| PDF | @react-pdf/renderer (server-side) | Substitui o reportlab do Python; roda na Vercel sem binário externo |
| Núcleo clínico | Módulo único em `src/domain` | Escalas e scoring em um só lugar, testado, sem duplicação |

Decisões que isso encerra: fim do Python como serviço separado; fim do acoplamento
ao Manus (OAuth/SDK/Forge); um só banco; e um núcleo clínico que é fonte única de
verdade para front, back e seed.

## URGENTE — segredos vazados no pacote antigo

O `.project-config.json` do tar.gz original continha credenciais reais em texto puro
(senha do banco TiDB, `JWT_SECRET`, chaves Forge e um par de chaves AWS). Antes de
qualquer coisa: **girar a senha do banco antigo, revogar as chaves Forge e AWS** e
nunca versionar arquivo de config com segredo. Neste projeto, segredos vivem só em
`.env.local` (Vercel: Environment Variables) e o `.gitignore` já bloqueia.

## O que já está pronto (e verificado)

- `src/domain/escalas.ts` — as **8 escalas** (HADS, DN4, MOS Sono, McGill, PCS,
  MDS-UPDRS total, Barthel Modificado, FIQ), transcritas com fidelidade das versões
  existentes. Nenhum item clínico foi inventado.
- `src/domain/scoring.ts` — os 7 métodos de pontuação (`sum`, `sum_boolean`,
  `basic_summary`, `count_present_and_vas`, `sum_fields`, `barthel_weighted`,
  `fiq_summary`) + formatação para impressão.
- `src/domain/scoring.test.ts` — **12 testes passando**, provando que o resultado
  bate com a especificação original (rode `npm test`).
- `supabase/migrations/0001_init.sql` e `0002_read_audit.sql` — schema Postgres com RLS,
  papéis, auditoria de escrita (trigger) e de leitura (`log_read`)
  por trigger.
- `src/lib/supabase/*` — clientes server e browser respeitando o RLS.
- `src/app/actions.ts` — exemplo de Server Action: o score é calculado no servidor a
  partir do núcleo, nunca confiando no cliente.
- `scripts/seed-escalas.ts` — popula `escala_definicoes` a partir da fonte única.

## Segurança e conformidade (estado atual)

- **RLS ligado** em todas as tabelas. Acesso a dados de paciente só para papéis
  `physician`/`admin`. Um cadastro novo entra como `pending` (sem acesso) até um
  admin promover — isso evita que signup aberto enxergue prontuário.
- **Auditoria por trigger** no banco, que a aplicação não consegue burlar. Limitação
  honesta: Postgres não tem trigger de SELECT, então o **log de leitura** (que a LGPD
  costuma exigir) é registrado pela aplicação via a função `log_read` (migration 0002),
  chamada ao abrir o prontuário e ao exportar o PDF.
- Pendências antes de uso clínico real: criptografia/retenção de dados, e avaliar as
  regras do CFM para prontuário eletrônico (CFM 1.821/2007 e a certificação SBIS-CFM
  se a meta for prontuário sem papel com assinatura ICP-Brasil). Não bloqueia o
  desenvolvimento, mas precisa entrar no plano antes de dado de paciente real.

## Como rodar

1. Criar projeto no Supabase e rodar, no SQL Editor e nesta ordem,
   `supabase/migrations/0001_init.sql` e depois `0002_read_audit.sql`.
2. Copiar `.env.example` para `.env.local` e preencher as chaves.
3. Popular as 8 escalas. Duas opções:
   - Sem máquina: rode `supabase/seed_escalas.sql` no SQL Editor do Supabase.
   - Via Node: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`.
4. Criar seu usuário pelo Supabase Auth e, no SQL Editor, promover a admin:
   `update profiles set role = 'admin' where email = 'voce@exemplo.com';`
5. `npm test` para confirmar o núcleo.
6. (Opcional) Rodar `supabase/seed_demo.sql` no SQL Editor para criar um paciente
   fictício com histórico de escalas, e ver a curva de evolução já preenchida.

## Deploy na Vercel

Conectar o repositório do GitHub na Vercel, definir as variáveis
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em Environment Variables,
e publicar. A `SUPABASE_SERVICE_ROLE_KEY` fica fora da Vercel (uso só local/CI).

## Estado atual

Telas implementadas: login, painel, lista e cadastro de pacientes, detalhe do paciente
(história clínica, evoluções SOAP e escalas com formulário dinâmico e gráfico de
evolução) e exportação de PDF. `next build` passa, `tsc` limpo e 12 testes do núcleo
verdes. Os componentes de UI são primitivos próprios em Tailwind; trocar por shadcn é
opcional e não muda a lógica. As migrations foram validadas em PostgreSQL real
(criação de tabelas, RLS, triggers de auditoria e `log_read`), incluindo teste de
acesso por papel.

## O que só você consegue fazer (precisa das suas contas)

1. Criar o projeto no Supabase e rodar as duas migrations (passo 1 acima).
2. Preencher `.env.local` com as chaves do projeto.
3. Rodar o seed das escalas e criar/promover o seu usuário admin (passos 3 e 4 acima).
4. Subir o repositório no GitHub e conectar na Vercel com as duas variáveis públicas.

Marca: `appName` em `src/lib/brand.ts` está como "Metanima" (provisório). Trocar lá
propaga para o app inteiro e para o cabeçalho/rodapé do PDF.
