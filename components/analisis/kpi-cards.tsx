"use client";

import { useState } from "react";

type HppItem = {
  hpp: number;
  satuan: string;
};

type Props = {
  pendapatan: number;
  biaya: number;
  laba: number;
  hppPerItem?: Record<string, HppItem>;
  overallHpp?: HppItem;
};

const formatCompact = (val: number | undefined) => {
  if (val === undefined || val === null || isNaN(val)) return "Rp 0";
  const absVal = Math.abs(val);
  if (absVal >= 1_000_000_000)
    return `Rp ${(val / 1_000_000_000).toFixed(1)} M`;
  if (absVal >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)} jt`;
  if (absVal >= 1_000) return `Rp ${(val / 1_000).toFixed(0)} rb`;
  return `Rp ${val.toLocaleString("id-ID")}`;
};

const formatFull = (val: number | undefined) => {
  if (val === undefined || val === null || isNaN(val)) return "Rp 0";
  return `Rp ${val.toLocaleString("id-ID")}`;
};

export function KpiCards({
  pendapatan,
  biaya,
  laba,
  hppPerItem,
  overallHpp,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<string>("all");

  const safeHppPerItem = hppPerItem || {};
  const safeOverallHpp = overallHpp || { hpp: 0, satuan: "kg" };
  const items = Object.keys(safeHppPerItem);
  const currentHpp =
    selectedItem === "all"
      ? safeOverallHpp
      : safeHppPerItem[selectedItem] || { hpp: 0, satuan: "kg" };

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
            title={formatFull(pendapatan)}
          >
            {formatCompact(pendapatan)}
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
            title={formatFull(biaya)}
          >
            {formatCompact(biaya)}
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
            title={formatFull(Math.abs(laba))}
          >
            {formatCompact(Math.abs(laba))}
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
        <h3
          className="text-base md:text-lg font-bold text-gray-900 truncate"
          title={`${formatFull(currentHpp.hpp)}/${currentHpp.satuan}`}
        >
          {formatCompact(currentHpp.hpp)}
          <span className="text-[10px] md:text-xs font-normal text-gray-600">
            /{currentHpp.satuan}
          </span>
        </h3>
      </div>
    </div>
  );
}
