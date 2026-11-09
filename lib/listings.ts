import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_TARGET_REQUEST,
  type EntryStatus,
  type FormData,
  type FormEntry,
  type FormKind,
  type TargetRequestSummary,
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
    priceLabel: str(rawData.priceLabel) || "Rp13.000 - Rp15.100",
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
      role: "Koordinator Pasokan",
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
      role: String(contactObj.position || contactObj.role || "Koordinator Pasokan"),
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

  if (error || !row) return null;

  if (row.format === "form") {
    const entry = rowToFormEntry(row as Record<string, unknown>);
    return {
      id: entry.id,
      reference: entry.reference || "PRM-JRK",
      ownerName: entry.data.ownerName || DEFAULT_TARGET_REQUEST.ownerName,
      ownerType: entry.data.ownerType || DEFAULT_TARGET_REQUEST.ownerType,
      productType: entry.data.productType || DEFAULT_TARGET_REQUEST.productType,
      variety: entry.data.variety || DEFAULT_TARGET_REQUEST.variety,
      quantity: entry.data.quantity || DEFAULT_TARGET_REQUEST.quantity,
      unit: entry.data.unit || DEFAULT_TARGET_REQUEST.unit,
      frequency: entry.data.frequency || DEFAULT_TARGET_REQUEST.frequency,
      neededDate: entry.data.neededDate || DEFAULT_TARGET_REQUEST.neededDate,
      partnershipScheme:
        entry.data.partnershipScheme ||
        DEFAULT_TARGET_REQUEST.partnershipScheme,
      deliveryType:
        entry.data.deliveryType || DEFAULT_TARGET_REQUEST.deliveryType,
      priceNote:
        entry.data.priceNote || "Menyesuaikan kesepakatan mutu & pengiriman",
      location: entry.data.location || DEFAULT_TARGET_REQUEST.location,
      description: entry.data.description || DEFAULT_TARGET_REQUEST.description,
    };
  }

  // Convert seed directory request row into TargetRequestSummary
  const raw = (row.data as Record<string, unknown>) || {};
  const partner = (raw.partner as Record<string, unknown>) || {};
  const req = (raw.request as Record<string, unknown>) || {};

  return {
    id: String(row.id),
    reference: String(row.reference || `PRM-${String(row.id).toUpperCase().slice(0, 8)}`),
    ownerName: str(partner.name) || "Mitra Pembeli",
    ownerType: str(partner.type) || "Mitra Pembeli",
    productType: str(req.product) || "Beras & Gabah",
    variety: str(req.variety) || str(req.product) || "Sesuai spesifikasi permintaan",
    quantity: str(req.quantity) || "1",
    unit: str(req.unit) || "kg",
    frequency: "Mingguan",
    neededDate: str(req.requiredDate) || "Segera",
    partnershipScheme: "Kontrak Pasok Berkala",
    deliveryType: "Diambil di titik kumpul desa",
    priceNote: "Sesuai kesepakatan mutu dan volume",
    location: str(req.deliveryLocation) || "Kediri",
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

async function uploadPhotoIfNeeded(
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
  const path = `${userId}/${listingId}.${parsed.ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, parsed.blob, {
      upsert: true,
      contentType: parsed.blob.type,
    });

  if (error) {
    console.warn("Unggah foto gagal:", error);
    return null;
  }
  return path;
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

  // Check if entry already exists and is sent (final)
  const { data: existingStatus } = await supabase
    .from("listings")
    .select("status")
    .eq("id", entry.id)
    .maybeSingle();

  if (
    existingStatus?.status === "sent" ||
    existingStatus?.status === "published"
  ) {
    throw new Error(
      `${label} yang sudah dikirim bersifat final dan tidak dapat diedit kembali.`
    );
  }

  // Prevent duplicate sent offer for the same request_id
  if (entry.kind === "offer" && entry.status === "sent" && entry.requestId) {
    const { data: duplicateOffer } = await supabase
      .from("listings")
      .select("id")
      .eq("owner_id", session.user.id)
      .eq("kind", "offer")
      .eq("status", "sent")
      .eq("request_id", entry.requestId)
      .neq("id", entry.id)
      .limit(1);

    if (duplicateOffer && duplicateOffer.length > 0) {
      throw new Error(
        "Anda sudah pernah mengirim penawaran untuk permintaan ini."
      );
    }
  }

  const photoPath = await uploadPhotoIfNeeded(
    session.user.id,
    entry.id,
    entry.data?.photoPreview
  );

  const publicData: Record<string, unknown> = { ...(entry.data || {}) };
  const contactData: Record<string, string> = {};

  CONTACT_KEYS.forEach((key) => {
    if (publicData[key] !== undefined) {
      contactData[key] = String(publicData[key] || "");
      delete publicData[key];
    }
  });

  if (
    typeof publicData.photoPreview === "string" &&
    publicData.photoPreview.startsWith("data:")
  ) {
    delete publicData.photoPreview;
  }

  if (entry.targetRequest) {
    publicData.targetRequest = entry.targetRequest;
  }

  const payload: Record<string, unknown> = {
    id: entry.id,
    owner_id: session.user.id,
    kind: entry.kind,
    status: entry.status,
    reference: entry.reference,
    request_id: entry.requestId || entry.targetRequest?.id || null,
    format: "form",
    data: publicData,
    updated_at: entry.updatedAt || new Date().toISOString(),
  };

  if (photoPath) {
    payload.photo_path = photoPath;
  }

  const { error: upsertError } = await supabase
    .from("listings")
    .upsert(payload, { onConflict: "id" });

  if (upsertError) {
    if (/row-level security|permission denied/i.test(upsertError.message)) {
      throw new Error(
        `${label} yang sudah dikirim bersifat final dan tidak dapat diubah.`
      );
    }
    throw new Error(upsertError.message || `Gagal menyimpan ${label.toLowerCase()}.`);
  }

  if (Object.keys(contactData).length > 0) {
    await supabase.from("listing_contacts").upsert(
      {
        listing_id: entry.id,
        contact: contactData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id" }
    );
  }

  const finalPhotoPreview = photoPath
    ? getStoragePhotoUrl(photoPath)
    : entry.data.photoPreview;

  return {
    ...entry,
    data: {
      ...entry.data,
      photoPreview: finalPhotoPreview,
    },
  };
}
