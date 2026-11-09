import { Navbar } from "@/components/navbar";
import { DirektoriClient } from "@/components/direktori/direktori-client";
import {
  mapRowToDirectoryOffer,
  mapRowToDirectoryRequest,
  type DirectoryOfferItem,
  type DirectoryRequestItem,
} from "@/lib/listings";
import {
  createServerSupabaseClient,
  getCurrentUserProfile,
} from "@/lib/supabase/server";
import "./direktori-usaha.css";

export default async function DirektoriPage() {
  const [user, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createServerSupabaseClient(),
  ]);

  const selectCols = user
    ? "id, kind, status, reference, format, data, photo_path, created_at, listing_contacts(contact)"
    : "id, kind, status, reference, format, data, photo_path, created_at";

  const { data: rows } = await supabase
    .from("listings")
    .select(selectCols)
    .in("status", ["sent", "published"])
    .order("created_at", { ascending: true });

  const requests: DirectoryRequestItem[] = [];
  const offers: DirectoryOfferItem[] = [];

  (rows || []).forEach((row) => {
    const r = row as unknown as Record<string, unknown>;
    if (r.kind === "request") {
      requests.push(mapRowToDirectoryRequest(r));
    } else if (r.kind === "offer") {
      offers.push(mapRowToDirectoryOffer(r));
    }
  });

  return (
    <>
      <Navbar initialUser={user} />
      <DirektoriClient
        initialRequests={requests}
        initialOffers={offers}
        initialUser={user}
      />
    </>
  );
}
