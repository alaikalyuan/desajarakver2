"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/analisis/top-nav";
import { Sidebar } from "@/components/analisis/sidebar";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import {
  deleteProduction,
  getProductions,
  newRowId,
  saveProduction,
  updateProduction,
  type Produksi,
} from "@/lib/analisis/api";
import { NumberInput } from "@/components/forms/number-input";
import {
  formatNumber,
  formatTanggal,
  parseDecimal,
  positiveNumberError,
  todayWIB,
} from "@/lib/format";

type EditRow = Omit<Produksi, "jumlah"> & { jumlah: string };

const ICON_BUTTON =
  "inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100";

const PANEN_SEBELUM_TANAM = "Tanggal panen tidak boleh sebelum tanggal tanam.";

/** Error text when the harvest date is before the planting date. */
function cekTanggal(tanam: string, panen: string): string | null {
  return tanam && panen && panen < tanam ? PANEN_SEBELUM_TANAM : null;
}

function laporGagal(err: unknown) {
  window.alert(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
}

export default function ProduksiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [komoditas, setKomoditas] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("kg");
  const [tanggalTanam, setTanggalTanam] = useState(() => todayWIB());
  const [tanggalPanen, setTanggalPanen] = useState(() => todayWIB());
  const [jumlahError, setJumlahError] = useState<string | null>(null);

  const [list, setList] = useState<Produksi[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditRow | null>(null);
  const [editError, setEditError] = useState("");
  const tanggalError = cekTanggal(tanggalTanam, tanggalPanen);

  useEffect(() => {
    let mounted = true;
    getProductions()
      .then((rows) => {
        if (mounted) setList(rows);
      })
      .catch(laporGagal);
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errJumlah = positiveNumberError(jumlah);
    setJumlahError(errJumlah);
    if (!komoditas.trim() || errJumlah || tanggalError) return;

    const newItem: Produksi = {
      id: newRowId(),
      komoditas: komoditas.trim(),
      jumlah: parseDecimal(jumlah)!,
      satuan,
      tanggalTanam,
      tanggalPanen,
    };

    try {
      await saveProduction(newItem);
    } catch (err) {
      laporGagal(err);
      return;
    }

    setList((current) => [newItem, ...current]);
    setKomoditas("");
    setJumlah("");
    setJumlahError(null);
  };

  const handleDelete = async (item: Produksi) => {
    if (!window.confirm(`Hapus data produksi ini?\n\n${item.komoditas}`)) {
      return;
    }
    const id = item.id;
    try {
      await deleteProduction(id);
      setList((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      laporGagal(err);
    }
  };

  const startEdit = (item: Produksi) => {
    setEditingId(item.id);
    setEditData({ ...item, jumlah: String(item.jumlah).replace(".", ",") });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editData || editingId === null) return;
    const jumlahBaru = parseDecimal(editData.jumlah);
    if (!editData.komoditas.trim()) {
      setEditError("Nama komoditas wajib diisi.");
      return;
    }
    if (jumlahBaru === null || jumlahBaru <= 0) {
      setEditError("Jumlah harus angka lebih dari 0.");
      return;
    }
    const errTanggal = cekTanggal(editData.tanggalTanam, editData.tanggalPanen);
    if (errTanggal) {
      setEditError(errTanggal);
      return;
    }
    setEditError("");
    const updated: Produksi = {
      ...editData,
      komoditas: editData.komoditas.trim(),
      jumlah: jumlahBaru,
    };
    try {
      await updateProduction(editingId, updated);
    } catch (err) {
      laporGagal(err);
      return;
    }
    setList((current) =>
      current.map((item) => (item.id === editingId ? updated : item))
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
                Data Produksi Pertanian
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                Catat jadwal tanam dan hasil panen komoditas desa.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nama Komoditas
                  </label>
                  <input
                    type="text"
                    value={komoditas}
                    onChange={(e) => setKomoditas(e.target.value)}
                    placeholder="Contoh: Padi, Cabai"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="produksi-jumlah" className="block text-xs font-medium text-gray-700 mb-1">
                    Hasil Panen / Target
                  </label>
                  <NumberInput
                    id="produksi-jumlah"
                    value={jumlah}
                    onValueChange={(v) => {
                      setJumlah(v);
                      setJumlahError(null);
                    }}
                    error={jumlahError}
                    placeholder="Contoh: 500 atau 2,5"
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
                    <option value="ikat">Ikat</option>
                    <option value="karung">Karung</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Tanam
                  </label>
                  <input
                    type="date"
                    value={tanggalTanam}
                    onChange={(e) => setTanggalTanam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Panen (atau Estimasi)
                  </label>
                  <input
                    type="date"
                    value={tanggalPanen}
                    min={tanggalTanam || undefined}
                    onChange={(e) => setTanggalPanen(e.target.value)}
                    aria-invalid={tanggalError ? true : undefined}
                    aria-describedby={tanggalError ? "produksi-tanggal-error" : undefined}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none aria-[invalid=true]:border-red-500"
                    required
                  />
                  {tanggalError && (
                    <p id="produksi-tanggal-error" role="alert" className="mt-1 text-xs text-red-600">
                      {tanggalError}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d6a4f] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Data Produksi
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Daftar Produksi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Komoditas</th>
                      <th className="px-4 py-3 whitespace-nowrap">Jumlah</th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        Tanggal Tanam
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        Tanggal Panen
                      </th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Belum ada data produksi
                        </td>
                      </tr>
                    ) : (
                      list.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          {editingId === item.id && editData ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editData.komoditas}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      komoditas: e.target.value,
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs w-28"
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
                                  type="date"
                                  value={editData.tanggalTanam}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      tanggalTanam: e.target.value,
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editData.tanggalPanen}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      tanggalPanen: e.target.value,
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="px-2 py-1 text-right whitespace-nowrap">
                                {editError && (
                                  <p role="alert" className="text-xs text-red-600 whitespace-normal text-left">
                                    {editError}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className={`${ICON_BUTTON} text-green-600`}
                                  aria-label="Simpan"
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
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {item.komoditas}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatNumber(item.jumlah)}{" "}
                                {item.satuan}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatTanggal(item.tanggalTanam)}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatTanggal(item.tanggalPanen)}
                              </td>
                              <td className="px-2 py-1 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className={`${ICON_BUTTON} text-blue-600 hover:text-blue-800`}
                                  aria-label={`Ubah ${item.komoditas}`}
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className={`${ICON_BUTTON} text-red-600 hover:text-red-700`}
                                  aria-label={`Hapus ${item.komoditas}`}
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
