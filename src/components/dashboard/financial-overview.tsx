"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { RecordPaymentDialog } from "@/components/students/record-payment-dialog";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Euro, 
  AlertCircle, 
  CheckCircle2, 
  Send
} from "lucide-react";

export interface MonthlyFinancialRecord {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface DebtorStudent {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  courses: string[];
  amountDue: number;
}

interface FinancialOverviewProps {
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthProfit: number;
  monthlyData: MonthlyFinancialRecord[];
  debtors: DebtorStudent[];
  currentMonthYear: string;
  currentMonthLabel: string;
  schoolName: string;
}

export function FinancialOverview({
  currentMonthIncome,
  currentMonthExpenses,
  currentMonthProfit,
  monthlyData,
  debtors,
  currentMonthYear,
  currentMonthLabel,
  schoolName,
}: FinancialOverviewProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isProfitPositive = currentMonthProfit >= 0;

  function handleRemind(debtor: DebtorStudent) {
    const formattedAmount = formatCurrency(debtor.amountDue);
    const subject = t("reminderSubject", { month: currentMonthLabel });
    const body = t("reminderBody", {
      name: debtor.name,
      month: currentMonthLabel,
      amount: formattedAmount,
      school: schoolName || t("defaultSchoolName"),
    });

    if (debtor.email) {
      const mailtoUrl = `mailto:${debtor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, "_blank");
      toast.success(t("reminderSent", { name: debtor.name }));
    } else {
      navigator.clipboard?.writeText(body);
      toast.info(t("noEmail") + " — " + t("reminderSent", { name: debtor.name }));
    }
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Euro strokeWidth={1.5} className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("financialOverview")}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {currentMonthLabel}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-medium text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {t("finances")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* 1. 3 KPI Cards: Einnahmen, Ausgaben, Gewinn */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Einnahmen (Income) */}
          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
              <span>{t("income")}</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft strokeWidth={1.5} className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
              {formatCurrency(currentMonthIncome)}
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 line-clamp-1">
              {t("incomeDesc")}
            </span>
          </div>

          {/* Ausgaben (Expenses) */}
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-red-800 dark:text-red-300 font-semibold mb-1">
              <span>{t("expenses")}</span>
              <div className="w-6 h-6 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <ArrowUpRight strokeWidth={1.5} className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-red-700 dark:text-red-300">
              {formatCurrency(currentMonthExpenses)}
            </div>
            <span className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1 line-clamp-1">
              {t("expensesDesc")}
            </span>
          </div>

          {/* Gewinn (Profit) */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              isProfitPositive
                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className={isProfitPositive ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}>
                {t("profit")}
              </span>
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  isProfitPositive
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                }`}
              >
                {isProfitPositive ? <TrendingUp strokeWidth={1.5} className="w-4 h-4" /> : <TrendingDown strokeWidth={1.5} className="w-4 h-4" />}
              </div>
            </div>
            <div
              className={`text-lg sm:text-xl font-black font-mono ${
                isProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {isProfitPositive ? "+" : ""}{formatCurrency(currentMonthProfit)}
            </div>
            <span
              className={`text-[10px] mt-1 line-clamp-1 ${
                isProfitPositive ? "text-emerald-700/80 dark:text-emerald-400/80" : "text-red-700/80 dark:text-red-400/80"
              }`}
            >
              {t("profitDesc")}
            </span>
          </div>
        </div>

        {/* 2. BarChart (Last 6 Months: Income vs Expenses) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("sixMonthsComparison")}
            </h4>
          </div>

          <div className="h-56 w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 p-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 12, right: 10, left: -16, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(val) => `${val}€`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "0.75rem",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      formatCurrency(Number(value || 0)),
                      name === "income" ? t("income") : t("expenses"),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => (value === "income" ? t("income") : t("expenses"))}
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="expenses"
                    name="expenses"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                {tCommon("loading")}
              </div>
            )}
          </div>
        </div>

        {/* 3. Offene Zahlungen (Debtors List) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {t("openPayments")}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("openPaymentsDesc")}
              </p>
            </div>
            {debtors.length > 0 ? (
              <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold">
                {debtors.length} {t("unpaidStudentsCount", { count: debtors.length })}
              </Badge>
            ) : (
              <Badge variant="success" className="text-xs px-2 py-0.5 font-bold">
                0
              </Badge>
            )}
          </div>

          {debtors.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-center space-y-1">
              <CheckCircle2 strokeWidth={1.5} className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {t("noOpenPayments")}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                {t("allPaymentsSettled")}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {debtors.map((debtor) => (
                <div
                  key={debtor.id}
                  className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {debtor.name}
                      </span>
                      {debtor.courses.length > 0 && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium truncate max-w-[120px]">
                          {debtor.courses.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {debtor.email || debtor.phone || tCommon("notSpecified")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{t("amountDue")}:</span>
                      <span className="text-xs font-black font-mono text-red-600 dark:text-red-400">
                        {formatCurrency(debtor.amountDue)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Remind button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemind(debtor)}
                        className="h-7 px-2 text-[11px] space-x-1 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        title={t("remind")}
                      >
                        <Send strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{t("remind")}</span>
                      </Button>

                      {/* Quick Record Payment Dialog */}
                      <RecordPaymentDialog
                        studentId={debtor.studentId}
                        studentName={debtor.name}
                        currentMonthYear={currentMonthYear}
                        defaultAmount={debtor.amountDue}
                        isAlreadyPaid={false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
