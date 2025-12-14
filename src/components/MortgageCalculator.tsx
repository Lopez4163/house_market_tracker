"use client";

import { useMemo, useState } from "react";

type MortgageCalculatorProps = {
  defaultPrice?: number | null;
  estimatedRent?: number | null; // from snapshot.kpis.medianRent
};

const num = (s: string) => {
  // Convert user input -> number for calculations
  // Empty string becomes 0 (so math still works)
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

// Optional: limits decimals for specific fields (e.g., interest rate)
const sanitizeNumberInput = (raw: string) => {
  // Allow empty
  if (raw === "") return "";
  // Only allow digits + one dot
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  // If more than one dot, keep first
  return parts[0] + "." + parts.slice(1).join("");
};

export default function MortgageCalculator({
  defaultPrice,
  estimatedRent,
}: MortgageCalculatorProps) {
  // ✅ store as strings so empty stays empty
  const [purchasePrice, setPurchasePrice] = useState<string>(
    defaultPrice != null ? String(Math.round(defaultPrice)) : ""
  );
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>("5");
  const [interestRate, setInterestRate] = useState<string>("6.5"); // APR
  const [termYears, setTermYears] = useState<string>("30");
  const [taxesPerYear, setTaxesPerYear] = useState<string>("3600");
  const [insurancePerYear, setInsurancePerYear] = useState<string>("2000");
  const [hoaPerMonth, setHoaPerMonth] = useState<string>("0");

  // Helper factory so you don’t repeat logic everywhere
  const bind = (setter: (v: string) => void, sanitize?: (v: string) => string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setter(sanitize ? sanitize(raw) : raw);
    };
  };

  // 2) CORE MORTGAGE MATH (computed from inputs)
  const {
    loanAmount,
    monthlyPrincipalInterest,
    monthlyTaxes,
    monthlyInsurance,
    totalMonthlyPayment,
  } = useMemo(() => {
    const price = num(purchasePrice);
    const dpPct = num(downPaymentPercent);
    const rate = num(interestRate);
    const years = Math.max(num(termYears), 1);
    const taxes = num(taxesPerYear);
    const insurance = num(insurancePerYear);
    const hoa = num(hoaPerMonth);

    const dp = (dpPct / 100) * price;
    const loan = Math.max(price - dp, 0);

    const r = rate / 100 / 12; // monthly interest rate
    const n = years * 12; // number of payments

    let mPI = 0;
    if (loan > 0) {
      if (r === 0) {
        mPI = loan / n;
      } else {
        const pow = Math.pow(1 + r, n);
        mPI = loan * (r * pow) / (pow - 1);
      }
    }

    const mTaxes = taxes / 12;
    const mInsurance = insurance / 12;

    return {
      loanAmount: loan,
      monthlyPrincipalInterest: mPI,
      monthlyTaxes: mTaxes,
      monthlyInsurance: mInsurance,
      totalMonthlyPayment: mPI + mTaxes + mInsurance + hoa,
    };
  }, [
    purchasePrice,
    downPaymentPercent,
    interestRate,
    termYears,
    taxesPerYear,
    insurancePerYear,
    hoaPerMonth,
  ]);

  // 3) FORMAT HELPERS
  const formatCurrency = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  const formatCurrencyExact = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });

  // 4) CIRCLE COLOR / LABEL BASED ON PITI VS RENT
  const affordability = useMemo(() => {
    if (!estimatedRent || estimatedRent <= 0 || totalMonthlyPayment <= 0) {
      return {
        label: "Estimate",
        sublabel: "",
        className: "border-slate-600 bg-slate-900/80 text-slate-100",
      };
    }

    const ratio = totalMonthlyPayment / estimatedRent;

    if (ratio <= 0.7) {
      return {
        label: "W",
        sublabel: "Well under rent",
        className: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
      };
    }

    if (ratio <= 1.0) {
      return {
        label: "OK",
        sublabel: "Near rent",
        className: "border-amber-500 bg-amber-500/15 text-amber-300",
      };
    }

    return {
      label: "L",
      sublabel: "Above rent",
      className: "border-rose-500 bg-rose-500/15 text-rose-300",
    };
  }, [estimatedRent, totalMonthlyPayment]);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/70 to-slate-950/60 shadow-lg shadow-black/20">
      {/* Top bar */}
      <div className="flex flex-col gap-4 border-b border-slate-800/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/50 px-3 py-1 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Mortgage + PITI Estimator
          </div>
          <h2 className="mt-2 truncate text-xl font-semibold text-slate-50">
            Mortgage Calculator
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Model monthly payment and compare against market rent.
          </p>
        </div>
  
        {/* PITI badge */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Estimated Monthly
            </span>
            <span className="text-sm text-slate-400">
              {estimatedRent && estimatedRent > 0 ? (
                <>
                  Rent est{" "}
                  <span className="font-medium text-slate-200">
                    {formatCurrencyExact(estimatedRent)}
                  </span>
                </>
              ) : (
                "Rent est unavailable"
              )}
            </span>
          </div>
  
          <div
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border ${affordability.className}`}
          >
            {/* subtle glow ring */}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-white/5" />
            <div className="text-center">
              <div className="text-[0.65rem] uppercase tracking-wide text-slate-200/70">
                PITI
              </div>
              <div className="mt-0.5 text-base font-semibold text-slate-50">
                {formatCurrencyExact(totalMonthlyPayment || 0)}
              </div>
              <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-slate-200/60">
                {affordability.sublabel || "Adjust inputs"}
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {/* Body */}
      <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2">
        {/* LEFT: Inputs */}
        <div className="space-y-5">
          <div className="grid gap-4">
            {/* Purchase Price */}
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <label className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Purchase Price</span>
                <span className="text-[0.7rem] text-slate-500">USD</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={purchasePrice}
                onChange={bind(setPurchasePrice, sanitizeNumberInput)}
                placeholder="250000"
              />
              <p className="mt-2 text-xs text-slate-500">
                Used to compute taxes, loan amount, and payment.
              </p>
            </div>
  
            {/* DP + Rate */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                <label className="block text-xs font-medium text-slate-300">
                  Down Payment %
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  value={downPaymentPercent}
                  onChange={bind(setDownPaymentPercent, sanitizeNumberInput)}
                  placeholder="5"
                />
                <p className="mt-2 text-xs text-slate-500">VA/FHA style: 0–5%+</p>
              </div>
  
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                <label className="block text-xs font-medium text-slate-300">
                  Interest Rate (APR %)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  value={interestRate}
                  onChange={bind(setInterestRate, sanitizeNumberInput)}
                  placeholder="6.5"
                />
                <p className="mt-2 text-xs text-slate-500">Try 6.0–7.5%</p>
              </div>
            </div>
  
            {/* Term */}
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <label className="block text-xs font-medium text-slate-300">
                Term (years)
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={termYears}
                onChange={bind(setTermYears, sanitizeNumberInput)}
                placeholder="30"
              />
              <p className="mt-2 text-xs text-slate-500">Common: 15 or 30</p>
            </div>
  
            {/* Taxes + Insurance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                <label className="block text-xs font-medium text-slate-300">
                  Taxes / year
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  value={taxesPerYear}
                  onChange={bind(setTaxesPerYear, sanitizeNumberInput)}
                  placeholder="3600"
                />
                <p className="mt-2 text-xs text-slate-500">Property tax estimate</p>
              </div>
  
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
                <label className="block text-xs font-medium text-slate-300">
                  Insurance / year
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  value={insurancePerYear}
                  onChange={bind(setInsurancePerYear, sanitizeNumberInput)}
                  placeholder="2000"
                />
                <p className="mt-2 text-xs text-slate-500">Homeowners estimate</p>
              </div>
            </div>
  
            {/* HOA */}
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <label className="block text-xs font-medium text-slate-300">
                HOA / month
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={hoaPerMonth}
                onChange={bind(setHoaPerMonth, sanitizeNumberInput)}
                placeholder="0"
              />
              <p className="mt-2 text-xs text-slate-500">Often $0 for SFH</p>
            </div>
          </div>
  
          {/* Footer actions */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/30 px-4 py-3">
            <p className="text-xs text-slate-500">
              Estimates only — lender/area specifics vary.
            </p>
  
            <button
              type="button"
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              onClick={() => {
                setPurchasePrice(defaultPrice != null ? String(Math.round(defaultPrice)) : "");
                setDownPaymentPercent("5");
                setInterestRate("6.5");
                setTermYears("30");
                setTaxesPerYear("3600");
                setInsurancePerYear("2000");
                setHoaPerMonth("0");
              }}
            >
              Reset
            </button>
          </div>
        </div>
  
        {/* RIGHT: Breakdown */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-50">Payment Breakdown</h3>
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2 py-1 text-[0.7rem] text-slate-400">
                Monthly
              </span>
            </div>
  
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Loan amount" value={formatCurrency(loanAmount)} />
              <Row label="Principal & Interest" value={formatCurrencyExact(monthlyPrincipalInterest)} />
              <Row label="Taxes" value={formatCurrencyExact(monthlyTaxes)} />
              <Row label="Insurance" value={formatCurrencyExact(monthlyInsurance)} />
              <Row label="HOA" value={formatCurrencyExact(num(hoaPerMonth))} />
            </div>
  
            <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Total Estimated Payment
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-50">
                {formatCurrencyExact(totalMonthlyPayment)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Includes P&amp;I + taxes + insurance + HOA.
              </div>
            </div>
          </div>
  
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-5">
            <h3 className="text-sm font-semibold text-slate-50">Quick Read</h3>
            <p className="mt-2 text-sm text-slate-400">
              The circle compares your <span className="text-slate-200">PITI</span> to the market’s{" "}
              <span className="text-slate-200">median rent</span>. Green means your payment is comfortably
              under rent, amber is close, and red is above.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
  
  // Small helper component inside the same file (below MortgageCalculator)
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-slate-100">{value}</span>
      </div>
    );
  }
}  