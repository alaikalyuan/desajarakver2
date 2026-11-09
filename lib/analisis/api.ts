import { supabase } from "@/lib/supabase/client";

// Data lives in Supabase (tables `transactions` and `productions`).
// Row Level Security limits every user to their own rows, so these helpers
// never filter by user themselves. Column names match
// supabase/migrations/20261108122254_initial_schema.sql.

export type Transaksi = {
  id: number;
  tanggal: string;
  tipe: "pemasukan" | "pengeluaran";
  kategori?: string;
  deskripsi: string;
  harga: number;
  jumlah: number;
  satuan: string;
  keterangan?: string;
};

export type Produksi = {
  id: number;
  komoditas: string;
  jumlah: number;
  satuan: string;
  tanggalTanam: string;
  tanggalPanen: string;
  keterangan?: string;
};

function gagal(pesan: string, error: unknown): never {
  console.error(pesan, error);
  throw new Error(`${pesan} Periksa koneksi lalu coba lagi.`);
}

/** Client-generated id, as in V1 (the id columns accept explicit values). */
export function newRowId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// ---------- Transaksi ----------

type TransaksiRow = {
  id: number;
  tanggal: string;
  tipe: Transaksi["tipe"];
  kategori: string | null;
  deskripsi: string;
  harga: number;
  jumlah: number;
  satuan: string;
  keterangan: string | null;
};

const fromTransaksiRow = (row: TransaksiRow): Transaksi => ({
  id: Number(row.id),
  tanggal: row.tanggal,
  tipe: row.tipe,
  kategori: row.kategori ?? undefined,
  deskripsi: row.deskripsi,
  harga: Number(row.harga),
  jumlah: Number(row.jumlah),
  satuan: row.satuan,
  keterangan: row.keterangan ?? undefined,
});

function toTransaksiRow(t: Partial<Transaksi>): Partial<TransaksiRow> {
  const row: Partial<TransaksiRow> = {};
  if (t.tanggal !== undefined) row.tanggal = t.tanggal;
  if (t.tipe !== undefined) row.tipe = t.tipe;
  if (t.kategori !== undefined) row.kategori = t.kategori || null;
  if (t.deskripsi !== undefined) row.deskripsi = t.deskripsi;
  if (t.harga !== undefined) row.harga = t.harga;
  if (t.jumlah !== undefined) row.jumlah = t.jumlah;
  if (t.satuan !== undefined) row.satuan = t.satuan;
  if (t.keterangan !== undefined) row.keterangan = t.keterangan || null;
  return row;
}

export async function getTransactions(): Promise<Transaksi[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, tanggal, tipe, kategori, deskripsi, harga, jumlah, satuan, keterangan")
    .order("tanggal", { ascending: false })
    .order("id", { ascending: false });
  if (error) gagal("Data keuangan gagal dimuat.", error);
  return (data as TransaksiRow[]).map(fromTransaksiRow);
}

export async function saveTransaction(t: Transaksi): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .insert({ id: t.id, ...toTransaksiRow(t) });
  if (error) gagal("Transaksi gagal disimpan.", error);
}

export async function updateTransaction(id: number, t: Partial<Transaksi>): Promise<void> {
  const { error } = await supabase.from("transactions").update(toTransaksiRow(t)).eq("id", id);
  if (error) gagal("Transaksi gagal diperbarui.", error);
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) gagal("Transaksi gagal dihapus.", error);
}

// ---------- Produksi ----------

type ProduksiRow = {
  id: number;
  komoditas: string;
  jumlah: number;
  satuan: string;
  tanggal_tanam: string | null;
  tanggal_panen: string | null;
  keterangan: string | null;
};

const fromProduksiRow = (row: ProduksiRow): Produksi => ({
  id: Number(row.id),
  komoditas: row.komoditas,
  jumlah: Number(row.jumlah),
  satuan: row.satuan,
  tanggalTanam: row.tanggal_tanam ?? "",
  tanggalPanen: row.tanggal_panen ?? "",
  keterangan: row.keterangan ?? undefined,
});

function toProduksiRow(p: Partial<Produksi>): Partial<ProduksiRow> {
  const row: Partial<ProduksiRow> = {};
  if (p.komoditas !== undefined) row.komoditas = p.komoditas;
  if (p.jumlah !== undefined) row.jumlah = p.jumlah;
  if (p.satuan !== undefined) row.satuan = p.satuan;
  if (p.tanggalTanam !== undefined) row.tanggal_tanam = p.tanggalTanam || null;
  if (p.tanggalPanen !== undefined) row.tanggal_panen = p.tanggalPanen || null;
  if (p.keterangan !== undefined) row.keterangan = p.keterangan || null;
  return row;
}

export async function getProductions(): Promise<Produksi[]> {
  const { data, error } = await supabase
    .from("productions")
    .select("id, komoditas, jumlah, satuan, tanggal_tanam, tanggal_panen, keterangan")
    .order("tanggal_tanam", { ascending: false })
    .order("id", { ascending: false });
  if (error) gagal("Data produksi gagal dimuat.", error);
  return (data as ProduksiRow[]).map(fromProduksiRow);
}

export async function saveProduction(p: Produksi): Promise<void> {
  const { error } = await supabase
    .from("productions")
    .insert({ id: p.id, ...toProduksiRow(p) });
  if (error) gagal("Data produksi gagal disimpan.", error);
}

export async function updateProduction(id: number, p: Partial<Produksi>): Promise<void> {
  const { error } = await supabase.from("productions").update(toProduksiRow(p)).eq("id", id);
  if (error) gagal("Data produksi gagal diperbarui.", error);
}

export async function deleteProduction(id: number): Promise<void> {
  const { error } = await supabase.from("productions").delete().eq("id", id);
  if (error) gagal("Data produksi gagal dihapus.", error);
}
