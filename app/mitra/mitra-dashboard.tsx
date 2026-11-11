"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, type FormEntry } from "@/lib/forms/form-flow";
import {
  closeListing,
  deleteDraft,
  respondToOffer,
  type ListingInterest,
} from "@/lib/listings";
import { fetchMitraDashboard, type MitraDashboardData } from "@/lib/dashboard-data";
import { telUrl, whatsAppUrl } from "@/lib/contact";
import { toKg } from "@/lib/units";
import "./mitra-dashboard.css";

interface IncomingOfferItem {
  id: number | string;
  penawar: string;
  lokasi: string;
  komoditas: string;
  volume: string;
  volumeKg: number;
  harga: number;
  hargaLabel: string;
  tanggal: string;
  tanggalLabel: string;
  status: OfferStatusLabel;
  rawStatus: string;
  kontak: string;
  permintaan: string;
}

type OfferStatusLabel = "Menunggu" | "Diterima" | "Selesai" | "Ditolak";

const OFFER_STATUS_LABEL: Record<string, OfferStatusLabel> = {
  sent: "Menunggu",
  accepted: "Diterima",
  completed: "Selesai",
  rejected: "Ditolak",
};

const STATUS_CLASS: Record<string, string> = {
  Menunggu: "wait",
  Diterima: "progress",
  Selesai: "done",
  Ditolak: "rejected",
};

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draf", cls: "wait" },
  published: { label: "Tampil di Direktori", cls: "done" },
  closed: { label: "Ditutup", cls: "rejected" },
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Sort key only: the first price in a note like "Rp11.800 - Rp12.300/kg".
// The note itself is shown as the seller wrote it.
function firstPrice(note: string): number {
  const match = note.match(/\d[\d.]*/);
  return match ? Number(match[0].replace(/\./g, "")) || 0 : 0;
}

function toIncomingOffer(entry: FormEntry): IncomingOfferItem {
  const qtyNum = Number(entry.data.quantity) || 0;
  const priceNote = (entry.data.priceNote || "").trim();
  return {
    id: entry.id,
    penawar: entry.data.ownerName || "—",
    lokasi: entry.data.location || "—",
    komoditas: entry.data.variety || entry.data.productType,
    volume: `${entry.data.quantity} ${entry.data.unit}`,
    volumeKg: toKg(qtyNum, entry.data.unit) ?? qtyNum,
    harga: firstPrice(priceNote),
    hargaLabel: priceNote || "-",
    tanggal: entry.createdAt.slice(0, 10),
    tanggalLabel: formatTimestamp(entry.createdAt),
    status: OFFER_STATUS_LABEL[entry.status] || "Menunggu",
    rawStatus: entry.status,
    // Readable only once this offer is accepted (database rule).
    kontak: entry.data.phone || "",
    permintaan: entry.targetRequest?.productType || "—",
  };
}

interface MitraDashboardProps {
  userId: string;
  userName: string;
  initialData: MitraDashboardData;
}

export function MitraDashboard({ userId, userName, initialData }: MitraDashboardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "penawaran-masuk" | "permintaan-saya"
  >("penawaran-masuk");

  const [data, setData] = useState<MitraDashboardData>(initialData);
  const myRequests = data.requests;
  const interests = data.interests;
  const incomingOffers = useMemo(() => data.offers.map(toIncomingOffer), [data.offers]);

  // Filters for Penawaran Masuk
  const [activeStatusTab, setActiveStatusTab] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterBox, setShowFilterBox] = useState(false);
  const [commodityFilter, setCommodityFilter] = useState("semua");
  const [sortOrder, setSortOrder] = useState("terbaru");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [toastText, setToastText] = useState("");
  const [openInterestId, setOpenInterestId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setData(await fetchMitraDashboard(createClient(), userId));
  }, [userId]);

  async function handleRespond(item: IncomingOfferItem, decision: "accepted" | "rejected") {
    const question =
      decision === "accepted"
        ? `Terima penawaran ${item.komoditas} dari ${item.penawar}? Nomor WhatsApp Anda dan penawar akan saling terlihat.`
        : `Tolak penawaran ${item.komoditas} dari ${item.penawar}? Keputusan ini tidak bisa dibatalkan.`;
    if (!window.confirm(question)) return;
    setBusyId(String(item.id));
    try {
      await respondToOffer(String(item.id), decision);
      showToast(
        decision === "accepted"
          ? "Penawaran diterima. Hubungi penawar lewat WhatsApp."
          : "Penawaran ditolak."
      );
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Tanggapan gagal disimpan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCloseRequest(req: FormEntry) {
    if (
      !window.confirm(
        `Tutup permintaan ${req.reference}? Permintaan akan hilang dari direktori dan tidak menerima penawaran baru.`
      )
    )
      return;
    setBusyId(req.id);
    try {
      await closeListing(req.id);
      showToast("Permintaan ditutup.");
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menutup permintaan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteDraft(req: FormEntry) {
    if (!window.confirm(`Hapus draf ${req.reference}? Draf yang dihapus tidak bisa dikembalikan.`))
      return;
    setBusyId(req.id);
    try {
      await deleteDraft(req.id);
      showToast("Draf dihapus.");
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Draf gagal dihapus.");
    } finally {
      setBusyId(null);
    }
  }

  const interestsByListing = useMemo(() => {
    const map: Record<string, ListingInterest[]> = {};
    interests.forEach((i) => {
      (map[i.listingId] ||= []).push(i);
    });
    return map;
  }, [interests]);

  function showToast(message: string) {
    setToastText(message);
    setTimeout(() => {
      setToastText("");
    }, 3200);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const commodities = useMemo(
    () => [...new Set(incomingOffers.map((item) => item.komoditas))],
    [incomingOffers]
  );

  const counts = useMemo(
    () => ({
      semua: incomingOffers.length,
      Menunggu: incomingOffers.filter((i) => i.status === "Menunggu").length,
      Diterima: incomingOffers.filter((i) => i.status === "Diterima").length,
      Selesai: incomingOffers.filter((i) => i.status === "Selesai").length,
      Ditolak: incomingOffers.filter((i) => i.status === "Ditolak").length,
    }),
    [incomingOffers]
  );

  const filteredOffers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incomingOffers
      .filter(
        (item) => activeStatusTab === "semua" || item.status === activeStatusTab
      )
      .filter(
        (item) =>
          commodityFilter === "semua" || item.komoditas === commodityFilter
      )
      .filter((item) => {
        if (!q) return true;
        return [item.penawar, item.lokasi, item.komoditas, item.permintaan]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (sortOrder === "terlama")
          return a.tanggal.localeCompare(b.tanggal);
        if (sortOrder === "harga-rendah") return a.harga - b.harga;
        if (sortOrder === "harga-tinggi") return b.harga - a.harga;
        if (sortOrder === "volume-besar") return b.volumeKg - a.volumeKg;
        return b.tanggal.localeCompare(a.tanggal);
      });
  }, [
    incomingOffers,
    activeStatusTab,
    commodityFilter,
    searchQuery,
    sortOrder,
  ]);

  function handleExportCsv() {
    if (filteredOffers.length === 0) {
      showToast("Belum ada penawaran untuk disimpan.");
      return;
    }

    const header = [
      "No",
      "Nama Penawar",
      "Lokasi",
      "Komoditas",
      "Volume",
      "Harga",
      "Tanggal Pengajuan",
      "Status",
      "Kontak",
      "Permintaan Terkait",
    ];
    const lines = filteredOffers.map((item, idx) =>
      [
        idx + 1,
        item.penawar,
        item.lokasi,
        item.komoditas,
        item.volume,
        item.hargaLabel,
        item.tanggalLabel,
        item.status,
        item.kontak || "-",
        item.permintaan,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    );

    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "penawaran-masuk-desa-jarak.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${filteredOffers.length} penawaran disimpan ke file Excel (CSV).`);
  }

  return (
    <div className="mitra-dashboard-scope">
      <header className="topbar">
        <Link className="brand" href="/">
          <img
            src="/assets/logo-desa-jarak-96.png"
            alt="Logo Desa Jarak"
            className="brand-logo"
            width={36}
            height={40}
          />
          <span className="brand-name">
            Desa <span>Jarak</span>
          </span>
        </Link>

        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="mitra-menu"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <div id="mitra-menu" className={`topbar-menu ${menuOpen ? "open" : ""}`}>
          <nav className="topnav" aria-label="Menu utama">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Beranda
            </Link>
            <Link href="/direktori" onClick={() => setMenuOpen(false)}>
              Direktori Usaha
            </Link>
            <Link href="/mitra/permintaan/baru" onClick={() => setMenuOpen(false)}>
              + Buat Permintaan
            </Link>
          </nav>

          <div className="account">
            <span className="avatar" aria-hidden="true">
              {initials(userName)}
            </span>
            <span className="account-name">{userName}</span>
            <button type="button" className="account-logout" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </header>

      <aside className="sidebar" aria-label="Menu mitra">
        <nav>
          <button
            type="button"
            className={activeSection === "penawaran-masuk" ? "active" : ""}
            onClick={() => setActiveSection("penawaran-masuk")}
          >
            <span>Penawaran Masuk</span>
            <b>{counts.Menunggu}</b>
          </button>

          <button
            type="button"
            className={activeSection === "permintaan-saya" ? "active" : ""}
            onClick={() => setActiveSection("permintaan-saya")}
          >
            <span>Permintaan Saya</span>
            <b>{myRequests.length}</b>
          </button>

          <Link href="/mitra/permintaan/baru">
            <span>+ Buat Permintaan</span>
          </Link>
        </nav>

        <button type="button" onClick={handleLogout}>
          Keluar dari Akun
        </button>
      </aside>

      <main>
        {activeSection === "penawaran-masuk" ? (
          <>

            <section className="heading">
              <div>
                <h1>Penawaran Masuk</h1>
                <p>Penawaran dari pelaku usaha Desa Jarak untuk permintaan Anda.</p>
              </div>
              <div className="heading-actions">
                <Link className="primary" href="/mitra/permintaan/baru">
                  + Buat Permintaan
                </Link>
                <button
                  type="button"
                  className="outline"
                  onClick={handleExportCsv}
                >
                  Simpan ke Excel
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Daftar penawaran masuk">
              <div className="tabs" role="tablist" aria-label="Status penawaran">
                {(
                  [
                    { key: "semua", label: "Semua", badgeClass: "" },
                    { key: "Menunggu", label: "Menunggu", badgeClass: "amber" },
                    { key: "Diterima", label: "Diterima", badgeClass: "blue" },
                    { key: "Selesai", label: "Selesai", badgeClass: "green" },
                    { key: "Ditolak", label: "Ditolak", badgeClass: "red" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeStatusTab === tab.key}
                    className={`tab ${
                      activeStatusTab === tab.key ? "active" : ""
                    }`}
                    onClick={() => setActiveStatusTab(tab.key)}
                  >
                    {tab.label}
                    <span className={`count ${tab.badgeClass}`}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="tools">
                <label className="search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    aria-label="Cari penawaran"
                    placeholder="Cari penawar atau komoditas"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => setSearchQuery("")}
                    >
                      ×
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  className="outline"
                  aria-expanded={showFilterBox}
                  onClick={() => setShowFilterBox((prev) => !prev)}
                >
                  Saring & Urutkan
                </button>
              </div>

              {showFilterBox && (
                <div className="filters">
                  <label>
                    Komoditas
                    <select
                      value={commodityFilter}
                      onChange={(e) => setCommodityFilter(e.target.value)}
                    >
                      <option value="semua">Semua komoditas</option>
                      {commodities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Urutkan
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="terbaru">Terbaru</option>
                      <option value="terlama">Terlama</option>
                      <option value="harga-rendah">Harga terendah</option>
                      <option value="harga-tinggi">Harga tertinggi</option>
                      <option value="volume-besar">Volume terbesar</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="linkbutton"
                    onClick={() => {
                      setActiveStatusTab("semua");
                      setSearchQuery("");
                      setCommodityFilter("semua");
                      setSortOrder("terbaru");
                    }}
                  >
                    Hapus saringan
                  </button>
                </div>
              )}

              <div className="table-scroll">
                <table className="stack-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Penawar</th>
                      <th>Komoditas</th>
                      <th>Volume</th>
                      <th>Harga Penawaran</th>
                      <th>Tanggal Pengajuan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffers.map((item, idx) => {
                      const isExpanded = expandedId === item.id;
                      const statusCls = STATUS_CLASS[item.status] || "wait";

                      return (
                        <Fragment key={item.id}>
                          <tr>
                            <td className="cell-hide-mobile">{idx + 1}</td>
                            <td className="cell-title">
                              <div className="person">
                                <span
                                  className="person-icon"
                                  aria-hidden="true"
                                >
                                  {initials(item.penawar)}
                                </span>
                                <span>
                                  <strong>{item.penawar}</strong>
                                  <small>{item.lokasi}</small>
                                </span>
                              </div>
                            </td>
                            <td data-label="Komoditas">
                              <strong>{item.komoditas}</strong>
                            </td>
                            <td data-label="Jumlah">{item.volume}</td>
                            <td data-label="Harga">
                              <strong>{item.hargaLabel}</strong>
                            </td>
                            <td data-label="Tanggal" className="cell-first">
                              {item.tanggalLabel}
                            </td>
                            <td data-label="Status">
                              <span className={`status ${statusCls}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="cell-actions">
                              <button
                                type="button"
                                className="detail-button"
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : item.id)
                                }
                              >
                                {isExpanded ? "Tutup Detail" : "Lihat Detail"}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="expanded-row stack-full">
                              <td colSpan={8}>
                                <div className="expanded-panel">
                                  <div className="expanded-heading">
                                    <div>
                                      <small className="expanded-label">
                                        DETAIL PENAWARAN
                                      </small>
                                      <h3>
                                        {item.penawar} - {item.komoditas}
                                      </h3>
                                    </div>
                                    <span className={`status ${statusCls}`}>
                                      {item.status}
                                    </span>
                                  </div>

                                  <div className="expanded-grid">
                                    <div className="expanded-item">
                                      <span>Nama Penawar</span>
                                      <strong>{item.penawar}</strong>
                                    </div>
                                    <div className="expanded-item">
                                      <span>Lokasi</span>
                                      <strong>{item.lokasi}</strong>
                                    </div>
                                    <div className="expanded-item">
                                      <span>Komoditas</span>
                                      <strong>{item.komoditas}</strong>
                                    </div>
                                    <div className="expanded-item">
                                      <span>Volume</span>
                                      <strong>{item.volume}</strong>
                                    </div>
                                    <div className="expanded-item">
                                      <span>Harga Penawaran</span>
                                      <strong>{item.hargaLabel}</strong>
                                    </div>
                                    <div className="expanded-item">
                                      <span>Kontak Penawar</span>
                                      <strong>
                                        {item.rawStatus === "sent"
                                          ? "Terlihat setelah Anda menerima penawaran"
                                          : telUrl(item.kontak) ? (
                                              <a href={telUrl(item.kontak)!}>{item.kontak}</a>
                                            ) : (
                                              item.kontak || "-"
                                            )}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="expanded-request">
                                    <span>Permintaan Terkait</span>
                                    <strong>{item.permintaan}</strong>
                                  </div>

                                  <div className="expanded-actions">
                                    <button
                                      type="button"
                                      className="outline"
                                      onClick={() => setExpandedId(null)}
                                    >
                                      Tutup Detail
                                    </button>
                                    {item.rawStatus === "sent" && (
                                      <>
                                        <button
                                          type="button"
                                          className="outline danger"
                                          disabled={busyId === String(item.id)}
                                          onClick={() => handleRespond(item, "rejected")}
                                        >
                                          Tolak
                                        </button>
                                        <button
                                          type="button"
                                          className="primary"
                                          disabled={busyId === String(item.id)}
                                          onClick={() => handleRespond(item, "accepted")}
                                        >
                                          Terima Penawaran
                                        </button>
                                      </>
                                    )}
                                    {item.rawStatus !== "sent" && whatsAppUrl(item.kontak) && (
                                      <a
                                        className="primary"
                                        href={
                                          whatsAppUrl(
                                            item.kontak,
                                            `Halo ${item.penawar}, saya menanggapi penawaran ${item.komoditas} Anda di Desa Jarak.`
                                          )!
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Hubungi lewat WhatsApp
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {incomingOffers.length === 0 ? (
                <div className="empty">
                  <h2>Belum ada penawaran untuk permintaan Anda</h2>
                  <p>
                    Penawaran dari pelaku usaha desa akan muncul di sini setelah
                    permintaan Anda tampil di Direktori.
                  </p>
                </div>
              ) : (
                filteredOffers.length === 0 && (
                  <div className="empty">
                    <h2>Tidak ada penawaran yang cocok</h2>
                    <p>Coba kata lain, atau hapus saringan.</p>
                  </div>
                )
              )}

              <footer className="footer">
                <span>
                  Menampilkan {filteredOffers.length} dari{" "}
                  {incomingOffers.length} penawaran
                </span>
              </footer>
            </section>
          </>
        ) : (
          <>

            <section className="heading">
              <div>
                <h1>Permintaan Saya</h1>
                <p>Permintaan yang Anda simpan sebagai draf atau tampilkan di Direktori.</p>
              </div>
              <Link className="primary" href="/mitra/permintaan/baru">
                + Buat Permintaan
              </Link>
            </section>

            <section className="panel">
              {myRequests.length === 0 ? (
                <div className="empty">
                  <h2>Belum ada permintaan</h2>
                  <p style={{ marginBottom: 16 }}>
                    Tulis kebutuhan Anda agar pelaku usaha Desa Jarak bisa
                    mengirim penawaran.
                  </p>
                  <Link className="primary" href="/mitra/permintaan/baru">
                    + Buat Permintaan
                  </Link>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="stack-table">
                    <thead>
                      <tr>
                        <th>Referensi</th>
                        <th>Komoditas</th>
                        <th>Jumlah</th>
                        <th>Dibutuhkan</th>
                        <th>Cara Kerja Sama</th>
                        <th>Status</th>
                        <th>Diperbarui</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map((req) => (
                        <Fragment key={req.id}>
                        <tr>
                          <td data-label="Kode">
                            <strong>{req.reference}</strong>
                          </td>
                          <td className="cell-title">
                            <strong>{req.data.productType}</strong>
                            <div className="cell-sub">
                              {req.data.variety || req.data.grade}
                            </div>
                          </td>
                          <td data-label="Jumlah">
                            {req.data.quantity} {req.data.unit} ({req.data.frequency})
                          </td>
                          <td data-label="Dibutuhkan">{req.data.neededDate || "-"}</td>
                          <td data-label="Cara Kerja Sama">{req.data.partnershipScheme}</td>
                          <td data-label="Status">
                            <span
                              className={`status ${
                                (REQUEST_STATUS[req.status] || REQUEST_STATUS.published).cls
                              }`}
                            >
                              {(REQUEST_STATUS[req.status] || REQUEST_STATUS.published).label}
                            </span>
                            {(interestsByListing[req.id]?.length ?? 0) > 0 && (
                              <button
                                type="button"
                                className="linkbutton interest-toggle"
                                aria-expanded={openInterestId === req.id}
                                onClick={() =>
                                  setOpenInterestId(openInterestId === req.id ? null : req.id)
                                }
                              >
                                {interestsByListing[req.id].length} orang tertarik
                              </button>
                            )}
                          </td>
                          <td data-label="Diperbarui" className="cell-first">
                            {formatTimestamp(req.updatedAt)}
                          </td>
                          <td className="cell-actions">
                            <div className="row-actions">
                              {req.status === "draft" && (
                                <>
                                  <Link
                                    href={`/mitra/permintaan/baru?entryId=${encodeURIComponent(
                                      req.id
                                    )}`}
                                    className="detail-button"
                                  >
                                    Lanjutkan Draf
                                  </Link>
                                  <button
                                    type="button"
                                    className="detail-button danger"
                                    disabled={busyId === req.id}
                                    onClick={() => handleDeleteDraft(req)}
                                  >
                                    Hapus
                                  </button>
                                </>
                              )}
                              {req.status === "published" && (
                                <>
                                  <Link
                                    href={`/mitra/permintaan/baru?entryId=${encodeURIComponent(
                                      req.id
                                    )}`}
                                    className="detail-button"
                                  >
                                    Ubah
                                  </Link>
                                  <button
                                    type="button"
                                    className="detail-button danger"
                                    disabled={busyId === req.id}
                                    onClick={() => handleCloseRequest(req)}
                                  >
                                    Tutup Permintaan
                                  </button>
                                </>
                              )}
                              {req.status === "closed" && <span>—</span>}
                            </div>
                          </td>
                        </tr>
                        {openInterestId === req.id && (
                          <tr className="expanded-row stack-full">
                            <td colSpan={8}>
                              <InterestList items={interestsByListing[req.id] || []} />
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <p className="note">
          Butuh bantuan memilih pemasok? Hubungi kantor Desa Jarak.
        </p>
      </main>

      {toastText && (
        <div className="toast" role="status" aria-live="polite">
          {toastText}
        </div>
      )}
    </div>
  );
}

function InterestList({ items }: { items: ListingInterest[] }) {
  return (
    <div className="expanded-panel">
      <small className="expanded-label">YANG MENYATAKAN MINAT</small>
      <ul className="interest-list">
        {items.map((person) => (
          <li key={`${person.listingId}-${person.createdAt}`}>
            <strong>{person.name}</strong>
            <span>{formatTimestamp(person.createdAt)}</span>
            {whatsAppUrl(person.phone) ? (
              <a
                href={
                  whatsAppUrl(
                    person.phone,
                    `Halo ${person.name}, terima kasih sudah tertarik dengan listing saya di Desa Jarak.`
                  )!
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp {person.phone}
              </a>
            ) : (
              <span>Nomor HP belum dicantumkan</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
