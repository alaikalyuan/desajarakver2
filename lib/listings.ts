import { parseIndonesianDate } from "@/lib/format";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  type EntryStatus,
  type FormData,
  type FormEntry,
  type FormKind,
  type TargetRequestSummary,
  isEditableStatus,
} from "@/lib/forms/form-flow";

const PHOTO_BUCKET = "listing-photos";
const CONTACT_KEYS: (keyof FormData)[] = [
  "contactName",
  "position",
  "phone",
  "email",
];

export interface DirectoryRequestItem {
  id: string;
  title: string;
  company: string;
  category: string;
  collaborationType: string;
  summary: string;
  volume: string;
  submissionDate: string;
  frequency: string;
  status: string;
  deadline: string;
  /** The deadline as YYYY-MM-DD when it is a full date, else null. */
  deadlineDate: string | null;
  image: string;
  location: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  unit: string;
  partnerAddress: string;
  specs: string[];
  terms: string[];
  contact: {
    pic: string;
    role: string;
    phone: string;
    whatsapp: string;
    email: string;
    availability: string;
  };
}

export interface DirectoryOfferFarmer {
  name: string;
  quantity: string;
  unit: string;
  price: string;
  phone?: string;
}

export interface DirectoryOfferItem {
  id: string;
  title: string;
  business: string;
  category: string;
  businessType: string;
  providerType: string;
  summary: string;
  note: string;
  capacity: string;
  priceLabel: string;
  harvestPeriod: string;
  estimatedAvailability: string;
  alwaysAvailable: boolean;
  availabilityKey: string;
  availability: string;
  offerDate: string;
  coverageKey: string;
  status: string;
  image: string;
  location: string;
  farmers: DirectoryOfferFarmer[];
  specs: string[];
  terms: string[];
  contact: {
    pic: string;
    role: string;
    phone: string;
    email: string;
    responseTime: string;
  };
}

const DEFAULT_REQUEST_IMAGE = "/assets/Images/Gambar Padi Beras Desa Jarak.jpg";
const DEFAULT_OFFER_IMAGE = "/assets/Images/Gambar Jagung Desa Jarak.jpg";

export function normalizeAssetUrl(rawUrl?: string | null, fallback = DEFAULT_REQUEST_IMAGE): string {
  if (!rawUrl) return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("../assets/")) {
    return trimmed.replace(/^\.\.\/assets\//, "/assets/");
  }
  if (trimmed.startsWith("assets/")) {
    return `/${trimmed}`;
  }
  return trimmed;
}

/**
 * A smaller copy of a listing photo for cards, made by Supabase image
 * transformation. Anything that is not a listing-photos URL is returned as is.
 */
export function thumbnailUrl(url: string, width = 480): string {
  const marker = "/storage/v1/object/public/";
  if (!url || !url.includes(marker)) return url;
  return `${url.replace(marker, "/storage/v1/render/image/public/")}?width=${width}&quality=70`;
}

export function getStoragePhotoUrl(photoPath?: string | null): string {
  if (!photoPath) return "";
  if (/^(https?:|data:|\/)/i.test(photoPath)) return photoPath;
  const supabase = createClient();
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath);
  return data?.publicUrl || "";
}

function extractContactFromRow(row: Record<string, unknown>): Record<string, string> {
  const rel = row?.listing_contacts;
  if (Array.isArray(rel)) {
    return (rel[0]?.contact as Record<string, string>) || {};
  }
  if (rel && typeof rel === "object" && "contact" in rel) {
    return ((rel as { contact?: Record<string, string> }).contact) || {};
  }
  return {};
}

function mapProductToCategory(productType = ""): string {
  const lower = productType.toLowerCase();
  if (lower.includes("telur") || lower.includes("unggas") || lower.includes("susu") || lower.includes("kambing") || lower.includes("sapi")) {
    return "Peternakan";
  }
  if (lower.includes("ikan") || lower.includes("lele") || lower.includes("nila")) {
    return "Perikanan";
  }
  if (lower.includes("olahan") || lower.includes("kerajinan") || lower.includes("keripik")) {
    return "Olahan Pangan";
  }
  if (lower.includes("pisang") || lower.includes("buah") || lower.includes("cengkeh") || lower.includes("kopi") || lower.includes("manggis") || lower.includes("durian") || lower.includes("alpukat")) {
    return "Perkebunan";
  }
  return "Pertanian";
}

function mapFrequencyFilter(freq = ""): string {
  const lower = freq.toLowerCase();
  if (lower.includes("sekali")) return "Sekali";
  if (lower.includes("musim")) return "Musiman";
  return "Rutin";
}

function mapCollaborationType(scheme = ""): string {
  const lower = scheme.toLowerCase();
  if (lower.includes("putus") || lower.includes("sekali") || lower.includes("konsinyasi")) {
    return "Non-Kontrak";
  }
  return "Kontrak";
}

function mapBusinessType(ownerType = ""): string {
  const lower = ownerType.toLowerCase();
  if (lower.includes("kelompok") || lower.includes("gapoktan")) return "Kelompok Tani";
  if (lower.includes("bumdes") || lower.includes("koperasi") || lower.includes("kdmp")) return "BUMDes/Koperasi";
  if (lower.includes("umkm")) return "UMKM";
  return "Usaha Mandiri";
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function quantityLabel(quantity: unknown, unit: unknown): string {
  const q = str(quantity);
  if (!q) return "-";
  const n = Number(q);
  const formatted = Number.isFinite(n) ? n.toLocaleString("id-ID") : q;
  return [formatted, str(unit)].filter(Boolean).join(" ");
}

const COVERAGE_LABELS: Record<string, string> = {
  jawa_timur: "Jawa Timur",
  pulau_jawa: "Pulau Jawa",
  nasional: "Nasional",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  stok: "Stok tersedia",
  po: "Pre-Order (PO)",
  musiman: "Musiman",
};

function formatIndonesianDate(isoOrLabel?: unknown): string {
  const s = str(isoOrLabel).trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

// Seed rows (format "directory") keep the shape of the old hard-coded arrays:
// requests are { partner, request, status, fulfilledQuantity, image },
// offers are { product, business, quantity, unit, priceLabel, availability, coverage, farmers, ... }.
function mapDirectorySeedRequest(
  row: Record<string, unknown>,
  rawData: Record<string, unknown>,
  contactObj: Record<string, unknown>,
  photoUrl: string
): DirectoryRequestItem {
  const partner = (rawData.partner as Record<string, unknown>) || {};
  const req = (rawData.request as Record<string, unknown>) || {};
  const contact = ((contactObj.partner as Record<string, unknown>) || contactObj) as Record<string, unknown>;
  const product = str(req.product) || "Komoditas Desa";

  const requested = Number(req.quantity) || 0;
  const fulfilled = Math.min(requested, Math.max(0, Number(rawData.fulfilledQuantity) || 0));
  const percent = requested > 0 ? Math.round((fulfilled / requested) * 100) : 0;

  const specs = [
    req.variety ? `Varietas: ${str(req.variety)}` : "",
    req.quality ? `Kualitas: ${str(req.quality)}` : "",
    req.packaging ? `Kemasan: ${str(req.packaging)}` : "",
    requested > 0
      ? `Terpenuhi: ${quantityLabel(fulfilled, req.unit)} dari ${quantityLabel(requested, req.unit)} (${percent}%)`
      : "",
  ].filter(Boolean);

  const terms = [
    partner.type ? `Jenis mitra: ${str(partner.type)}` : "",
    partner.address ? `Alamat mitra: ${str(partner.address)}` : "",
    req.submissionDate ? `Diajukan: ${str(req.submissionDate)}` : "",
  ].filter(Boolean);

  return {
    id: String(row.id),
    title: product,
    company: str(partner.name) || "Mitra Pembeli",
    category: mapProductToCategory(product),
    collaborationType: "Kontrak",
    summary: str(req.note),
    volume: quantityLabel(req.quantity, req.unit),
    submissionDate: str(req.submissionDate) || formatIndonesianDate(row.created_at),
    frequency: "Sesuai jadwal mitra",
    status: str(rawData.status) || "Baru",
    deadline: str(req.requiredDate) || "-",
    deadlineDate: parseIndonesianDate(str(req.requiredDate)),
    image: photoUrl || normalizeAssetUrl(str(rawData.image), DEFAULT_REQUEST_IMAGE),
    location: str(req.deliveryLocation) || str(partner.address) || "Jawa Timur",
    requestedQuantity: requested,
    fulfilledQuantity: fulfilled,
    unit: str(req.unit) || "kg",
    partnerAddress: str(partner.address) || str(req.deliveryLocation) || "-",
    specs: specs.length > 0 ? specs : ["Mutu sesuai standar pasar"],
    terms: terms.length > 0 ? terms : ["Skema kerja sama sesuai kesepakatan"],
    contact: {
      pic: str(contact.pic),
      role: str(contact.position) || "Penanggung Jawab",
      phone: str(contact.phone) || str(contact.whatsapp),
      whatsapp: str(contact.whatsapp) || str(contact.phone),
      email: str(contact.email),
      availability: contact.phone ? `Telepon kantor: ${str(contact.phone)}` : "Senin - Jumat, 08.00 - 16.00 WIB",
    },
  };
}

function mapDirectorySeedOffer(
  row: Record<string, unknown>,
  rawData: Record<string, unknown>,
  contactObj: Record<string, unknown>,
  photoUrl: string
): DirectoryOfferItem {
  const availabilityKey = str(rawData.availability) || "stok";
  const statusStr = str(rawData.status) || "Aktif";
  const finished = /selesai/i.test(statusStr);
  const rawFarmers = Array.isArray(rawData.farmers)
    ? (rawData.farmers as Record<string, unknown>[])
    : [];
  const farmerPhones = Array.isArray(contactObj.farmerPhones)
    ? (contactObj.farmerPhones as unknown[]).map(str)
    : [];

  const farmers: DirectoryOfferFarmer[] = rawFarmers.map((f, idx) => ({
    name: str(f.name) || "Nama belum dicantumkan",
    quantity: str(f.quantity),
    unit: str(f.unit) || str(rawData.unit),
    price: str(f.price),
    phone: farmerPhones[idx] || str(f.phone) || "",
  }));

  const specs = [
    rawData.priceLabel ? `Kisaran harga: ${str(rawData.priceLabel)}` : "",
    rawData.note ? str(rawData.note) : "",
    ...rawFarmers.map(
      (f) =>
        `${str(f.name)}: ${quantityLabel(f.quantity, f.unit)}${f.price ? ` @ ${str(f.price)}` : ""}`
    ),
  ].filter(Boolean);

  const terms = [
    `Jangkauan: ${COVERAGE_LABELS[str(rawData.coverage)] || "Jawa Timur"}`,
    rawData.offerDate ? `Ditawarkan: ${str(rawData.offerDate)}` : "",
  ].filter(Boolean);

  const rawImage = str(rawData.image).trim();
  const resolvedImage =
    photoUrl || (rawImage ? normalizeAssetUrl(rawImage, DEFAULT_OFFER_IMAGE) : "");

  return {
    id: String(row.id),
    title: str(rawData.product) || "Penawaran Komoditas Desa",
    business: str(rawData.business) || "Pelaku Usaha Desa Jarak",
    category: str(rawData.category) || "Komoditas",
    businessType: mapBusinessType(str(rawData.providerType)),
    providerType: str(rawData.providerType) || "kelompok_tani",
    summary: str(rawData.description),
    note: str(rawData.note) || str(rawData.description) || "Belum ada catatan tambahan.",
    capacity: quantityLabel(rawData.quantity, rawData.unit),
    priceLabel: str(rawData.priceLabel) || "Harga belum dicantumkan",
    harvestPeriod: `${AVAILABILITY_LABELS[availabilityKey] || "Stok tersedia"} · ${
      str(rawData.estimatedAvailability) || "Sesuai kesepakatan"
    }`,
    estimatedAvailability: str(rawData.estimatedAvailability) || "Sesuai kesepakatan",
    alwaysAvailable: Boolean(rawData.alwaysAvailable),
    availabilityKey,
    availability: finished ? "Selesai" : AVAILABILITY_LABELS[availabilityKey] || "Stok tersedia",
    offerDate: str(rawData.offerDate) || formatIndonesianDate(row.created_at),
    coverageKey: str(rawData.coverage) || "jawa_timur",
    status: finished ? "Selesai" : "Aktif",
    image: resolvedImage,
    location: str(rawData.location) || "Desa Jarak",
    farmers,
    specs: specs.length > 0 ? specs : ["Mutu sesuai standar pasar"],
    terms,
    contact: {
      pic: str(contactObj.pic),
      role: "",
      phone: str(contactObj.phone),
      email: str(contactObj.email),
      responseTime: farmerPhones.filter(Boolean).length
        ? `Kontak petani: ${farmerPhones.filter(Boolean).join(", ")}`
        : "Aktif melalui WhatsApp / Telepon",
    },
  };
}

export function mapRowToDirectoryRequest(row: Record<string, unknown>): DirectoryRequestItem {
  const rawData = (row.data as Record<string, unknown>) || {};
  const contactObj = extractContactFromRow(row);
  const photoUrl = row.photo_path ? getStoragePhotoUrl(String(row.photo_path)) : "";

  if (row.format === "directory") {
    return mapDirectorySeedRequest(row, rawData, contactObj, photoUrl);
  }

  // format === "form"
  const productType = String(rawData.productType || "Komoditas Desa");
  const variety = String(rawData.variety || "");
  const quantity = String(rawData.quantity || "");
  const unit = String(rawData.unit || "kg");
  const grade = String(rawData.grade || "Sortir Standar Pasar");
  const priceNote = String(rawData.priceNote || "");
  const partnershipScheme = String(rawData.partnershipScheme || "Kontrak Pasok Berkala");
  const paymentMethod = String(rawData.paymentMethod || "");
  const deliveryType = String(rawData.deliveryType || "");
  const duration = String(rawData.duration || "");
  const additionalNeeds = String(rawData.additionalNeeds || "");

  const specs = [
    variety ? `Varietas / spesifikasi: ${variety}` : "",
    grade ? `Standar mutu: ${grade}` : "",
    priceNote ? `Acuan harga: ${priceNote}` : "",
  ].filter(Boolean);

  const terms = [
    partnershipScheme ? `Skema: ${partnershipScheme}` : "",
    paymentMethod ? `Pembayaran: ${paymentMethod}` : "",
    deliveryType ? `Penyerahan: ${deliveryType}` : "",
    duration ? `Durasi: ${duration}` : "",
    additionalNeeds ? `Catatan: ${additionalNeeds}` : "",
  ].filter(Boolean);

  const reqNum = Number(quantity) || 0;

  return {
    id: String(row.id),
    title: variety || productType,
    company: String(rawData.ownerName || "Mitra Pembeli"),
    category: mapProductToCategory(productType),
    collaborationType: mapCollaborationType(partnershipScheme),
    summary: String(rawData.description || additionalNeeds || `Membutuhkan pasokan ${productType} (${variety || grade}).`),
    volume: quantity ? quantityLabel(quantity, unit) : "-",
    submissionDate: formatIndonesianDate(row.created_at),
    frequency: mapFrequencyFilter(String(rawData.frequency || "")),
    status: "Baru",
    deadline: String(rawData.neededDate || "Fleksibel"),
    deadlineDate: parseIndonesianDate(String(rawData.neededDate || "")),
    image:
      photoUrl ||
      normalizeAssetUrl(String(rawData.photoPreview || ""), DEFAULT_REQUEST_IMAGE),
    location: String(rawData.location || "Kediri"),
    requestedQuantity: reqNum,
    fulfilledQuantity: 0,
    unit,
    partnerAddress: String(rawData.location || "Kediri"),
    specs: specs.length > 0 ? specs : ["Mutu sesuai standar pasar"],
    terms: terms.length > 0 ? terms : ["Skema kerja sama sesuai kesepakatan"],
    contact: {
      pic: String(contactObj.contactName || contactObj.pic || ""),
      role: String(contactObj.position || contactObj.role || "Penanggung Jawab"),
      phone: String(contactObj.phone || ""),
      whatsapp: String(contactObj.phone || ""),
      email: String(contactObj.email || ""),
      availability: "Jam kerja operasional",
    },
  };
}

export function mapRowToDirectoryOffer(row: Record<string, unknown>): DirectoryOfferItem {
  const rawData = (row.data as Record<string, unknown>) || {};
  const contactObj = extractContactFromRow(row);
  const photoUrl = row.photo_path ? getStoragePhotoUrl(String(row.photo_path)) : "";

  if (row.format === "directory") {
    return mapDirectorySeedOffer(row, rawData, contactObj, photoUrl);
  }

  // format === "form"
  const productType = String(rawData.productType || "Komoditas Desa");
  const variety = String(rawData.variety || "");
  const quantity = String(rawData.quantity || "");
  const unit = String(rawData.unit || "kg");
  const grade = String(rawData.grade || "Sortir Standar Pasar");
  const priceNote = String(rawData.priceNote || "");
  const partnershipScheme = String(rawData.partnershipScheme || "Kontrak Pasok Berkala");
  const paymentMethod = String(rawData.paymentMethod || "");
  const deliveryType = String(rawData.deliveryType || "");
  const duration = String(rawData.duration || "");
  const additionalNeeds = String(rawData.additionalNeeds || "");

  const specs = [
    variety ? `Varietas / bentuk produk: ${variety}` : "",
    grade ? `Kualitas sortir: ${grade}` : "",
    priceNote ? `Acuan harga: ${priceNote}` : "",
  ].filter(Boolean);

  const terms = [
    partnershipScheme ? `Skema: ${partnershipScheme}` : "",
    paymentMethod ? `Pembayaran: ${paymentMethod}` : "",
    deliveryType ? `Penyerahan: ${deliveryType}` : "",
    duration ? `Komitmen pasok: ${duration}` : "",
    additionalNeeds ? `Catatan: ${additionalNeeds}` : "",
  ].filter(Boolean);

  return {
    id: String(row.id),
    title: variety || productType,
    business: String(rawData.ownerName || "Pelaku Usaha Desa Jarak"),
    category: mapProductToCategory(productType),
    businessType: mapBusinessType(String(rawData.ownerType || "")),
    providerType: String(rawData.ownerType || "usaha"),
    summary: String(rawData.description || `Pasokan ${productType} dari Desa Jarak.`),
    note: String(rawData.description || additionalNeeds || "Belum ada catatan tambahan."),
    capacity: quantity ? quantityLabel(quantity, unit) : "-",
    priceLabel: priceNote || "Sesuai kesepakatan",
    harvestPeriod: String(rawData.neededDate || rawData.frequency || "Tersedia berkala"),
    estimatedAvailability: String(rawData.neededDate || "Sesuai ketersediaan"),
    alwaysAvailable: false,
    availabilityKey: "stok",
    availability: "Tersedia",
    offerDate: formatIndonesianDate(row.created_at),
    coverageKey: "jawa_timur",
    status: "Aktif",
    image:
      photoUrl ||
      normalizeAssetUrl(String(rawData.photoPreview || ""), DEFAULT_OFFER_IMAGE),
    location: String(rawData.location || "Desa Jarak, Plosoklaten"),
    farmers: [],
    specs: specs.length > 0 ? specs : ["Mutu sesuai standar pasar"],
    terms: terms.length > 0 ? terms : ["Siap bekerja sama dengan mitra"],
    contact: {
      pic: String(contactObj.contactName || contactObj.pic || ""),
      role: String(contactObj.position || contactObj.role || ""),
      phone: String(contactObj.phone || ""),
      email: String(contactObj.email || ""),
      responseTime: "Aktif melalui WhatsApp / Telepon",
    },
  };
}

export function rowToFormEntry(row: Record<string, unknown>): FormEntry {
  const rawData = { ...((row.data as Record<string, unknown>) || {}) };
  const targetRequest = (rawData.targetRequest as TargetRequestSummary | null) || null;
  delete rawData.targetRequest;

  const contact = extractContactFromRow(row);
  const photoUrl = row.photo_path
    ? getStoragePhotoUrl(String(row.photo_path))
    : String(rawData.photoPreview || "");

  const mergedData: FormData = {
    ownerType: String(rawData.ownerType || ""),
    ownerName: String(rawData.ownerName || rawData.company || rawData.business || ""),
    contactName: String(contact.contactName || contact.pic || rawData.contactName || ""),
    position: String(contact.position || contact.role || rawData.position || ""),
    phone: String(contact.phone || rawData.phone || ""),
    email: String(contact.email || rawData.email || ""),
    location: String(rawData.location || ""),
    productType: String(rawData.productType || rawData.category || "Beras & Gabah"),
    variety: String(rawData.variety || rawData.title || ""),
    grade: String(rawData.grade || "Sortir Standar Pasar"),
    quantity: String(rawData.quantity || rawData.volume || rawData.capacity || ""),
    unit: String(rawData.unit || "ton"),
    frequency: String(rawData.frequency || rawData.harvestPeriod || "Mingguan"),
    neededDate: String(rawData.neededDate || rawData.deadline || ""),
    priceNote: String(rawData.priceNote || ""),
    partnershipScheme: String(rawData.partnershipScheme || "Kontrak Pasok Berkala"),
    paymentMethod: String(rawData.paymentMethod || "Transfer setelah barang diterima"),
    deliveryType: String(rawData.deliveryType || "Diambil di titik kumpul desa"),
    duration: String(rawData.duration || "1 musim panen (3 bulan)"),
    description: String(rawData.description || rawData.summary || ""),
    additionalNeeds: String(rawData.additionalNeeds || ""),
    photoName: String(rawData.photoName || ""),
    photoPreview: photoUrl,
  };

  return {
    id: String(row.id),
    kind: (row.kind as FormKind) || "request",
    status: (row.status as EntryStatus) || "sent",
    reference: String(row.reference || ""),
    requestId: row.request_id ? String(row.request_id) : null,
    targetRequest,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
    data: mergedData,
  };
}

export async function readFormEntries(): Promise<FormEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, owner_id, kind, status, reference, request_id, format, data, photo_path, created_at, updated_at, listing_contacts(contact)"
    )
    .eq("format", "form")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => rowToFormEntry(row as Record<string, unknown>));
}

export async function getTargetRequestById(
  requestId: string
): Promise<TargetRequestSummary | null> {
  if (!requestId) return null;
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("listings")
    .select("id, kind, status, reference, format, data")
    .eq("id", requestId)
    .single();

  // Only an open request can receive offers; the database enforces the same.
  if (error || !row || row.kind !== "request" || row.status !== "published") {
    return null;
  }

  if (row.format === "form") {
    const entry = rowToFormEntry(row as Record<string, unknown>);
    return {
      id: entry.id,
      reference: entry.reference || "PRM-JRK",
      ownerName: entry.data.ownerName || "",
      ownerType: entry.data.ownerType || "",
      productType: entry.data.productType || "",
      variety: entry.data.variety || "",
      quantity: entry.data.quantity || "",
      unit: entry.data.unit || "",
      frequency: entry.data.frequency || "",
      neededDate: entry.data.neededDate || "",
      partnershipScheme:
        entry.data.partnershipScheme || "",
      deliveryType:
        entry.data.deliveryType || "",
      priceNote: entry.data.priceNote || "",
      location: entry.data.location || "",
      description: entry.data.description || "",
    };
  }

  // Convert seed directory request row into TargetRequestSummary
  const raw = (row.data as Record<string, unknown>) || {};
  const partner = (raw.partner as Record<string, unknown>) || {};
  const req = (raw.request as Record<string, unknown>) || {};

  return {
    id: String(row.id),
    reference: String(row.reference || `PRM-${String(row.id).toUpperCase().slice(0, 8)}`),
    ownerName: str(partner.name),
    ownerType: str(partner.type),
    productType: str(req.product),
    variety: str(req.variety) || str(req.product),
    quantity: str(req.quantity),
    unit: str(req.unit),
    frequency: "",
    neededDate: str(req.requiredDate),
    partnershipScheme: "",
    deliveryType: "",
    priceNote: "",
    location: str(req.deliveryLocation),
    description: str(req.note),
  };
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
    dataUrl || ""
  );
  if (!match) return null;
  const mime = match[1];
  const bytes = atob(match[2]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }
  const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
  return { blob: new Blob([buffer], { type: mime }), ext };
}

async function uploadPhoto(
  userId: string,
  listingId: string,
  photoPreview: string
): Promise<string | null> {
  if (!photoPreview || !photoPreview.startsWith("data:image/")) {
    return null;
  }
  const parsed = dataUrlToBlob(photoPreview);
  if (!parsed) return null;

  const supabase = createClient();
  // Every upload gets a new name, so a cached copy of the old photo is never
  // shown for the new one. The old file is removed once the row points at
  // the new one.
  const path = `${userId}/${listingId}-${Date.now().toString(36)}.${parsed.ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, parsed.blob, { upsert: false, contentType: parsed.blob.type });

  if (error) {
    console.error("Unggah foto gagal:", error);
    return null;
  }
  return path;
}

/** Best effort: a file left behind is wasted space, never shown. */
async function removePhotos(paths: (string | null | undefined)[]) {
  const toRemove = paths.filter(
    (p): p is string => Boolean(p) && !/^(https?:|data:|\/)/i.test(String(p))
  );
  if (toRemove.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(toRemove);
  if (error) console.error("Foto lama gagal dihapus:", error);
}

function friendlyDbError(message: string, fallback: string): string {
  if (/listings_one_offer_per_request|duplicate key/i.test(message)) {
    return "Anda sudah pernah mengirim penawaran untuk permintaan ini.";
  }
  if (/row-level security|permission denied/i.test(message)) {
    return "Anda tidak memiliki izin untuk mengubah data ini.";
  }
  if (/failed to fetch|network/i.test(message)) {
    return "Koneksi internet terputus. Periksa sinyal lalu coba lagi.";
  }
  // Messages raised by our own database rules are already in Indonesian.
  return message || fallback;
}

/**
 * The seller's own non-draft offer for a request, if any. Used to stop a
 * second offer before the seller starts typing (2.10).
 */
export async function findMyOfferForRequest(
  requestId: string
): Promise<{ id: string; status: string; reference: string } | null> {
  if (!requestId) return null;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from("listings")
    .select("id, status, reference")
    .eq("owner_id", session.user.id)
    .eq("kind", "offer")
    .eq("request_id", requestId)
    .neq("status", "draft")
    .limit(1)
    .maybeSingle();
  return data
    ? { id: String(data.id), status: String(data.status), reference: String(data.reference || "") }
    : null;
}

export async function saveFormEntry(entry: FormEntry): Promise<FormEntry> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Silakan masuk terlebih dahulu untuk menyimpan formulir.");
  }

  const label = entry.kind === "request" ? "Permintaan" : "Penawaran";

  const { data: existing } = await supabase
    .from("listings")
    .select("status, photo_path")
    .eq("id", entry.id)
    .maybeSingle();

  const existingStatus = existing?.status as string | undefined;
  const oldPhotoPath = (existing?.photo_path as string | null) ?? null;

  // A sent offer (or a closed or decided listing) keeps its content. Saving it
  // again with the same status is the retry after the contact or photo
  // failed: skip the listing row and finish those steps.
  const isRetryOfFinal =
    existingStatus !== undefined &&
    !isEditableStatus(existingStatus) &&
    existingStatus === entry.status;

  if (existingStatus && !isEditableStatus(existingStatus) && !isRetryOfFinal) {
    throw new Error(
      `${label} yang sudah dikirim bersifat final dan tidak dapat diubah.`
    );
  }

  const requestId = entry.requestId || entry.targetRequest?.id || null;

  if (!isRetryOfFinal && entry.kind === "offer" && entry.status !== "draft" && requestId) {
    const duplicate = await findMyOfferForRequest(requestId);
    if (duplicate && duplicate.id !== entry.id) {
      throw new Error("Anda sudah pernah mengirim penawaran untuk permintaan ini.");
    }
  }

  const publicData: Record<string, unknown> = { ...(entry.data || {}) };
  const contactData: Record<string, string> = {};

  CONTACT_KEYS.forEach((key) => {
    if (publicData[key] !== undefined) {
      contactData[key] = String(publicData[key] || "");
      delete publicData[key];
    }
  });

  // The photo lives in storage; only its path is stored on the row.
  delete publicData.photoPreview;
  delete publicData.status;

  if (entry.targetRequest) {
    publicData.targetRequest = entry.targetRequest;
  }

  if (!isRetryOfFinal) {
    const payload: Record<string, unknown> = {
      id: entry.id,
      owner_id: session.user.id,
      kind: entry.kind,
      status: entry.status,
      reference: entry.reference,
      request_id: requestId,
      format: "form",
      data: publicData,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("listings")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(
        friendlyDbError(upsertError.message, `Gagal menyimpan ${label.toLowerCase()}.`)
      );
    }
  }

  // Upload only after the row exists, so a failed save leaves no orphan file.
  let photoPath = oldPhotoPath;
  let photoFailed = false;
  if (entry.data?.photoPreview?.startsWith("data:image/")) {
    const uploaded = await uploadPhoto(session.user.id, entry.id, entry.data.photoPreview);
    if (!uploaded) {
      photoFailed = true;
    } else {
      const { error: photoError } = await supabase
        .from("listings")
        .update({ photo_path: uploaded })
        .eq("id", entry.id);
      if (photoError) {
        photoFailed = true;
        await removePhotos([uploaded]);
      } else {
        photoPath = uploaded;
        if (oldPhotoPath && oldPhotoPath !== uploaded) {
          await removePhotos([oldPhotoPath]);
        }
      }
    }
  }

  let contactFailed = false;
  if (Object.keys(contactData).length > 0) {
    const { error: contactError } = await supabase
      .from("listing_contacts")
      .upsert(
        { listing_id: entry.id, contact: contactData },
        { onConflict: "listing_id" }
      );
    if (contactError) {
      console.error("Kontak gagal disimpan:", contactError);
      contactFailed = true;
    }
  }

  if (photoFailed || contactFailed) {
    const what = [photoFailed && "foto", contactFailed && "kontak"]
      .filter(Boolean)
      .join(" dan ");
    throw new Error(
      `${label} tersimpan, tetapi ${what} gagal disimpan. Tekan tombol kirim sekali lagi untuk mencoba ulang.`
    );
  }

  return {
    ...entry,
    requestId,
    data: {
      ...entry.data,
      photoPreview: photoPath ? getStoragePhotoUrl(photoPath) : "",
    },
  };
}

/** Deletes a draft and its photo (2.5). Sent and published listings stay. */
export async function deleteDraft(listingId: string): Promise<void> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("listings")
    .select("status, photo_path")
    .eq("id", listingId)
    .maybeSingle();
  if (!row) throw new Error("Draf tidak ditemukan.");
  if (row.status !== "draft") throw new Error("Hanya draf yang dapat dihapus.");

  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) throw new Error(friendlyDbError(error.message, "Draf gagal dihapus."));
  await removePhotos([row.photo_path as string | null]);
}

async function callRpc<T>(fn: string, args: Record<string, unknown>, fallback: string): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendlyDbError(error.message, fallback));
  return data as T;
}

/** The buyer accepts or rejects an offer sent to one of their requests (2.7). */
export function respondToOffer(offerId: string, decision: "accepted" | "rejected") {
  return callRpc<string>(
    "respond_to_offer",
    { p_offer_id: offerId, p_decision: decision },
    "Tanggapan gagal disimpan."
  );
}

/** The owner closes a published request or directory offer (2.8). */
export function closeListing(listingId: string) {
  return callRpc<string>("close_listing", { p_listing_id: listingId }, "Gagal menutup listing.");
}

/**
 * Records "Nyatakan Minat" and returns the listing's contact JSON (2.9, D2).
 * The database limits this to 10 new listings per user per 24 hours.
 */
export function expressInterest(listingId: string) {
  return callRpc<Record<string, unknown>>(
    "express_interest",
    { p_listing_id: listingId },
    "Minat gagal dicatat."
  );
}

export interface ListingInterest {
  listingId: string;
  name: string;
  phone: string;
  createdAt: string;
}

/** Everyone who pressed "Nyatakan Minat" on the caller's listings. */
export async function getMyListingInterests(
  supabase: SupabaseClient = createClient()
): Promise<ListingInterest[]> {
  const { data, error } = await supabase.rpc("my_listing_interests");
  if (error || !Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    listingId: String(row.listing_id),
    name: String(row.business_name || row.full_name || "Pengguna"),
    phone: String(row.phone || ""),
    createdAt: String(row.created_at || ""),
  }));
}

/** Contacts the caller may read, keyed by listing id. */
export async function getContacts(
  listingIds: string[],
  supabase: SupabaseClient = createClient()
): Promise<Record<string, Record<string, string>>> {
  if (listingIds.length === 0) return {};
  const { data } = await supabase
    .from("listing_contacts")
    .select("listing_id, contact")
    .in("listing_id", listingIds);
  const out: Record<string, Record<string, string>> = {};
  (data || []).forEach((row) => {
    out[String(row.listing_id)] = (row.contact as Record<string, string>) || {};
  });
  return out;
}
