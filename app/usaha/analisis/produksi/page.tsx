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

function laporGagal(err: unknown) {
  window.alert(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
}

export default function ProduksiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [komoditas, setKomoditas] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("kg");
  const [tanggalTanam, setTanggalTanam] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [tanggalPanen, setTanggalPanen] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const [list, setList] = useState<Produksi[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Produksi | null>(null);

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
    if (!komoditas || !jumlah) return;

    const newItem: Produksi = {
      id: newRowId(),
      komoditas,
      jumlah: Number(jumlah),
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
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduction(id);
      setList((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      laporGagal(err);
    }
  };

  const startEdit = (item: Produksi) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    if (!editData || editingId === null) return;
    try {
      await updateProduction(editingId, editData);
    } catch (err) {
      laporGagal(err);
      return;
    }
    setList((current) =>
      current.map((item) => (item.id === editingId ? editData : item))
    );
    setEditingId(null);
    setEditData(null);
  };

  const formatTanggal = (tgl: string) => {
    if (!tgl) return "-";
    const d = new Date(tgl);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hasil Panen / Target
                  </label>
                  <input
                    type="number"
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    placeholder="Contoh: 500"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
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
                    onChange={(e) => setTanggalPanen(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
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
                                  type="number"
                                  value={editData.jumlah}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      jumlah: Number(e.target.value),
                                    })
                                  }
                                  className="border rounded px-2 py-1 text-xs w-20"
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
                              <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className="text-green-600 p-1"
                                  aria-label="Simpan"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-gray-500 p-1"
                                  aria-label="Batal"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {item.komoditas}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.jumlah.toLocaleString("id-ID")}{" "}
                                {item.satuan}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatTanggal(item.tanggalTanam)}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatTanggal(item.tanggalPanen)}
                              </td>
                              <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="text-blue-600 hover:text-blue-800"
                                  aria-label={`Ubah ${item.komoditas}`}
                                >
                                  <Edit2 className="w-4 h-4 inline" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                  aria-label={`Hapus ${item.komoditas}`}
                                >
                                  <Trash2 className="w-4 h-4 inline" />
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
