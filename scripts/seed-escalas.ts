/**
 * Seed/sync das definições de escala a partir da FONTE ÚNICA (src/domain).
 * Roda com a service_role key (ignora RLS) — use só localmente / em CI.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed
 */
import { createClient } from "@supabase/supabase-js";
import { ESCALAS } from "../src/domain/escalas";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  let inserted = 0, updated = 0;
  for (const def of ESCALAS) {
    const row = {
      codigo: def.code,
      nome: def.name,
      versao: def.version,
      schema_json: def,
    };
    const { data: existing } = await supabase
      .from("escala_definicoes").select("id").eq("codigo", def.code).maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("escala_definicoes").insert(row);
      if (error) throw error;
      inserted++;
    } else {
      const { error } = await supabase
        .from("escala_definicoes").update(row).eq("codigo", def.code);
      if (error) throw error;
      updated++;
    }
  }
  console.log(`Seed concluído: ${inserted} inseridas, ${updated} atualizadas, ${ESCALAS.length} no total.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
