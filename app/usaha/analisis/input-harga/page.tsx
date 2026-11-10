"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/analisis/top-nav";
import { Sidebar } from "@/components/analisis/sidebar";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import {
  deleteTransaction,
  getTransactions,
  newRowId,
  saveTransaction,
  updateTransaction,
  type Transaksi,
} from "@/lib/analisis/api";
import { NumberInput } from "@/components/forms/number-input";
import {
  formatNumber,
  formatRupiah,
  formatTanggal,
  parseDecimal,
  positiveNumberError,
  todayWIB,
} from "@/lib/format";

type Transaction = Transaksi;
/** Row being edited: numbers stay as typed text until they are saved. */
type EditRow = Omit<Transaction, "jumlah" | "harga"> & { jumlah: string; harga: string };

const ICON_BUTTON =
  "inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100";

function laporGagal(err: unknown) {
  window.alert(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
}

export default function InputTransaksiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tanggal, setTanggal] = useState(() => todayWIB());
  const [tipe, setTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kategori, setKategori] = useState<"operasional" | "aset">(
    "operasional"
  );
  const [deskripsi, setDeskripsi] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("kg");
  const [harga, setHarga] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditRow | null>(null);
  const [formErrors, setFormErrors] = useState<{ jumlah?: string; harga?: string }>({});
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let mounted = true;
    getTransactions()
      .then((rows) => {
        if (mounted) setTransactions(rows);
      })
      .catch(laporGagal);
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      jumlah: positiveNumberError(jumlah) ?? undefined,
      harga: positiveNumberError(harga) ?? undefined,
    };
    setFormErrors(errors);
    if (!deskripsi.trim() || errors.jumlah || errors.harga) return;

    const newItem: Transaction = {
      id: newRowId(),
      tanggal,
      tipe,
      kategori: tipe === "pengeluaran" ? kategori : undefined,
      deskripsi: deskripsi.trim(),
      jumlah: parseDecimal(jumlah)!,
      satuan,
      harga: parseDecimal(harga)!,
    };

    try {
      await saveTransaction(newItem);
    } catch (err) {
      laporGagal(err);
      return;
    }

    setTransactions((current) => [newItem, ...current]);
    setDeskripsi("");
    setJumlah("");
    setHarga("");
    setFormErrors({});
  };

  const handleDelete = async (item: Transaction) => {
    if (
      !window.confirm(
        `Hapus transaksi ini?\n\n${item.deskripsi} (${formatTanggal(item.tanggal)})`
      )
    ) {
      return;
    }
    const id = item.id;
    try {
      await deleteTransaction(id);
      setTransactions((current) => current.filter((t) => t.id !== id));
    } catch (err) {
      laporGagal(err);
    }
  };

  const startEdit = (item: Transaction) => {
    setEditingId(item.id);
    setEditData({
      ...item,
      jumlah: String(item.jumlah).replace(".", ","),
      harga: String(item.harga).replace(".", ","),
    });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editData || editingId === null) return;
    const jumlahBaru = parseDecimal(editData.jumlah);
    const hargaBaru = parseDecimal(editData.harga);
    if (!editData.deskripsi.trim()) {
      setEditError("Deskripsi wajib diisi.");
      return;
    }
    if (jumlahBaru === null || jumlahBaru <= 0 || hargaBaru === null || hargaBaru <= 0) {
      setEditError("Jumlah dan harga harus angka lebih dari 0.");
      return;
    }
    setEditError("");
    const updated: Transaction = {
      ...editData,
      deskripsi: editData.deskripsi.trim(),
      jumlah: jumlahBaru,
      harga: hargaBaru,
      kategori: editData.tipe === "pengeluaran" ? editData.kategori || "operasional" : undefined,
    };
    try {
      await updateTransaction(editingId, { ...updated, kategori: updated.kategori ?? "" });
    } catch (err) {
      laporGagal(err);
      return;
    }
    setTransactions((current) =>
      current.map((t) => (t.id === editingId ? updated : t))
    );
    setEditingId(null);
    setEditData(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <main className="p-4 md:p-6 space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Input Transaksi Keuangan
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                Catat pemasukan dan pengeluaran usaha dengan tanggal yang
                sesuai.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipe Transaksi
                  </label>
                  <select
                    value={tipe}
                    onChange={(e) =>
                      setTipe(e.target.value as "pemasukan" | "pengeluaran")
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none bg-white"
                  >
                    <option value="pemasukan">Pemasukan (Penjualan)</option>
                    <option value="pengeluaran">Pengeluaran (Biaya)</option>
                  </select>
                </div>

                {tipe === "pengeluaran" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Kategori Biaya
                    </label>
                    <select
                      value={kategori}
                      onChange={(e) =>
                        setKategori(e.target.value as "operasional" | "aset")
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none bg-white"
                    >
                      <option value="operasional">
                        Biaya Operasional (Pupuk, Bibit, Tenaga)
                      </option>
                      <option value="aset">
                        Pembelian Aset (Alat Tani, Mesin)
                      </option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nama Barang / Deskripsi
                    </label>
                    <input
                      type="text"
                      value={deskripsi}
                      onChange={(e) => setDeskripsi(e.target.value)}
                      placeholder="Contoh: Padi, Jagung"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              {tipe === "pengeluaran" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nama Barang / Deskripsi Pengeluaran
                  </label>
                  <input
                    type="text"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder={
                      kategori === "aset"
                        ? "Contoh: Traktor, Cangkul"
                        : "Contoh: Pupuk Urea, Bibit Padi"
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="transaksi-jumlah" className="block text-xs font-medium text-gray-700 mb-1">
                    Jumlah
                  </label>
                  <NumberInput
                    id="transaksi-jumlah"
                    value={jumlah}
                    onValueChange={(v) => {
                      setJumlah(v);
                      setFormErrors((e) => ({ ...e, jumlah: undefined }));
                    }}
                    error={formErrors.jumlah}
                    placeholder="Contoh: 100 atau 2,5"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-base md:text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none bg-white"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ton">Ton</option>
                    <option value="kwintal">Kwintal</option>
                    <option value="liter">Liter</option>
                    <option value="karung">Karung</option>
                    <option value="ikat">Ikat</option>
                    <option value="buah">Buah</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="transaksi-harga" className="block text-xs font-medium text-gray-700 mb-1">
                    Harga per Satuan (Rp)
                  </label>
                  <NumberInput
                    id="transaksi-harga"
                    value={harga}
                    onValueChange={(v) => {
                      setHarga(v);
                      setFormErrors((e) => ({ ...e, harga: undefined }));
                    }}
                    error={formErrors.harga}
                    placeholder="Contoh: 12000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-base md:text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d6a4f] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Simpan Transaksi
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">
                  Riwayat Transaksi
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                      <th className="px-4 py-3 whitespace-nowrap">Tipe</th>
                      <th className="px-4 py-3 whitespace-nowrap">Deskripsi</th>
                      <th className="px-4 py-3 whitespace-nowrap">Jumlah</th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        Harga Satuan
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">Total</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Belum ada transaksi
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          {editingId === t.id && editData ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editData.tanggal}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      tanggal: e.target.value,
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs w-32"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={editData.tipe}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      tipe: e.target.value as
                                        | "pemasukan"
                                        | "pengeluaran",
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                >
                                  <option value="pemasukan">Pemasukan</option>
                                  <option value="pengeluaran">
                                    Pengeluaran
                                  </option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editData.deskripsi}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      deskripsi: e.target.value,
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs w-32"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label="Jumlah"
                                  value={editData.jumlah}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      jumlah: e.target.value,
                                    })
                                  }
                                  aria-invalid={positiveNumberError(editData.jumlah) ? true : undefined}
                                  className="border rounded px-2 py-1 text-xs w-20 aria-[invalid=true]:border-red-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label="Harga per satuan"
                                  value={editData.harga}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      harga: e.target.value,
                                    })
                                  }
                                  aria-invalid={positiveNumberError(editData.harga) ? true : undefined}
                                  className="border rounded px-2 py-1 text-xs w-24 aria-[invalid=true]:border-red-500"
                                />
                              </td>
                              <td className="px-3 py-2 font-semibold whitespace-nowrap">
                                {formatRupiah(
                                  (parseDecimal(editData.jumlah) ?? 0) *
                                    (parseDecimal(editData.harga) ?? 0)
                                )}
                                {editError && (
                                  <p role="alert" className="text-xs font-normal text-red-600 whitespace-normal">
                                    {editError}
                                  </p>
                                )}
                              </td>
                              <td className="px-2 py-1 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className={`${ICON_BUTTON} text-green-600`}
                                  aria-label="Simpan perubahan"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditError("");
                                  }}
                                  className={`${ICON_BUTTON} text-gray-500`}
                                  aria-label="Batal"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatTanggal(t.tanggal)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    t.tipe === "pemasukan"
                                      ? "bg-green-100 text-green-800"
                                      : t.kategori === "aset"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {t.tipe === "pemasukan"
                                    ? "Pemasukan"
                                    : t.kategori === "aset"
                                      ? "Aset"
                                      : "Biaya Operasional"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {t.deskripsi}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatNumber(t.jumlah)} {t.satuan}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatRupiah(t.harga)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {formatRupiah(t.jumlah * t.harga)}
                              </td>
                              <td className="px-2 py-1 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => startEdit(t)}
                                  className={`${ICON_BUTTON} text-blue-600 hover:text-blue-800`}
                                  aria-label={`Ubah ${t.deskripsi}`}
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(t)}
                                  className={`${ICON_BUTTON} text-red-600 hover:text-red-700`}
                                  aria-label={`Hapus ${t.deskripsi}`}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
