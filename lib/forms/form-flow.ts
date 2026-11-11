import { POSITIVE_NUMBER_MESSAGE, positiveNumberError } from "@/lib/format";

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
  photoName: string;
  photoPreview: string;
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
  errors: Partial<Record<keyof FormData, string>>;
}

/** Index of the last (review) step; steps before it hold the fields. */
export const REVIEW_STEP = 2;

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
    id: "barang",
    label: "Barang",
    title: "Barang yang Anda Tawarkan",
    description: "Tulis barang, jumlah yang sanggup dikirim, dan kapan siap.",
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
    title: "Periksa Penawaran",
    description: "Cek sekali lagi, lalu kirim.",
  },
];

/** Label shown for a stored option value (values stay as saved). */
export function optionLabel(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label || value;
}

export const REQUEST_OWNER_TYPES: SelectOption[] = [
  {
    value: "Mitra Pembeli",
    label: "Mitra Pembeli",
    description: "Pembeli langsung, distributor, atau pedagang antar daerah.",
  },
  {
    value: "UMKM Pengolahan",
    label: "UMKM Pengolahan",
    description: "Usaha olahan pangan, dapur produksi, atau rumah kemas.",
  },
  {
    value: "Ritel / Kuliner",
    label: "Ritel / Kuliner",
    description: "Toko bahan pangan, katering, restoran, atau warung besar.",
  },
  {
    value: "Koperasi / Komunitas Usaha",
    label: "Koperasi / Komunitas Usaha",
    description: "Jaringan usaha yang menghimpun kebutuhan anggota.",
  },
];

export const OFFER_OWNER_TYPES: SelectOption[] = [
  {
    value: "BUMDes",
    label: "BUMDes",
    description: "Unit usaha desa yang mengoordinasikan pasokan warga.",
  },
  {
    value: "Kelompok Tani",
    label: "Kelompok Tani",
    description: "Gabungan petani atau pekebun komoditas sejenis.",
  },
  {
    value: "UMKM Desa",
    label: "UMKM Desa",
    description: "Usaha warga untuk olahan, pengemasan, atau distribusi lokal.",
  },
  {
    value: "Koperasi Desa",
    label: "Koperasi Desa",
    description: "Lembaga ekonomi warga untuk pemasaran bersama.",
  },
  {
    value: "Produsen Mandiri",
    label: "Produsen Mandiri",
    description:
      "Petani, peternak, atau perajin yang memasok secara langsung.",
  },
];

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
      productType: targetRequest?.productType || "Beras & Gabah",
      variety: targetRequest?.variety || "",
      grade: "Sortir Standar Pasar",
      quantity: "",
      unit: targetRequest?.unit || "ton",
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
      photoName: "",
      photoPreview: "",
    };
  }

  return {
    ownerType: "Mitra Pembeli",
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
    photoName: "",
    photoPreview: "",
  };
}

export function getSteps(kind: FormKind): StepConfig[] {
  return kind === "request" ? REQUEST_STEPS : OFFER_STEPS;
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

/**
 * Step 0 (Barang) and step 1 (Kontak & Kirim) hold the fields; step 2 is the
 * review. `today` (YYYY-MM-DD) is used to refuse a date in the past.
 */
export function validateStep(
  kind: FormKind,
  stepIndex: number,
  data: FormData,
  today?: string
): ValidationResult {
  const errors: Partial<Record<keyof FormData, string>> = {};

  const requireField = (key: keyof FormData, message: string) => {
    if (!String(data[key] ?? "").trim()) {
      errors[key] = message;
    }
  };

  if (stepIndex === 0) {
    requireField("productType", "Pilih jenis barang.");
    requireField(
      "variety",
      kind === "request"
        ? "Tulis barang yang Anda cari, misalnya \"Beras medium IR64\"."
        : "Tulis barang yang Anda tawarkan, misalnya \"Beras Ciherang\"."
    );
    requireField(
      "quantity",
      kind === "request" ? "Tulis jumlah yang dibutuhkan." : "Tulis jumlah yang sanggup dikirim."
    );
    requireField("unit", "Pilih satuan.");
    requireField("frequency", "Pilih seberapa sering.");
    requireField(
      "neededDate",
      kind === "request" ? "Pilih tanggal barang dibutuhkan." : "Pilih bulan barang siap dikirim."
    );

    if (data.quantity.trim() && positiveNumberError(data.quantity)) {
      errors.quantity = POSITIVE_NUMBER_MESSAGE;
    }
    const iso = neededDateToInput(kind, data.neededDate);
    if (today && iso) {
      const pastLimit = kind === "request" ? today : today.slice(0, 7);
      if (iso < pastLimit) {
        errors.neededDate =
          kind === "request"
            ? "Tanggal sudah lewat. Pilih hari ini atau sesudahnya."
            : "Bulan sudah lewat. Pilih bulan ini atau sesudahnya.";
      }
    }
  }

  if (stepIndex === 1) {
    requireField(
      "ownerName",
      kind === "request"
        ? "Tulis nama usaha atau toko Anda."
        : "Tulis nama usaha, kelompok tani, atau BUMDes Anda."
    );
    requireField("ownerType", "Pilih jenis usaha.");
    requireField("contactName", "Tulis nama orang yang bisa dihubungi.");
    const phoneMessage = phoneError(data.phone);
    if (phoneMessage) errors.phone = phoneMessage;
    requireField(
      "location",
      kind === "request"
        ? "Tulis alamat atau kecamatan tujuan kirim."
        : "Tulis dusun atau tempat barang diambil."
    );
    requireField("partnershipScheme", "Pilih cara kerja sama.");
    requireField("paymentMethod", "Pilih cara bayar.");
    requireField("deliveryType", "Pilih cara barang diserahkan.");
    requireField(
      "description",
      kind === "request"
        ? "Jelaskan singkat barang yang Anda terima (mutu, kemasan, jadwal)."
        : "Jelaskan singkat kondisi barang (asal panen, kemasan, kesiapan kirim)."
    );
    if (
      data.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    ) {
      errors.email = "Alamat email belum benar. Contoh: nama@gmail.com";
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
  errors: Partial<Record<keyof FormData, string>>;
} {
  const mergedErrors: Partial<Record<keyof FormData, string>> = {};
  let firstInvalidStep: number | null = null;

  for (let step = 0; step < REVIEW_STEP; step += 1) {
    const result = validateStep(kind, step, data, today);
    if (!result.valid && firstInvalidStep === null) {
      firstInvalidStep = step;
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
