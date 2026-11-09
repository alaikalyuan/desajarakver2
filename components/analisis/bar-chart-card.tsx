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

type Props = {
  title: string;
  data: Record<string, unknown>[];
  actualKey: string;
  targetKey: string;
  actualLabel: string;
  unit?: string;
  headerAction?: React.ReactNode;
};

export function BarChartCard({
  title,
  data,
  actualKey,
  targetKey,
  actualLabel,
  unit = "kg",
  headerAction,
}: Props) {
  return (
    <ChartCard title={title} action={headerAction}>
      <div className="h-40 md:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={4}
            margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
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
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return String(v);
              }}
              width={45}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(v: unknown) =>
                `${Number(v).toLocaleString("id-ID")} ${unit}`
              }
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 11,
              }}
            />
            <Bar
              dataKey={actualKey}
              name={actualLabel}
              fill="var(--chart-1)"
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey={targetKey}
              name="Target"
              fill="var(--chart-2)"
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: actualLabel, color: "var(--chart-1)" },
          { label: "Target", color: "var(--chart-2)" },
        ]}
      />
    </ChartCard>
  );
}
