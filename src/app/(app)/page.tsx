import { createClient } from "@/lib/supabase/server";

export default async function Painel() {
  const supabase = await createClient();
  const { count: pacientes } = await supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("ativo", true);
  const { count: aplicacoes } = await supabase.from("escala_respostas").select("*", { count: "exact", head: true });

  const cards = [
    { label: "Pacientes ativos", value: pacientes ?? 0 },
    { label: "Escalas aplicadas", value: aplicacoes ?? 0 },
  ];

  return (
    <div className="p-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">Painel</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 max-w-xl">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-lilac/60 bg-white p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 text-4xl font-[family-name:var(--font-display)] text-purple">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
