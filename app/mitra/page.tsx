"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, type FormEntry } from "@/lib/forms/form-flow";
import { rowToFormEntry } from "@/lib/listings";
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
  kontak: string;
  permintaan: string;
}

type OfferStatusLabel =
  | "Menunggu Respons"
  | "Dalam Proses"
  | "Terlaksana"
  | "Ditolak";

// Same labels as V1 (sub-login-mitra.js STATUS_PENAWARAN).
const OFFER_STATUS_LABEL: Record<string, OfferStatusLabel> = {
  sent: "Menunggu Respons",
  accepted: "Dalam Proses",
  completed: "Terlaksana",
  rejected: "Ditolak",
};

const STATUS_CLASS: Record<string, string> = {
  "Menunggu Respons": "wait",
  "Dalam Proses": "progress",
  Terlaksana: "done",
  Ditolak: "rejected",
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

export default function MitraDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Mitra Desa Jarak");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "penawaran-masuk" | "permintaan-saya"
  >("penawaran-masuk");

  const [incomingOffers, setIncomingOffers] = useState<IncomingOfferItem[]>([]);
  const [myRequests, setMyRequests] = useState<FormEntry[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Filters for Penawaran Masuk
  const [activeStatusTab, setActiveStatusTab] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterBox, setShowFilterBox] = useState(false);
  const [commodityFilter, setCommodityFilter] = useState("semua");
  const [sortOrder, setSortOrder] = useState("terbaru");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboard() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserName(
          profile.business_name || profile.full_name || "Mitra Desa Jarak"
        );
      }

      // Load Mitra's own requests
      const { data: reqRows } = await supabase
        .from("listings")
        .select(
          "id, owner_id, kind, status, reference, request_id, format, data, photo_path, created_at, updated_at, listing_contacts(contact)"
        )
        .eq("owner_id", session.user.id)
        .eq("kind", "request")
        .eq("format", "form")
        .order("updated_at", { ascending: false });

      const mappedReqs = (reqRows || []).map((r) =>
        rowToFormEntry(r as Record<string, unknown>)
      );
      setMyRequests(mappedReqs);
      setLoadingRequests(false);

      // Offers sent to this mitra's own requests (published, not drafts).
      const requestIds = mappedReqs
        .filter((r) => r.status !== "draft")
        .map((r) => r.id);
      if (requestIds.length === 0) return;

      const { data: offerRows } = await supabase
        .from("listings")
        .select(
          "id, owner_id, kind, status, reference, request_id, format, data, photo_path, created_at, updated_at, listing_contacts(contact)"
        )
        .eq("kind", "offer")
        .in("status", ["sent", "accepted", "rejected", "completed"])
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      if (offerRows && offerRows.length > 0) {
        const liveOffers: IncomingOfferItem[] = offerRows.map((row) => {
          const entry = rowToFormEntry(row as Record<string, unknown>);
          const qtyNum = Number(entry.data.quantity) || 0;
          const volKg = toKg(qtyNum, entry.data.unit) ?? qtyNum;
          const priceNote = (entry.data.priceNote || "").trim();
          return {
            id: entry.id,
            penawar: entry.data.ownerName || "—",
            lokasi: entry.data.location || "—",
            komoditas: entry.data.variety || entry.data.productType,
            volume: `${entry.data.quantity} ${entry.data.unit}`,
            volumeKg: volKg,
            harga: firstPrice(priceNote),
            hargaLabel: priceNote || "-",
            tanggal: entry.createdAt.slice(0, 10),
            tanggalLabel: formatTimestamp(entry.createdAt),
            status: OFFER_STATUS_LABEL[entry.status] || "Menunggu Respons",
            kontak: entry.data.phone || "-",
            permintaan:
              entry.targetRequest?.productType ||
              "Permintaan Kemitraan Direktori",
          };
        });
        setIncomingOffers(liveOffers);
      }
    }

    loadDashboard();
  }, []);

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
      "Menunggu Respons": incomingOffers.filter(
        (i) => i.status === "Menunggu Respons"
      ).length,
      "Dalam Proses": incomingOffers.filter((i) => i.status === "Dalam Proses").length,
      Terlaksana: incomingOffers.filter((i) => i.status === "Terlaksana").length,
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
      showToast("Tidak ada data penawaran untuk diekspor.");
      return;
    }

    const header = [
      "No",
      "Nama Penawar",
      "Lokasi",
      "Komoditas",
      "Volume",
      "Harga per Kg",
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
        item.kontak,
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
    showToast(`${filteredOffers.length} data penawaran berhasil diekspor.`);
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

        <nav className="topnav" aria-label="Menu utama">
          <Link href="/">BERANDA</Link>
          <Link href="/direktori">DIREKTORI USAHA</Link>
          <Link href="/mitra/permintaan/baru">+ AJUKAN PERMINTAAN</Link>
        </nav>

        <div className="account">
          <span className="avatar" aria-hidden="true">
            {initials(userName)}
          </span>
          <button
            type="button"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((prev) => !prev)}
          >
            {userName} <span aria-hidden="true">▾</span>
          </button>
          {accountMenuOpen && (
            <div className="account-menu">
              <Link href="/direktori">Buka Direktori Usaha</Link>
              <Link href="/mitra/permintaan/baru">Buat Permintaan Baru</Link>
              <button type="button" onClick={handleLogout}>
                Keluar
              </button>
            </div>
          )}
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
            <b>{counts["Menunggu Respons"]}</b>
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

          <Link href="/direktori">
            <span>Direktori Usaha</span>
          </Link>
        </nav>

        <button type="button" onClick={handleLogout}>
          Keluar dari Akun
        </button>
      </aside>

      <main>
        {activeSection === "penawaran-masuk" ? (
          <>
            <p className="crumb">
              Dashboard Mitra / <b>Penawaran Masuk</b>
            </p>

            <section className="heading">
              <div>
                <h1>Penawaran Masuk</h1>
                <p>
                  Kelola penawaran komoditas dari pelaku usaha Desa Jarak yang
                  masuk ke permintaan Anda.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="primary" href="/mitra/permintaan/baru">
                  + Buat Permintaan Kemitraan
                </Link>
                <button
                  type="button"
                  className="outline"
                  onClick={handleExportCsv}
                >
                  Ekspor Data (CSV)
                </button>
              </div>
            </section>

            <section className="panel" aria-label="Daftar penawaran masuk">
              <div className="tabs" role="tablist" aria-label="Status penawaran">
                {(
                  [
                    { key: "semua", label: "Semua", badgeClass: "" },
                    {
                      key: "Menunggu Respons",
                      label: "Menunggu Respons",
                      badgeClass: "amber",
                    },
                    { key: "Dalam Proses", label: "Dalam Proses", badgeClass: "blue" },
                    { key: "Terlaksana", label: "Terlaksana", badgeClass: "green" },
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
                <label className="search" aria-label="Cari penawaran">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder="Cari nama penawar, komoditas, atau lokasi..."
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
                  Filter & Urutkan
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
                    Atur ulang
                  </button>
                </div>
              )}

              <div className="table-scroll">
                <table>
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
                            <td>{idx + 1}</td>
                            <td>
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
                            <td>
                              <strong>{item.komoditas}</strong>
                            </td>
                            <td>{item.volume}</td>
                            <td>
                              <strong>{item.hargaLabel}</strong>
                            </td>
                            <td>{item.tanggalLabel}</td>
                            <td>
                              <span className={`status ${statusCls}`}>
                                {item.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="detail-button"
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : item.id)
                                }
                              >
                                {isExpanded ? "Tutup ▲" : "Lihat Detail ▾"}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="expanded-row">
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
                                        {telUrl(item.kontak) ? (
                                          <a href={telUrl(item.kontak)!}>{item.kontak}</a>
                                        ) : (
                                          item.kontak
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
                                    {whatsAppUrl(item.kontak) && (
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
                    permintaan Anda diterbitkan di direktori.
                  </p>
                </div>
              ) : (
                filteredOffers.length === 0 && (
                  <div className="empty">
                    <h2>Tidak ada penawaran yang cocok</h2>
                    <p>
                      Coba ubah kata kunci pencarian atau atur ulang filter di
                      atas.
                    </p>
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
            <p className="crumb">
              Dashboard Mitra / <b>Permintaan Saya</b>
            </p>

            <section className="heading">
              <div>
                <h1>Permintaan Kemitraan Saya</h1>
                <p>
                  Daftar permintaan pasokan yang telah Anda simpan sebagai draf
                  atau publikasikan ke Direktori Usaha.
                </p>
              </div>
              <Link className="primary" href="/mitra/permintaan/baru">
                + Buat Permintaan Baru
              </Link>
            </section>

            <section className="panel">
              {loadingRequests ? (
                <div className="empty">
                  <p>Memuat daftar permintaan Anda...</p>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="empty">
                  <h2>Belum ada permintaan kemitraan</h2>
                  <p style={{ marginBottom: 16 }}>
                    Buat permintaan kemitraan pertama Anda agar pelaku usaha
                    Desa Jarak dapat mengajukan penawaran pasokan.
                  </p>
                  <Link className="primary" href="/mitra/permintaan/baru">
                    + Buat Permintaan Kemitraan
                  </Link>
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Referensi</th>
                        <th>Komoditas & Varietas</th>
                        <th>Volume & Frekuensi</th>
                        <th>Target Waktu</th>
                        <th>Skema Kerja Sama</th>
                        <th>Status</th>
                        <th>Diperbarui</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map((req) => (
                        <tr key={req.id}>
                          <td>
                            <strong>{req.reference}</strong>
                          </td>
                          <td>
                            <strong>{req.data.productType}</strong>
                            <div style={{ fontSize: 11, color: "#65788a" }}>
                              {req.data.variety || req.data.grade}
                            </div>
                          </td>
                          <td>
                            {req.data.quantity} {req.data.unit} ({req.data.frequency})
                          </td>
                          <td>{req.data.neededDate || "-"}</td>
                          <td>{req.data.partnershipScheme}</td>
                          <td>
                            <span
                              className={`status ${
                                req.status === "draft" ? "wait" : "done"
                              }`}
                            >
                              {req.status === "draft" ? "Draf" : "Dipublikasikan"}
                            </span>
                          </td>
                          <td>{formatTimestamp(req.updatedAt)}</td>
                          <td>
                            {req.status === "draft" ? (
                              <Link
                                href={`/mitra/permintaan/baru?entryId=${encodeURIComponent(
                                  req.id
                                )}`}
                                className="detail-button"
                              >
                                Lanjutkan Draf
                              </Link>
                            ) : (
                              <Link href="/direktori" className="detail-button">
                                Lihat di Direktori
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <p className="note">
          Butuh bantuan verifikasi pemasok? Hubungi tim fasilitasi BUMDes Desa
          Jarak.
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
