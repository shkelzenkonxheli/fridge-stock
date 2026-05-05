import Link from "next/link";
import { AutoPrintOnMount } from "./auto-print-on-mount";
import { requireRole } from "@/lib/auth";
import {
  BUSINESS_TIME_ZONE,
  getMonthStringInTimeZone,
  getMonthlySalesReport,
} from "@/lib/reports/monthly-sales-report";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

type ReportsPageProps = {
  searchParams?: Promise<{
    month?: string;
    print?: string;
  }>;
};

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPrint = resolvedSearchParams?.print === "1";
  const defaultMonth = getMonthStringInTimeZone(new Date(), BUSINESS_TIME_ZONE);
  const rawMonth = resolvedSearchParams?.month?.trim() || defaultMonth;
  const selectedMonth = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : defaultMonth;
  const report = await getMonthlySalesReport(selectedMonth);

  return (
    <main className="px-4 py-6 print:px-0 print:py-0 sm:px-6 lg:px-8">
      {isPrint ? <AutoPrintOnMount /> : null}
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-5 rounded-[30px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] print:rounded-none print:border-none print:px-0 print:py-0 print:shadow-none sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Raporte mujore</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Shitjet per {report.monthLabel}
              </h1>
            </div>

            <form className={`flex flex-col gap-3 sm:flex-row sm:items-end ${isPrint ? "print:hidden" : ""}`}>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Muaji
                <input
                  type="month"
                  name="month"
                  defaultValue={selectedMonth}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Shfaq raportin
              </button>
              <Link
                href={`/reports?month=${selectedMonth}&print=1`}
                target="_blank"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                title="Print"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M7 9V4h10v5" />
                  <path d="M7 17H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
                  <path d="M7 14h10v6H7z" />
                </svg>
              </Link>
              <a
                href={`/reports/pdf?month=${selectedMonth}`}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800"
                title="Download PDF"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M12 4v10" />
                  <path d="m8 10 4 4 4-4" />
                  <path d="M5 19h14" />
                </svg>
              </a>
            </form>
          </div>
        </section>

        <section className="grid gap-4 print:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm print:break-inside-avoid print:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Porosi
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {report.ordersCount}
            </p>
            <p className="mt-2 text-sm text-slate-500">Gjithe porosite e muajit</p>
          </div>

          <div className="rounded-[24px] border border-emerald-200 bg-white px-5 py-5 shadow-sm print:break-inside-avoid print:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Copa
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {report.totalPairs}
            </p>
            <p className="mt-2 text-sm text-slate-500">Patika te shitura ne total</p>
          </div>

          <div className="rounded-[24px] border border-blue-100 bg-white px-5 py-5 shadow-sm print:break-inside-avoid print:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Shitje totale
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(report.totalRevenue)}
            </p>
            <p className="mt-2 text-sm text-slate-500">Te ardhura nga shitja</p>
          </div>

          <div className="rounded-[24px] border border-violet-100 bg-white px-5 py-5 shadow-sm print:break-inside-avoid print:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fitimi bruto
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(report.grossProfit)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Kosto totale {formatCurrency(report.totalCost)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)] print:break-inside-avoid print:shadow-none">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Shitjet sipas burimit
            </h2>
          </div>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
            {report.sourceBreakdown.map((item) => (
              <div
                key={item.source}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {item.quantity}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>Shitje {formatCurrency(item.revenue)}</p>
                  <p>Fitim {formatCurrency(item.profit)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 print:grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)] print:break-inside-avoid print:shadow-none">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Top modelet
              </h2>
            </div>
            {report.topModels.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">
                Nuk ka shitje per kete muaj.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/90 text-left">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-6 py-4">Brandi</th>
                      <th className="px-6 py-4">Modeli</th>
                      <th className="px-6 py-4 text-right">Copa</th>
                      <th className="px-6 py-4 text-right">Shitje</th>
                      <th className="px-6 py-4 text-right">Fitim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.topModels.map((item) => (
                      <tr key={`${item.brand}-${item.name}`} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4 text-slate-600">{item.brand}</td>
                        <td className="px-6 py-4 font-medium text-slate-950">{item.name}</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-950">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-700">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                          {formatCurrency(item.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)] print:break-inside-avoid print:shadow-none">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Sipas brandit
                </h2>
              </div>
              <div className="space-y-3 px-6 py-5">
                {report.topBrands.length === 0 ? (
                  <p className="text-sm text-slate-500">Nuk ka te dhena.</p>
                ) : (
                  report.topBrands.map((item) => (
                    <div
                      key={item.brand}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.brand}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.quantity} cope
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(item.profit)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)] print:break-inside-avoid print:shadow-none">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Ritmi ditor
                </h2>
              </div>
              <div className="space-y-3 px-6 py-5">
                {report.dailySales.length === 0 ? (
                  <p className="text-sm text-slate-500">Nuk ka te dhena.</p>
                ) : (
                  report.dailySales.map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.date}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.quantity} cope
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-950">
                        {formatCurrency(item.profit)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
