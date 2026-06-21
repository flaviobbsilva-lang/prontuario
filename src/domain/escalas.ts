/**
 * NÚCLEO CLÍNICO — Definições de escalas (fonte única de verdade)
 * ----------------------------------------------------------------
 * Este arquivo é a especificação canônica e auditável das escalas.
 * Reúne e reconcilia o que estava espalhado entre o backend Python
 * (FastAPI) e o app TypeScript (Manus/Drizzle). Nada de conteúdo
 * clínico inventado: cada item e cada peso foi transcrito das versões
 * existentes.
 *
 * Regra: a UI e o banco NUNCA redefinem itens. Eles consomem daqui.
 * O seed (scripts/seed-escalas.ts) grava estas definições em
 * escala_definicoes.schema_json, preservando rastreabilidade por versão.
 */

export type ScoringMethod =
  | "sum"
  | "sum_boolean"
  | "basic_summary"
  | "count_present_and_vas"
  | "sum_fields"
  | "barthel_weighted"
  | "fiq_summary";

export interface ScaleOption {
  label: string;
  value: number | string;
}

export interface ScaleItem {
  id: string;
  text: string;
  type: "radio" | "boolean" | "number";
  /** opções "cruas" (lista de valores) ou rotuladas ({label, value}) */
  options?: Array<number> | ScaleOption[];
  min?: number;
  max?: number;
}

export interface ScaleScoring {
  method: ScoringMethod;
  subscales?: Record<string, string[]>;
  threshold?: number;
  fields?: string[];
  extra?: { parts?: Record<string, string[]> };
  [k: string]: unknown;
}

export interface ScaleDefinition {
  code: string;
  name: string;
  version: string;
  items: ScaleItem[];
  scoring: ScaleScoring;
}

// ---------------------------------------------------------------------------
// HADS — Escala Hospitalar de Ansiedade e Depressão (14 itens)
// ---------------------------------------------------------------------------
const hads: ScaleDefinition = {
  code: "HADS",
  name: "Escala Hospitalar de Ansiedade e Depressão (HADS)",
  version: "v1",
  items: [
    { id: "A1", text: "Eu me sinto tenso ou contraído", type: "radio", options: [0, 1, 2, 3] },
    { id: "D2", text: "Eu ainda sinto gosto pelas mesmas coisas de antes", type: "radio", options: [0, 1, 2, 3] },
    { id: "A3", text: "Eu sinto uma espécie de medo, como se alguma coisa ruim fosse acontecer", type: "radio", options: [0, 1, 2, 3] },
    { id: "D4", text: "Dou risada e me divirto quando vejo coisas engraçadas", type: "radio", options: [0, 1, 2, 3] },
    { id: "A5", text: "Estou com a cabeça cheia de preocupações", type: "radio", options: [0, 1, 2, 3] },
    { id: "D6", text: "Eu me sinto alegre", type: "radio", options: [0, 1, 2, 3] },
    { id: "A7", text: "Consigo ficar sentado à vontade e me sentir relaxado", type: "radio", options: [0, 1, 2, 3] },
    { id: "D8", text: "Eu estou lento para pensar e fazer as coisas", type: "radio", options: [0, 1, 2, 3] },
    { id: "A9", text: "Eu tenho uma sensação ruim de medo (frio na barriga/aperto no estômago)", type: "radio", options: [0, 1, 2, 3] },
    { id: "D10", text: "Eu perdi o interesse em cuidar da minha aparência", type: "radio", options: [0, 1, 2, 3] },
    { id: "A11", text: "Eu me sinto inquieto, como se eu não pudesse ficar parado", type: "radio", options: [0, 1, 2, 3] },
    { id: "D12", text: "Fico esperando animado as coisas boas que estão por vir", type: "radio", options: [0, 1, 2, 3] },
    { id: "A13", text: "De repente, tenho a sensação de entrar em pânico", type: "radio", options: [0, 1, 2, 3] },
    { id: "D14", text: "Consigo sentir prazer ao assistir/ler/ouvir algo", type: "radio", options: [0, 1, 2, 3] },
  ],
  scoring: {
    method: "sum",
    subscales: {
      anxiety: ["A1", "A3", "A5", "A7", "A9", "A11", "A13"],
      depression: ["D2", "D4", "D6", "D8", "D10", "D12", "D14"],
    },
  },
};

// ---------------------------------------------------------------------------
// DN4 — Questionário para Diagnóstico de Dor Neuropática 4 (10 itens)
// ---------------------------------------------------------------------------
const dn4: ScaleDefinition = {
  code: "DN4",
  name: "Questionário para Diagnóstico de Dor Neuropática 4 (DN4)",
  version: "v1",
  items: [
    { id: "Q1_1", text: "Queimação", type: "boolean" },
    { id: "Q1_2", text: "Sensação de frio dolorosa", type: "boolean" },
    { id: "Q1_3", text: "Choque elétrico", type: "boolean" },
    { id: "Q2_4", text: "Formigamento", type: "boolean" },
    { id: "Q2_5", text: "Alfinetada e agulhada", type: "boolean" },
    { id: "Q2_6", text: "Adormecimento", type: "boolean" },
    { id: "Q2_7", text: "Coceira", type: "boolean" },
    { id: "Q3_8", text: "Hipoestesia ao toque", type: "boolean" },
    { id: "Q3_9", text: "Hipoestesia à picada de agulha", type: "boolean" },
    { id: "Q4_10", text: "Escovação desencadeia/aumenta dor", type: "boolean" },
  ],
  scoring: { method: "sum_boolean", threshold: 4 },
};

// ---------------------------------------------------------------------------
// MOS Sono (12 itens)
// ---------------------------------------------------------------------------
const mosSleep: ScaleDefinition = {
  code: "MOS_SLEEP",
  name: "Escala do Sono (MOS)",
  version: "v1",
  items: [
    { id: "S1", text: "Tempo para iniciar o sono (1=0-15min ... 5=>60min)", type: "radio", options: [1, 2, 3, 4, 5] },
    { id: "S2", text: "Horas de sono por noite (número)", type: "number", min: 0, max: 24 },
    { id: "S3", text: "Sono não era tranquilo", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S4", text: "Dormiu o suficiente para acordar descansado", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S5", text: "Acordou com falta de ar ou dor de cabeça", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S6", text: "Sentiu sono/sonolento durante o dia", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S7", text: "Teve dificuldade para dormir", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S8", text: "Acordou à noite e teve dificuldade para voltar a dormir", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S9", text: "Dificuldade para permanecer acordado durante o dia", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S10", text: "Roncou durante a noite", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S11", text: "Tirou cochilos (>=5 min) durante o dia", type: "radio", options: [1, 2, 3, 4, 5, 6] },
    { id: "S12", text: "Obteve a quantidade de sono de que precisava", type: "radio", options: [1, 2, 3, 4, 5, 6] },
  ],
  scoring: { method: "basic_summary" },
};

// ---------------------------------------------------------------------------
// McGill breve (15 descritores booleanos + VAS)
// ---------------------------------------------------------------------------
const mcgillDescriptors: Array<[number, string]> = [
  [1, "Latejante"], [2, "Pontada"], [3, "Choque"], [4, "Fina-Agulhada"], [5, "Fisgada"],
  [6, "Queimação"], [7, "Espalha"], [8, "Dolorida"], [9, "Cansativa-exaustiva"], [10, "Enjoada"],
  [11, "Sufocante"], [12, "Apavorante-Enlouquecedora"], [13, "Aborrecida"], [14, "Que incomoda"], [15, "Insuportável"],
];
const mcgill: ScaleDefinition = {
  code: "MCGILL_BRIEF",
  name: "McGill breve (descritores + intensidade)",
  version: "v1",
  items: [
    ...mcgillDescriptors.map(([i, t]) => ({ id: `M${i}`, text: t, type: "boolean" as const })),
    { id: "VAS", text: "Intensidade da dor (0-10)", type: "number", min: 0, max: 10 },
  ],
  scoring: { method: "count_present_and_vas" },
};

// ---------------------------------------------------------------------------
// PCS — Escala de Catastrofismo Associado à Dor (13 itens)
// ---------------------------------------------------------------------------
const pcs: ScaleDefinition = {
  code: "PCS_BR",
  name: "Escala de Catastrofismo Associado à Dor (13 itens)",
  version: "v1",
  items: Array.from({ length: 13 }, (_, k) => ({
    id: `P${k + 1}`,
    text: `Item ${k + 1}`,
    type: "radio" as const,
    options: [1, 2, 3, 4],
  })),
  scoring: { method: "sum" },
};

// ---------------------------------------------------------------------------
// MDS-UPDRS (Totais por Parte I–IV) — Rotina
// ---------------------------------------------------------------------------
const updrsTotal: ScaleDefinition = {
  code: "MDS_UPDRS_TOTAL",
  name: "MDS-UPDRS (Totais por Parte I–IV) - Rotina",
  version: "v1",
  items: [
    { id: "P1_TOTAL", text: "Parte I - experiências não motoras (total)", type: "number", min: 0 },
    { id: "P2_TOTAL", text: "Parte II - experiências motoras (total)", type: "number", min: 0 },
    { id: "P3_TOTAL", text: "Parte III - exame motor (total)", type: "number", min: 0 },
    { id: "P4_TOTAL", text: "Parte IV - complicações motoras (total)", type: "number", min: 0 },
  ],
  scoring: { method: "sum_fields", fields: ["P1_TOTAL", "P2_TOTAL", "P3_TOTAL", "P4_TOTAL"] },
};

// ---------------------------------------------------------------------------
// Índice de Barthel Modificado
// ---------------------------------------------------------------------------
const barthel5: ScaleOption[] = [
  { label: "Incapaz", value: 0 },
  { label: "Ajuda substancial", value: 1 },
  { label: "Ajuda moderada", value: 3 },
  { label: "Ajuda mínima", value: 4 },
  { label: "Independente", value: 5 },
];
const barthel10: ScaleOption[] = [
  { label: "Incapaz", value: 0 },
  { label: "Ajuda substancial", value: 2 },
  { label: "Ajuda moderada", value: 5 },
  { label: "Ajuda mínima", value: 8 },
  { label: "Independente", value: 10 },
];
const barthel15: ScaleOption[] = [
  { label: "Incapaz", value: 0 },
  { label: "Ajuda substancial", value: 3 },
  { label: "Ajuda moderada", value: 8 },
  { label: "Ajuda mínima", value: 12 },
  { label: "Independente", value: 15 },
];
const barthelMod: ScaleDefinition = {
  code: "BARTHEL_MOD",
  name: "Índice de Barthel Modificado",
  version: "v1",
  items: [
    { id: "HIGIENE", text: "Higiene Pessoal", type: "radio", options: barthel5 },
    { id: "BANHO", text: "Banho", type: "radio", options: barthel5 },
    { id: "ALIMENTACAO", text: "Alimentação", type: "radio", options: barthel10 },
    { id: "TOALETE", text: "Toalete", type: "radio", options: barthel10 },
    { id: "ESCADAS", text: "Subir escadas", type: "radio", options: barthel10 },
    { id: "VESTUARIO", text: "Vestuário", type: "radio", options: barthel10 },
    { id: "BEXIGA", text: "Controle de Bexiga", type: "radio", options: barthel10 },
    { id: "INTESTINO", text: "Controle de Intestino", type: "radio", options: barthel10 },
    {
      id: "MOBILITY_MODE",
      text: "Mobilidade: o paciente deambula ou utiliza cadeira de rodas?",
      type: "radio",
      options: [
        { label: "Deambulação (andar)", value: "WALK" },
        { label: "Cadeira de rodas", value: "WHEEL" },
      ],
    },
    { id: "DEAMBULACAO", text: "Deambulação (se aplicável)", type: "radio", options: barthel15 },
    { id: "CADEIRA_RODAS", text: "Cadeira de rodas (se aplicável)", type: "radio", options: barthel5 },
    { id: "TRANSFERENCIA", text: "Transferência cadeira/cama", type: "radio", options: barthel15 },
  ],
  scoring: { method: "barthel_weighted" },
};

// ---------------------------------------------------------------------------
// FIQ — Questionário Sobre o Impacto da Fibromialgia
// ---------------------------------------------------------------------------
const fiqFunc: ScaleOption[] = [
  { label: "Quase sempre", value: 0 },
  { label: "Sempre", value: 1 },
  { label: "De vez em quando", value: 2 },
  { label: "Nunca", value: 3 },
];
const fiqFuncTexts: Array<[string, string]> = [
  ["F1_1", "1a) Fazer compras"], ["F1_2", "1b) Lavar roupa"], ["F1_3", "1c) Cozinhar"],
  ["F1_4", "1d) Lavar louça"], ["F1_5", "1e) Limpar a casa"], ["F1_6", "1f) Arrumar a cama"],
  ["F1_7", "1g) Andar vários quarteirões"], ["F1_8", "1h) Visitar parentes/amigos"],
  ["F1_9", "1i) Cuidar do quintal/jardim"], ["F1_10", "1j) Dirigir carro/andar de ônibus"],
];
const fiq: ScaleDefinition = {
  code: "FIQ",
  name: "Questionário Sobre o Impacto da Fibromialgia (FIQ)",
  version: "v1",
  items: [
    ...fiqFuncTexts.map(([id, text]) => ({ id, text, type: "radio" as const, options: fiqFunc })),
    { id: "DAYS_WELL", text: "2) Nos últimos 7 dias, em quantos dias você se sentiu bem? (0-7)", type: "number", min: 0, max: 7 },
    { id: "DAYS_MISSED", text: "3) Por causa da fibromialgia, quantos dias você faltou ao trabalho? (0-7)", type: "number", min: 0, max: 7 },
    { id: "WORK_INTERFERENCE", text: "4) Interferência na capacidade de fazer seu serviço (0-10)", type: "number", min: 0, max: 10 },
    { id: "PAIN", text: "5) Quanta dor você sentiu? (0-10)", type: "number", min: 0, max: 10 },
    { id: "FATIGUE", text: "6) Você sentiu cansaço? (0-10)", type: "number", min: 0, max: 10 },
    { id: "MORNING_TIRED", text: "7) Como se sentiu ao se levantar de manhã? (0-10)", type: "number", min: 0, max: 10 },
    { id: "STIFFNESS", text: "8) Você sentiu rigidez? (0-10)", type: "number", min: 0, max: 10 },
    { id: "ANXIETY", text: "9) Você se sentiu nervoso/ansioso? (0-10)", type: "number", min: 0, max: 10 },
    { id: "DEPRESSION", text: "10) Você se sentiu deprimido/desanimado? (0-10)", type: "number", min: 0, max: 10 },
  ],
  scoring: { method: "fiq_summary" },
};

/** As 8 escalas ativas (UPDRS detalhada foi descontinuada na consolidação). */
export const ESCALAS: ScaleDefinition[] = [
  hads, dn4, mosSleep, mcgill, pcs, updrsTotal, barthelMod, fiq,
];

export function getEscalaByCodigo(codigo: string): ScaleDefinition | undefined {
  return ESCALAS.find((e) => e.code === codigo);
}
