// Shared number, money and date helpers. Every Rupiah amount, axis label and
// tooltip in the app goes through here so the format stays the same
// everywhere: "Rp 15 jt", "Rp 1,2 M", "Rp 12.000".

const ID = "id-ID";

/** 1234.5 -> "1.234,5" (Indonesian separators, at most `maxDecimals`). */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(ID, { maximumFractionDigits: maxDecimals });
}

/** Full amount: "Rp 12.000", "−Rp 5.000". */
export function formatRupiah(value: number | null | undefined): string {
  const v = Number.isFinite(value) ? Number(value) : 0;
  const sign = v < 0 ? "−" : "";
  return `${sign}Rp ${formatNumber(Math.abs(v), 0)}`;
}

/** Short number without currency: "500 rb", "15 jt", "1,2 M". */
export function formatCompactNumber(value: number | null | undefined): string {
  const v = Number.isFinite(value) ? Number(value) : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}${formatNumber(abs / 1_000_000_000, 1)} M`;
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, 1)} jt`;
  if (abs >= 1_000) return `${sign}${formatNumber(abs / 1_000, 1)} rb`;
  return `${sign}${formatNumber(abs, 1)}`;
}

/** Short amount: "Rp 500 rb", "Rp 15 jt", "Rp 1,2 M". */
export function formatRupiahCompact(value: number | null | undefined): string {
  const v = Number.isFinite(value) ? Number(value) : 0;
  const sign = v < 0 ? "−" : "";
  return `${sign}Rp ${formatCompactNumber(Math.abs(v))}`;
}

/**
 * Reads a number the way villagers type it on an Indonesian keyboard.
 * "2,5" -> 2.5, "1.000" -> 1000, "1.000,5" -> 1000.5, "2.5" -> 2.5.
 * Returns null when the text is empty or not a number.
 */
export function parseDecimal(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw ?? "").trim().replace(/\s+/g, "");
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export const POSITIVE_NUMBER_MESSAGE = "Masukkan angka lebih dari 0";

/** Error message for a number field, or null when the value is valid (> 0). */
export function positiveNumberError(raw: string | number | null | undefined): string | null {
  const n = parseDecimal(raw);
  if (n === null || n <= 0) return POSITIVE_NUMBER_MESSAGE;
  return null;
}

/** Today's date in WIB (Asia/Jakarta) as YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "2026-11-10" -> "10 Nov 2026". Date-only strings are read as calendar dates. */
export function formatTanggal(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(ID, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Escape text before writing it into raw HTML (print window). */
export function escapeHtml(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MONTHS_ID: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agus: 8, agustus: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11,
  des: 12, desember: 12,
};

/**
 * Reads a full calendar date written as "2026-10-20", "20/10/2026",
 * "20 Okt 2026" or "20 Oktober 2026". Returns YYYY-MM-DD, or null for anything
 * vaguer ("Mulai Mei 2026", "Fleksibel"), which then never counts as expired.
 */
export function parseIndonesianDate(label: string | null | undefined): string | null {
  const s = String(label ?? "").trim().toLowerCase();
  if (!s) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null;

  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return valid(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/.exec(s);
  if (m && MONTHS_ID[m[2]]) return valid(Number(m[3]), MONTHS_ID[m[2]], Number(m[1]));
  return null;
}
