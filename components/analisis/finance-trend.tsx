"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, Legend } from "./chart-card";
import { formatCompactNumber, formatRupiah } from "@/lib/format";

type Props = {
  data: Record<string, unknown>[];
};

export function FinanceTrend({ data }: Props) {
  return (
    <ChartCard title="Tren Keuangan">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickFormatter={(v: number) => formatCompactNumber(v)}
              width={48}
            />
            <Tooltip
              formatter={(v: unknown) => formatRupiah(Number(v))}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="pendapatan"
              name="Pendapatan"
              stroke="#1b4332"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="biaya"
              name="Biaya Operasional"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: "Pendapatan (Rp)", color: "#1b4332" },
          { label: "Biaya Operasional (Rp)", color: "#ef4444" },
        ]}
      />
    </ChartCard>
  );
}
