import {
  formatNumber,
  formatRupiah,
  parseDecimal,
  POSITIVE_NUMBER_MESSAGE,
  positiveNumberError,
} from "@/lib/format";
import { isKelompokTaniName } from "./kelompok-tani";

export type FormKind = "request" | "offer";
export type EntryStatus =
  | "draft"
  | "published"
  | "sent"
  | "accepted"
  | "rejected"
  | "completed"
  | "closed";

/** Anything that is no longer a draft is final and cannot be edited. */
export function isFinalStatus(status: EntryStatus | string | null | undefined) {
  return Boolean(status) && status !== "draft";
}

/**
 * Status a listing gets when it is submitted. Requests and stand-alone offers
 * go to the directory ("published"); an offer made to a request is sent to
 * that buyer only ("sent"). The database enforces the same rule.
 */
export function submittedStatus(kind: FormKind, requestId: string | null): EntryStatus {
  return kind === "offer" && requestId ? "sent" : "published";
}

/** A published listing can still be edited by its owner ("Ubah"). */
export function isEditableStatus(status: EntryStatus | string | null | undefined) {
  return status === "draft" || status === "published";
}

export interface StepConfig {
  id: string;
  label: string;
  title: string;
  description: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

/** A group member whose produce is part of the offer. Public: no phone here. */
export interface OfferProvider {
  name: string;
  quantity: string;
  /** Rupiah per unit, as typed. */
  price: string;
}

export const MAX_PROVIDERS = 10;

export interface FormData {
  ownerType: string;
  ownerName: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
  location: string;
  productType: string;
  variety: string;
  grade: string;
  quantity: string;
  unit: string;
  frequency: string;
  neededDate: string;
  priceNote: string;
  partnershipScheme: string;
  paymentMethod: string;
  deliveryType: string;
  duration: string;
  description: string;
  additionalNeeds: string;
  packaging: string;
  providers: OfferProvider[];
  photoName: string;
  photoPreview: string;
}

/** Keys are field names, or providerErrorKey() for one member's field. */
export type FormErrors = Partial<Record<string, string>>;

export function providerErrorKey(name: string, field: "quantity" | "price"): string {
  return `providers.${name}.${field}`;
}

export interface TargetRequestSummary {
  id: string;
  reference: string;
  ownerName: string;
  ownerType: string;
  productType: string;
  variety: string;
  quantity: string;
  unit: string;
  frequency: string;
  neededDate: string;
  partnershipScheme: string;
  deliveryType: string;
  priceNote: string;
  location: string;
  description: string;
}

export interface FormEntry {
  id: string;
  kind: FormKind;
  status: EntryStatus;
  reference: string;
  requestId?: string | null;
  targetRequest?: TargetRequestSummary | null;
  createdAt: string;
  updatedAt: string;
  data: FormData;
}

export interface ValidationResult {
  valid: boolean;
  errors: FormErrors;
}

export const REQUEST_STEPS: StepConfig[] = [
  {
    id: "barang",
    label: "Barang",
    title: "Barang yang Anda Cari",
    description: "Tulis barang, jumlah, dan kapan Anda membutuhkannya.",
  },
  {
    id: "kontak",
    label: "Kontak & Kirim",
    title: "Kontak dan Cara Kirim",
    description:
      "Nama dan nomor HP diambil dari akun Anda. Ubah bila perlu.",
  },
  {
    id: "periksa",
    label: "Periksa",
    title: "Periksa Permintaan",
    description: "Cek sekali lagi, lalu kirim.",
  },
];

export const OFFER_STEPS: StepConfig[] = [
  {
    id: "jenis",
    label: "Jenis Usaha",
    title: "Siapa Anda?",
    description: "Pilih jenis usaha Anda.",
  },
  {
    id: "produk",
    label: "Produk",
    title: "Produk apa yang ingin Anda tawarkan?",
    description: "Pilih jenis barang, lalu tulis namanya.",
  },
  {
    id: "penyedia",
    label: "Penyedia",
    title: "Siapa yang menyediakan produk ini?",
    description: "Centang anggota kelompok yang produknya ikut ditawarkan.",
  },
  {
    id: "jumlah",
    label: "Jumlah & Harga",
    title: "Berapa jumlah dan harganya?",
    description: "Tulis jumlah yang sanggup dikirim dan harga jualnya.",
  },
  {
    id: "informasi",
    label: "Informasi",
    title: "Lengkapi informasi penawaran",
    description: "Nama dan nomor HP diambil dari akun Anda. Ubah bila perlu.",
  },
  {
    id: "foto",
    label: "Foto",
    title: "Tambahkan foto produk",
    description: "Boleh dilewati jika belum ada foto.",
  },
  {
    id: "periksa",
    label: "Periksa",
    title: "Periksa Penawaran",
    description: "Cek sekali lagi, lalu kirim.",
  },
];

/** Label shown for a stored option value (values stay as saved). */
export function optionLabel(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label || value;
}

export const KELOMPOK_TANI_TYPE = "Kelompok Tani";
export const PERORANGAN_TYPE = "Perorangan";
/** Public buyer name for a private person; their own name stays in the contact. */
export const PERORANGAN_NAME = "Pembeli Perorangan";

export const REQUEST_OWNER_TYPES: SelectOption[] = [
  { value: "Instansi", label: "Instansi" },
  { value: PERORANGAN_TYPE, label: "Perorangan" },
];

export const OFFER_OWNER_TYPES: SelectOption[] = [
  {
    value: KELOMPOK_TANI_TYPE,
    label: "Kelompok Tani",
    description: "Ketua mengisi untuk hasil panen anggota.",
  },
  {
    value: "Warga Tani",
    label: "Warga Tani",
    description: "Petani yang menjual hasil panennya sendiri.",
  },
  {
    value: "UMKM",
    label: "UMKM",
    description: "Usaha olahan, kerajinan, atau usaha mandiri.",
  },
  {
    value: "BUMDes/Kopdes",
    label: "BUMDes/Kopdes",
    description: "Badan usaha atau koperasi milik desa.",
  },
];

const LEGACY_OFFER_TYPES: Record<string, string> = {
  BUMDes: "BUMDes/Kopdes",
  "Koperasi Desa": "BUMDes/Kopdes",
  "UMKM Desa": "UMKM",
  "Produsen Mandiri": "Warga Tani",
};

/** Listings saved with an older list of types still open with a valid choice. */
export function normalizeOwnerType(kind: FormKind, value: string): string {
  const options = kind === "request" ? REQUEST_OWNER_TYPES : OFFER_OWNER_TYPES;
  if (!value || options.some((o) => o.value === value)) return value;
  return kind === "request" ? "Instansi" : LEGACY_OFFER_TYPES[value] || "";
}

export function isGroupOffer(kind: FormKind, data: Pick<FormData, "ownerType">): boolean {
  return kind === "offer" && data.ownerType === KELOMPOK_TANI_TYPE;
}

/** Sum and average price (weighted by quantity) of the members' amounts. */
export function providerTotals(providers: OfferProvider[]): {
  quantity: number;
  averagePrice: number | null;
} {
  let quantity = 0;
  let value = 0;
  let priced = 0;
  for (const provider of providers) {
    const q = parseDecimal(provider.quantity);
    if (q === null || q <= 0) continue;
    quantity += q;
    const p = parseDecimal(provider.price);
    if (p === null || p <= 0) continue;
    value += q * p;
    priced += q;
  }
  return {
    quantity: Math.round(quantity * 1e6) / 1e6,
    averagePrice: priced > 0 ? value / priced : null,
  };
}

/**
 * The data as saved and reviewed. A group offer's total and price come from
 * its members, so every reader of quantity/priceNote keeps working.
 */
export function resolveFormData(kind: FormKind, data: FormData): FormData {
  if (kind === "request") {
    return data.ownerType === PERORANGAN_TYPE ? { ...data, ownerName: PERORANGAN_NAME } : data;
  }
  if (!isGroupOffer(kind, data)) return { ...data, providers: [] };
  const { quantity, averagePrice } = providerTotals(data.providers);
  return {
    ...data,
    position: data.position.trim() || "Ketua Kelompok",
    quantity: quantity > 0 ? formatNumber(quantity, 6).replace(/\./g, "") : "",
    priceNote: averagePrice === null ? "" : `${formatRupiah(averagePrice)}/${data.unit} (rata-rata)`,
  };
}

export const PRODUCT_OPTIONS: SelectOption[] = [
  { value: "Beras & Gabah", label: "Beras & Gabah" },
  { value: "Jagung Pipil", label: "Jagung Pipil" },
  { value: "Cabai & Sayur Dataran Rendah", label: "Cabai & Sayur" },
  { value: "Singkong & Umbi", label: "Singkong & Umbi" },
  { value: "Pisang & Buah Kebun", label: "Pisang & Buah Kebun" },
  { value: "Telur & Unggas", label: "Telur & Unggas" },
  { value: "Susu Segar", label: "Susu Segar" },
  { value: "Olahan Pangan Desa", label: "Olahan Pangan Desa" },
  { value: "Pupuk Organik & Media Tanam", label: "Pupuk Organik" },
  { value: "Kerajinan & Anyaman", label: "Kerajinan & Anyaman" },
];

export const GRADE_OPTIONS: SelectOption[] = [
  {
    value: "Sortir Standar Pasar",
    label: "Sortir Standar Pasar",
    description: "Bersih, layak jual, dan seragam untuk distribusi harian.",
  },
  {
    value: "Sortir Super / Pilihan",
    label: "Sortir Super / Pilihan",
    description: "Ukuran lebih seragam dengan seleksi mutu lebih ketat.",
  },
  {
    value: "Bahan Baku Olahan",
    label: "Bahan Baku Olahan",
    description: "Fokus pada kesegaran dan kecocokan proses produksi.",
  },
  {
    value: "Siap Kemas / Siap Jual",
    label: "Siap Kemas / Siap Jual",
    description: "Sudah dikemas rapi untuk ritel atau mitra toko.",
  },
];

export const UNIT_OPTIONS: SelectOption[] = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "ton", label: "Ton" },
  { value: "karung", label: "Karung" },
  { value: "krat", label: "Krat / Peti" },
  { value: "ikat", label: "Ikat" },
  { value: "liter", label: "Liter" },
  { value: "paket", label: "Paket / Kemasan" },
];

export const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "Sekali panen / sekali kirim", label: "Sekali kirim" },
  { value: "Mingguan", label: "Mingguan" },
  { value: "Dua mingguan", label: "Dua mingguan" },
  { value: "Bulanan", label: "Bulanan" },
  { value: "Musiman mengikuti panen", label: "Musiman" },
];

export const PARTNERSHIP_OPTIONS: SelectOption[] = [
  {
    value: "Pembelian Putus Terjadwal",
    label: "Beli langsung per kiriman",
    description:
      "Transaksi jelas per pengiriman dengan jadwal yang disepakati.",
  },
  {
    value: "Kontrak Pasok Berkala",
    label: "Kirim rutin dengan kontrak",
    description: "Komitmen volume dan jangka waktu tertentu.",
  },
  {
    value: "Kemitraan Budidaya / Produksi",
    label: "Tanam bersama (pembeli ikut atur tanam)",
    description:
      "Mitra dan desa menyepakati pola tanam atau standar produksi.",
  },
  {
    value: "Konsinyasi / Titip Jual Terbatas",
    label: "Titip jual",
    description: "Cocok untuk produk olahan atau kemasan siap jual.",
  },
];

export const PAYMENT_OPTIONS: SelectOption[] = [
  { value: "Tunai saat serah terima", label: "Tunai saat serah terima" },
  {
    value: "Transfer setelah barang diterima",
    label: "Transfer saat barang diterima",
  },
  {
    value: "Uang muka + pelunasan saat kirim",
    label: "Uang muka, sisanya saat kirim",
  },
  {
    value: "Tempo 7-14 hari terverifikasi",
    label: "Bayar 7–14 hari setelah barang diterima",
  },
];

export const DELIVERY_OPTIONS: SelectOption[] = [
  { value: "Diambil di titik kumpul desa", label: "Pembeli ambil di desa" },
  { value: "Diantar ke gudang mitra", label: "Diantar ke gudang pembeli" },
  {
    value: "Titik temu pasar / ekspedisi",
    label: "Bertemu di pasar / lewat ekspedisi",
  },
];

export const DURATION_OPTIONS: SelectOption[] = [
  { value: "Uji coba 1 kali pengiriman", label: "Coba 1 kali kirim dulu" },
  { value: "1 musim panen (3 bulan)", label: "1 musim panen (3 bulan)" },
  { value: "6 bulan", label: "6 bulan" },
  { value: "12 bulan", label: "12 bulan" },
];

export function createEmptyFormData(
  kind: FormKind,
  targetRequest?: TargetRequestSummary | null
): FormData {
  if (kind === "offer") {
    return {
      ownerType: "Kelompok Tani",
      ownerName: "",
      contactName: "",
      position: "",
      phone: "",
      email: "",
      location: "",
      // No default: the seller picks one of the known types.
      productType: PRODUCT_OPTIONS.some((o) => o.value === targetRequest?.productType)
        ? targetRequest!.productType
        : "",
      variety: targetRequest?.variety || "",
      grade: "Sortir Standar Pasar",
      quantity: "",
      unit: targetRequest?.unit || "kg",
      frequency: targetRequest?.frequency || "Mingguan",
      neededDate: "",
      priceNote: "",
      partnershipScheme:
        targetRequest?.partnershipScheme || "Kontrak Pasok Berkala",
      paymentMethod: "Transfer setelah barang diterima",
      deliveryType:
        targetRequest?.deliveryType || "Diambil di titik kumpul desa",
      duration: "1 musim panen (3 bulan)",
      description: "",
      additionalNeeds: "",
      packaging: "",
      providers: [],
      photoName: "",
      photoPreview: "",
    };
  }

  return {
    ownerType: "Instansi",
    ownerName: "",
    contactName: "",
    position: "",
    phone: "",
    email: "",
    location: "",
    productType: "Beras & Gabah",
    variety: "",
    grade: "Sortir Standar Pasar",
    quantity: "",
    unit: "ton",
    frequency: "Mingguan",
    neededDate: "",
    priceNote: "",
    partnershipScheme: "Kontrak Pasok Berkala",
    paymentMethod: "Transfer setelah barang diterima",
    deliveryType: "Diambil di titik kumpul desa",
    duration: "1 musim panen (3 bulan)",
    description: "",
    additionalNeeds: "",
    packaging: "",
    providers: [],
    photoName: "",
    photoPreview: "",
  };
}

/** Only a kelompok tani picks members, so other sellers skip that step. */
export function getSteps(kind: FormKind, ownerType: string): StepConfig[] {
  if (kind === "request") return REQUEST_STEPS;
  return ownerType === KELOMPOK_TANI_TYPE
    ? OFFER_STEPS
    : OFFER_STEPS.filter((step) => step.id !== "penyedia");
}

/** Phone number check shared by the wizard: digits, spaces, +, - and () only. */
export function phoneError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Nomor HP wajib diisi.";
  if (/[^\d\s+()-]/.test(value)) {
    return "Nomor HP hanya boleh berisi angka. Contoh: 0812 3456 7890";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return "Nomor HP terdiri dari 9 sampai 15 angka. Contoh: 0812 3456 7890";
  }
  return null;
}

type CheckedField = Exclude<keyof FormData, "providers">;

const STEP_FIELDS: Record<FormKind, Record<string, CheckedField[]>> = {
  request: {
    barang: ["productType", "variety", "quantity", "unit", "frequency", "neededDate"],
    kontak: [
      "ownerType", "ownerName", "contactName", "phone", "location",
      "partnershipScheme", "paymentMethod", "deliveryType", "description", "email",
    ],
  },
  offer: {
    jenis: ["ownerType", "ownerName"],
    produk: ["productType", "variety"],
    jumlah: ["quantity", "unit", "frequency"],
    informasi: [
      "description", "neededDate", "location", "contactName", "phone",
      "partnershipScheme", "paymentMethod", "deliveryType", "email",
    ],
  },
};

function requiredMessages(kind: FormKind): Partial<Record<CheckedField, string>> {
  const request = kind === "request";
  return {
    productType: "Pilih jenis barang.",
    variety: request
      ? "Tulis barang yang Anda cari, misalnya \"Beras medium IR64\"."
      : "Tulis barang yang Anda tawarkan, misalnya \"Beras Ciherang\".",
    quantity: request ? "Tulis jumlah yang dibutuhkan." : "Tulis jumlah yang sanggup dikirim.",
    unit: "Pilih satuan.",
    frequency: "Pilih seberapa sering.",
    neededDate: request ? "Pilih tanggal barang dibutuhkan." : "Pilih bulan barang siap dikirim.",
    ownerName: request ? "Tulis nama instansi atau usaha Anda." : "Tulis nama usaha Anda.",
    ownerType: request ? "Pilih jenis pembeli." : "Pilih jenis usaha.",
    contactName: "Tulis nama orang yang bisa dihubungi.",
    location: request
      ? "Tulis alamat atau kecamatan tujuan kirim."
      : "Tulis dusun atau tempat barang diambil.",
    partnershipScheme: "Pilih cara kerja sama.",
    paymentMethod: "Pilih cara bayar.",
    deliveryType: "Pilih cara barang diserahkan.",
    description: request
      ? "Jelaskan singkat barang yang Anda terima (mutu, kemasan, jadwal)."
      : "Jelaskan singkat kondisi barang (asal panen, kemasan, kesiapan kirim).",
  };
}

/**
 * Checks the fields of one step (by step id). `today` (YYYY-MM-DD) is used to
 * refuse a date in the past.
 */
export function validateStep(
  kind: FormKind,
  stepId: string,
  data: FormData,
  today?: string
): ValidationResult {
  const errors: FormErrors = {};
  const group = isGroupOffer(kind, data);
  const messages = requiredMessages(kind);
  const perorangan = kind === "request" && data.ownerType === PERORANGAN_TYPE;

  for (const field of STEP_FIELDS[kind][stepId] || []) {
    const value = data[field].trim();

    if (field === "ownerName" && perorangan) continue;
    // A group's amounts are checked per member below.
    if (field === "quantity" && group) continue;

    if (field === "ownerName" && group) {
      if (!isKelompokTaniName(data.ownerName)) errors.ownerName = "Pilih nama kelompok tani.";
      continue;
    }
    if (field === "phone") {
      const message = phoneError(data.phone);
      if (message) errors.phone = message;
      continue;
    }
    if (!value) {
      const message = messages[field];
      if (message) errors[field] = message;
      continue;
    }
    if (field === "quantity" && positiveNumberError(value)) {
      errors.quantity = POSITIVE_NUMBER_MESSAGE;
    }
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.email = "Alamat email belum benar. Contoh: nama@gmail.com";
    }
    if (field === "neededDate" && today) {
      const iso = neededDateToInput(kind, value);
      const pastLimit = kind === "request" ? today : today.slice(0, 7);
      if (iso && iso < pastLimit) {
        errors.neededDate =
          kind === "request"
            ? "Tanggal sudah lewat. Pilih hari ini atau sesudahnya."
            : "Bulan sudah lewat. Pilih bulan ini atau sesudahnya.";
      }
    }
  }

  if (group && stepId === "penyedia" && data.providers.length === 0) {
    errors.providers = "Pilih minimal satu anggota.";
  }
  if (group && stepId === "jumlah") {
    for (const provider of data.providers) {
      for (const field of ["quantity", "price"] as const) {
        if (positiveNumberError(provider[field])) {
          errors[providerErrorKey(provider.name, field)] = POSITIVE_NUMBER_MESSAGE;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * The stored neededDate is a readable label ("20 Okt 2026" for a request,
 * "Mulai Desember 2026" for an offer), so the directory can show it as is
 * and still tell when a request has passed its date. These two helpers
 * convert between that label and the value of a date/month input.
 */
export function neededDateFromInput(kind: FormKind, inputValue: string): string {
  if (kind === "request") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inputValue);
    if (!m) return "";
    return `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
  }
  const m = /^(\d{4})-(\d{2})$/.exec(inputValue);
  if (!m) return "";
  return `Mulai ${MONTHS_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

export function neededDateToInput(kind: FormKind, label: string): string {
  const s = String(label || "").trim();
  if (kind === "request") {
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(s);
    if (!m) return "";
    const month = monthIndex(m[2]);
    return month ? `${m[3]}-${pad2(month)}-${pad2(Number(m[1]))}` : "";
  }
  const m = /([A-Za-z]+)\s+(\d{4})/.exec(s);
  if (!m) return "";
  const month = monthIndex(m[1]);
  return month ? `${m[2]}-${pad2(month)}` : "";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthIndex(name: string): number {
  const lower = name.toLowerCase();
  const i = MONTHS_LONG.findIndex(
    (long, idx) => long.toLowerCase() === lower || MONTHS_SHORT[idx].toLowerCase() === lower
  );
  if (i >= 0) return i + 1;
  if (lower === "agt" || lower === "agus") return 8;
  if (lower === "sept") return 9;
  return 0;
}

export function validateAllSteps(
  kind: FormKind,
  data: FormData,
  today?: string
): {
  valid: boolean;
  firstInvalidStep: number | null;
  errors: FormErrors;
} {
  const mergedErrors: FormErrors = {};
  let firstInvalidStep: number | null = null;

  for (const [index, step] of getSteps(kind, data.ownerType).entries()) {
    const result = validateStep(kind, step.id, data, today);
    if (!result.valid && firstInvalidStep === null) {
      firstInvalidStep = index;
    }
    Object.assign(mergedErrors, result.errors);
  }

  return {
    valid: firstInvalidStep === null,
    firstInvalidStep,
    errors: mergedErrors,
  };
}

/** Short code like "PRM-JRK-K3F9Q2": time plus random letters, so two never match. */
export function createReference(kind: FormKind): string {
  const prefix = kind === "request" ? "PRM-JRK" : "PNW-JRK";
  const time = Date.now().toString(36).slice(-3);
  const random = Math.random().toString(36).slice(2, 5);
  return `${prefix}-${(time + random).toUpperCase()}`;
}

export function formatTimestamp(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}
