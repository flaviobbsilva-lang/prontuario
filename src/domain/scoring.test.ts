import { describe, it, expect } from "vitest";
import { computeScore, formatScoreForPrint } from "./scoring";
import { ESCALAS, getEscalaByCodigo } from "./escalas";

const scoring = (codigo: string) => getEscalaByCodigo(codigo)!.scoring;

describe("integridade das definições", () => {
  it("expõe exatamente as 8 escalas ativas", () => {
    expect(ESCALAS.map((e) => e.code).sort()).toEqual(
      ["BARTHEL_MOD", "DN4", "FIQ", "HADS", "MCGILL_BRIEF", "MDS_UPDRS_TOTAL", "MOS_SLEEP", "PCS_BR"],
    );
  });
  it("não tem códigos duplicados", () => {
    const codes = ESCALAS.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("HADS (sum + subescalas)", () => {
  it("soma total e separa ansiedade/depressão", () => {
    const ans = { A1: 2, D2: 1, A3: 3, D4: 0, A5: 2, D6: 1, A7: 1, D8: 2, A9: 3, D10: 0, A11: 1, D12: 1, A13: 2, D14: 1 };
    const s = computeScore(scoring("HADS"), ans);
    expect(s.total).toBe(20);
    expect(s.anxiety).toBe(14); // 2+3+2+1+3+1+2
    expect(s.depression).toBe(6); // 1+0+1+2+0+1+1
  });
});

describe("DN4 (sum_boolean, threshold 4)", () => {
  it("3 positivos: não sugestivo", () => {
    const s = computeScore(scoring("DN4"), { Q1_1: true, Q1_2: true, Q1_3: true });
    expect(s.total).toBe(3);
    expect(s.neuropathic_suspect).toBe(false);
  });
  it("4 positivos: sugestivo", () => {
    const s = computeScore(scoring("DN4"), { Q1_1: true, Q1_2: true, Q1_3: true, Q2_4: true });
    expect(s.total).toBe(4);
    expect(s.neuropathic_suspect).toBe(true);
  });
});

describe("MOS Sono (basic_summary)", () => {
  it("média dos itens 3-12 e horas", () => {
    const ans = { S1: 2, S2: 6, S3: 4, S4: 4, S5: 4, S6: 4, S7: 4, S8: 4, S9: 4, S10: 4, S11: 4, S12: 4 };
    const s = computeScore(scoring("MOS_SLEEP"), ans);
    expect(s.hours).toBe(6);
    expect(s.avg_3_12).toBe(4);
  });
});

describe("McGill breve (count_present_and_vas)", () => {
  it("conta descritores M* presentes e captura VAS", () => {
    const s = computeScore(scoring("MCGILL_BRIEF"), { M1: true, M3: true, M8: true, M2: false, VAS: 7 });
    expect(s.present_count).toBe(3);
    expect(s.vas).toBe(7);
  });
});

describe("MDS-UPDRS total (sum_fields)", () => {
  it("soma as 4 partes e expõe parciais", () => {
    const s = computeScore(scoring("MDS_UPDRS_TOTAL"), { P1_TOTAL: 5, P2_TOTAL: 10, P3_TOTAL: 20, P4_TOTAL: 3 });
    expect(s.total).toBe(38);
    expect(s.p3_total).toBe(20);
  });
});

describe("Barthel Modificado (barthel_weighted)", () => {
  it("WALK usa DEAMBULACAO; 100 = totalmente independente", () => {
    const ans = {
      HIGIENE: 5, BANHO: 5, ALIMENTACAO: 10, TOALETE: 10, ESCADAS: 10, VESTUARIO: 10,
      BEXIGA: 10, INTESTINO: 10, TRANSFERENCIA: 15, MOBILITY_MODE: "WALK", DEAMBULACAO: 15, CADEIRA_RODAS: 5,
    };
    const s = computeScore(scoring("BARTHEL_MOD"), ans);
    expect(s.total).toBe(100);
    expect(s.interpretation).toBe("Totalmente independente");
  });
  it("WHEEL usa CADEIRA_RODAS e ignora DEAMBULACAO", () => {
    const ans = {
      HIGIENE: 0, BANHO: 0, ALIMENTACAO: 0, TOALETE: 0, ESCADAS: 0, VESTUARIO: 0,
      BEXIGA: 0, INTESTINO: 0, TRANSFERENCIA: 0, MOBILITY_MODE: "WHEEL", DEAMBULACAO: 15, CADEIRA_RODAS: 5,
    };
    const s = computeScore(scoring("BARTHEL_MOD"), ans);
    expect(s.total).toBe(5);
    expect(s.interpretation).toBe("Dependência total");
  });
});

describe("FIQ (fiq_summary)", () => {
  it("separa função, dias e soma VAS", () => {
    const ans = {
      F1_1: 1, F1_2: 2, F1_3: 0, F1_4: 3, F1_5: 1, F1_6: 1, F1_7: 2, F1_8: 0, F1_9: 1, F1_10: 1,
      DAYS_WELL: 3, DAYS_MISSED: 2,
      WORK_INTERFERENCE: 5, PAIN: 7, FATIGUE: 8, MORNING_TIRED: 6, STIFFNESS: 4, ANXIETY: 5, DEPRESSION: 3,
    };
    const s = computeScore(scoring("FIQ"), ans);
    expect(s.function_sum).toBe(12);
    expect(s.vas_sum).toBe(38);
    expect(s.days_well).toBe(3);
  });
});

describe("formatScoreForPrint", () => {
  it("formata HADS de forma legível", () => {
    const lines = formatScoreForPrint("Escala Hospitalar de Ansiedade e Depressão (HADS)", { total: 20, anxiety: 14, depression: 6 });
    expect(lines).toContain("Ansiedade: 14");
    expect(lines).toContain("Escore total: 20");
  });
});
