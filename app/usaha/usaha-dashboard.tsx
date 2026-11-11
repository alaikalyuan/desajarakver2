"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp, type FormEntry } from "@/lib/forms/form-flow";
import { closeListing, deleteDraft, type ListingInterest } from "@/lib/listings";
import { fetchUsahaDashboard, type UsahaDashboardData } from "@/lib/dashboard-data";
import { whatsAppUrl } from "@/lib/contact";
import "./usaha-dashboard.css";

type RowStatus =
  | "draf"
  | "menunggu"
  | "diterima"
  | "selesai"
  | "ditolak"
  | "tayang"
  | "ditutup";

interface PageRowItem {
  offer: FormEntry;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  status: RowStatus;
}

interface DashboardTabConfig {
  breadcrumb: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  headers: [string, string, string, string, string, string];
}

const OFFERS_TAB: DashboardTabConfig = {
  breadcrumb: "Penawaran Saya",
  title: "Penawaran Saya",
  subtitle: "Daftar penawaran komoditas yang telah Anda ajukan ke mitra.",
  searchPlaceholder: "Cari komoditas atau mitra",
  headers: ["Komoditas", "Untuk", "Jumlah", "Harga", "Status", "Aksi"],
};

const OFFER_ROW_STATUS: Record<string, RowStatus> = {
  draft: "draf",
  sent: "menunggu",
  accepted: "diterima",
  completed: "selesai",
  rejected: "ditolak",
  published: "tayang",
  closed: "ditutup",
};

function offerVolumeKg(offer: FormEntry): number {
  const qty = Number(String(offer.data.quantity).replace(",", ".")) || 0;
  if (offer.data.unit === "ton") return qty * 1000;
  if (offer.data.unit === "kg") return qty;
  return 0;
}

const STATUS_LABELS: Record<RowStatus, string> = {
  draf: "Draf",
  menunggu: "Menunggu",
  ditolak: "Ditolak",
  diterima: "Diterima",
  selesai: "Selesai",
  tayang: "Tayang di Direktori",
  ditutup: "Ditutup",
};

interface UsahaDashboardProps {
  userId: string;
  userName: string;
  userRoleLabel: string;
  initialData: UsahaDashboardData;
}

export function UsahaDashboard({
  userId,
  userName,
  userRoleLabel,
  initialData,
}: UsahaDashboardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [data, setData] = useState<UsahaDashboardData>(initialData);
  const myOffers = data.offers;
  // Buyer contacts, readable once an offer to their request is accepted.
  const buyerContacts = data.buyerContacts;
  const interests: ListingInterest[] = data.interests;
  const [openInterestId, setOpenInterestId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastText, setToastText] = useState("");

  const loadData = useCallback(async () => {
    setData(await fetchUsahaDashboard(createClient(), userId));
  }, [userId]);

  function showToast(message: string) {
    setToastText(message);
    setTimeout(() => setToastText(""), 3200);
  }

  async function handleClose(offer: FormEntry) {
    if (
      !window.confirm(
        `Tutup penawaran ${offer.reference}? Penawaran akan hilang dari direktori.`
      )
    )
      return;
    setBusyId(offer.id);
    try {
      await closeListing(offer.id);
      showToast("Penawaran ditutup.");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menutup penawaran.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteDraft(offer: FormEntry) {
    if (!window.confirm(`Hapus draf ${offer.reference}? Draf yang dihapus tidak bisa dikembalikan.`))
      return;
    setBusyId(offer.id);
    try {
      await deleteDraft(offer.id);
      showToast("Draf dihapus.");
      await loadData();
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const activeOffers = myOffers.filter(
    (o) => o.status === "sent" || o.status === "accepted" || o.status === "published"
  );
  const totalVolumeKg = myOffers
    .filter((o) => o.status !== "draft")
    .reduce((sum, o) => sum + offerVolumeKg(o), 0);

  const currentTabConfig = OFFERS_TAB;

  const offerRows = useMemo<PageRowItem[]>(
    () =>
      myOffers.map((offer) => ({
        offer,
        col1: `${offer.data.productType} (${offer.data.variety || offer.reference})`,
        col2: offer.targetRequest?.ownerName || "Semua pembeli (Direktori)",
        col3: `${offer.data.quantity} ${offer.data.unit} (${offer.data.frequency})`,
        col4:
          offer.data.priceNote || `Diperbarui ${formatTimestamp(offer.updatedAt)}`,
        status: OFFER_ROW_STATUS[offer.status] || "menunggu",
      })),
    [myOffers]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return offerRows.filter((item) => {
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
  }, [offerRows, searchQuery, statusFilter]);

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
            src="/assets/logo-desa-jarak-96.png"
            alt="Logo Desa Jarak"
            width={40}
            height={40}
          />
          <span>Desa Jarak</span>
        </Link>

        <div className="account">
          <div className="account-text">
            <strong>{userName}</strong>
            <small>{userRoleLabel}</small>
          </div>
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <button
            type="button"
            className="topbar-logout"
            onClick={handleLogout}
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar" aria-label="Menu pelaku usaha">
          <p className="sidebar-label">MENU UTAMA</p>

          <button type="button" className="menu-item active">
            <span aria-hidden="true">▤</span>
            <span>Penawaran Saya</span>
          </button>

          <Link href="/direktori" className="menu-item">
            <span aria-hidden="true">📥</span>
            <span>Cari Permintaan Mitra</span>
          </Link>

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
          <section className="welcome">
            <div>
              <h1>Selamat Datang, {userName}</h1>
              <p>
                Lihat penawaran Anda, cari permintaan pembeli, dan catat
                penjualan di satu tempat.
              </p>
            </div>
            <div className="welcome-actions">
              <Link href="/usaha/penawaran/baru" className="btn-green">
                <PlusCircle size={16} aria-hidden="true" /> Buat Penawaran
              </Link>
              <Link href="/usaha/analisis" className="btn-outline-green">
                <BarChart3 size={16} aria-hidden="true" /> Buka Analisis Desa
              </Link>
            </div>
          </section>

          <section className="stats" aria-label="Ringkasan penawaran">
            <article className="stat-card">
              <span className="stat-icon green" aria-hidden="true">✓</span>
              <p>Penawaran Aktif</p>
              <h2>{activeOffers.length}</h2>
              <small>Komoditas sedang ditawarkan</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon orange" aria-hidden="true">⏳</span>
              <p>Menunggu</p>
              <h2>
                {
                  myOffers.filter(
                    (o) => o.status === "draft" || o.status === "sent"
                  ).length
                }
              </h2>
              <small>Draf atau menunggu jawaban pembeli</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon blue" aria-hidden="true">🤝</span>
              <p>Diterima Pembeli</p>
              <h2>
                {myOffers.filter((o) => o.status === "accepted").length}
              </h2>
              <small>Penawaran yang sudah diterima</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon purple" aria-hidden="true">📦</span>
              <p>Total Jumlah</p>
              <h2>
                {(totalVolumeKg / 1000).toLocaleString("id-ID", {
                  maximumFractionDigits: 1,
                })}{" "}
                Ton
              </h2>
              <small>Semua penawaran terkirim (kg dan ton)</small>
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
                aria-label="Cari penawaran"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select
                aria-label="Saring menurut status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="semua">Semua Status</option>
                <option value="draf">Draf</option>
                <option value="tayang">Tayang di Direktori</option>
                <option value="menunggu">Menunggu</option>
                <option value="diterima">Diterima</option>
                <option value="ditutup">Ditutup</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            {offerRows.length === 0 ? (
              <div className="empty-state">
                <h3>Belum ada penawaran</h3>
                <p>
                  Cari permintaan mitra di Direktori, lalu ajukan penawaran
                  pertama Anda.
                </p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="empty-state">
                <h3>Tidak ada yang cocok</h3>
                <p>Coba kata lain, atau pilih &quot;Semua Status&quot;.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="stack-table">
                  <thead>
                    <tr>
                      {currentTabConfig.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((item) => {
                      const { offer } = item;
                      const editHref = `/usaha/penawaran/baru?entryId=${encodeURIComponent(offer.id)}`;
                      const buyer = offer.requestId ? buyerContacts[offer.requestId] : undefined;
                      const buyerPhone = buyer?.phone || buyer?.whatsapp || "";
                      const buyerWa = whatsAppUrl(
                        buyerPhone,
                        `Halo ${offer.targetRequest?.ownerName || ""}, penawaran ${offer.reference} saya sudah Anda terima di Desa Jarak. Mari kita atur pengirimannya.`
                      );
                      const interested = interestsByListing[offer.id] || [];
                      return (
                        <Fragment key={offer.id}>
                          <tr>
                            <td className="cell-title">{item.col1}</td>
                            <td data-label="Untuk">{item.col2}</td>
                            <td data-label="Jumlah">{item.col3}</td>
                            <td data-label="Harga">{item.col4}</td>
                            <td data-label="Status">
                              <span className={`status ${item.status}`}>
                                {STATUS_LABELS[item.status]}
                              </span>
                              {interested.length > 0 && (
                                <button
                                  type="button"
                                  className="interest-toggle"
                                  aria-expanded={openInterestId === offer.id}
                                  onClick={() =>
                                    setOpenInterestId(openInterestId === offer.id ? null : offer.id)
                                  }
                                >
                                  {interested.length} orang tertarik
                                </button>
                              )}
                            </td>
                            <td className="cell-actions">
                              <div className="row-actions">
                                {offer.status === "draft" && (
                                  <>
                                    <Link href={editHref} className="action-btn">
                                      Lanjutkan Draf
                                    </Link>
                                    <button
                                      type="button"
                                      className="action-btn danger"
                                      disabled={busyId === offer.id}
                                      onClick={() => handleDeleteDraft(offer)}
                                    >
                                      Hapus
                                    </button>
                                  </>
                                )}
                                {offer.status === "published" && (
                                  <>
                                    <Link href={editHref} className="action-btn">
                                      Ubah
                                    </Link>
                                    <button
                                      type="button"
                                      className="action-btn danger"
                                      disabled={busyId === offer.id}
                                      onClick={() => handleClose(offer)}
                                    >
                                      Tutup
                                    </button>
                                  </>
                                )}
                                {(offer.status === "accepted" || offer.status === "completed") &&
                                  (buyerWa ? (
                                    <a
                                      className="action-btn primary"
                                      href={buyerWa}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      WhatsApp Pembeli
                                    </a>
                                  ) : (
                                    <span className="muted-text">Kontak pembeli belum dicantumkan</span>
                                  ))}
                                {offer.status === "sent" && (
                                  <span className="muted-text">Menunggu jawaban pembeli</span>
                                )}
                                {(offer.status === "rejected" || offer.status === "closed") && (
                                  <span className="muted-text">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {openInterestId === offer.id && (
                            <tr className="interest-row stack-full">
                              <td colSpan={6}>
                                <ul className="interest-list">
                                  {interested.map((person) => (
                                    <li key={`${person.listingId}-${person.createdAt}`}>
                                      <strong>{person.name}</strong>
                                      <span>{formatTimestamp(person.createdAt)}</span>
                                      {whatsAppUrl(person.phone) ? (
                                        <a
                                          href={
                                            whatsAppUrl(
                                              person.phone,
                                              `Halo ${person.name}, terima kasih sudah tertarik dengan penawaran ${offer.data.productType} saya di Desa Jarak.`
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
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="notice">
              Penawaran ke sebuah permintaan berstatus &quot;Menunggu&quot;
              sampai pembeli menerima atau menolaknya. Setelah diterima, nomor
              WhatsApp pembeli muncul di sini.
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
