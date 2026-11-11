"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/analisis/top-nav";
import { Sidebar } from "@/components/analisis/sidebar";
import { KpiCards, type HppItem } from "@/components/analisis/kpi-cards";
import { BarChartCard } from "@/components/analisis/bar-chart-card";
import { RevenueDonut } from "@/components/analisis/revenue-donut";
import { FinanceTrend } from "@/components/analisis/finance-trend";
import { PeriodSelect } from "@/components/analisis/period-select";
import { getProductions, getTransactions } from "@/lib/analisis/api";
import { createClient } from "@/lib/supabase/client";
import {
  escapeHtml,
  formatNumber,
  formatRupiah,
  formatTanggal,
} from "@/lib/format";
import {
  dominantUnitGroup,
  formatQuantityTotals,
  sumByUnit,
  toGroupQuantity,
  unitGroup,
} from "@/lib/units";

interface NormalizedTransaction {
  id: string;
  tanggal: string;
  tipe: "pemasukan" | "pengeluaran";
  kategori: string;
  deskripsi: string;
  jumlah: number;
  satuan: string;
  harga: number;
}

interface NormalizedProduksi {
  id: string;
  komoditas: string;
  jumlah: number;
  satuan: string;
  tanggalTanam: string;
  tanggalPanen: string;
}

type Bucket = {
  label: string;
  produksi: number;
  penjualan: number;
  pendapatan: number;
  biaya: number;
};

const MONTH_NAMES = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const FILTER_SELECT_CLASS =
  "min-h-11 text-sm border border-gray-500 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332] cursor-pointer max-w-[140px]";

const EMPTY_HPP: HppItem = { hpp: null, satuan: null };

const nilai = (t: NormalizedTransaction) => t.harga * t.jumlah;
const isPemasukan = (t: NormalizedTransaction) => t.tipe === "pemasukan";
/** Running costs only. Asset purchases (kategori "aset") are an investment, not a cost of goods. */
const isBiayaOperasional = (t: NormalizedTransaction) =>
  t.tipe === "pengeluaran" && t.kategori !== "aset";
const produksiDate = (p: NormalizedProduksi) => p.tanggalPanen || p.tanggalTanam || "";

/**
 * HPP = cost / quantity sold, in one unit. Mass units are converted to kg
 * first. When the sales use more than one kind of unit (kg and "unit"), there
 * is no honest single number, so this returns null.
 */
function computeHpp(biaya: number, sales: { jumlah: number; satuan: string }[]): HppItem {
  const totals = sumByUnit(sales);
  const groups = Object.keys(totals);
  if (groups.length !== 1 || totals[groups[0]] <= 0) return EMPTY_HPP;
  return { hpp: Math.round(biaya / totals[groups[0]]), satuan: groups[0] };
}

/**
 * Picks the unit most entries use, and returns the items in that unit plus a
 * note listing what was left out of the chart (other units cannot share an axis).
 */
function splitByDominantUnit<T extends { jumlah: number; satuan: string }>(items: T[]) {
  const group = dominantUnitGroup(items) ?? "kg";
  const included = items.filter((i) => unitGroup(i.satuan) === group);
  const excluded = items.filter((i) => unitGroup(i.satuan) !== group);
  const note = excluded.length
    ? `Tidak termasuk satuan lain: ${formatQuantityTotals(sumByUnit(excluded))}`
    : undefined;
  return { group, included, note };
}

function periodLabel(year: string, month: string) {
  return month === "all" ? `Tahun ${year}` : `${MONTH_NAMES[Number(month)]} ${year}`;
}

export default function AnalisisDashboardPage() {
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [recapYear, setRecapYear] = useState(String(currentYear));

  const [selectedKomoditas, setSelectedKomoditas] = useState<string>("all");
  const [selectedPenjualan, setSelectedPenjualan] = useState<string>("all");
  const [selectedPengeluaran, setSelectedPengeluaran] = useState<string>("all");

  const [allTransactions, setAllTransactions] = useState<NormalizedTransaction[]>([]);
  const [allProduksi, setAllProduksi] = useState<NormalizedProduksi[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const years = Array.from({ length: 31 }, (_, i) => currentYear - 5 + i);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setRecapYear(year);
  };

  // Load everything once. Every number below is computed from these two lists.
  useEffect(() => {
    let mounted = true;

    Promise.all([getTransactions(), getProductions()])
      .then(([dbTx, dbProd]) => {
        if (!mounted) return;
        setAllTransactions(
          dbTx.map((t) => ({
            id: String(t.id),
            tanggal: t.tanggal,
            tipe: t.tipe,
            kategori: (t.kategori || "operasional").toLowerCase(),
            deskripsi: t.deskripsi,
            jumlah: Number(t.jumlah) || 0,
            satuan: t.satuan || "unit",
            harga: Number(t.harga) || 0,
          }))
        );
        setAllProduksi(
          dbProd.map((p) => ({
            id: String(p.id),
            komoditas: p.komoditas,
            jumlah: Number(p.jumlah) || 0,
            satuan: p.satuan || "unit",
            tanggalTanam: p.tanggalTanam,
            tanggalPanen: p.tanggalPanen,
          }))
        );
        setLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          setLoadError(
            err instanceof Error ? err.message : "Data gagal dimuat. Coba muat ulang halaman."
          );
        }
      });

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name")
        .eq("id", session.user.id)
        .single();
      if (mounted && profile) {
        setUserName(profile.business_name || profile.full_name || "");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const view = useMemo(() => {
    const datePrefix =
      selectedMonth === "all" ? selectedYear : `${selectedYear}-${selectedMonth}`;

    const keuangan = allTransactions.filter((t) => t.tanggal?.startsWith(datePrefix));
    const produksi = allProduksi.filter((p) => produksiDate(p).startsWith(datePrefix));
    const penjualan = keuangan.filter(isPemasukan);
    const biayaOperasional = keuangan.filter(isBiayaOperasional);

    const pendapatan = penjualan.reduce((sum, t) => sum + nilai(t), 0);
    const biaya = biayaOperasional.reduce((sum, t) => sum + nilai(t), 0);
    const overallHpp = computeHpp(biaya, penjualan);

    // HPP per product sold. Costs whose description matches the product name
    // are charged to it; without matching costs the overall average is used.
    const hppPerItem: Record<string, HppItem> = {};
    for (const name of new Set(penjualan.map((t) => t.deskripsi).filter(Boolean))) {
      const key = name.toLowerCase();
      const sales = penjualan.filter((t) => t.deskripsi.toLowerCase() === key);
      const matchingCosts = biayaOperasional.filter((t) => t.deskripsi.toLowerCase() === key);
      if (matchingCosts.length) {
        hppPerItem[name] = computeHpp(
          matchingCosts.reduce((sum, t) => sum + nilai(t), 0),
          sales
        );
      } else {
        const groups = new Set(sales.map((t) => unitGroup(t.satuan)));
        hppPerItem[name] =
          groups.size === 1 && overallHpp.satuan && groups.has(overallHpp.satuan)
            ? overallHpp
            : EMPTY_HPP;
      }
    }

    const revenueByItem: Record<string, number> = {};
    for (const t of penjualan) {
      const key = t.deskripsi || "Lainnya";
      revenueByItem[key] = (revenueByItem[key] || 0) + nilai(t);
    }
    const revenueItems = Object.entries(revenueByItem)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const makeBuckets = (): Record<string, Bucket> => {
      const agg: Record<string, Bucket> = {};
      const empty = { produksi: 0, penjualan: 0, pendapatan: 0, biaya: 0 };
      if (selectedMonth === "all") {
        for (let m = 1; m <= 12; m++) {
          const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
          agg[key] = { label: `${key.substring(5)}/${selectedYear.substring(2)}`, ...empty };
        }
      } else {
        const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${selectedYear}-${selectedMonth}-${String(d).padStart(2, "0")}`;
          agg[key] = { label: String(d), ...empty };
        }
      }
      return agg;
    };
    const bucketKey = (date: string) =>
      selectedMonth === "all" ? date.substring(0, 7) : date.substring(0, 10);

    // Produksi chart
    const produksiForChart =
      selectedKomoditas === "all"
        ? produksi
        : produksi.filter((p) => p.komoditas === selectedKomoditas);
    const prodSplit = splitByDominantUnit(produksiForChart);
    const prodBucket = makeBuckets();
    for (const p of prodSplit.included) {
      const b = prodBucket[bucketKey(produksiDate(p))];
      if (b) b.produksi += toGroupQuantity(p.jumlah, p.satuan);
    }

    // Penjualan chart
    const penjualanForChart =
      selectedPenjualan === "all"
        ? penjualan
        : penjualan.filter((t) => t.deskripsi === selectedPenjualan);
    const jualSplit = splitByDominantUnit(penjualanForChart);
    const jualBucket = makeBuckets();
    for (const t of jualSplit.included) {
      const b = jualBucket[bucketKey(t.tanggal)];
      if (b) b.penjualan += toGroupQuantity(t.jumlah, t.satuan);
    }

    // Pengeluaran chart: same rule as the "Total Biaya" KPI (no asset purchases).
    const pengeluaranForChart =
      selectedPengeluaran === "all"
        ? biayaOperasional
        : biayaOperasional.filter((t) => t.deskripsi === selectedPengeluaran);
    const biayaBucket = makeBuckets();
    for (const t of pengeluaranForChart) {
      const b = biayaBucket[bucketKey(t.tanggal)];
      if (b) b.biaya += nilai(t);
    }

    // Finance trend
    const trendBucket = makeBuckets();
    for (const t of keuangan) {
      const b = trendBucket[bucketKey(t.tanggal)];
      if (!b) continue;
      if (isPemasukan(t)) b.pendapatan += nilai(t);
      else if (isBiayaOperasional(t)) b.biaya += nilai(t);
    }

    const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

    return {
      summary: { pendapatan, biaya, laba: pendapatan - biaya },
      overallHpp,
      hppPerItem,
      revenueItems,
      komoditasList: uniq(produksi.map((p) => p.komoditas)),
      penjualanList: uniq(penjualan.map((t) => t.deskripsi)),
      pengeluaranList: uniq(biayaOperasional.map((t) => t.deskripsi)),
      chartDataProduksi: Object.values(prodBucket),
      produksiUnit: prodSplit.group,
      produksiNote: prodSplit.note,
      chartDataPenjualan: Object.values(jualBucket),
      penjualanUnit: jualSplit.group,
      penjualanNote: jualSplit.note,
      chartDataPengeluaran: Object.values(biayaBucket),
      chartData: Object.values(trendBucket),
    };
  }, [
    allTransactions,
    allProduksi,
    selectedYear,
    selectedMonth,
    selectedKomoditas,
    selectedPenjualan,
    selectedPengeluaran,
  ]);

  const yearly = useMemo(() => {
    const keuangan = allTransactions.filter((t) => t.tanggal?.startsWith(recapYear));
    const produksi = allProduksi.filter((p) => produksiDate(p).startsWith(recapYear));
    const penjualan = keuangan.filter(isPemasukan);
    const pendapatan = penjualan.reduce((sum, t) => sum + nilai(t), 0);
    const biaya = keuangan.filter(isBiayaOperasional).reduce((sum, t) => sum + nilai(t), 0);
    return {
      pendapatan,
      biaya,
      laba: pendapatan - biaya,
      hpp: computeHpp(biaya, penjualan),
      totalProduksi: formatQuantityTotals(sumByUnit(produksi)),
      totalPenjualan: formatQuantityTotals(sumByUnit(penjualan)),
    };
  }, [allTransactions, allProduksi, recapYear]);

  const hasAnyData = allTransactions.length > 0 || allProduksi.length > 0;
  const periodHasData =
    view.summary.pendapatan > 0 ||
    view.summary.biaya > 0 ||
    view.chartDataProduksi.some((b) => b.produksi > 0) ||
    view.chartDataPenjualan.some((b) => b.penjualan > 0);

  const handlePrintReport = () => {
    const datePrefix =
      selectedMonth === "all" ? selectedYear : `${selectedYear}-${selectedMonth}`;
    const transactions = allTransactions.filter((t) => t.tanggal?.startsWith(datePrefix));
    const produksi = allProduksi.filter((p) => produksiDate(p).startsWith(datePrefix));
    const penjualan = transactions.filter(isPemasukan);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Izinkan jendela baru (pop-up) di browser untuk mencetak laporan.");
      return;
    }

    const label = escapeHtml(periodLabel(selectedYear, selectedMonth));
    const e = escapeHtml;
    const { pendapatan, biaya, laba } = view.summary;
    const modal =
      view.overallHpp.hpp === null
        ? "— (belum bisa dihitung: belum ada penjualan atau satuannya berbeda)"
        : `${formatRupiah(view.overallHpp.hpp)}/${view.overallHpp.satuan}`;
    const tipeLabel = (t: NormalizedTransaction) =>
      isPemasukan(t) ? "Penjualan" : t.kategori === "aset" ? "Beli alat/aset" : "Biaya";

    // Every value written below goes through escapeHtml (e).
    printWindow.document.write(`
      <html><head><title>Laporan ${label}</title><style>body { font-family: Arial, sans-serif; padding: 30px; color: #1f2d24; } h1 { color: #1b4332; } table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; } th { background: #1b4332; color: white; padding: 10px; text-align: left; } td { padding: 8px; border-bottom: 1px solid #ddd; } .summary td:first-child { width: 45%; color: #444; } .summary td:last-child { font-weight: bold; }</style></head>
      <body><h1>Laporan Usaha Desa Jarak</h1><p>${userName ? `${e(userName)} · ` : ""}Periode: ${label}</p>
      <h2>Ringkasan</h2><table class="summary"><tbody>
      <tr><td>Total penjualan (pendapatan)</td><td>${e(formatRupiah(pendapatan))}</td></tr>
      <tr><td>Total biaya (tanpa beli alat/aset)</td><td>${e(formatRupiah(biaya))}</td></tr>
      <tr><td>${laba >= 0 ? "Untung (laba)" : "Rugi"}</td><td>${e(formatRupiah(Math.abs(laba)))}</td></tr>
      <tr><td>Modal per satuan (HPP)</td><td>${e(modal)}</td></tr>
      <tr><td>Jumlah terjual</td><td>${e(formatQuantityTotals(sumByUnit(penjualan)))}</td></tr>
      <tr><td>Jumlah panen</td><td>${e(formatQuantityTotals(sumByUnit(produksi)))}</td></tr>
      </tbody></table>
      <h2>Transaksi</h2><table><thead><tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th>Jumlah</th><th>Total</th></tr></thead><tbody>
      ${transactions
        .map(
          (t) =>
            `<tr><td>${e(formatTanggal(t.tanggal))}</td><td>${e(tipeLabel(t))}</td><td>${e(
              t.deskripsi
            )}</td><td>${e(`${formatNumber(t.jumlah)} ${t.satuan}`)}</td><td>${e(
              formatRupiah(nilai(t))
            )}</td></tr>`
        )
        .join("")}
      </tbody></table><h2>Produksi</h2><table><thead><tr><th>Komoditas</th><th>Jumlah</th><th>Tgl Panen</th></tr></thead><tbody>
      ${produksi
        .map(
          (p) =>
            `<tr><td>${e(p.komoditas)}</td><td>${e(
              `${formatNumber(p.jumlah)} ${p.satuan}`
            )}</td><td>${e(formatTanggal(p.tanggalPanen))}</td></tr>`
        )
        .join("")}
      </tbody></table></body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <main className="p-3 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 break-words">
                  Analisis Desa{userName ? `: ${userName}` : ""}
                </h1>
                <p className="text-sm text-gray-700 mt-1">
                  Catat penjualan, biaya, dan panen. Untung-rugi dihitung otomatis.
                </p>
              </div>
              {hasAnyData && (
                <PeriodSelect
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={handleYearChange}
                  years={years}
                />
              )}
            </div>

            {loadError && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </p>
            )}

            {!loaded && !loadError && (
              <p role="status" className="rounded-2xl bg-white border border-gray-100 px-4 py-8 text-center text-gray-700">
                Memuat catatan Anda…
              </p>
            )}

            {loaded && !hasAnyData && (
              <section className="rounded-2xl bg-white border border-gray-200 p-5 md:p-8 space-y-4">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                  Mulai dengan mencatat penjualan pertama
                </h2>
                <p className="text-sm md:text-base text-gray-700 max-w-2xl">
                  Setiap kali Anda menjual hasil panen, catat di sini: barang,
                  jumlah, dan harganya. Catat juga biaya seperti pupuk atau bibit.
                  Halaman ini lalu menghitung untung-rugi Anda tiap bulan.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/usaha/analisis/input-harga"
                    className="inline-flex items-center justify-center min-h-12 px-5 rounded-lg bg-[#1b4332] text-white font-semibold hover:bg-[#2d6a4f]"
                  >
                    Catat Penjualan atau Biaya
                  </Link>
                  <Link
                    href="/usaha/analisis/produksi"
                    className="inline-flex items-center justify-center min-h-12 px-5 rounded-lg border border-[#1b4332] text-[#1b4332] font-semibold hover:bg-gray-50"
                  >
                    Catat Panen
                  </Link>
                </div>
              </section>
            )}

            {loaded && hasAnyData && !periodHasData && (
              <p role="status" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                Belum ada catatan pada {periodLabel(selectedYear, selectedMonth)}.{" "}
                {selectedMonth !== "all" && (
                  <button
                    type="button"
                    className="font-semibold underline min-h-11"
                    onClick={() => setSelectedMonth("all")}
                  >
                    Lihat setahun penuh
                  </button>
                )}
              </p>
            )}

            {loaded && hasAnyData && (
            <>
            <KpiCards
              pendapatan={view.summary.pendapatan}
              biaya={view.summary.biaya}
              laba={view.summary.laba}
              hppPerItem={view.hppPerItem}
              overallHpp={view.overallHpp}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
              <div className="lg:col-span-1">
                <BarChartCard
                  title="Produksi"
                  data={view.chartDataProduksi}
                  dataKey="produksi"
                  label={selectedKomoditas === "all" ? "Total" : selectedKomoditas}
                  unit={view.produksiUnit}
                  note={view.produksiNote}
                  headerAction={
                    <select
                      aria-label="Pilih komoditas panen"
                      value={selectedKomoditas}
                      onChange={(e) => setSelectedKomoditas(e.target.value)}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="all">Semua</option>
                      {view.komoditasList.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  }
                />
              </div>

              <div className="lg:col-span-1">
                <BarChartCard
                  title="Penjualan"
                  data={view.chartDataPenjualan}
                  dataKey="penjualan"
                  label={selectedPenjualan === "all" ? "Total" : selectedPenjualan}
                  unit={view.penjualanUnit}
                  note={view.penjualanNote}
                  headerAction={
                    <select
                      aria-label="Pilih barang terjual"
                      value={selectedPenjualan}
                      onChange={(e) => setSelectedPenjualan(e.target.value)}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="all">Semua</option>
                      {view.penjualanList.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  }
                />
              </div>

              <div className="lg:col-span-1">
                <BarChartCard
                  title="Pengeluaran"
                  data={view.chartDataPengeluaran}
                  dataKey="biaya"
                  label={selectedPengeluaran === "all" ? "Total" : selectedPengeluaran}
                  unit="Rp"
                  note="Biaya operasional saja, tanpa pembelian aset (sama dengan Total Biaya)."
                  headerAction={
                    <select
                      aria-label="Pilih jenis biaya"
                      value={selectedPengeluaran}
                      onChange={(e) => setSelectedPengeluaran(e.target.value)}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="all">Semua</option>
                      {view.pengeluaranList.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
              <div className="lg:col-span-1">
                <RevenueDonut items={view.revenueItems} />
              </div>
              <div className="lg:col-span-1">
                <FinanceTrend data={view.chartData} />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
                  <div className="flex justify-between items-center mb-4 gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base whitespace-nowrap">
                      Ringkasan Setahun
                    </h3>
                    <input
                      aria-label="Tahun ringkasan"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={recapYear}
                      onChange={(e) => setRecapYear(e.target.value.replace(/\D/g, ""))}
                      className="min-h-11 text-base border border-gray-500 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-center w-20"
                      placeholder={String(currentYear)}
                    />
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Produksi</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {yearly.totalProduksi}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Penjualan</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {yearly.totalPenjualan}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Pendapatan</span>
                      <span className="font-semibold text-gray-900">
                        {formatRupiah(yearly.pendapatan)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Biaya</span>
                      <span className="font-semibold text-red-600">
                        {formatRupiah(yearly.biaya)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">
                        {yearly.laba >= 0 ? "Laba" : "Rugi"}
                      </span>
                      <span
                        className={`font-semibold ${
                          yearly.laba >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {formatRupiah(Math.abs(yearly.laba))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600">Modal per Satuan</span>
                      <span className="font-semibold text-gray-900">
                        {yearly.hpp.hpp === null
                          ? "—"
                          : `${formatRupiah(yearly.hpp.hpp)}/${yearly.hpp.satuan}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] rounded-2xl p-5 md:p-8 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-base md:text-xl font-bold mb-1">
                    Laporan {periodLabel(selectedYear, selectedMonth)}
                  </h2>
                  <p className="text-sm text-gray-100">
                    Cetak ringkasan untung-rugi, modal per satuan, transaksi,
                    dan panen. Pilih &quot;Simpan sebagai PDF&quot; di layar
                    cetak untuk menyimpannya.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="flex items-center gap-2 min-h-12 bg-white text-[#1b4332] px-5 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md whitespace-nowrap"
                >
                  Cetak Laporan
                </button>
              </div>
            </div>
            </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
