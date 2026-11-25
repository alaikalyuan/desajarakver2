import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchUsahaDashboard } from "@/lib/dashboard-data";
import {
  createServerSupabaseClient,
  getCurrentUserProfile,
} from "@/lib/supabase/server";
import { UsahaDashboard } from "./usaha-dashboard";

export const metadata: Metadata = {
  title: "Halaman Pelaku Usaha",
};

export default async function UsahaPage() {
  const user = await getCurrentUserProfile();
  if (!user) redirect("/masuk?next=/usaha");

  const supabase = await createServerSupabaseClient();
  const data = await fetchUsahaDashboard(supabase, user.id);

  return (
    <UsahaDashboard
      userId={user.id}
      userName={user.businessName || user.fullName || "Pelaku Usaha"}
      userRole={user.role}
      initialData={data}
    />
  );
}
