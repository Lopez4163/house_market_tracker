"use client";

import { useMemo, useState } from "react";

type MortgageCalculatorProps = {
  defaultPrice?: number | null;
  estimatedRent?: number | null; // from snapshot.kpis.medianRent
};

export default function MortgageCalculator({
  defaultPrice,
  estimatedRent,
}: MortgageCalculatorProps) {
  // 1) USER-CONTROLLED INPUTS (state)
  const [purchasePrice, setPurchasePrice] = useState<number>(defaultPrice ?? 250000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(5);
  const [interestRate, setInterestRate] = useState<number>(6.5); // APR
  const [termYears, setTermYears] = useState<number>(30);
  const [taxesPerYear, setTaxesPerYear] = useState<number>(3600); // $300/mo
  const [insurancePerYear, setInsurancePerYear] = useState<number>(2000); // $100/mo
  const [hoaPerMonth, setHoaPerMonth] = useState<number>(0);

  // 2) CORE MORTGAGE MATH (computed from inputs)
  const {
    loanAmount,
    monthlyPrincipalInterest,
    monthlyTaxes,
    monthlyInsurance,
    totalMonthlyPayment,
  } = useMemo(() => {
    const dp = (downPaymentPercent / 100) * purchasePrice;
    const loan = Math.max(purchasePrice - dp, 0);

    const r = interestRate / 100 / 12; // monthly interest rate
    const n = termYears * 12; // number of monthly payments

    let mPI = 0;
    if (loan > 0) {
      if (r === 0) {
        // 0% interest edge case
        mPI = loan / n;
      } else {
        const pow = Math.pow(1 + r, n);
        mPI = loan * (r * pow) / (pow - 1);
      }
    }

    const mTaxes = taxesPerYear / 12;
    const mInsurance = insurancePerYear / 12;

    return {
      loanAmount: loan,
      monthlyPrincipalInterest: mPI,
      monthlyTaxes: mTaxes,
      monthlyInsurance: mInsurance,
      totalMonthlyPayment: mPI + mTaxes + mInsurance + hoaPerMonth,
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

  // 5) UI
  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
      {/* HEADER + CIRCLE */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            Mortgage Calculator
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Estimate monthly payment for this market. Tweak the inputs to match your lender.
          </p>
        </div>

        {/* PITI Circle */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border text-center text-xs font-semibold ${affordability.className}`}
          >
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[0.65rem] uppercase tracking-wide opacity-70">
                PITI
              </span>
              <span className="text-sm">
                {formatCurrencyExact(totalMonthlyPayment || 0)}
              </span>
            </div>
          </div>
          <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">
            {affordability.sublabel || "Adjust inputs"}
          </span>
          {estimatedRent && estimatedRent > 0 && (
            <span className="text-[0.65rem] text-slate-500">
              Rent est:{" "}
              <span className="font-medium text-slate-300">
                {formatCurrencyExact(estimatedRent)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* INPUTS GRID */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* LEFT: loan basics */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Purchase Price
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Down Payment %
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={downPaymentPercent}
                onChange={(e) =>
                  setDownPaymentPercent(Number(e.target.value) || 0)
                }
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Interest Rate (APR %)
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Term (years)
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={termYears}
              onChange={(e) => setTermYears(Number(e.target.value) || 0)}
              min={1}
            />
          </div>
        </div>

        {/* RIGHT: taxes/insurance/HOA + breakdown */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Taxes / year
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={taxesPerYear}
                onChange={(e) => setTaxesPerYear(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Insurance / year
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={insurancePerYear}
                onChange={(e) =>
                  setInsurancePerYear(Number(e.target.value) || 0)
                }
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              HOA / month
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={hoaPerMonth}
              onChange={(e) => setHoaPerMonth(Number(e.target.value) || 0)}
              min={0}
            />
          </div>

          {/* BREAKDOWN BOX */}
          <div className="mt-3 rounded-lg bg-slate-950/70 p-3 text-sm text-slate-200">
            <div className="flex justify-between">
              <span>Loan amount</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Principal & interest (P&I)</span>
              <span>{formatCurrencyExact(monthlyPrincipalInterest)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Taxes</span>
              <span>{formatCurrencyExact(monthlyTaxes)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Insurance</span>
              <span>{formatCurrencyExact(monthlyInsurance)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>HOA</span>
              <span>{formatCurrencyExact(hoaPerMonth)}</span>
            </div>

            <div className="mt-3 flex items-baseline justify-between border-t border-slate-800 pt-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Total est. monthly payment
              </span>
              <span className="text-lg font-semibold text-emerald-400">
                {formatCurrencyExact(totalMonthlyPayment)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        This is just a rough estimate. Actual numbers depend on your lender, credit, loan
        type, and local taxes/insurance.
      </p>
    </section>
  );
}
