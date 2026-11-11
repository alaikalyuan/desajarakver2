import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { DirektoriClient } from "@/components/direktori/direktori-client";
import { DIRECTORY_PAGE_SIZE, fetchDirectoryPage } from "@/lib/directory-data";
import {
  createServerSupabaseClient,
  getCurrentUserProfile,
} from "@/lib/supabase/server";
import "./direktori-usaha.css";

export const metadata: Metadata = {
  title: "Direktori Usaha",
  description: "Hasil Desa Jarak yang dijual, dan permintaan dari pembeli.",
};

export default async function DirektoriPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, supabase, params] = await Promise.all([
    getCurrentUserProfile(),
    createServerSupabaseClient(),
    searchParams,
  ]);

  const signedIn = Boolean(user);
  const [requests, offers] = await Promise.all([
    fetchDirectoryPage(supabase, "request", 0, DIRECTORY_PAGE_SIZE, signedIn).catch(() => ({
      items: [],
      total: 0,
    })),
    fetchDirectoryPage(supabase, "offer", 0, DIRECTORY_PAGE_SIZE, signedIn).catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  return (
    <>
      <Navbar initialUser={user} />
      <DirektoriClient
        initialRequests={requests.items}
        requestTotal={requests.total}
        initialOffers={offers.items}
        offerTotal={offers.total}
        initialUser={user}
        initialTab={params.tab === "penawaran" ? "penawaran" : "permintaan"}
      />
    </>
  );
}
