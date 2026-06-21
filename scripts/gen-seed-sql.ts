import { ESCALAS } from "../src/domain/escalas";
const esc = (s: string) => s.replace(/'/g, "''");
let out = `-- Seed das 8 escalas (gerado de src/domain/escalas.ts).
-- Rode no SQL Editor do Supabase. Idempotente: atualiza se já existir.
`;
for (const d of ESCALAS) {
  const json = esc(JSON.stringify(d));
  out += `\ninsert into public.escala_definicoes (codigo, nome, versao, schema_json) values
  ('${esc(d.code)}', '${esc(d.name)}', '${esc(d.version)}', '${json}'::jsonb)
  on conflict (codigo) do update set nome = excluded.nome, versao = excluded.versao, schema_json = excluded.schema_json;\n`;
}
process.stdout.write(out);
