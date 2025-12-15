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
        mPI = (loan * (r * pow)) / (pow - 1);
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
        className: "border-white/20 bg-white/5 text-white/85",
      };
    }

    const ratio = totalMonthlyPayment / estimatedRent;

    if (ratio <= 0.7) {
      return {
        label: "W",
        sublabel: "Well under rent",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      };
    }

    if (ratio <= 1.0) {
      return {
        label: "OK",
        sublabel: "Near rent",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      label: "L",
      sublabel: "Above rent",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    };
  }, [estimatedRent, totalMonthlyPayment]);

  return (
    <section className="mt-8 border border-white/15 bg-white/5">
      {/* Top bar */}
      <div className="flex flex-col gap-4 border-b border-white/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 border border-white/15 bg-[#0B0B0F]/40 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 bg-white/40" />
            Mortgage + PITI Estimator
          </div>

          <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-white">
            Mortgage Calculator
          </h2>

          <p className="mt-1 text-sm text-white/60">
            Model monthly payment and compare against market rent.
          </p>
        </div>

        {/* PITI badge */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-[0.3em] text-white/45">
              Estimated Monthly
            </span>
            <span className="text-sm text-white/60">
              {estimatedRent && estimatedRent > 0 ? (
                <>
                  Rent est{" "}
                  <span className="font-medium text-white/85">
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
            <div className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-white/5" />
            <div className="text-center">
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
                PITI
              </div>
              <div className="mt-0.5 text-base font-semibold text-white">
                {formatCurrencyExact(totalMonthlyPayment || 0)}
              </div>
              <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-white/45">
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
            <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
              <label className="flex items-center justify-between text-xs font-medium text-white/70">
                <span>Purchase Price</span>
                <span className="text-[0.7rem] text-white/45">USD</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                value={purchasePrice}
                onChange={bind(setPurchasePrice, sanitizeNumberInput)}
                placeholder="250000"
              />
              <p className="mt-2 text-xs text-white/45">
                Used to compute taxes, loan amount, and payment.
              </p>
            </div>

            {/* DP + Rate */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
                <label className="block text-xs font-medium text-white/70">
                  Down Payment %
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                  value={downPaymentPercent}
                  onChange={bind(setDownPaymentPercent, sanitizeNumberInput)}
                  placeholder="5"
                />
                <p className="mt-2 text-xs text-white/45">VA/FHA style: 0–5%+</p>
              </div>

              <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
                <label className="block text-xs font-medium text-white/70">
                  Interest Rate (APR %)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                  value={interestRate}
                  onChange={bind(setInterestRate, sanitizeNumberInput)}
                  placeholder="6.5"
                />
                <p className="mt-2 text-xs text-white/45">Try 6.0–7.5%</p>
              </div>
            </div>

            {/* Term */}
            <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
              <label className="block text-xs font-medium text-white/70">
                Term (years)
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                value={termYears}
                onChange={bind(setTermYears, sanitizeNumberInput)}
                placeholder="30"
              />
              <p className="mt-2 text-xs text-white/45">Common: 15 or 30</p>
            </div>

            {/* Taxes + Insurance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
                <label className="block text-xs font-medium text-white/70">
                  Taxes / year
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                  value={taxesPerYear}
                  onChange={bind(setTaxesPerYear, sanitizeNumberInput)}
                  placeholder="3600"
                />
                <p className="mt-2 text-xs text-white/45">Property tax estimate</p>
              </div>

              <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
                <label className="block text-xs font-medium text-white/70">
                  Insurance / year
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                  value={insurancePerYear}
                  onChange={bind(setInsurancePerYear, sanitizeNumberInput)}
                  placeholder="2000"
                />
                <p className="mt-2 text-xs text-white/45">Homeowners estimate</p>
              </div>
            </div>

            {/* HOA */}
            <div className="border border-white/15 bg-[#0B0B0F]/40 p-4">
              <label className="block text-xs font-medium text-white/70">
                HOA / month
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
                value={hoaPerMonth}
                onChange={bind(setHoaPerMonth, sanitizeNumberInput)}
                placeholder="0"
              />
              <p className="mt-2 text-xs text-white/45">Often $0 for SFH</p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border border-white/15 bg-[#0B0B0F]/30 px-4 py-3">
            <p className="text-xs text-white/45">
              Estimates only — lender/area specifics vary.
            </p>

            <button
              type="button"
              className="border border-white/20 bg-[#0B0B0F]/40 px-3 py-1.5 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition"
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
          <div className="border border-white/15 bg-[#0B0B0F]/35 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Payment Breakdown</h3>
              <span className="border border-white/15 bg-[#0B0B0F]/40 px-2 py-1 text-[0.7rem] text-white/55">
                Monthly
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Loan amount" value={formatCurrency(loanAmount)} />
              <Row
                label="Principal & Interest"
                value={formatCurrencyExact(monthlyPrincipalInterest)}
              />
              <Row label="Taxes" value={formatCurrencyExact(monthlyTaxes)} />
              <Row label="Insurance" value={formatCurrencyExact(monthlyInsurance)} />
              <Row label="HOA" value={formatCurrencyExact(num(hoaPerMonth))} />
            </div>

            <div className="mt-5 border border-white/15 bg-[#0B0B0F]/40 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/45">
                Total Estimated Payment
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatCurrencyExact(totalMonthlyPayment)}
              </div>
              <div className="mt-2 text-xs text-white/45">
                Includes P&amp;I + taxes + insurance + HOA.
              </div>
            </div>
          </div>

          <div className="border border-white/15 bg-[#0B0B0F]/25 p-5">
            <h3 className="text-sm font-semibold text-white">Quick Read</h3>
            <p className="mt-2 text-sm text-white/60">
              The circle compares your <span className="text-white/85">PITI</span> to the market’s{" "}
              <span className="text-white/85">median rent</span>. Green means your payment is comfortably
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
        <span className="text-white/60">{label}</span>
        <span className="font-medium text-white/85">{value}</span>
      </div>
    );
  }
}
