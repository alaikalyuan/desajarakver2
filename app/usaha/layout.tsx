import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function UsahaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/masuk?next=/usaha");
  }

  if (user.role === "mitra") {
    redirect("/mitra");
  }

  return <>{children}</>;
}
