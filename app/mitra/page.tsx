import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchMitraDashboard } from "@/lib/dashboard-data";
import {
  createServerSupabaseClient,
  getCurrentUserProfile,
} from "@/lib/supabase/server";
import { MitraDashboard } from "./mitra-dashboard";

export const metadata: Metadata = {
  title: "Halaman Mitra",
};

export default async function MitraPage() {
  const user = await getCurrentUserProfile();
  if (!user) redirect("/masuk?next=/mitra");

  const supabase = await createServerSupabaseClient();
  const data = await fetchMitraDashboard(supabase, user.id);

  return (
    <MitraDashboard
      userId={user.id}
      userName={user.businessName || user.fullName || "Mitra"}
      initialData={data}
    />
  );
}
