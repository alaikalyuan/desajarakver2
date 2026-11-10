"use client";

import { useState } from "react";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";

/** HPP per unit; `hpp` is null when it cannot be computed (no sales, or mixed units). */
export type HppItem = {
  hpp: number | null;
  satuan: string | null;
};

type Props = {
  pendapatan: number;
  biaya: number;
  laba: number;
  hppPerItem?: Record<string, HppItem>;
  overallHpp?: HppItem;
};

const EMPTY_HPP: HppItem = { hpp: null, satuan: null };

export function KpiCards({
  pendapatan,
  biaya,
  laba,
  hppPerItem,
  overallHpp,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<string>("all");

  const safeHppPerItem = hppPerItem || {};
  const safeOverallHpp = overallHpp || EMPTY_HPP;
  const items = Object.keys(safeHppPerItem);
  const currentHpp =
    selectedItem === "all"
      ? safeOverallHpp
      : safeHppPerItem[selectedItem] || EMPTY_HPP;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
      <div className="bg-[#e8f5e9] p-3 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-w-0">
        <div className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-base md:text-xl">🌱</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-gray-600 truncate">
            Total Pendapatan
          </p>
          <h3
            className="text-base md:text-lg font-bold text-gray-900 truncate"
            title={formatRupiah(pendapatan)}
          >
            {formatRupiahCompact(pendapatan)}
          </h3>
        </div>
      </div>

      <div className="bg-[#fce4ec] p-3 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-w-0">
        <div className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-base md:text-xl">💸</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-gray-600 truncate">
            Total Biaya
          </p>
          <h3
            className="text-base md:text-lg font-bold text-gray-900 truncate"
            title={formatRupiah(biaya)}
          >
            {formatRupiahCompact(biaya)}
          </h3>
        </div>
      </div>

      <div
        className={`${
          laba >= 0 ? "bg-[#e3f2fd]" : "bg-[#ffebee]"
        } p-3 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-w-0`}
      >
        <div className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-base md:text-xl">
            {laba >= 0 ? "📈" : "📉"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-gray-600 truncate">
            {laba >= 0 ? "Total Untung" : "Total Rugi"}
          </p>
          <h3
            className="text-base md:text-lg font-bold text-gray-900 truncate"
            title={formatRupiah(Math.abs(laba))}
          >
            {formatRupiahCompact(Math.abs(laba))}
          </h3>
        </div>
      </div>

      <div className="bg-[#fff8e1] p-3 md:p-5 rounded-2xl min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-sm md:text-lg">📦</span>
          </div>
          <p className="text-[10px] md:text-xs text-gray-600 truncate">
            HPP Rata-rata
          </p>
        </div>
        <select
          aria-label="Pilih barang untuk HPP rata-rata"
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
          className="w-full text-[10px] md:text-xs border border-gray-200 rounded-md px-1.5 md:px-2 py-1 bg-white text-gray-700 mb-1.5 focus:outline-none focus:ring-1 focus:ring-[#1b4332] cursor-pointer"
        >
          <option value="all">Semua Barang</option>
          {items.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {currentHpp.hpp === null ? (
          <h3
            className="text-base md:text-lg font-bold text-gray-900 truncate"
            title="Belum bisa dihitung: belum ada penjualan, atau satuannya berbeda-beda."
          >
            —
          </h3>
        ) : (
          <h3
            className="text-base md:text-lg font-bold text-gray-900 truncate"
            title={`${formatRupiah(currentHpp.hpp)}/${currentHpp.satuan}`}
          >
            {formatRupiahCompact(currentHpp.hpp)}
            <span className="text-[10px] md:text-xs font-normal text-gray-600">
              /{currentHpp.satuan}
            </span>
          </h3>
        )}
      </div>
    </div>
  );
}
