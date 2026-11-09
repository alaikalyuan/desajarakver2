export type MonthKey = "jan" | "feb" | "mar" | "apr" | "mei" | "jun";

export type PeriodData = {
  label: string;
  kpi: {
    pendapatan: { value: string; change: number };
    biaya: { value: string; change: number };
    untung: { value: string; change: number };
    hpp: { value: string; unit: string; status: string };
  };
  production: { month: string; hasil: number; target: number }[];
  sales: { month: string; terjual: number; target: number }[];
  revenueSources: { name: string; value: number; color: string }[];
  financeTrend: { month: string; pendapatan: number; biaya: number }[];
};

export const periodOrder: MonthKey[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mei",
  "jun",
];
