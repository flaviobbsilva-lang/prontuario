import { createClient } from "@/lib/supabase/server";
import { brand } from "@/lib/brand";
import { formatScoreForPrint } from "@/domain/scoring";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { decryptObjeto } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#2A2436" },
  header: { borderBottom: `1pt solid ${brand.colors.lilac}`, paddingBottom: 8, marginBottom: 12 },
  clinic: { fontSize: 16, color: brand.colors.purple, fontFamily: "Times-Roman" },
  crm: { fontSize: 9, color: brand.colors.muted },
  h2: { fontSize: 12, color: brand.colors.purple, marginTop: 14, marginBottom: 4, fontFamily: "Times-Roman" },
  label: { fontFamily: "Helvetica-Bold" },
  row: { marginBottom: 3 },
  foot: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: brand.colors.muted, textAlign: "right" },
});

function idade(nasc: string) {
  const d = new Date(nasc), h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pBruto } = await supabase.from("pacientes").select("*").eq("id", id).single();
  if (!pBruto) return new Response("Paciente não encontrado", { status: 404 });
  const p = decryptObjeto(pBruto, ["nome", "cpf", "telefone", "email"])!;
  await supabase.rpc("log_read", { p_entidade: "paciente_pdf", p_entidade_id: id });
  const { data: hBruto } = await supabase.from("historia_clinica").select("*").eq("paciente_id", id).maybeSingle();
  const h = decryptObjeto(hBruto, [
    "queixa_principal", "historia_doenca_atual", "historia_pregressa",
    "antecedentes_pessoais", "antecedentes_familiares", "habitos",
    "alergias", "medicamentos_em_uso",
  ]);
  const { data: notasBrutas } = await supabase.from("notas_soap").select("*").eq("paciente_id", id).order("created_at", { ascending: false }).limit(10);
  const notas = (notasBrutas ?? []).map((n: any) => decryptObjeto(n, ["subjetivo", "objetivo", "avaliacao", "plano"]));

  // último resultado de cada escala
  const { data: resp } = await supabase.from("escala_respostas")
    .select("aplicado_em, score_json, escala_definicoes(nome)").eq("paciente_id", id).order("aplicado_em", { ascending: false });
  const vistos = new Set<string>();
  const ultimas = (resp ?? []).filter((r: any) => {
    const nome = r.escala_definicoes?.nome; if (!nome || vistos.has(nome)) return false; vistos.add(nome); return true;
  });

  const historiaCampos: Array<[string, string]> = [
    ["Queixa principal", h?.queixa_principal], ["História da doença atual", h?.historia_doenca_atual],
    ["História pregressa", h?.historia_pregressa], ["Antecedentes pessoais", h?.antecedentes_pessoais],
    ["Antecedentes familiares", h?.antecedentes_familiares], ["Hábitos", h?.habitos],
    ["Alergias", h?.alergias], ["Medicamentos em uso", h?.medicamentos_em_uso],
  ].map(([l, v]) => [l, v || "-"]) as Array<[string, string]>;

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.clinic}>{brand.clinicName}</Text>
          <Text style={s.crm}>{brand.crm}</Text>
        </View>

        <Text style={s.h2}>Identificação</Text>
        <Text style={s.row}><Text style={s.label}>Nome: </Text>{p.nome}   ·   <Text style={s.label}>Idade: </Text>{idade(p.data_nascimento)}</Text>
        <Text style={s.row}><Text style={s.label}>CPF: </Text>{p.cpf || "-"}   ·   <Text style={s.label}>Telefone: </Text>{p.telefone || "-"}</Text>

        <Text style={s.h2}>História clínica</Text>
        {historiaCampos.map(([l, v]) => (
          <Text key={l} style={s.row}><Text style={s.label}>{l}: </Text>{v}</Text>
        ))}

        <Text style={s.h2}>Escalas — últimos resultados</Text>
        {ultimas.length === 0 && <Text style={s.row}>Sem registros de escalas.</Text>}
        {ultimas.map((r: any, i: number) => (
          <View key={i} style={{ marginBottom: 6 }}>
            <Text style={s.label}>{r.escala_definicoes?.nome} · {new Date(r.aplicado_em).toLocaleDateString("pt-BR")}</Text>
            {formatScoreForPrint(r.escala_definicoes?.nome ?? "", r.score_json || {}).map((linha, j) => (
              <Text key={j} style={s.row}>{linha}</Text>
            ))}
          </View>
        ))}

        <Text style={s.h2}>Evoluções (SOAP)</Text>
        {(notas ?? []).map((n: any) => (
          <View key={n.id} style={{ marginBottom: 6 }}>
            <Text style={s.label}>{new Date(n.created_at).toLocaleDateString("pt-BR")}</Text>
            {n.subjetivo && <Text style={s.row}>S: {n.subjetivo}</Text>}
            {n.objetivo && <Text style={s.row}>O: {n.objetivo}</Text>}
            {n.avaliacao && <Text style={s.row}>A: {n.avaliacao}</Text>}
            {n.plano && <Text style={s.row}>P: {n.plano}</Text>}
          </View>
        ))}

        <Text style={s.foot} fixed>Documento gerado eletronicamente · uso clínico · {brand.appName}</Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new Response(buffer as any, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="prontuario_${id}.pdf"` },
  });
}
