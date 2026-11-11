import {
  FormData,
  FormEntry,
  FormKind,
  TargetRequestSummary,
} from "./form-flow";

export type RolePerspective = "mitra" | "desa";

export interface RoleMeta {
  role: RolePerspective;
  badge: string;
  actorTitle: string;
  actorSubtitle: string;
   counterpartTitle: string;
  targetBannerLabel: string;
  formActionLabel: string;
  submitLabel: string;
  draftReadyText: string;
  sentReadyText: string;
}

export interface ReadinessItem {
  label: string;
  value: string;
  ready: boolean;
  stepIndex: number;
}

export interface CompatibilityNote {
  aspect: string;
  target: string;
  current: string;
  aligned: boolean;
}

export function getRoleMeta(kind: FormKind): RoleMeta {
  if (kind === "request") {
    return {
      role: "mitra",
      badge: "Alur Mitra Pembeli / Pemohon",
      actorTitle: "Mitra",
      actorSubtitle:
        "Mitra pembeli, usaha pengolahan, ritel, atau lembaga pemesan komoditas desa.",
      counterpartTitle: "BUMDes, kelompok tani, dan pelaku usaha Desa Jarak",
      targetBannerLabel: "Permintaan akan tampil pada Direktori Kebutuhan Mitra",
      formActionLabel: "+ Ajukan Permintaan Kemitraan",
      submitLabel: "Kirim Permintaan",
      draftReadyText:
        "Isian tersimpan otomatis di HP ini. Tekan \"Simpan sebagai Draf\" untuk menyimpannya di akun Anda.",
      sentReadyText:
        "Permintaan siap ditinjau dan ditanggapi oleh penyedia Desa Jarak melalui alur penawaran.",
    };
  }

  return {
    role: "desa",
    badge: "Alur Penyedia Desa Jarak",
    actorTitle: "Pelaku Usaha",
    actorSubtitle:
      "BUMDes, kelompok tani, koperasi, UMKM, atau produsen warga yang menanggapi kebutuhan mitra.",
    counterpartTitle: "Mitra pembeli atau pemohon kemitraan",
    targetBannerLabel: "Menanggapi Permintaan Mitra",
    formActionLabel: "Ajukan Penawaran",
    submitLabel: "Kirim Penawaran",
    draftReadyText:
      "Isian tersimpan otomatis di HP ini. Tekan \"Simpan sebagai Draf\" untuk menyimpannya di akun Anda.",
    sentReadyText:
      "Penawaran tercatat dan terhubung ke permintaan mitra yang dipilih.",
  };
}

export function buildTargetFromRequestEntry(
  entry?: FormEntry | null
): TargetRequestSummary | null {
  // No made-up request: without a real entry there is nothing to respond to.
  if (!entry || entry.kind !== "request") {
    return null;
  }

  return {
    id: entry.id,
    reference: entry.reference,
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

export function buildReadinessItems(
  kind: FormKind,
  data: FormData
): ReadinessItem[] {
  return [
    {
      label: "Barang",
      value:
        data.productType && data.variety
          ? `${data.productType} - ${data.variety}`
          : "Jenis barang belum lengkap",
      ready: Boolean(data.productType.trim() && data.variety.trim()),
      stepIndex: 0,
    },
    {
      label: "Jumlah & waktu",
      value:
        data.quantity && data.neededDate
          ? `${data.quantity} ${data.unit} - ${data.frequency} - ${data.neededDate}`
          : "Jumlah atau waktu belum diisi",
      ready: Boolean(data.quantity.trim() && data.neededDate.trim()),
      stepIndex: 0,
    },
    {
      label: "Nama & nomor HP",
      value:
        data.ownerName && data.contactName && data.phone
          ? `${data.ownerName} - ${data.contactName} (${data.phone})`
          : "Nama usaha, nama orang, atau nomor HP belum lengkap",
      ready: Boolean(
        data.ownerName.trim() && data.contactName.trim() && data.phone.trim()
      ),
      stepIndex: 1,
    },
    {
      label: kind === "request" ? "Alamat tujuan" : "Tempat barang diambil",
      value: data.location.trim() || "Belum diisi",
      ready: Boolean(data.location.trim()),
      stepIndex: 1,
    },
    {
      label: "Keterangan",
      value: data.description.trim() || "Belum ditulis",
      ready: Boolean(data.description.trim()),
      stepIndex: 1,
    },
  ];
}

export function buildOfferCompatibility(
  data: FormData,
  target: TargetRequestSummary
): CompatibilityNote[] {
  return [
    {
      aspect: "Komoditas",
      target: `${target.productType} (${target.variety})`,
      current: data.productType
        ? `${data.productType}${data.variety ? ` (${data.variety})` : ""}`
        : "Belum dipilih",
      aligned: Boolean(
        data.productType && data.productType === target.productType
      ),
    },
    {
      aspect: "Volume & satuan",
      target: `${target.quantity} ${target.unit} - ${target.frequency}`,
      current: data.quantity
        ? `${data.quantity} ${data.unit} - ${data.frequency}`
        : "Belum diisi",
      aligned: Boolean(data.quantity.trim() && data.unit === target.unit),
    },
    {
      aspect: "Pola kerja sama",
      target: target.partnershipScheme,
      current: data.partnershipScheme || "Belum dipilih",
      aligned: Boolean(
        data.partnershipScheme &&
          data.partnershipScheme === target.partnershipScheme
      ),
    },
    {
      aspect: "Penyerahan barang",
      target: target.deliveryType,
      current: data.deliveryType || "Belum dipilih",
      aligned: Boolean(
        data.deliveryType && data.deliveryType === target.deliveryType
      ),
    },
  ];
}
