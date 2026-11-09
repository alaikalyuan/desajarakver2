"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, type FormEntry } from "@/lib/forms/form-flow";
import { rowToFormEntry } from "@/lib/listings";
import { ROLE_NAMES, type UserRole } from "@/lib/auth";
import "./usaha-dashboard.css";

interface PageRowItem {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  status: "draf" | "menunggu" | "diproses" | "selesai" | "ditolak";
  action: string;
  href?: string;
}

interface DashboardTabConfig {
  breadcrumb: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  headers: [string, string, string, string, string, string];
  rows: PageRowItem[];
}

const SAMPLE_TAB_DATA: Record<string, DashboardTabConfig> = {
  "penawaran-saya": {
    breadcrumb: "Penawaran Saya",
    title: "Penawaran Saya",
    subtitle: "Daftar penawaran komoditas yang telah Anda ajukan ke mitra.",
    searchPlaceholder: "Cari komoditas atau nama mitra...",
    headers: ["Komoditas", "Mitra Tujuan", "Volume", "Harga", "Status", "Aksi"],
    rows: [],
  },
  "permintaan-masuk": {
    breadcrumb: "Permintaan Masuk",
    title: "Permintaan Masuk",
    subtitle: "Kebutuhan komoditas dari mitra yang sesuai dengan usaha Anda.",
    searchPlaceholder: "Cari permintaan atau nama mitra...",
    headers: [
      "Permintaan",
      "Mitra",
      "Kebutuhan",
      "Batas Waktu",
      "Status",
      "Aksi",
    ],
    rows: [
      {
        col1: "Pasokan Cabai Segar",
        col2: "CV Pangan Nusantara",
        col3: "2 Ton / bulan",
        col4: "28 Apr 2026",
        status: "menunggu",
        action: "Ajukan Penawaran",
        href: "/usaha/penawaran/baru?requestId=seed-request-3",
      },
      {
        col1: "Jagung Pakan Ternak",
        col2: "PT Agro Timur Jaya",
        col3: "5 Ton",
        col4: "02 Mei 2026",
        status: "diproses",
        action: "Ajukan Penawaran",
        href: "/usaha/penawaran/baru?requestId=seed-request-2",
      },
      {
        col1: "Sayur Segar Harian",
        col2: "Dapur Katering Berkah",
        col3: "500 Kg / minggu",
        col4: "10 Mei 2026",
        status: "selesai",
        action: "Lihat Direktori",
        href: "/direktori",
      },
    ],
  },
  pesan: {
    breadcrumb: "Pesan",
    title: "Pesan Mitra",
    subtitle: "Percakapan terbaru terkait penawaran dan pengiriman komoditas.",
    searchPlaceholder: "Cari pengirim atau isi pesan...",
    headers: ["Pengirim", "Topik", "Pesan Terakhir", "Waktu", "Status", "Aksi"],
    rows: [
      {
        col1: "CV Pangan Nusantara",
        col2: "Konfirmasi Sampel Cabai",
        col3: "Sampel sudah kami terima dengan baik.",
        col4: "Hari ini, 09.30",
        status: "menunggu",
        action: "Buka Pesan",
      },
      {
        col1: "PT Agro Timur Jaya",
        col2: "Jadwal Kirim Jagung",
        col3: "Mohon konfirmasi armada pengiriman.",
        col4: "Kemarin",
        status: "diproses",
        action: "Buka Pesan",
      },
      {
        col1: "Toko Tani Sehat",
        col2: "Pembayaran Beras Organik",
        col3: "Pembayaran tahap pertama sudah selesai.",
        col4: "16 Apr 2026",
        status: "selesai",
        action: "Buka Pesan",
      },
    ],
  },
  dokumen: {
    breadcrumb: "Dokumen",
    title: "Dokumen Usaha",
    subtitle: "Dokumen kerja sama, surat jalan, dan bukti transaksi usaha.",
    searchPlaceholder: "Cari nama dokumen atau mitra...",
    headers: [
      "Nama Dokumen",
      "Mitra",
      "Jenis",
      "Tanggal",
      "Status",
      "Aksi",
    ],
    rows: [
      {
        col1: "Kontrak Pasok Cabai Semester I",
        col2: "CV Pangan Nusantara",
        col3: "Perjanjian",
        col4: "18 Apr 2026",
        status: "diproses",
        action: "Unduh",
      },
      {
        col1: "Surat Jalan Beras Organik",
        col2: "Toko Tani Sehat",
        col3: "Pengiriman",
        col4: "15 Apr 2026",
        status: "selesai",
        action: "Unduh",
      },
      {
        col1: "Form Spesifikasi Jagung Pipil",
        col2: "PT Agro Timur Jaya",
        col3: "Lampiran",
        col4: "12 Apr 2026",
        status: "menunggu",
        action: "Unduh",
      },
    ],
  },
};

const OFFER_ROW_STATUS: Record<string, PageRowItem["status"]> = {
  draft: "draf",
  sent: "menunggu",
  accepted: "diproses",
  completed: "selesai",
  rejected: "ditolak",
};

function offerVolumeKg(offer: FormEntry): number {
  const qty = Number(String(offer.data.quantity).replace(",", ".")) || 0;
  if (offer.data.unit === "ton") return qty * 1000;
  if (offer.data.unit === "kg") return qty;
  return 0;
}

const STATUS_LABELS: Record<string, string> = {
  draf: "Draf",
  menunggu: "Menunggu",
  ditolak: "Ditolak",
  diproses: "Diproses",
  selesai: "Selesai",
};

export default function UsahaDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Pelaku Usaha Desa Jarak");
  const [userRoleLabel, setUserRoleLabel] = useState("Pelaku Usaha");
  const [activeTab, setActiveTab] = useState<string>("penawaran-saya");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [myOffers, setMyOffers] = useState<FormEntry[]>([]);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_name, role")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserName(
          profile.business_name || profile.full_name || "Pelaku Usaha Desa Jarak"
        );
        setUserRoleLabel(
          ROLE_NAMES[profile.role as UserRole] || "Pelaku Usaha"
        );
      }

      const { data: offerRows } = await supabase
        .from("listings")
        .select(
          "id, owner_id, kind, status, reference, request_id, format, data, photo_path, created_at, updated_at, listing_contacts(contact)"
        )
        .eq("owner_id", session.user.id)
        .eq("kind", "offer")
        .eq("format", "form")
        .order("updated_at", { ascending: false });

      if (offerRows) {
        setMyOffers(
          offerRows.map((r) => rowToFormEntry(r as Record<string, unknown>))
        );
      }
    }

    loadData();
  }, []);

  function showToast(msg: string) {
    setToastText(msg);
    setTimeout(() => {
      setToastText("");
    }, 2800);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const activeOffers = myOffers.filter(
    (o) => o.status === "sent" || o.status === "accepted"
  );
  const totalVolumeKg = myOffers
    .filter((o) => o.status !== "draft")
    .reduce((sum, o) => sum + offerVolumeKg(o), 0);

  const currentTabConfig =
    SAMPLE_TAB_DATA[activeTab] || SAMPLE_TAB_DATA["penawaran-saya"];

  // Combine user's real offers with sample rows when viewing "penawaran-saya"
  const combinedRows = useMemo(() => {
    if (activeTab !== "penawaran-saya") {
      return currentTabConfig.rows;
    }

    const realRows: PageRowItem[] = myOffers.map((offer) => ({
      col1: `${offer.data.productType} (${offer.data.variety || offer.reference})`,
      col2:
        offer.targetRequest?.ownerName || "Direktori Usaha Desa Jarak",
      col3: `${offer.data.quantity} ${offer.data.unit} (${offer.data.frequency})`,
      col4: offer.data.priceNote || `Diperbarui ${formatTimestamp(offer.updatedAt)}`,
      status: OFFER_ROW_STATUS[offer.status] || "menunggu",
      action: offer.status === "draft" ? "Lanjutkan Draf" : "Lihat di Direktori",
      href:
        offer.status === "draft"
          ? `/usaha/penawaran/baru?entryId=${encodeURIComponent(offer.id)}`
          : "/direktori",
    }));

    return [...realRows, ...currentTabConfig.rows];
  }, [activeTab, currentTabConfig.rows, myOffers]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedRows.filter((item) => {
      const matchSearch =
        !q ||
        [item.col1, item.col2, item.col3, item.col4]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchStatus =
        statusFilter === "semua" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [combinedRows, searchQuery, statusFilter]);

  const initials = (userName || "PU")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="usaha-dashboard-scope">
      <header className="topbar">
        <Link className="brand" href="/">
          <img
            src="/assets/Logo Desa Jarak.png"
            alt="Logo Desa Jarak"
            width={40}
            height={40}
          />
          <span>Desa Jarak</span>
        </Link>

        <div className="account">
          <div style={{ textAlign: "right" }}>
            <strong>{userName}</strong>
            <small>{userRoleLabel}</small>
          </div>
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar" aria-label="Menu pelaku usaha">
          <p className="sidebar-label">MENU UTAMA</p>

          <button
            type="button"
            className={`menu-item ${
              activeTab === "penawaran-saya" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("penawaran-saya");
              setSearchQuery("");
              setStatusFilter("semua");
            }}
          >
            <span aria-hidden="true">▤</span>
            <span>Penawaran Saya</span>
          </button>

          <button
            type="button"
            className={`menu-item ${
              activeTab === "permintaan-masuk" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("permintaan-masuk");
              setSearchQuery("");
              setStatusFilter("semua");
            }}
          >
            <span aria-hidden="true">📥</span>
            <span>Permintaan Masuk</span>
            <span className="menu-count">3</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeTab === "pesan" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("pesan");
              setSearchQuery("");
              setStatusFilter("semua");
            }}
          >
            <span aria-hidden="true">✉</span>
            <span>Pesan</span>
            <span className="menu-count">2</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeTab === "dokumen" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("dokumen");
              setSearchQuery("");
              setStatusFilter("semua");
            }}
          >
            <span aria-hidden="true">📄</span>
            <span>Dokumen</span>
          </button>

          <Link href="/usaha/analisis" className="menu-item">
            <span aria-hidden="true">
              <BarChart3 size={17} />
            </span>
            <span>Analisis Desa</span>
          </Link>

          <Link href="/usaha/penawaran/baru" className="menu-item">
            <span aria-hidden="true">
              <PlusCircle size={17} />
            </span>
            <span>Buat Penawaran Baru</span>
          </Link>

          <div className="sidebar-bottom">
            <Link className="back-link" href="/direktori">
              ← Ke Direktori Usaha
            </Link>
            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              Keluar dari Akun
            </button>
          </div>
        </aside>

        <main className="main-content">
          <p className="breadcrumb">
            Dashboard Pelaku Usaha &gt;{" "}
            <span>{currentTabConfig.breadcrumb}</span>
          </p>

          <section className="welcome">
            <div>
              <p className="eyebrow">JARAK CONNECT</p>
              <h1>Selamat Datang, {userName}</h1>
              <p>
                Pantau status penawaran komoditas, permintaan mitra, dan
                ketahanan ekonomi Desa Jarak dalam satu halaman.
              </p>
            </div>
            <div className="welcome-actions">
              <Link href="/usaha/penawaran/baru" className="btn-green">
                <PlusCircle size={16} /> + Buat Penawaran
              </Link>
              <Link href="/usaha/analisis" className="btn-outline-green">
                <BarChart3 size={16} /> Buka Analisis Desa
              </Link>
            </div>
          </section>

          <section className="stats" aria-label="Ringkasan penawaran">
            <article className="stat-card">
              <span className="stat-icon green">✓</span>
              <p>Penawaran Aktif</p>
              <h2>{activeOffers.length}</h2>
              <small>Komoditas sedang ditawarkan</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon orange">⏳</span>
              <p>Menunggu Respon</p>
              <h2>
                {
                  myOffers.filter(
                    (o) => o.status === "draft" || o.status === "sent"
                  ).length
                }
              </h2>
              <small>Sedang ditinjau / draf</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon blue">🤝</span>
              <p>Kemitraan Berjalan</p>
              <h2>
                {myOffers.filter((o) => o.status === "accepted").length}
              </h2>
              <small>Proses pengiriman rutin</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon purple">📦</span>
              <p>Total Volume</p>
              <h2>
                {(totalVolumeKg / 1000).toLocaleString("id-ID", {
                  maximumFractionDigits: 1,
                })}{" "}
                Ton
              </h2>
              <small>Akumulasi penawaran terkirim</small>
            </article>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>{currentTabConfig.title}</h2>
                <p>{currentTabConfig.subtitle}</p>
              </div>
              <span className="status-label">
                Menampilkan {filteredRows.length} data
              </span>
            </div>

            <div className="toolbar">
              <input
                type="search"
                placeholder={currentTabConfig.searchPlaceholder}
                aria-label="Cari data"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="semua">Semua Status</option>
                <option value="draf">Draf</option>
                <option value="menunggu">Menunggu</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            {filteredRows.length === 0 ? (
              <div className="empty-state">
                <h3>Data tidak ditemukan</h3>
                <p>Coba ubah kata kunci pencarian atau pilihan status.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {currentTabConfig.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((item, idx) => (
                      <tr key={`${item.col1}-${idx}`}>
                        <td>{item.col1}</td>
                        <td>{item.col2}</td>
                        <td>{item.col3}</td>
                        <td>{item.col4}</td>
                        <td>
                          <span className={`status ${item.status}`}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td>
                          {item.href ? (
                            <Link href={item.href} className="action-btn">
                              {item.action}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() =>
                                showToast(`${item.action}: ${item.col1}`)
                              }
                            >
                              {item.action}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="notice">
              Status penawaran diperbarui setelah mitra atau pengelola BUMDes
              meninjau pengajuan Anda.
            </p>
          </section>
        </main>
      </div>

      {toastText && (
        <div className="toast" role="status" aria-live="polite">
          {toastText}
        </div>
      )}
    </div>
  );
}
