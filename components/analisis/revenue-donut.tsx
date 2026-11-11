"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";

type Props = {
  items: { name: string; value: number }[];
};

const COLORS = [
  "#1b4332",
  "#2d6a4f",
  "#40916c",
  "#52b788",
  "#74c69d",
  "#95d5b2",
  "#b7e4c7",
];

export function RevenueDonut({ items }: Props) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Sumber Pendapatan</h3>
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          Belum ada data pendapatan
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Sumber Pendapatan</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
              >
                {items.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-600">Total</span>
            <span className="font-bold text-xs text-gray-900" title={formatRupiah(total)}>
              {formatRupiahCompact(total)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          {items.map((item, index) => {
            const percentage = Math.round((item.value / total) * 100);
            return (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  ></span>
                  <span className="text-gray-700 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 ml-2">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
