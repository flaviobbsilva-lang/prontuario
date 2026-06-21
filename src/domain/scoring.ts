/**
 * NÚCLEO CLÍNICO — Motor de pontuação (scoring)
 * ---------------------------------------------
 * Reproduz fielmente a lógica que existia no FastAPI (compute_score) e no
 * app TS (computeScore + formatScoreForPrint), agora num único lugar testado.
 * Cobre os 7 métodos: sum, sum_boolean, basic_summary, count_present_and_vas,
 * sum_fields, barthel_weighted, fiq_summary.
 */

import type { ScaleScoring } from "./escalas";

export type Answers = Record<string, unknown>;
export type Score = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeScore(scoring: ScaleScoring, answers: Answers): Score {
  const method = scoring.method;

  if (method === "sum") {
    let total = 0;
    for (const v of Object.values(answers)) {
      if (typeof v === "number") total += v;
    }
    const out: Score = { total };
    for (const [name, keys] of Object.entries(scoring.subscales ?? {})) {
      out[name] = keys.reduce((acc, k) => acc + num(answers[k]), 0);
    }
    return out;
  }

  if (method === "sum_boolean") {
    const total = Object.values(answers).filter((v) => Boolean(v)).length;
    return { total, neuropathic_suspect: total >= (scoring.threshold ?? 4) };
  }

  if (method === "basic_summary") {
    const items: number[] = [];
    for (let i = 3; i <= 12; i++) {
      const v = answers[`S${i}`];
      if (typeof v === "number") items.push(v);
    }
    const avg = items.length ? items.reduce((a, b) => a + b, 0) / items.length : null;
    return { hours: answers.S2 ?? null, avg_3_12: avg };
  }

  if (method === "count_present_and_vas") {
    const present = Object.entries(answers).filter(
      ([k, v]) => k.startsWith("M") && k !== "VAS" && Boolean(v),
    ).length;
    return { present_count: present, vas: answers.VAS ?? null };
  }

  if (method === "sum_fields") {
    const fields = scoring.fields ?? [];
    const total = fields.reduce((acc, f) => acc + num(answers[f]), 0);
    const out: Score = { total };
    const parts = scoring.extra?.parts ?? {};
    for (const [pname, pfields] of Object.entries(parts)) {
      out[pname] = pfields.reduce((acc, f) => acc + num(answers[f]), 0);
    }
    for (const f of fields) out[f.toLowerCase()] = num(answers[f]);
    return out;
  }

  if (method === "barthel_weighted") {
    const fixed = ["HIGIENE", "BANHO", "ALIMENTACAO", "TOALETE", "ESCADAS", "VESTUARIO", "BEXIGA", "INTESTINO", "TRANSFERENCIA"];
    let total = fixed.reduce((acc, item) => acc + num(answers[item]), 0);

    const mode = answers.MOBILITY_MODE;
    if (mode === "WALK") total += num(answers.DEAMBULACAO);
    else if (mode === "WHEEL") total += num(answers.CADEIRA_RODAS);

    let interpretation: string;
    if (total === 100) interpretation = "Totalmente independente";
    else if (total >= 76) interpretation = "Dependência leve";
    else if (total >= 51) interpretation = "Dependência moderada";
    else if (total >= 26) interpretation = "Dependência severa";
    else interpretation = "Dependência total";

    return { total, mobility_mode: mode ?? null, interpretation };
  }

  if (method === "fiq_summary") {
    const funcItems = ["F1_1", "F1_2", "F1_3", "F1_4", "F1_5", "F1_6", "F1_7", "F1_8", "F1_9", "F1_10"];
    const functionSum = funcItems.reduce((a, k) => a + num(answers[k]), 0);
    const vasSum =
      num(answers.WORK_INTERFERENCE) + num(answers.PAIN) + num(answers.FATIGUE) +
      num(answers.MORNING_TIRED) + num(answers.STIFFNESS) + num(answers.ANXIETY) +
      num(answers.DEPRESSION);
    return {
      function_sum: functionSum,
      days_well: num(answers.DAYS_WELL),
      days_missed: num(answers.DAYS_MISSED),
      vas_sum: vasSum,
      note: "FIQ: resumo sem normalização (o formulário anexado não especifica fórmula final).",
      work_interference: num(answers.WORK_INTERFERENCE),
      pain: num(answers.PAIN),
      fatigue: num(answers.FATIGUE),
      morning_tired: num(answers.MORNING_TIRED),
      stiffness: num(answers.STIFFNESS),
      anxiety: num(answers.ANXIETY),
      depression: num(answers.DEPRESSION),
    };
  }

  return { raw: answers };
}

/** Linhas formatadas para exibição/impressão por escala. */
export function formatScoreForPrint(scaleName: string, score: Score): string[] {
  const n = scaleName;
  const g = (k: string) => (score[k] ?? "-") as unknown;

  if (n.includes("McGill")) {
    return [`Descritores presentes: ${g("present_count")}`, `Intensidade da dor (VAS): ${g("vas")}/10`];
  }
  if (n.includes("DN4")) {
    return [`Escore total: ${g("total")}`, `Sugestivo de dor neuropática: ${score.neuropathic_suspect ? "Sim" : "Não"}`];
  }
  if (n.includes("HADS")) {
    return [`Ansiedade: ${g("anxiety")}`, `Depressão: ${g("depression")}`, `Escore total: ${g("total")}`];
  }
  if (n.includes("MOS")) {
    const avg = typeof score.avg_3_12 === "number" ? score.avg_3_12.toFixed(2) : (score.avg_3_12 ?? "-");
    return [`Horas de sono: ${g("hours")}`, `Média dos itens (3-12): ${avg}`];
  }
  if (n.includes("UPDRS")) {
    const lines = [`Total geral: ${g("total")}`];
    if (score.p1_total !== undefined) {
      lines.push(`Parte I (não motora): ${score.p1_total}`);
      lines.push(`Parte II (AVDs): ${score.p2_total}`);
      lines.push(`Parte III (exame motor): ${score.p3_total}`);
      lines.push(`Parte IV (complicações motoras): ${score.p4_total}`);
    }
    return lines;
  }
  if (n.includes("PCS") || n.includes("Catastrofismo")) {
    return [`Escore total: ${g("total")}`];
  }
  if (n.includes("Barthel") || n.includes("BARTHEL")) {
    const mode = score.mobility_mode === "WHEEL" ? "Cadeira de rodas" : "Deambulação";
    return [`Escore total: ${g("total")}/100`, `Mobilidade (modo): ${mode}`, `Interpretação: ${g("interpretation")}`];
  }
  if (n.includes("FIQ")) {
    const lines = [
      `Função (soma 1a-1j): ${g("function_sum")}`,
      `Dias que se sentiu bem (0-7): ${g("days_well")}`,
      `Dias de falta ao trabalho (0-7): ${g("days_missed")}`,
      `Sintomas (soma VAS 0-10): ${g("vas_sum")}`,
    ];
    if (score.note) lines.push(`Obs.: ${score.note}`);
    return lines;
  }
  return Object.entries(score)
    .filter(([k]) => !k.startsWith("raw"))
    .map(([k, v]) => `${k}: ${v}`);
}
