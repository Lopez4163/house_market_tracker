// src/domain/finance.ts (pure functions; just a stub now)
export type FinanceInputs = {
    price: number; downPct: number; rate: number; termYears: number;
    taxesYr: number; insuranceYr: number; hoaMo?: number;
    units?: number; rentPerUnit?: number; vacancyPct?: number;
    repairsPct?: number; pmPct?: number; closingCosts?: number;
    appreciationPct?: number; rentGrowthPct?: number; yearsOut?: number;
  };
  
  export function monthlyPI(principal: number, ratePct: number, termYears: number) {
    const r = ratePct / 100 / 12;
    const n = termYears * 12;
    return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  }
  