import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function ChartCard({ title, badge, action, children }: Props) {
  return (
    <section className="flex flex-col rounded-xl border bg-card p-4 shadow-xs">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {badge ? (
            <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground">
              {badge}
              <ChevronDown className="size-3" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="mt-2 flex items-center justify-center gap-5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
