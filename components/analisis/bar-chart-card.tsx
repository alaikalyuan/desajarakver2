"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, Legend } from "./chart-card";
import { formatCompactNumber, formatNumber, formatRupiah } from "@/lib/format";

type Props = {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  label: string;
  /** "Rp" for money; otherwise the quantity unit shown after the number. */
  unit: string;
  /** Small text under the chart, e.g. which units were left out. */
  note?: string;
  headerAction?: React.ReactNode;
};

export function BarChartCard({
  title,
  data,
  dataKey,
  label,
  unit,
  note,
  headerAction,
}: Props) {
  const isMoney = unit === "Rp";
  const formatValue = (v: unknown) =>
    isMoney ? formatRupiah(Number(v)) : `${formatNumber(Number(v))} ${unit}`;

  return (
    <ChartCard title={title} action={headerAction}>
      <div className="h-40 md:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              stroke="var(--muted-foreground)"
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              stroke="var(--muted-foreground)"
              tickFormatter={(v: number) => formatCompactNumber(v)}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(v: unknown) => formatValue(v)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 11,
              }}
            />
            <Bar
              dataKey={dataKey}
              name={label}
              fill="var(--chart-1)"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          {
            label: isMoney ? `${label} (Rp)` : `${label} (${unit})`,
            color: "var(--chart-1)",
          },
        ]}
      />
      {note && <p className="mt-2 text-xs text-gray-600">{note}</p>}
    </ChartCard>
  );
}
