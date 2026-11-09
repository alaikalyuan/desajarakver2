"use client";

import { useEffect, useState } from "react";

const monthNames = [
  { value: "all", label: "Semua Bulan" },
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

type Props = {
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  years: number[];
};

export function PeriodSelect({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: Props) {
  const [yearInput, setYearInput] = useState(selectedYear);

  useEffect(() => {
    setYearInput(selectedYear);
  }, [selectedYear]);

  const handleYearBlur = () => {
    if (yearInput.length === 4 && !isNaN(Number(yearInput))) {
      onYearChange(yearInput);
    } else {
      setYearInput(selectedYear);
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex gap-2 w-full lg:w-auto">
      <div className="flex flex-col gap-1 flex-1 lg:flex-none">
        <label className="text-[10px] md:text-xs font-medium text-gray-600">
          Bulan
        </label>
        <select
          aria-label="Pilih bulan"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="h-10 px-2 md:px-3 rounded-lg border border-gray-200 bg-white text-xs md:text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none cursor-pointer w-full lg:w-32"
        >
          {monthNames.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 flex-1 lg:flex-none">
        <label className="text-[10px] md:text-xs font-medium text-gray-600">
          Tahun
        </label>
        <input
          aria-label="Pilih tahun"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={yearInput}
          onChange={(e) => setYearInput(e.target.value.replace(/\D/g, ""))}
          onBlur={handleYearBlur}
          onKeyDown={handleYearKeyDown}
          placeholder="2026"
          className="h-10 px-2 w-full lg:w-24 rounded-lg border border-gray-200 bg-white text-xs md:text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none text-center"
        />
      </div>
    </div>
  );
}
