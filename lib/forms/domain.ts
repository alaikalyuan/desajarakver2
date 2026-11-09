import {
  DEFAULT_TARGET_REQUEST,
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
      actorTitle: "Pemohon Kemitraan",
      actorSubtitle:
        "Mitra pembeli, usaha pengolahan, ritel, atau lembaga pemesan komoditas desa.",
      counterpartTitle: "BUMDes, kelompok tani, dan pelaku usaha Desa Jarak",
      targetBannerLabel: "Permintaan akan tampil pada Direktori Kebutuhan Mitra",
      formActionLabel: "+ Ajukan Permintaan Kemitraan",
      submitLabel: "Kirim Permintaan Kemitraan",
      draftReadyText:
        "Draf tersimpan di akun Anda dan dapat dilanjutkan kapan saja sebelum dipublikasikan ke direktori.",
      sentReadyText:
        "Permintaan siap ditinjau dan ditanggapi oleh penyedia Desa Jarak melalui alur penawaran.",
    };
  }

  return {
    role: "desa",
    badge: "Alur Penyedia Desa Jarak",
    actorTitle: "Penyedia / Pelaku Usaha Desa",
    actorSubtitle:
      "BUMDes, kelompok tani, koperasi, UMKM, atau produsen warga yang menanggapi kebutuhan mitra.",
    counterpartTitle: "Mitra pembeli atau pemohon kemitraan",
    targetBannerLabel: "Menanggapi Permintaan Mitra",
    formActionLabel: "Ajukan Penawaran",
    submitLabel: "Kirim Penawaran ke Mitra",
    draftReadyText:
      "Draf penawaran tersimpan untuk dilengkapi bersama kelompok tani atau pengurus usaha desa.",
    sentReadyText:
      "Penawaran tercatat dan terhubung ke permintaan mitra yang dipilih.",
  };
}

export function buildTargetFromRequestEntry(
  entry?: FormEntry | null
): TargetRequestSummary {
  if (!entry || entry.kind !== "request") {
    return DEFAULT_TARGET_REQUEST;
  }

  return {
    id: entry.id,
    reference: entry.reference,
    ownerName: entry.data.ownerName || DEFAULT_TARGET_REQUEST.ownerName,
    ownerType: entry.data.ownerType || DEFAULT_TARGET_REQUEST.ownerType,
    productType: entry.data.productType || DEFAULT_TARGET_REQUEST.productType,
    variety: entry.data.variety || DEFAULT_TARGET_REQUEST.variety,
    quantity: entry.data.quantity || DEFAULT_TARGET_REQUEST.quantity,
    unit: entry.data.unit || DEFAULT_TARGET_REQUEST.unit,
    frequency: entry.data.frequency || DEFAULT_TARGET_REQUEST.frequency,
    neededDate: entry.data.neededDate || DEFAULT_TARGET_REQUEST.neededDate,
    partnershipScheme:
      entry.data.partnershipScheme || DEFAULT_TARGET_REQUEST.partnershipScheme,
    deliveryType:
      entry.data.deliveryType || DEFAULT_TARGET_REQUEST.deliveryType,
    priceNote: entry.data.priceNote || "Menyesuaikan kesepakatan mutu & pengiriman",
    location: entry.data.location || DEFAULT_TARGET_REQUEST.location,
    description: entry.data.description || DEFAULT_TARGET_REQUEST.description,
  };
}

export function buildReadinessItems(
  kind: FormKind,
  data: FormData
): ReadinessItem[] {
  return [
    {
      label: kind === "request" ? "Pemohon & kontak" : "Penyedia desa & kontak",
      value:
        data.ownerName && data.contactName && data.phone
          ? `${data.ownerName} - ${data.contactName} (${data.phone})`
          : "Nama usaha, PIC, atau nomor kontak belum lengkap",
      ready: Boolean(
        data.ownerName.trim() && data.contactName.trim() && data.phone.trim()
      ),
      stepIndex: 0,
    },
    {
      label:
        kind === "request" ? "Lokasi penerimaan" : "Titik pasok Desa Jarak",
      value: data.location.trim() || "Lokasi belum diisi",
      ready: Boolean(data.location.trim()),
      stepIndex: 0,
    },
    {
      label: "Komoditas & spesifikasi",
      value:
        data.productType && data.variety
          ? `${data.productType} - ${data.variety} (${data.grade})`
          : "Jenis komoditas atau spesifikasi belum lengkap",
      ready: Boolean(data.productType.trim() && data.variety.trim()),
      stepIndex: 1,
    },
    {
      label: kind === "request" ? "Volume & jadwal" : "Kapasitas & ketersediaan",
      value:
        data.quantity && data.neededDate
          ? `${data.quantity} ${data.unit} - ${data.frequency} - ${data.neededDate}`
          : "Jumlah atau jadwal belum diisi",
      ready: Boolean(data.quantity.trim() && data.neededDate.trim()),
      stepIndex: 1,
    },
    {
      label: "Skema & penyerahan",
      value:
        data.partnershipScheme && data.deliveryType
          ? `${data.partnershipScheme} - ${data.deliveryType}`
          : "Skema kerja sama atau penyerahan belum dipilih",
      ready: Boolean(
        data.partnershipScheme.trim() && data.deliveryType.trim()
      ),
      stepIndex: 2,
    },
    {
      label: "Rincian operasional",
      value:
        data.description.trim() || "Uraian kebutuhan/pasokan belum ditulis",
      ready: Boolean(data.description.trim()),
      stepIndex: 2,
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
