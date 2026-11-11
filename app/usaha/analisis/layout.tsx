import type { Metadata } from "next";

export const metadata: Metadata = {
  // Re-state the template: a plain title here would drop it for the sub-pages.
  title: { default: "Analisis Desa", template: "%s | JARAK CONNECT" },
};

export default function AnalisisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
