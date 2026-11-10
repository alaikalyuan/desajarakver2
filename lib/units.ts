import { formatNumber } from "@/lib/format";

// Mass units are converted to kg so they can be added together.
// Every other unit (liter, karung, ikat, buah, unit, ...) is kept separate.
const KG_FACTOR: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  ton: 1000,
  kwintal: 100,
  kuintal: 100,
  gram: 0.001,
  g: 0.001,
};

export function normalizeUnit(satuan: string | null | undefined): string {
  return String(satuan ?? "").trim().toLowerCase() || "unit";
}

/** Quantity in kg, or null when the unit is not a mass unit. */
export function toKg(jumlah: number, satuan: string | null | undefined): number | null {
  const factor = KG_FACTOR[normalizeUnit(satuan)];
  return factor === undefined ? null : jumlah * factor;
}

/** The group a unit adds up in: "kg" for all mass units, else the unit itself. */
export function unitGroup(satuan: string | null | undefined): string {
  const u = normalizeUnit(satuan);
  return KG_FACTOR[u] === undefined ? u : "kg";
}

/** Quantity expressed in its unit group (mass -> kg, other units unchanged). */
export function toGroupQuantity(jumlah: number, satuan: string | null | undefined): number {
  return toKg(jumlah, satuan) ?? jumlah;
}

/** Totals per unit group, e.g. { kg: 2520, unit: 1 }. */
export type QuantityTotals = Record<string, number>;

export function sumByUnit(items: { jumlah: number; satuan: string }[]): QuantityTotals {
  const totals: QuantityTotals = {};
  for (const item of items) {
    const group = unitGroup(item.satuan);
    totals[group] = (totals[group] || 0) + toGroupQuantity(item.jumlah, item.satuan);
  }
  return totals;
}

/** "2.520 kg", "2.520 kg · 1 unit", or "0" when empty. kg is always listed first. */
export function formatQuantityTotals(totals: QuantityTotals): string {
  const entries = Object.entries(totals).filter(([, v]) => v !== 0);
  if (entries.length === 0) return "0";
  entries.sort(([a], [b]) => (a === "kg" ? -1 : b === "kg" ? 1 : a.localeCompare(b)));
  return entries.map(([unit, v]) => `${formatNumber(v)} ${unit}`).join(" · ");
}

/** The unit group with the largest number of entries (kg wins ties). */
export function dominantUnitGroup(items: { satuan: string }[]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const g = unitGroup(item.satuan);
    counts[g] = (counts[g] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort(
    ([ga, a], [gb, b]) => b - a || (ga === "kg" ? -1 : gb === "kg" ? 1 : 0)
  );
  return sorted[0]?.[0] ?? null;
}
