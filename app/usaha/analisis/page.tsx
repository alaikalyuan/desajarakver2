"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/analisis/top-nav";
import { Sidebar } from "@/components/analisis/sidebar";
import { KpiCards } from "@/components/analisis/kpi-cards";
import { BarChartCard } from "@/components/analisis/bar-chart-card";
import { RevenueDonut } from "@/components/analisis/revenue-donut";
import { FinanceTrend } from "@/components/analisis/finance-trend";
import { PeriodSelect } from "@/components/analisis/period-select";
import { getProductions, getTransactions } from "@/lib/analisis/api";
import { createClient } from "@/lib/supabase/client";

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

export default function AnalisisDashboardPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Kelompok Tani Makmur");
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [recapYear, setRecapYear] = useState(String(currentYear));

  useEffect(() => {
    setRecapYear(selectedYear);
  }, [selectedYear]);

  const [summary, setSummary] = useState({
    pendapatan: 0,
    biaya: 0,
    laba: 0,
    hpp: 0,
  });
  const [yearlySummary, setYearlySummary] = useState({
    pendapatan: 0,
    biaya: 0,
    laba: 0,
    hpp: 0,
    totalProduksi: 0,
    totalPenjualan: 0,
  });

  const [hppPerItem, setHppPerItem] = useState<
    Record<string, { hpp: number; satuan: string }>
  >({});
  const [overallHpp, setOverallHpp] = useState({ hpp: 0, satuan: "kg" });

  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [chartDataProduksi, setChartDataProduksi] = useState<
    Record<string, unknown>[]
  >([]);
  const [chartDataPenjualan, setChartDataPenjualan] = useState<
    Record<string, unknown>[]
  >([]);
  const [chartDataPengeluaran, setChartDataPengeluaran] = useState<
    Record<string, unknown>[]
  >([]);

  const [komoditasList, setKomoditasList] = useState<string[]>([]);
  const [penjualanList, setPenjualanList] = useState<string[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<string[]>([]);

  const [selectedKomoditas, setSelectedKomoditas] = useState<string>("all");
  const [selectedPenjualan, setSelectedPenjualan] = useState<string>("all");
  const [selectedPengeluaran, setSelectedPengeluaran] = useState<string>("all");

  const [produksiUnit, setProduksiUnit] = useState("kg");
  const [penjualanUnit, setPenjualanUnit] = useState("kg");

  const [revenueItems, setRevenueItems] = useState<
    { name: string; value: number }[]
  >([]);
  const [allTransactions, setAllTransactions] = useState<
    NormalizedTransaction[]
  >([]);
  const [allProduksi, setAllProduksi] = useState<NormalizedProduksi[]>([]);

  const years = Array.from({ length: 31 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, business_name")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setUserName(
            profile.business_name ||
              profile.full_name ||
              "Kelompok Tani Makmur"
          );
        }
      }
    });
  }, []);

  const getDominantUnit = (items: { satuan?: string }[]) => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      const s = i?.satuan;
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "kg";
  };

  async function loadCombinedData(): Promise<{
    keuangan: NormalizedTransaction[];
    produksi: NormalizedProduksi[];
  }> {
    let dbTx: Awaited<ReturnType<typeof getTransactions>> = [];
    let dbProd: Awaited<ReturnType<typeof getProductions>> = [];
    try {
      [dbTx, dbProd] = await Promise.all([getTransactions(), getProductions()]);
    } catch (err) {
      console.error(err);
    }

    const keuangan: NormalizedTransaction[] = dbTx.map((t) => ({
      id: String(t.id),
      tanggal: t.tanggal,
      tipe: t.tipe,
      kategori: (t.kategori || "operasional").toLowerCase(),
      deskripsi: t.deskripsi,
      jumlah: Number(t.jumlah) || 0,
      satuan: t.satuan || "kg",
      harga: Number(t.harga) || 0,
    }));

    const produksi: NormalizedProduksi[] = dbProd.map((p) => ({
      id: String(p.id),
      komoditas: p.komoditas,
      jumlah: Number(p.jumlah) || 0,
      satuan: p.satuan || "kg",
      tanggalTanam: p.tanggalTanam,
      tanggalPanen: p.tanggalPanen,
    }));

    return { keuangan, produksi };
  }

  useEffect(() => {
    const fetchData = async () => {
      const datePrefix =
        selectedMonth === "all"
          ? selectedYear
          : `${selectedYear}-${selectedMonth}`;

      const { keuangan: semuaKeuangan, produksi: semuaProduksi } =
        await loadCombinedData();

      setAllTransactions(semuaKeuangan);
      setAllProduksi(semuaProduksi);

      const filteredKeuangan = semuaKeuangan.filter((t) =>
        t.tanggal?.startsWith(datePrefix)
      );
      const filteredProduksi = semuaProduksi.filter((p) =>
        (p.tanggalPanen || p.tanggalTanam)?.startsWith(datePrefix)
      );

      const uniqKomoditas = Array.from(
        new Set(filteredProduksi.map((p) => p.komoditas).filter(Boolean))
      );
      const uniqPenjualan = Array.from(
        new Set(
          filteredKeuangan
            .filter((t) => t.tipe === "pemasukan")
            .map((t) => t.deskripsi)
            .filter(Boolean)
        )
      );
      const uniqPengeluaran = Array.from(
        new Set(
          filteredKeuangan
            .filter((t) => t.tipe === "pengeluaran")
            .map((t) => t.deskripsi)
            .filter(Boolean)
        )
      );

      setKomoditasList(uniqKomoditas);
      setPenjualanList(uniqPenjualan);
      setPengeluaranList(uniqPengeluaran);

      const totalPendapatan = filteredKeuangan
        .filter((t) => t.tipe === "pemasukan")
        .reduce((sum, t) => sum + t.harga * t.jumlah, 0);

      const totalBiaya = filteredKeuangan
        .filter((t) => t.tipe === "pengeluaran" && t.kategori !== "aset")
        .reduce((sum, t) => sum + t.harga * t.jumlah, 0);

      const totalJumlahPemasukan = filteredKeuangan
        .filter((t) => t.tipe === "pemasukan")
        .reduce((sum, t) => sum + t.jumlah, 0);

      const laba = totalPendapatan - totalBiaya;
      const hppOverall =
        totalJumlahPemasukan > 0
          ? Math.round(totalBiaya / totalJumlahPemasukan)
          : 0;

      setSummary({
        pendapatan: totalPendapatan,
        biaya: totalBiaya,
        laba,
        hpp: hppOverall,
      });
      setOverallHpp({ hpp: hppOverall, satuan: "kg" });

      const allItems = new Set<string>();
      filteredKeuangan.forEach((t) => {
        if (t.deskripsi) allItems.add(t.deskripsi);
      });
      filteredProduksi.forEach((p) => {
        if (p.komoditas) allItems.add(p.komoditas);
      });

      const hppMap: Record<string, { hpp: number; satuan: string }> = {};
      allItems.forEach((itemName) => {
        const matchingPengeluaran = filteredKeuangan.filter(
          (t) =>
            t.tipe === "pengeluaran" &&
            t.kategori !== "aset" &&
            t.deskripsi.toLowerCase() === itemName.toLowerCase()
        );
        const totalPengeluaran = matchingPengeluaran.reduce(
          (sum, t) => sum + t.harga * t.jumlah,
          0
        );
        const totalJumlahPengeluaran = matchingPengeluaran.reduce(
          (sum, t) => sum + t.jumlah,
          0
        );

        let hpp = hppOverall;
        let satuan = "kg";
        if (totalJumlahPengeluaran > 0) {
          hpp = Math.round(totalPengeluaran / totalJumlahPengeluaran);
          satuan = matchingPengeluaran[0]?.satuan || "kg";
        }
        hppMap[itemName] = { hpp, satuan };
      });
      setHppPerItem(hppMap);

      const pemasukanByItem: Record<string, number> = {};
      filteredKeuangan
        .filter((t) => t.tipe === "pemasukan")
        .forEach((t) => {
          const key = t.deskripsi || "Lainnya";
          pemasukanByItem[key] =
            (pemasukanByItem[key] || 0) + t.harga * t.jumlah;
        });
      setRevenueItems(
        Object.entries(pemasukanByItem)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      const makeMonthlyBucket = () => {
        const agg: Record<
          string,
          {
            label: string;
            produksi: number;
            penjualan: number;
            pendapatan: number;
            biaya: number;
          }
        > = {};
        for (let m = 1; m <= 12; m++) {
          const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
          agg[key] = {
            label: `${key.substring(5)}/${selectedYear.substring(2)}`,
            produksi: 0,
            penjualan: 0,
            pendapatan: 0,
            biaya: 0,
          };
        }
        return agg;
      };

      const makeDailyBucket = () => {
        const daysInMonth = new Date(
          Number(selectedYear),
          Number(selectedMonth),
          0
        ).getDate();
        const agg: Record<
          string,
          {
            label: string;
            produksi: number;
            penjualan: number;
            pendapatan: number;
            biaya: number;
          }
        > = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${selectedYear}-${selectedMonth}-${String(d).padStart(
            2,
            "0"
          )}`;
          agg[key] = {
            label: String(d),
            produksi: 0,
            penjualan: 0,
            pendapatan: 0,
            biaya: 0,
          };
        }
        return agg;
      };

      const produksiForChart =
        selectedKomoditas === "all"
          ? filteredProduksi
          : filteredProduksi.filter((p) => p.komoditas === selectedKomoditas);
      setProduksiUnit(getDominantUnit(produksiForChart));

      const prodBucket =
        selectedMonth === "all" ? makeMonthlyBucket() : makeDailyBucket();
      produksiForChart.forEach((p) => {
        const fullDate = p.tanggalPanen || p.tanggalTanam || "";
        const key =
          selectedMonth === "all" ? fullDate.substring(0, 7) : fullDate;
        if (key && prodBucket[key]) prodBucket[key].produksi += p.jumlah;
      });
      setChartDataProduksi(Object.values(prodBucket));

      const penjualanRaw = filteredKeuangan.filter(
        (t) => t.tipe === "pemasukan"
      );
      const penjualanForChart =
        selectedPenjualan === "all"
          ? penjualanRaw
          : penjualanRaw.filter((t) => t.deskripsi === selectedPenjualan);
      setPenjualanUnit(getDominantUnit(penjualanForChart));

      const jualBucket =
        selectedMonth === "all" ? makeMonthlyBucket() : makeDailyBucket();
      penjualanForChart.forEach((t) => {
        const key =
          selectedMonth === "all" ? t.tanggal.substring(0, 7) : t.tanggal;
        if (key && jualBucket[key]) jualBucket[key].penjualan += t.jumlah;
      });
      setChartDataPenjualan(Object.values(jualBucket));

      const pengeluaranRaw = filteredKeuangan.filter(
        (t) => t.tipe === "pengeluaran"
      );
      const pengeluaranForChart =
        selectedPengeluaran === "all"
          ? pengeluaranRaw
          : pengeluaranRaw.filter((t) => t.deskripsi === selectedPengeluaran);

      const biayaBucket =
        selectedMonth === "all" ? makeMonthlyBucket() : makeDailyBucket();
      pengeluaranForChart.forEach((t) => {
        const key =
          selectedMonth === "all" ? t.tanggal.substring(0, 7) : t.tanggal;
        if (key && biayaBucket[key]) {
          biayaBucket[key].biaya += t.harga * t.jumlah;
        }
      });
      setChartDataPengeluaran(Object.values(biayaBucket));

      const aggBucket =
        selectedMonth === "all" ? makeMonthlyBucket() : makeDailyBucket();
      filteredKeuangan.forEach((t) => {
        const key =
          selectedMonth === "all" ? t.tanggal.substring(0, 7) : t.tanggal;
        if (key && aggBucket[key]) {
          if (t.tipe === "pemasukan") {
            aggBucket[key].pendapatan += t.harga * t.jumlah;
          } else if (t.kategori !== "aset") {
            aggBucket[key].biaya += t.harga * t.jumlah;
          }
        }
      });
      setChartData(Object.values(aggBucket));
    };

    fetchData();
  }, [
    selectedYear,
    selectedMonth,
    selectedKomoditas,
    selectedPenjualan,
    selectedPengeluaran,
  ]);

  useEffect(() => {
    const fetchRekap = async () => {
      const { keuangan: semuaKeuangan, produksi: semuaProduksi } =
        await loadCombinedData();

      const tahunanKeuangan = semuaKeuangan.filter((t) =>
        t.tanggal?.startsWith(recapYear)
      );
      const tahunanProduksi = semuaProduksi.filter((p) =>
        (p.tanggalPanen || p.tanggalTanam)?.startsWith(recapYear)
      );

      const tahunanPendapatan = tahunanKeuangan
        .filter((t) => t.tipe === "pemasukan")
        .reduce((sum, t) => sum + t.harga * t.jumlah, 0);
      const tahunanBiaya = tahunanKeuangan
        .filter((t) => t.tipe === "pengeluaran" && t.kategori !== "aset")
        .reduce((sum, t) => sum + t.harga * t.jumlah, 0);
      const tahunanTotalJumlah = tahunanKeuangan
        .filter((t) => t.tipe === "pemasukan")
        .reduce((sum, t) => sum + t.jumlah, 0);
      const tahunanTotalProd = tahunanProduksi.reduce(
        (sum, p) => sum + p.jumlah,
        0
      );

      setYearlySummary({
        pendapatan: tahunanPendapatan,
        biaya: tahunanBiaya,
        laba: tahunanPendapatan - tahunanBiaya,
        hpp:
          tahunanTotalJumlah > 0
            ? Math.round(tahunanBiaya / tahunanTotalJumlah)
            : 0,
        totalProduksi: tahunanTotalProd,
        totalPenjualan: tahunanTotalJumlah,
      });
    };
    fetchRekap();
  }, [recapYear]);

  const handleDownloadPDF = () => {
    const datePrefix =
      selectedMonth === "all"
        ? selectedYear
        : `${selectedYear}-${selectedMonth}`;
    const transactions = allTransactions.filter((t) =>
      t.tanggal?.startsWith(datePrefix)
    );
    const produksi = allProduksi.filter((p) =>
      (p.tanggalPanen || p.tanggalTanam)?.startsWith(datePrefix)
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Mohon izinkan pop-up untuk mengunduh laporan.");
      return;
    }

    const formatRp = (v: number) => `Rp ${(v || 0).toLocaleString("id-ID")}`;
    const formatTgl = (t: string) =>
      t
        ? new Date(t).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";
    const periodeLabel =
      selectedMonth === "all"
        ? `Tahun ${selectedYear}`
        : `${
            [
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
            ][Number(selectedMonth)]
          } ${selectedYear}`;

    printWindow.document.write(`
      <html><head><title>Laporan ${periodeLabel}</title><style>body { font-family: Arial, sans-serif; padding: 30px; } h1 { color: #1b4332; } table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; } th { background: #1b4332; color: white; padding: 10px; text-align: left; } td { padding: 8px; border-bottom: 1px solid #ddd; }</style></head>
      <body><h1>Laporan Keuangan & Produksi Desa Jarak</h1><p>Periode: ${periodeLabel}</p>
      <h2>Transaksi</h2><table><thead><tr><th>Tanggal</th><th>Tipe</th><th>Deskripsi</th><th>Total</th></tr></thead><tbody>
      ${transactions
        .map(
          (t) =>
            `<tr><td>${formatTgl(t.tanggal)}</td><td>${t.tipe}</td><td>${
              t.deskripsi
            }</td><td>${formatRp(t.harga * t.jumlah)}</td></tr>`
        )
        .join("")}
      </tbody></table><h2>Produksi</h2><table><thead><tr><th>Komoditas</th><th>Jumlah</th><th>Tgl Panen</th></tr></thead><tbody>
      ${produksi
        .map(
          (p) =>
            `<tr><td>${p.komoditas}</td><td>${p.jumlah} ${
              p.satuan
            }</td><td>${formatTgl(p.tanggalPanen)}</td></tr>`
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
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Selamat Datang,
                </p>
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 mt-1 break-words">
                  {userName}
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Kelola data produksi, penjualan, dan keuangan usaha Anda
                  dengan mudah.
                </p>
              </div>
              <PeriodSelect
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                years={years}
              />
            </div>

            <KpiCards
              pendapatan={summary.pendapatan}
              biaya={summary.biaya}
              laba={summary.laba}
              hppPerItem={hppPerItem}
              overallHpp={overallHpp}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
              <div className="lg:col-span-1">
                <BarChartCard
                  title="Produksi"
                  data={chartDataProduksi}
                  actualKey="produksi"
                  targetKey="produksi"
                  actualLabel={
                    selectedKomoditas === "all" ? "Total" : selectedKomoditas
                  }
                  unit={produksiUnit}
                  headerAction={
                    <select
                      aria-label="Filter komoditas produksi"
                      value={selectedKomoditas}
                      onChange={(e) => setSelectedKomoditas(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332] cursor-pointer max-w-[120px]"
                    >
                      <option value="all">Semua</option>
                      {komoditasList.map((k) => (
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
                  data={chartDataPenjualan}
                  actualKey="penjualan"
                  targetKey="penjualan"
                  actualLabel={
                    selectedPenjualan === "all" ? "Total" : selectedPenjualan
                  }
                  unit={penjualanUnit}
                  headerAction={
                    <select
                      aria-label="Filter penjualan"
                      value={selectedPenjualan}
                      onChange={(e) => setSelectedPenjualan(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332] cursor-pointer max-w-[120px]"
                    >
                      <option value="all">Semua</option>
                      {penjualanList.map((k) => (
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
                  data={chartDataPengeluaran}
                  actualKey="biaya"
                  targetKey="biaya"
                  actualLabel={
                    selectedPengeluaran === "all"
                      ? "Total"
                      : selectedPengeluaran
                  }
                  unit="Rp"
                  headerAction={
                    <select
                      aria-label="Filter pengeluaran"
                      value={selectedPengeluaran}
                      onChange={(e) => setSelectedPengeluaran(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332] cursor-pointer max-w-[120px]"
                    >
                      <option value="all">Semua</option>
                      {pengeluaranList.map((k) => (
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
                <RevenueDonut items={revenueItems} />
              </div>
              <div className="lg:col-span-1">
                <FinanceTrend data={chartData} />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
                  <div className="flex justify-between items-center mb-4 gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base whitespace-nowrap">
                      Rekapitulasi Tahunan
                    </h3>
                    <input
                      aria-label="Tahun rekapitulasi"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={recapYear}
                      onChange={(e) =>
                        setRecapYear(e.target.value.replace(/\D/g, ""))
                      }
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332] text-center w-16"
                      placeholder="2026"
                    />
                  </div>
                  <div className="space-y-3 text-xs md:text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Produksi</span>
                      <span className="font-semibold text-gray-900">
                        {yearlySummary.totalProduksi.toLocaleString("id-ID")} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Penjualan</span>
                      <span className="font-semibold text-gray-900">
                        {yearlySummary.totalPenjualan.toLocaleString("id-ID")}{" "}
                        kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Pendapatan</span>
                      <span className="font-semibold text-gray-900">
                        Rp {yearlySummary.pendapatan.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">Total Biaya</span>
                      <span className="font-semibold text-red-600">
                        Rp {yearlySummary.biaya.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-600">
                        {yearlySummary.laba >= 0 ? "Laba" : "Rugi"}
                      </span>
                      <span
                        className={`font-semibold ${
                          yearlySummary.laba >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        Rp{" "}
                        {Math.abs(yearlySummary.laba).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600">HPP Rata-rata</span>
                      <span className="font-semibold text-gray-900">
                        Rp {yearlySummary.hpp.toLocaleString("id-ID")}/kg
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
                    Laporan{" "}
                    {selectedMonth === "all"
                      ? `Tahun ${selectedYear}`
                      : `${
                          [
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
                          ][Number(selectedMonth)]
                        } ${selectedYear}`}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-200">
                    Unduh laporan lengkap dengan riwayat transaksi, produksi,
                    dan ringkasan keuangan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-white text-[#1b4332] px-5 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md whitespace-nowrap"
                >
                  Unduh Laporan (PDF)
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
