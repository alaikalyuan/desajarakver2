export type FormKind = "request" | "offer";
export type EntryStatus =
  | "draft"
  | "published"
  | "sent"
  | "accepted"
  | "rejected"
  | "completed";

/** Anything that is no longer a draft is final and cannot be edited. */
export function isFinalStatus(status: EntryStatus | string | null | undefined) {
  return Boolean(status) && status !== "draft";
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

export const REQUEST_STEPS: StepConfig[] = [
  {
    id: "identitas",
    label: "Identitas",
    title: "Identitas Mitra & Kebutuhan Awal",
    description:
      "Isi data usaha pemohon agar pengelola desa tahu siapa yang sedang mencari pasokan.",
  },
  {
    id: "spesifikasi",
    label: "Komoditas",
    title: "Spesifikasi Komoditas yang Dicari",
    description:
      "Jelaskan produk, jumlah kebutuhan, ritme pasok, dan target kualitas yang diharapkan.",
  },
  {
    id: "kemitraan",
    label: "Kerja Sama",
    title: "Skema Kerja Sama & Pengiriman",
    description:
      "Tentukan pola kerja sama, cara pembayaran, dan catatan tambahan untuk calon pemasok desa.",
  },
  {
    id: "tinjauan",
    label: "Tinjauan",
    title: "Periksa Kembali Permintaan",
    description:
      "Pastikan informasi utama sudah jelas sebelum permintaan disimpan sebagai draf atau dikirim.",
  },
];

export const OFFER_STEPS: StepConfig[] = [
  {
    id: "identitas",
    label: "Penyedia",
    title: "Identitas Penyedia Desa",
    description:
      "Lengkapi data pelaku usaha atau kelompok pemasok yang siap mengajukan penawaran.",
  },
  {
    id: "spesifikasi",
    label: "Pasokan",
    title: "Kapasitas Produk & Ketersediaan",
    description:
      "Tulis jenis produk, kapasitas yang sanggup dipasok, jadwal ketersediaan, dan acuan harga.",
  },
  {
    id: "kemitraan",
    label: "Penawaran",
    title: "Skema Penawaran & Bukti Produk",
    description:
      "Jelaskan cara kirim, skema kerja sama, catatan pasokan, dan lampiran foto bila tersedia.",
  },
  {
    id: "tinjauan",
    label: "Tinjauan",
    title: "Periksa Kembali Penawaran",
    description:
      "Tinjau kesesuaian isi penawaran sebelum disimpan sebagai draf atau dikirim ke mitra.",
  },
];

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
    label: "Pembelian Putus Terjadwal",
    description:
      "Transaksi jelas per pengiriman dengan jadwal yang disepakati.",
  },
  {
    value: "Kontrak Pasok Berkala",
    label: "Kontrak Pasok Berkala",
    description: "Komitmen volume dan jangka waktu tertentu.",
  },
  {
    value: "Kemitraan Budidaya / Produksi",
    label: "Kemitraan Budidaya / Produksi",
    description:
      "Mitra dan desa menyepakati pola tanam atau standar produksi.",
  },
  {
    value: "Konsinyasi / Titip Jual Terbatas",
    label: "Konsinyasi Terbatas",
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
    label: "Uang muka + pelunasan",
  },
  { value: "Tempo 7-14 hari terverifikasi", label: "Tempo 7-14 hari" },
];

export const DELIVERY_OPTIONS: SelectOption[] = [
  { value: "Diambil di titik kumpul desa", label: "Diambil di titik kumpul desa" },
  { value: "Diantar ke gudang mitra", label: "Diantar ke gudang mitra" },
  {
    value: "Titik temu pasar / ekspedisi",
    label: "Titik temu / ekspedisi bersama",
  },
];

export const DURATION_OPTIONS: SelectOption[] = [
  { value: "Uji coba 1 kali pengiriman", label: "Uji coba 1 kali pengiriman" },
  { value: "1 musim panen (3 bulan)", label: "1 musim panen (3 bulan)" },
  { value: "6 bulan", label: "6 bulan" },
  { value: "12 bulan", label: "12 bulan" },
];

export const DEFAULT_TARGET_REQUEST: TargetRequestSummary = {
  id: "req-beras-0426",
  reference: "PRM-JRK-2404",
  ownerName: "CV Pangan Lestari Kediri",
  ownerType: "Mitra Pembeli",
  productType: "Beras & Gabah",
  variety: "Beras putih medium IR64 / Ciherang",
  quantity: "3",
  unit: "ton",
  frequency: "Mingguan",
  neededDate: "Mulai Mei 2026",
  partnershipScheme: "Kontrak Pasok Berkala",
  deliveryType: "Diambil di titik kumpul desa",
  priceNote: "Rp11.800 - Rp12.300/kg sesuai kadar air dan hasil sortir",
  location: "Gudang penerima Kecamatan Pare, Kabupaten Kediri",
  description:
    "Membutuhkan pasokan beras medium bersih, kadar air terjaga, dikemas karung 50 kg, dengan jadwal ambil setiap pekan di titik kumpul Desa Jarak.",
};

export function createEmptyFormData(
  kind: FormKind,
  targetRequest?: TargetRequestSummary | null
): FormData {
  if (kind === "offer") {
    return {
      ownerType: "Kelompok Tani",
      ownerName: "",
      contactName: "",
      position: "Koordinator Pasokan",
      phone: "",
      email: "",
      location: "Dusun Krajan, Desa Jarak",
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
    position: "Penanggung Jawab Pembelian",
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

export function validateStep(
  kind: FormKind,
  stepIndex: number,
  data: FormData
): ValidationResult {
  const errors: Partial<Record<keyof FormData, string>> = {};

  const requireField = (key: keyof FormData, message: string) => {
    if (!String(data[key] ?? "").trim()) {
      errors[key] = message;
    }
  };

  if (stepIndex === 0) {
    requireField(
      "ownerType",
      kind === "request"
        ? "Pilih kategori pemohon."
        : "Pilih kategori penyedia desa."
    );
    requireField(
      "ownerName",
      kind === "request"
        ? "Nama usaha atau lembaga wajib diisi."
        : "Nama kelompok, BUMDes, atau usaha wajib diisi."
    );
    requireField("contactName", "Nama penanggung jawab wajib diisi.");
    requireField("phone", "Nomor WhatsApp atau telepon aktif wajib diisi.");
    requireField(
      "location",
      kind === "request"
        ? "Lokasi usaha atau gudang tujuan wajib diisi."
        : "Dusun atau lokasi titik kumpul wajib diisi."
    );

    if (
      data.phone.trim() &&
      data.phone.replace(/[^\d]/g, "").length < 9
    ) {
      errors.phone = "Masukkan nomor telepon yang dapat dihubungi.";
    }
    if (
      data.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    ) {
      errors.email = "Format email belum sesuai.";
    }
  }

  if (stepIndex === 1) {
    requireField("productType", "Pilih jenis produk atau komoditas.");
    requireField(
      "variety",
      kind === "request"
        ? "Tulis varietas atau spesifikasi singkat yang dicari."
        : "Tulis varietas atau bentuk produk yang ditawarkan."
    );
    requireField(
      "quantity",
      kind === "request"
        ? "Jumlah kebutuhan wajib diisi."
        : "Kapasitas pasok wajib diisi."
    );
    requireField("unit", "Pilih satuan jumlah.");
    requireField(
      "frequency",
      "Pilih frekuensi kebutuhan atau ketersediaan."
    );
    requireField(
      "neededDate",
      kind === "request"
        ? "Target waktu mulai pasok wajib diisi."
        : "Waktu ketersediaan pasokan wajib diisi."
    );

    const numericQuantity = Number(String(data.quantity).replace(",", "."));
    if (
      data.quantity.trim() &&
      (!Number.isFinite(numericQuantity) || numericQuantity <= 0)
    ) {
      errors.quantity = "Masukkan angka jumlah yang lebih besar dari 0.";
    }
  }

  if (stepIndex === 2) {
    requireField("partnershipScheme", "Pilih skema kerja sama.");
    requireField(
      "paymentMethod",
      "Pilih cara pembayaran yang diharapkan."
    );
    requireField(
      "deliveryType",
      "Pilih mekanisme penyerahan barang."
    );
    requireField(
      "description",
      kind === "request"
        ? "Jelaskan kebutuhan penggunaan atau standar penerimaan barang."
        : "Jelaskan kondisi komoditas, sumber panen, atau kesiapan pasok."
    );
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAllSteps(
  kind: FormKind,
  data: FormData
): {
  valid: boolean;
  firstInvalidStep: number | null;
  errors: Partial<Record<keyof FormData, string>>;
} {
  const mergedErrors: Partial<Record<keyof FormData, string>> = {};
  let firstInvalidStep: number | null = null;

  for (let step = 0; step < 3; step += 1) {
    const result = validateStep(kind, step, data);
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

export function createReference(kind: FormKind): string {
  const prefix = kind === "request" ? "PRM-JRK" : "PNW-JRK";
  const stamp = String(Date.now()).slice(-4);
  return `${prefix}-${stamp}`;
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
