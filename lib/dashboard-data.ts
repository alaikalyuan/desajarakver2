import type { SupabaseClient } from "@supabase/supabase-js";
import type { FormEntry } from "@/lib/forms/form-flow";
import {
  getContacts,
  getMyListingInterests,
  rowToFormEntry,
  type ListingInterest,
} from "@/lib/listings";

/**
 * Data for the two role dashboards. The same functions run on the server
 * (first paint) and in the browser (refresh after an action), so they take
 * the Supabase client as an argument.
 */

const LISTING_COLS =
  "id, owner_id, kind, status, reference, request_id, format, data, photo_path, created_at, updated_at, listing_contacts(contact)";

export interface MitraDashboardData {
  requests: FormEntry[];
  offers: FormEntry[];
  interests: ListingInterest[];
}

export async function fetchMitraDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<MitraDashboardData> {
  const [{ data: reqRows }, interests] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_COLS)
      .eq("owner_id", userId)
      .eq("kind", "request")
      .eq("format", "form")
      .order("updated_at", { ascending: false }),
    getMyListingInterests(supabase),
  ]);

  const requests = (reqRows || []).map((r) =>
    rowToFormEntry(r as Record<string, unknown>)
  );

  // Offers sent to this mitra's own requests (published or closed, not drafts).
  const requestIds = requests.filter((r) => r.status !== "draft").map((r) => r.id);
  let offers: FormEntry[] = [];
  if (requestIds.length > 0) {
    const { data: offerRows } = await supabase
      .from("listings")
      .select(LISTING_COLS)
      .eq("kind", "offer")
      .in("status", ["sent", "accepted", "rejected", "completed"])
      .in("request_id", requestIds)
      .order("created_at", { ascending: false });
    offers = (offerRows || []).map((r) => rowToFormEntry(r as Record<string, unknown>));
  }

  return { requests, offers, interests };
}

export interface UsahaDashboardData {
  offers: FormEntry[];
  buyerContacts: Record<string, Record<string, string>>;
  interests: ListingInterest[];
}

export async function fetchUsahaDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<UsahaDashboardData> {
  const [{ data: offerRows }, interests] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_COLS)
      .eq("owner_id", userId)
      .eq("kind", "offer")
      .eq("format", "form")
      .order("updated_at", { ascending: false }),
    getMyListingInterests(supabase),
  ]);

  const offers = (offerRows || []).map((r) =>
    rowToFormEntry(r as Record<string, unknown>)
  );

  // Buyer contacts become readable once an offer to their request is accepted.
  const acceptedRequestIds = offers
    .filter((o) => (o.status === "accepted" || o.status === "completed") && o.requestId)
    .map((o) => o.requestId as string);
  const buyerContacts = await getContacts(acceptedRequestIds, supabase);

  return { offers, buyerContacts, interests };
}
