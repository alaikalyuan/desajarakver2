import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapRowToDirectoryOffer,
  mapRowToDirectoryRequest,
  type DirectoryOfferItem,
  type DirectoryRequestItem,
} from "@/lib/listings";

/** Listings per "Muat lagi" page in the directory. */
export const DIRECTORY_PAGE_SIZE = 20;

const BASE_COLS = "id, kind, status, reference, format, data, photo_path, created_at";

export interface DirectoryPage<T> {
  items: T[];
  total: number;
}

/**
 * One page of published listings of one kind, newest first. Signed-in users
 * also get the contacts the database lets them read.
 */
export async function fetchDirectoryPage(
  supabase: SupabaseClient,
  kind: "request",
  offset: number,
  limit: number,
  signedIn: boolean
): Promise<DirectoryPage<DirectoryRequestItem>>;
export async function fetchDirectoryPage(
  supabase: SupabaseClient,
  kind: "offer",
  offset: number,
  limit: number,
  signedIn: boolean
): Promise<DirectoryPage<DirectoryOfferItem>>;
export async function fetchDirectoryPage(
  supabase: SupabaseClient,
  kind: "request" | "offer",
  offset: number,
  limit: number,
  signedIn: boolean
): Promise<DirectoryPage<DirectoryRequestItem | DirectoryOfferItem>> {
  const cols = signedIn ? `${BASE_COLS}, listing_contacts(contact)` : BASE_COLS;
  const { data, count, error } = await supabase
    .from("listings")
    .select(cols, { count: "exact" })
    .eq("kind", kind)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error("Daftar gagal dimuat. Periksa koneksi lalu coba lagi.");

  const rows = (data || []) as unknown as Record<string, unknown>[];
  return {
    items: rows.map((r) =>
      kind === "request" ? mapRowToDirectoryRequest(r) : mapRowToDirectoryOffer(r)
    ),
    total: count ?? rows.length,
  };
}
