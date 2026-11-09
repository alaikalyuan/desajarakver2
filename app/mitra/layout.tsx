import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function MitraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/masuk?next=/mitra");
  }

  if (user.role !== "mitra") {
    redirect("/usaha");
  }

  return <>{children}</>;
}
