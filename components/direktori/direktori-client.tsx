"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/auth";
import {
  mapRowToDirectoryOffer,
  mapRowToDirectoryRequest,
  type DirectoryOfferItem,
  type DirectoryRequestItem,
} from "@/lib/listings";
import { createClient } from "@/lib/supabase/client";
import { todayWIB } from "@/lib/format";
import { telUrl, whatsAppUrl } from "@/lib/contact";

interface DirektoriClientProps {
  initialRequests: DirectoryRequestItem[];
  initialOffers: DirectoryOfferItem[];
  initialUser: UserProfile | null;
}

/** A phone number as a tap-to-call link when it looks like a real number. */
function PhoneLink({ phone, whatsapp }: { phone: string; whatsapp?: boolean }) {
  const href = whatsapp ? whatsAppUrl(phone) : telUrl(phone);
  if (!href) return <>{phone || "-"}</>;
  return (
    <a
      href={href}
      {...(whatsapp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {phone}
    </a>
  );
}

function normalizeRequestStatus(status = ""): string {
  const value = status.toLowerCase();
  if (value.includes("terbuka") || value.includes("baru")) return "Baru";
  if (value.includes("seleksi") || value.includes("proses")) {
    return "Dalam Proses";
  }
  if (value.includes("tutup") || value.includes("selesai")) return "Selesai";
  return status || "Baru";
}

/** A request whose "Tanggal Dibutuhkan" has passed no longer takes offers. */
function isPastDeadline(item: DirectoryRequestItem): boolean {
  return Boolean(item.deadlineDate) && item.deadlineDate! < todayWIB();
}

/** Status used by the filters: past-deadline requests count as finished. */
function requestStatusBucket(item: DirectoryRequestItem): string {
  return isPastDeadline(item) ? "Selesai" : normalizeRequestStatus(item.status);
}

function getRequestStatusClass(status = ""): string {
  const norm = normalizeRequestStatus(status);
  if (norm === "Baru") return "status-baru";
  if (norm === "Dalam Proses") return "status-proses";
  return "status-selesai";
}

function getRequestLocationGroup(location = ""): "jatim" | "luar_jatim" {
  const value = location.toLowerCase();
  const jatimAreas = [
    "jawa timur",
    "jatim",
    "kediri",
    "surabaya",
    "malang",
    "blitar",
    "tulungagung",
    "nganjuk",
    "jombang",
    "madiun",
    "gresik",
    "sidoarjo",
    "mojokerto",
    "pasuruan",
    "probolinggo",
    "banyuwangi",
    "jember",
    "lamongan",
    "tuban",
    "bojonegoro",
    "pare",
    "plosoklaten",
    "jarak",
  ];
  return jatimAreas.some((area) => value.includes(area))
    ? "jatim"
    : "luar_jatim";
}

function normalizeOfferAvailabilityKey(item: DirectoryOfferItem): string {
  if (
    item.availabilityKey === "stok" ||
    item.availabilityKey === "po" ||
    item.availabilityKey === "musiman"
  ) {
    return item.availabilityKey;
  }
  const val = `${item.availability} ${item.harvestPeriod}`.toLowerCase();
  if (val.includes("po") || val.includes("pre-order") || val.includes("pesan")) {
    return "po";
  }
  if (val.includes("musim")) {
    return "musiman";
  }
  return "stok";
}

function normalizeOfferAvailabilityLabel(item: DirectoryOfferItem): string {
  const key = normalizeOfferAvailabilityKey(item);
  if (key === "po") return "Pre-Order (PO)";
  if (key === "musiman") return "Musiman";
  return "Tersedia";
}

function getOfferEstimatedAvailabilityLabel(item: DirectoryOfferItem): string {
  const statusText = normalizeOfferStatus(item);
  if (statusText === "Selesai") return "-";
  const key = normalizeOfferAvailabilityKey(item);
  if (key === "stok") {
    return item.alwaysAvailable
      ? "Selalu tersedia"
      : item.estimatedAvailability || "Sesuai ketersediaan";
  }
  if (key === "musiman") {
    return item.estimatedAvailability || "Menunggu jadwal panen";
  }
  if (key === "po") {
    return item.estimatedAvailability || "Sesuai kesepakatan";
  }
  return item.estimatedAvailability || "Belum ditentukan";
}

function normalizeOfferStatus(item: DirectoryOfferItem): "Aktif" | "Selesai" {
  const val = `${item.status || ""} ${item.availability || ""}`.toLowerCase();
  if (val.includes("habis") || val.includes("tutup") || val.includes("selesai")) {
    return "Selesai";
  }
  return "Aktif";
}

function getOfferCoverageKey(item: DirectoryOfferItem): string {
  if (
    item.coverageKey === "jawa_timur" ||
    item.coverageKey === "pulau_jawa" ||
    item.coverageKey === "nasional"
  ) {
    return item.coverageKey;
  }
  const text = `${item.terms.join(" ")} ${item.summary}`.toLowerCase();
  if (text.includes("nasional") || text.includes("seluruh indonesia")) {
    return "nasional";
  }
  if (
    text.includes("pulau jawa") ||
    text.includes("jakarta") ||
    text.includes("jawa tengah") ||
    text.includes("jawa barat")
  ) {
    return "pulau_jawa";
  }
  return "jawa_timur";
}

const JENIS_FILTER_OPTIONS = [
  { key: "semua", label: "Semua jenis" },
  { key: "pertanian_perkebunan", label: "Pertanian & Perkebunan" },
  { key: "peternakan_perikanan", label: "Peternakan & Perikanan" },
  { key: "olahan_kuliner", label: "Produk Olahan & Kuliner" },
  { key: "kerajinan", label: "Kerajinan" },
  { key: "jasa", label: "Jasa" },
] as const;

type JenisFilterKey = (typeof JENIS_FILTER_OPTIONS)[number]["key"];

type JenisGroup = Exclude<JenisFilterKey, "semua">;

// Whole words only: "olahan" must not match "pengolahan", "nila" not "nilai",
// "ikan" not "diberikan".
const JENIS_KEYWORDS: [JenisGroup, string[]][] = [
  ["jasa", ["jasa", "layanan", "sewa alat", "sewa traktor"]],
  ["kerajinan", ["kerajinan", "anyaman", "kriya", "souvenir"]],
  ["olahan_kuliner", ["olahan", "olahan pangan", "kuliner", "keripik", "sambal"]],
  [
    "peternakan_perikanan",
    [
      "peternakan", "perikanan", "ternak", "telur", "unggas", "ayam", "susu",
      "kambing", "sapi", "ikan", "lele", "nila",
    ],
  ],
  // Checked last, so "Susu Segar" stays livestock and "Jasa ... pertanian" stays a service.
  [
    "pertanian_perkebunan",
    ["pertanian", "perkebunan", "hortikultura", "komoditas", "segar", "panen"],
  ],
];

// Keywords are plain lowercase words, so they need no regex escaping.
function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(text);
}

function matchJenis(text: string): JenisGroup | null {
  const lower = text.toLowerCase();
  for (const [group, words] of JENIS_KEYWORDS) {
    if (words.some((w) => hasWord(lower, w))) return group;
  }
  return null;
}

function getListingJenisGroup(category = "", title = "", summary = ""): JenisGroup {
  // The category and product name decide first; the free-text summary is only
  // a fallback, so "beras siap kirim untuk pengolahan" stays a fresh crop.
  return (
    matchJenis(category) ??
    matchJenis(title) ??
    matchJenis(summary) ??
    "pertanian_perkebunan"
  );
}

function getOfferCoverageLabel(item: DirectoryOfferItem): string {
  const key = getOfferCoverageKey(item);
  if (key === "nasional") return "Nasional";
  if (key === "pulau_jawa") return "Pulau Jawa";
  return "Jawa Timur";
}

export function DirektoriClient({
  initialRequests,
  initialOffers,
  initialUser,
}: DirektoriClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [requests, setRequests] =
    useState<DirectoryRequestItem[]>(initialRequests);
  const [offers, setOffers] = useState<DirectoryOfferItem[]>(initialOffers);
  const [activeTab, setActiveTab] = useState<"permintaan" | "penawaran">(
    "permintaan"
  );

  // Request search & filters
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilterOpen, setRequestFilterOpen] = useState(false);
  const [draftReqJenis, setDraftReqJenis] = useState<JenisFilterKey>("semua");
  const [draftReqStatus, setDraftReqStatus] = useState("semua");
  const [draftReqLocation, setDraftReqLocation] = useState("semua");
  const [appliedReqJenis, setAppliedReqJenis] =
    useState<JenisFilterKey>("semua");
  const [appliedReqStatus, setAppliedReqStatus] = useState("semua");
  const [appliedReqLocation, setAppliedReqLocation] = useState("semua");
  const [reqOpenSections, setReqOpenSections] = useState<{
    jenis: boolean;
    status: boolean;
    location: boolean;
  }>({
    jenis: false,
    status: false,
    location: false,
  });
  const reqFilterRef = useRef<HTMLDivElement>(null);

  // Offer search & filters
  const [offerSearch, setOfferSearch] = useState("");
  const [offerFilterOpen, setOfferFilterOpen] = useState(false);
  const [draftOfferJenis, setDraftOfferJenis] =
    useState<JenisFilterKey>("semua");
  const [draftOfferAvail, setDraftOfferAvail] = useState("semua");
  const [draftOfferStatus, setDraftOfferStatus] = useState("semua");
  const [draftOfferCoverage, setDraftOfferCoverage] = useState("semua");
  const [appliedOfferJenis, setAppliedOfferJenis] =
    useState<JenisFilterKey>("semua");
  const [appliedOfferAvail, setAppliedOfferAvail] = useState("semua");
  const [appliedOfferStatus, setAppliedOfferStatus] = useState("semua");
  const [appliedOfferCoverage, setAppliedOfferCoverage] = useState("semua");
  const [offerOpenSections, setOfferOpenSections] = useState<{
    jenis: boolean;
    availability: boolean;
    status: boolean;
    coverage: boolean;
  }>({
    jenis: false,
    availability: false,
    status: false,
    coverage: false,
  });
  const offerFilterRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [selectedModal, setSelectedModal] = useState<
    | { type: "request"; item: DirectoryRequestItem }
    | { type: "offer"; item: DirectoryOfferItem }
    | null
  >(null);

  // Re-fetch with client session so RLS on listing_contacts returns contact info when logged in
  useEffect(() => {
    const supabase = createClient();

    async function refreshWithSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, business_name, phone, role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: profile.full_name,
            businessName: profile.business_name,
            phone: profile.phone,
            role: profile.role,
          });
        }
      } else {
        setUser(null);
      }

      const selectCols = session?.user
        ? "id, kind, status, reference, format, data, photo_path, created_at, listing_contacts(contact)"
        : "id, kind, status, reference, format, data, photo_path, created_at";

      const { data: rows } = await supabase
        .from("listings")
        .select(selectCols)
        .in("status", ["sent", "published"])
        .order("created_at", { ascending: true });

      if (rows && rows.length > 0) {
        const nextReqs: DirectoryRequestItem[] = [];
        const nextOffers: DirectoryOfferItem[] = [];
        rows.forEach((row) => {
          const r = row as unknown as Record<string, unknown>;
          if (r.kind === "request") {
            nextReqs.push(mapRowToDirectoryRequest(r));
          } else if (r.kind === "offer") {
            nextOffers.push(mapRowToDirectoryOffer(r));
          }
        });
        setRequests(nextReqs);
        setOffers(nextOffers);
      }
    }

    refreshWithSession();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        reqFilterRef.current &&
        !reqFilterRef.current.contains(event.target as Node)
      ) {
        setRequestFilterOpen(false);
      }
      if (
        offerFilterRef.current &&
        !offerFilterRef.current.contains(event.target as Node)
      ) {
        setOfferFilterOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Counts for Request filters
  const reqCounts = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    const base = requests.filter((item) => {
      if (!keyword) return true;
      const text = [
        item.title,
        item.company,
        item.category,
        item.collaborationType,
        item.summary,
        item.location,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(keyword);
    });

    return {
      jenis: {
        semua: base.length,
        pertanian_perkebunan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "pertanian_perkebunan"
        ).length,
        peternakan_perikanan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "peternakan_perikanan"
        ).length,
        olahan_kuliner: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "olahan_kuliner"
        ).length,
        kerajinan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "kerajinan"
        ).length,
        jasa: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) === "jasa"
        ).length,
      },
      status: {
        semua: base.length,
        Baru: base.filter((i) => requestStatusBucket(i) === "Baru")
          .length,
        "Dalam Proses": base.filter(
          (i) => requestStatusBucket(i) === "Dalam Proses"
        ).length,
        Selesai: base.filter(
          (i) => requestStatusBucket(i) === "Selesai"
        ).length,
      },
      location: {
        semua: base.length,
        jatim: base.filter(
          (i) => getRequestLocationGroup(i.location) === "jatim"
        ).length,
        luar_jatim: base.filter(
          (i) => getRequestLocationGroup(i.location) === "luar_jatim"
        ).length,
      },
    };
  }, [requests, requestSearch]);

  const filteredRequests = useMemo(() => {
    const keyword = requestSearch.trim().toLowerCase();
    return requests.filter((item) => {
      const text = [
        item.title,
        item.company,
        item.category,
        item.collaborationType,
        item.summary,
        item.location,
        ...item.specs,
        ...item.terms,
      ]
        .join(" ")
        .toLowerCase();

      const matchKeyword = !keyword || text.includes(keyword);
      const matchJenis =
        appliedReqJenis === "semua" ||
        getListingJenisGroup(item.category, item.title, item.summary) ===
          appliedReqJenis;
      const matchStatus =
        appliedReqStatus === "semua" ||
        requestStatusBucket(item) === appliedReqStatus;
      const matchLoc =
        appliedReqLocation === "semua" ||
        getRequestLocationGroup(item.location) === appliedReqLocation;

      return matchKeyword && matchJenis && matchStatus && matchLoc;
    });
  }, [
    requests,
    requestSearch,
    appliedReqJenis,
    appliedReqStatus,
    appliedReqLocation,
  ]);

  // Counts for Offer filters
  const offerCounts = useMemo(() => {
    const keyword = offerSearch.trim().toLowerCase();
    const base = offers.filter((item) => {
      if (!keyword) return true;
      const text = [
        item.title,
        item.business,
        item.category,
        item.businessType,
        item.summary,
        item.location,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(keyword);
    });

    return {
      jenis: {
        semua: base.length,
        pertanian_perkebunan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "pertanian_perkebunan"
        ).length,
        peternakan_perikanan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "peternakan_perikanan"
        ).length,
        olahan_kuliner: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "olahan_kuliner"
        ).length,
        kerajinan: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) ===
            "kerajinan"
        ).length,
        jasa: base.filter(
          (i) =>
            getListingJenisGroup(i.category, i.title, i.summary) === "jasa"
        ).length,
      },
      availability: {
        semua: base.length,
        stok: base.filter((i) => normalizeOfferAvailabilityKey(i) === "stok")
          .length,
        po: base.filter((i) => normalizeOfferAvailabilityKey(i) === "po")
          .length,
        musiman: base.filter(
          (i) => normalizeOfferAvailabilityKey(i) === "musiman"
        ).length,
      },
      status: {
        semua: base.length,
        Aktif: base.filter((i) => normalizeOfferStatus(i) === "Aktif").length,
        Selesai: base.filter((i) => normalizeOfferStatus(i) === "Selesai")
          .length,
      },
      coverage: {
        semua: base.length,
        jawa_timur: base.filter((i) => getOfferCoverageKey(i) === "jawa_timur")
          .length,
        pulau_jawa: base.filter((i) => getOfferCoverageKey(i) === "pulau_jawa")
          .length,
        nasional: base.filter((i) => getOfferCoverageKey(i) === "nasional")
          .length,
      },
    };
  }, [offers, offerSearch]);

  const filteredOffers = useMemo(() => {
    const keyword = offerSearch.trim().toLowerCase();
    return offers.filter((item) => {
      const text = [
        item.title,
        item.business,
        item.category,
        item.businessType,
        item.summary,
        item.location,
        ...item.specs,
        ...item.terms,
      ]
        .join(" ")
        .toLowerCase();

      const matchKeyword = !keyword || text.includes(keyword);
      const matchJenis =
        appliedOfferJenis === "semua" ||
        getListingJenisGroup(item.category, item.title, item.summary) ===
          appliedOfferJenis;
      const matchAvail =
        appliedOfferAvail === "semua" ||
        normalizeOfferAvailabilityKey(item) === appliedOfferAvail;
      const matchStatus =
        appliedOfferStatus === "semua" ||
        normalizeOfferStatus(item) === appliedOfferStatus;
      const matchCov =
        appliedOfferCoverage === "semua" ||
        getOfferCoverageKey(item) === appliedOfferCoverage;

      return (
        matchKeyword && matchJenis && matchAvail && matchStatus && matchCov
      );
    });
  }, [
    offers,
    offerSearch,
    appliedOfferJenis,
    appliedOfferAvail,
    appliedOfferStatus,
    appliedOfferCoverage,
  ]);

  function handleAddRequestClick() {
    if (!user) {
      router.push(
        `/masuk?next=${encodeURIComponent("/mitra/permintaan/baru")}`
      );
      return;
    }
    if (user.role === "mitra") {
      router.push("/mitra/permintaan/baru");
      return;
    }
    router.push(`/masuk?next=${encodeURIComponent("/mitra/permintaan/baru")}`);
  }

  function handleAddOfferClick(requestId?: string) {
    const targetPath = requestId
      ? `/usaha/penawaran/baru?requestId=${encodeURIComponent(requestId)}`
      : "/usaha/penawaran/baru";

    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(targetPath)}`);
      return;
    }
    if (user.role === "usaha" || user.role === "bumdes") {
      router.push(targetPath);
      return;
    }
    router.push(`/masuk?next=${encodeURIComponent(targetPath)}`);
  }

  return (
    <>
      <main className="directory-page">
        <section className="directory-header">
          <p className="section-label">JARAK CONNECT</p>
          <h1>Direktori Usaha</h1>
          <p className="section-description">
            Mempertemukan kebutuhan Anda dengan potensi Desa Jarak
          </p>
        </section>

        <div className="directory-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "permintaan"}
            className={`tab-button ${
              activeTab === "permintaan" ? "active" : ""
            }`}
            data-tab="permintaan"
            onClick={() => setActiveTab("permintaan")}
          >
            Permintaan Mitra
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "penawaran"}
            className={`tab-button ${
              activeTab === "penawaran" ? "active" : ""
            }`}
            data-tab="penawaran"
            onClick={() => setActiveTab("penawaran")}
          >
            Penawaran Desa
          </button>
        </div>

        {/* TAB PERMINTAAN MITRA */}
        <section
          id="permintaan"
          className={`tab-content ${
            activeTab === "permintaan" ? "active" : ""
          }`}
        >
          <div className="toolbar">
            <div className="toolbar-heading">
              <h2>Permintaan Mitra</h2>
              <p>
                Kebutuhan produk, komoditas, dan jasa yang dibutuhkan publik.
              </p>
            </div>

            <div className="toolbar-actions request-toolbar-actions">
              <button
                type="button"
                className="secondary-button"
                id="addRequestButton"
                onClick={handleAddRequestClick}
              >
                + Ajukan Kebutuhan Kemitraan
              </button>

              <div className="search-box">
                <input
                  type="search"
                  id="searchRequest"
                  placeholder="Cari produk atau mitra..."
                  aria-label="Cari permintaan mitra"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                />
              </div>

              <div className="request-filter-wrap" ref={reqFilterRef}>
                <button
                  type="button"
                  className="secondary-button request-filter-toggle"
                  id="toggleRequestFilters"
                  aria-expanded={requestFilterOpen}
                  aria-controls="requestFiltersPanel"
                  onClick={() => setRequestFilterOpen((prev) => !prev)}
                >
                  <span aria-hidden="true">☷</span> Filter
                </button>

                <div
                  id="requestFiltersPanel"
                  className="request-filters-panel filter-accordion-panel"
                  hidden={!requestFilterOpen}
                >
                  {/* Accordion 1: Jenis */}
                  <div className="filter-accordion-section">
                    <button
                      type="button"
                      className={`filter-accordion-header ${
                        reqOpenSections.jenis ? "open" : ""
                      }`}
                      aria-expanded={reqOpenSections.jenis}
                      onClick={() =>
                        setReqOpenSections((prev) => ({
                          ...prev,
                          jenis: !prev.jenis,
                        }))
                      }
                    >
                      <span>Jenis</span>
                      <span
                        className="filter-accordion-chevron"
                        aria-hidden="true"
                      >
                        {reqOpenSections.jenis ? "^" : "v"}
                      </span>
                    </button>

                    {reqOpenSections.jenis && (
                      <div className="filter-accordion-body">
                        {JENIS_FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            className={`request-filter-option ${
                              draftReqJenis === opt.key ? "active" : ""
                            }`}
                            onClick={() => setDraftReqJenis(opt.key)}
                          >
                            <span>{opt.label}</span>
                            <span className="request-filter-count">
                              {reqCounts.jenis[opt.key]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Status Permintaan */}
                  <div className="filter-accordion-section">
                    <button
                      type="button"
                      className={`filter-accordion-header ${
                        reqOpenSections.status ? "open" : ""
                      }`}
                      aria-expanded={reqOpenSections.status}
                      onClick={() =>
                        setReqOpenSections((prev) => ({
                          ...prev,
                          status: !prev.status,
                        }))
                      }
                    >
                      <span>Status Permintaan</span>
                      <span
                        className="filter-accordion-chevron"
                        aria-hidden="true"
                      >
                        {reqOpenSections.status ? "^" : "v"}
                      </span>
                    </button>

                    {reqOpenSections.status && (
                      <div className="filter-accordion-body">
                        {(
                          ["semua", "Baru", "Dalam Proses", "Selesai"] as const
                        ).map((statusKey) => (
                          <button
                            key={statusKey}
                            type="button"
                            className={`request-filter-option ${
                              draftReqStatus === statusKey ? "active" : ""
                            }`}
                            onClick={() => setDraftReqStatus(statusKey)}
                          >
                            <span>
                              {statusKey === "semua"
                                ? "Semua status"
                                : statusKey}
                            </span>
                            <span className="request-filter-count">
                              {reqCounts.status[statusKey]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Lokasi Permintaan */}
                  <div className="filter-accordion-section">
                    <button
                      type="button"
                      className={`filter-accordion-header ${
                        reqOpenSections.location ? "open" : ""
                      }`}
                      aria-expanded={reqOpenSections.location}
                      onClick={() =>
                        setReqOpenSections((prev) => ({
                          ...prev,
                          location: !prev.location,
                        }))
                      }
                    >
                      <span>Lokasi Permintaan</span>
                      <span
                        className="filter-accordion-chevron"
                        aria-hidden="true"
                      >
                        {reqOpenSections.location ? "^" : "v"}
                      </span>
                    </button>

                    {reqOpenSections.location && (
                      <div className="filter-accordion-body">
                        {(
                          [
                            { key: "semua", label: "Semua lokasi" },
                            { key: "jatim", label: "Jawa Timur" },
                            { key: "luar_jatim", label: "Luar Jawa Timur" },
                          ] as const
                        ).map((loc) => (
                          <button
                            key={loc.key}
                            type="button"
                            className={`request-filter-option ${
                              draftReqLocation === loc.key ? "active" : ""
                            }`}
                            onClick={() => setDraftReqLocation(loc.key)}
                          >
                            <span>{loc.label}</span>
                            <span className="request-filter-count">
                              {reqCounts.location[loc.key]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="request-filter-footer">
                    <button
                      type="button"
                      className="secondary-button"
                      id="applyRequestFilters"
                      onClick={() => {
                        setAppliedReqJenis(draftReqJenis);
                        setAppliedReqStatus(draftReqStatus);
                        setAppliedReqLocation(draftReqLocation);
                        setRequestFilterOpen(false);
                      }}
                    >
                      Terapkan filter
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      id="resetRequestFilters"
                      onClick={() => {
                        setDraftReqJenis("semua");
                        setDraftReqStatus("semua");
                        setDraftReqLocation("semua");
                        setAppliedReqJenis("semua");
                        setAppliedReqStatus("semua");
                        setAppliedReqLocation("semua");
                        setRequestFilterOpen(false);
                      }}
                    >
                      Reset filter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="requestList" className="card-grid">
            {filteredRequests.length === 0 ? (
              <div className="request-empty-state">
                <h3>Permintaan tidak ditemukan</h3>
                <p>Coba ubah kata kunci atau filter pencarian Anda.</p>
              </div>
            ) : (
              filteredRequests.map((item) => {
                const pastDeadline = isPastDeadline(item);
                const statusText = pastDeadline
                  ? "Ditutup"
                  : normalizeRequestStatus(item.status);
                const statusClass = pastDeadline
                  ? "status-selesai"
                  : getRequestStatusClass(item.status);
                const isClosed = pastDeadline || statusText === "Selesai";

                return (
                  <article key={item.id} className="directory-card">
                    <div className="card-image-wrapper">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="card-image"
                        loading="lazy"
                      />
                      <span className={`status ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>

                    <h3>{item.title}</h3>
                    <p className="card-subtitle">{item.company}</p>

                    <div className="info-list">
                      <div className="info-item">
                        <small>Jumlah</small>
                        <strong>{item.volume}</strong>
                      </div>
                      <div className="info-item">
                        <small>Tanggal Pengajuan</small>
                        <strong>{item.submissionDate}</strong>
                      </div>
                      <div className="info-item">
                        <small>Tanggal Dibutuhkan</small>
                        <strong>{item.deadline}</strong>
                      </div>
                      <div className="info-item">
                        <small>Lokasi</small>
                        <strong>{item.location}</strong>
                      </div>
                    </div>

                    <div className="card-note">
                      <small>Catatan</small>
                      <p>{item.summary}</p>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="card-button button-detail"
                        onClick={() =>
                          setSelectedModal({ type: "request", item })
                        }
                      >
                        Lihat Detail
                      </button>

                      <button
                        type="button"
                        className={`card-button ${
                          isClosed ? "button-disabled" : "button-offer"
                        }`}
                        aria-disabled={isClosed ? "true" : undefined}
                        disabled={isClosed}
                        title={
                          isClosed
                            ? pastDeadline
                              ? "Batas waktu permintaan sudah lewat"
                              : "Permintaan mitra sudah terpenuhi"
                            : "Ajukan penawaran untuk kebutuhan ini"
                        }
                        onClick={() => {
                          if (!isClosed) handleAddOfferClick(item.id);
                        }}
                      >
                        Ajukan Penawaran
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* TAB PENAWARAN DESA */}
        <section
          id="penawaran"
          className={`tab-content ${
            activeTab === "penawaran" ? "active" : ""
          }`}
        >
          <div className="offer-toolbar-wrap" ref={offerFilterRef}>
            <div className="toolbar">
              <div>
                <h2>Penawaran Desa</h2>
                <p>
                  Produk, komoditas, dan jasa yang ditawarkan oleh pelaku usaha.
                </p>
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className="secondary-button"
                  id="addOfferButton"
                  onClick={() => handleAddOfferClick()}
                >
                  + Buat Penawaran
                </button>

                <div className="search-box">
                  <input
                    type="search"
                    id="searchOffer"
                    placeholder="Cari produk, jasa, atau pelaku usaha..."
                    aria-label="Cari penawaran desa"
                    value={offerSearch}
                    onChange={(e) => setOfferSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="secondary-button offer-filter-toggle"
                  id="toggleOfferFilters"
                  aria-expanded={offerFilterOpen}
                  aria-controls="offerFiltersPanel"
                  onClick={() => setOfferFilterOpen((prev) => !prev)}
                >
                  <span aria-hidden="true">☷</span> Filter
                </button>
              </div>
            </div>

            <div
              id="offerFiltersPanel"
              className="offer-filters-panel filter-accordion-panel"
              hidden={!offerFilterOpen}
            >
              {/* Accordion 1: Jenis */}
              <div className="filter-accordion-section">
                <button
                  type="button"
                  className={`filter-accordion-header ${
                    offerOpenSections.jenis ? "open" : ""
                  }`}
                  aria-expanded={offerOpenSections.jenis}
                  onClick={() =>
                    setOfferOpenSections((prev) => ({
                      ...prev,
                      jenis: !prev.jenis,
                    }))
                  }
                >
                  <span>Jenis</span>
                  <span
                    className="filter-accordion-chevron"
                    aria-hidden="true"
                  >
                    {offerOpenSections.jenis ? "^" : "v"}
                  </span>
                </button>

                {offerOpenSections.jenis && (
                  <div className="filter-accordion-body">
                    {JENIS_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`offer-filter-option ${
                          draftOfferJenis === opt.key ? "active" : ""
                        }`}
                        onClick={() => setDraftOfferJenis(opt.key)}
                      >
                        <span>{opt.label}</span>
                        <span className="offer-filter-count">
                          {offerCounts.jenis[opt.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion 2: Ketersediaan */}
              <div className="filter-accordion-section">
                <button
                  type="button"
                  className={`filter-accordion-header ${
                    offerOpenSections.availability ? "open" : ""
                  }`}
                  aria-expanded={offerOpenSections.availability}
                  onClick={() =>
                    setOfferOpenSections((prev) => ({
                      ...prev,
                      availability: !prev.availability,
                    }))
                  }
                >
                  <span>Ketersediaan</span>
                  <span
                    className="filter-accordion-chevron"
                    aria-hidden="true"
                  >
                    {offerOpenSections.availability ? "^" : "v"}
                  </span>
                </button>

                {offerOpenSections.availability && (
                  <div className="filter-accordion-body">
                    {(
                      [
                        { key: "semua", label: "Semua ketersediaan" },
                        { key: "stok", label: "Stok tersedia" },
                        { key: "po", label: "Pre-Order (PO)" },
                        { key: "musiman", label: "Musiman" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`offer-filter-option ${
                          draftOfferAvail === opt.key ? "active" : ""
                        }`}
                        onClick={() => setDraftOfferAvail(opt.key)}
                      >
                        <span>{opt.label}</span>
                        <span className="offer-filter-count">
                          {offerCounts.availability[opt.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion 3: Status Penawaran */}
              <div className="filter-accordion-section">
                <button
                  type="button"
                  className={`filter-accordion-header ${
                    offerOpenSections.status ? "open" : ""
                  }`}
                  aria-expanded={offerOpenSections.status}
                  onClick={() =>
                    setOfferOpenSections((prev) => ({
                      ...prev,
                      status: !prev.status,
                    }))
                  }
                >
                  <span>Status Penawaran</span>
                  <span
                    className="filter-accordion-chevron"
                    aria-hidden="true"
                  >
                    {offerOpenSections.status ? "^" : "v"}
                  </span>
                </button>

                {offerOpenSections.status && (
                  <div className="filter-accordion-body">
                    {(["semua", "Aktif", "Selesai"] as const).map(
                      (statusKey) => (
                        <button
                          key={statusKey}
                          type="button"
                          className={`offer-filter-option ${
                            draftOfferStatus === statusKey ? "active" : ""
                          }`}
                          onClick={() => setDraftOfferStatus(statusKey)}
                        >
                          <span>
                            {statusKey === "semua"
                              ? "Semua status"
                              : statusKey}
                          </span>
                          <span className="offer-filter-count">
                            {offerCounts.status[statusKey]}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 4: Jangkauan */}
              <div className="filter-accordion-section">
                <button
                  type="button"
                  className={`filter-accordion-header ${
                    offerOpenSections.coverage ? "open" : ""
                  }`}
                  aria-expanded={offerOpenSections.coverage}
                  onClick={() =>
                    setOfferOpenSections((prev) => ({
                      ...prev,
                      coverage: !prev.coverage,
                    }))
                  }
                >
                  <span>Jangkauan</span>
                  <span
                    className="filter-accordion-chevron"
                    aria-hidden="true"
                  >
                    {offerOpenSections.coverage ? "^" : "v"}
                  </span>
                </button>

                {offerOpenSections.coverage && (
                  <div className="filter-accordion-body">
                    {(
                      [
                        { key: "semua", label: "Semua jangkauan" },
                        { key: "jawa_timur", label: "Jawa Timur" },
                        { key: "pulau_jawa", label: "Pulau Jawa" },
                        { key: "nasional", label: "Nasional" },
                      ] as const
                    ).map((cov) => (
                      <button
                        key={cov.key}
                        type="button"
                        className={`offer-filter-option ${
                          draftOfferCoverage === cov.key ? "active" : ""
                        }`}
                        onClick={() => setDraftOfferCoverage(cov.key)}
                      >
                        <span>{cov.label}</span>
                        <span className="offer-filter-count">
                          {offerCounts.coverage[cov.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="offer-filter-actions">
                <button
                  type="button"
                  className="secondary-button"
                  id="applyOfferFilters"
                  onClick={() => {
                    setAppliedOfferJenis(draftOfferJenis);
                    setAppliedOfferAvail(draftOfferAvail);
                    setAppliedOfferStatus(draftOfferStatus);
                    setAppliedOfferCoverage(draftOfferCoverage);
                    setOfferFilterOpen(false);
                  }}
                >
                  Terapkan filter
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  id="resetOfferFilters"
                  onClick={() => {
                    setDraftOfferJenis("semua");
                    setDraftOfferAvail("semua");
                    setDraftOfferStatus("semua");
                    setDraftOfferCoverage("semua");
                    setAppliedOfferJenis("semua");
                    setAppliedOfferAvail("semua");
                    setAppliedOfferStatus("semua");
                    setAppliedOfferCoverage("semua");
                    setOfferFilterOpen(false);
                  }}
                >
                  Reset filter
                </button>
              </div>
            </div>
          </div>

          <div className="offer-results-header">
            <p id="offerCount">
              Menampilkan {filteredOffers.length} dari {offers.length} penawaran
              desa
            </p>
          </div>

          {filteredOffers.length === 0 ? (
            <div id="offerEmptyState" className="offer-empty-state show">
              <h3>Belum ada penawaran yang sesuai</h3>
              <p>
                Coba ubah kata kunci atau filter pencarian untuk melihat
                penawaran dari pelaku usaha Desa Jarak.
              </p>
            </div>
          ) : (
            <div id="offerList" className="card-grid offer-product-grid">
              {filteredOffers.map((item) => {
                const statusText = normalizeOfferStatus(item);
                const isActive = statusText === "Aktif";
                const statusClass = isActive
                  ? "offer-status-aktif"
                  : "offer-status-selesai";
                const availLabel = normalizeOfferAvailabilityLabel(item);
                const estAvailLabel = getOfferEstimatedAvailabilityLabel(item);

                return (
                  <article key={item.id} className="directory-card">
                    <div className="card-image-wrapper">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="card-image"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="offer-image-placeholder"
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#eef5ef",
                            color: "#276749",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          Belum ada foto
                        </div>
                      )}
                      <span className={`status ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>

                    <h3>{item.title}</h3>
                    <p className="card-subtitle">{item.business}</p>

                    <div className="offer-card-meta">
                      <div>
                        <small>
                          {item.category === "Jasa"
                            ? "Kapasitas layanan"
                            : "Jumlah"}
                        </small>
                        <strong>{item.capacity || "-"}</strong>
                      </div>
                      <div>
                        <small>Estimasi ketersediaan</small>
                        <strong>{estAvailLabel}</strong>
                      </div>
                      <div>
                        <small>Harga</small>
                        <strong>{item.priceLabel}</strong>
                      </div>
                      <div>
                        <small>Status ketersediaan</small>
                        <strong>{availLabel}</strong>
                      </div>
                    </div>

                    <div className="card-note">
                      <small>Catatan</small>
                      <p>{item.note || item.summary || "Belum ada catatan tambahan."}</p>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="card-button button-detail"
                        onClick={() =>
                          setSelectedModal({ type: "offer", item })
                        }
                      >
                        Lihat Detail
                      </button>

                      {/* Until interest is recorded in the app (Phase 2), "Nyatakan
                          Minat" opens WhatsApp to the seller. Without a login or
                          a usable number it opens the detail, which explains why. */}
                      {statusText !== "Selesai" &&
                      user &&
                      whatsAppUrl(item.contact.phone) ? (
                        <a
                          className="card-button button-offer"
                          href={
                            whatsAppUrl(
                              item.contact.phone,
                              `Halo ${item.business}, saya tertarik dengan penawaran ${item.title} di Direktori Desa Jarak.`
                            )!
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Nyatakan Minat
                        </a>
                      ) : (
                        <button
                          type="button"
                          className={`card-button ${
                            statusText === "Selesai"
                              ? "button-disabled"
                              : "button-offer"
                          }`}
                          aria-disabled={
                            statusText === "Selesai" ? "true" : "false"
                          }
                          disabled={statusText === "Selesai"}
                          onClick={() =>
                            setSelectedModal({ type: "offer", item })
                          }
                        >
                          Nyatakan Minat
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* MODAL DETAIL */}
      {selectedModal && (
        <div
          id="detailModal"
          className="modal show"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedModal(null);
            }
          }}
        >
          <div className="modal-content">
            <button
              type="button"
              className="modal-close"
              id="closeModal"
              aria-label="Tutup detail"
              onClick={() => setSelectedModal(null)}
            >
              ×
            </button>

            <div id="modalBody">
              {selectedModal.type === "request" ? (
                (() => {
                  const reqItem = selectedModal.item;
                  const pastDeadline = isPastDeadline(reqItem);
                  const statusText = pastDeadline
                    ? "Ditutup"
                    : normalizeRequestStatus(reqItem.status);
                  const statusClass = pastDeadline
                    ? "status-selesai"
                    : getRequestStatusClass(reqItem.status);
                  const isClosed = pastDeadline || statusText === "Selesai";
                  const requestedQuantity = Number(reqItem.requestedQuantity) || 0;
                  const fulfilledQuantity = Math.min(
                    requestedQuantity,
                    Math.max(0, Number(reqItem.fulfilledQuantity) || 0)
                  );
                  const remainingQuantity = Math.max(
                    0,
                    requestedQuantity - fulfilledQuantity
                  );
                  const fulfillmentPercent =
                    requestedQuantity > 0
                      ? Math.round(
                          (fulfilledQuantity / requestedQuantity) * 100
                        )
                      : 0;
                  const remainingLabel =
                    requestedQuantity > 0
                      ? `${remainingQuantity.toLocaleString("id-ID")} ${reqItem.unit}`
                      : reqItem.volume;

                  return (
                    <>
                      <div className="modal-image-wrapper">
                        <img
                          src={reqItem.image}
                          alt={`Foto ${reqItem.title}`}
                          className="modal-image"
                        />
                        <span className={`modal-status ${statusClass}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="modal-section">
                        <h2>{reqItem.title}</h2>
                        <p className="modal-partner">{reqItem.company}</p>
                      </div>

                      <div className="modal-section">
                        <h4>Detail Permintaan</h4>
                        <div className="modal-info-grid">
                          <div>
                            <small>Jumlah</small>
                            <strong>{reqItem.volume}</strong>
                          </div>
                          <div>
                            <small>Tanggal Pengajuan</small>
                            <strong>{reqItem.submissionDate}</strong>
                          </div>
                          <div>
                            <small>Tanggal Dibutuhkan</small>
                            <strong>{reqItem.deadline}</strong>
                          </div>
                          <div>
                            <small>Lokasi Pengiriman</small>
                            <strong>{reqItem.location}</strong>
                          </div>
                        </div>

                        <div className="fulfillment-panel">
                          <div className="fulfillment-heading">
                            <h4>Progres Pemenuhan</h4>
                            <strong className="fulfillment-percent">
                              {fulfillmentPercent}%
                            </strong>
                          </div>

                          <div
                            className="fulfillment-track"
                            role="progressbar"
                            aria-label="Persentase pemenuhan permintaan"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={fulfillmentPercent}
                          >
                            <span style={{ width: `${fulfillmentPercent}%` }} />
                          </div>

                          <div className="fulfillment-stats">
                            <span>Sisa kebutuhan</span>
                            <strong>{remainingLabel}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="modal-section">
                        <h4>Informasi Mitra</h4>
                        {user ? (
                          <div className="modal-contact">
                            <p>
                              <strong>PIC:</strong>{" "}
                              {reqItem.contact.pic || "-"} (
                              {reqItem.contact.role || "Penanggung Jawab"})
                            </p>
                            <p>
                              <strong>Alamat:</strong>{" "}
                              {reqItem.partnerAddress || reqItem.location}
                            </p>
                            <p>
                              <strong>Email:</strong>{" "}
                              {reqItem.contact.email || "-"}
                            </p>
                            <p>
                              <strong>Telepon:</strong>{" "}
                              <PhoneLink phone={reqItem.contact.phone} />
                            </p>
                            <p>
                              <strong>WhatsApp:</strong>{" "}
                              <PhoneLink
                                phone={
                                  reqItem.contact.whatsapp ||
                                  reqItem.contact.phone
                                }
                                whatsapp
                              />
                            </p>
                          </div>
                        ) : (
                          <div className="modal-contact-locked">
                            <span className="modal-lock-icon" aria-hidden="true">
                              🔒
                            </span>
                            <div>
                              <strong>Informasi kontak dibatasi</strong>
                              <p>
                                Masuk sebagai pelaku usaha desa untuk melihat
                                informasi kontak mitra.
                              </p>
                              <Link href="/masuk?next=/direktori">
                                Masuk ke akun
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="modal-section modal-note-section">
                        <h4>Catatan</h4>
                        <p>{reqItem.summary}</p>
                      </div>

                      <div className="modal-action">
                        <button
                          type="button"
                          className={
                            isClosed ? "button-disabled" : "button-offer"
                          }
                          aria-disabled={isClosed ? "true" : "false"}
                          disabled={isClosed}
                          title={
                            isClosed
                              ? pastDeadline
                              ? "Batas waktu permintaan sudah lewat"
                              : "Permintaan mitra sudah terpenuhi"
                              : "Ajukan penawaran untuk permintaan ini"
                          }
                          onClick={() => {
                            if (!isClosed) {
                              const reqId = reqItem.id;
                              setSelectedModal(null);
                              handleAddOfferClick(reqId);
                            }
                          }}
                        >
                          Ajukan Penawaran
                        </button>
                      </div>
                    </>
                  );
                })()
              ) : (
                (() => {
                  const offerItem = selectedModal.item;
                  const statusText = normalizeOfferStatus(offerItem);
                  const isActive = statusText === "Aktif";
                  const statusClass = isActive
                    ? "status-proses"
                    : "status-selesai";
                  const availLabel = normalizeOfferAvailabilityLabel(offerItem);
                  const estAvailLabel =
                    getOfferEstimatedAvailabilityLabel(offerItem);
                  const isFarmerGroup =
                    offerItem.providerType.toLowerCase() === "kelompok_tani" ||
                    offerItem.business.toLowerCase().includes("kelompok tani");

                  return (
                    <>
                      {offerItem.image ? (
                        <div className="modal-image-wrapper">
                          <img
                            src={offerItem.image}
                            alt={offerItem.title}
                            className="modal-image"
                          />
                          <span className={`modal-status ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                      ) : (
                        <div className="modal-section">
                          <span className={`modal-status ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                      )}

                      <div className="modal-section">
                        <h2>{offerItem.title}</h2>
                        <p className="modal-partner">{offerItem.business}</p>
                      </div>

                      <div className="modal-section">
                        <h4>Detail Penawaran</h4>
                        <div className="modal-info-grid">
                          <div>
                            <small>Jumlah</small>
                            <strong>{offerItem.capacity || "-"}</strong>
                          </div>
                          <div>
                            <small>Tanggal Penawaran</small>
                            <strong>
                              {offerItem.offerDate || "Belum dicantumkan"}
                            </strong>
                          </div>
                          <div>
                            <small>Status Ketersediaan</small>
                            <strong>{availLabel}</strong>
                          </div>
                          <div>
                            <small>Estimasi Ketersediaan</small>
                            <strong>{estAvailLabel}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="modal-section">
                        <h4>Informasi Pelaku Usaha</h4>
                        {user ? (
                          <div className="modal-contact">
                            <p>
                              <strong>Nama penawar:</strong>{" "}
                              {offerItem.business}
                            </p>
                            {offerItem.contact.pic && (
                              <p>
                                <strong>PIC:</strong> {offerItem.contact.pic}
                              </p>
                            )}
                            {offerItem.contact.phone && (
                              <p>
                                <strong>Nomor HP:</strong>{" "}
                                <PhoneLink phone={offerItem.contact.phone} />
                              </p>
                            )}
                            {whatsAppUrl(offerItem.contact.phone) && (
                              <p>
                                <a
                                  className="button-offer card-button"
                                  href={
                                    whatsAppUrl(
                                      offerItem.contact.phone,
                                      `Halo ${offerItem.business}, saya tertarik dengan penawaran ${offerItem.title} di Direktori Desa Jarak.`
                                    )!
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Hubungi lewat WhatsApp
                                </a>
                              </p>
                            )}

                            {isFarmerGroup && (
                              <>
                                <h4>Petani yang Menyediakan</h4>
                                <div className="modal-farmer-list">
                                  {offerItem.farmers.length > 0 ? (
                                    offerItem.farmers.map((farmer, idx) => (
                                      <div
                                        key={idx}
                                        className="modal-farmer-item"
                                      >
                                        <strong>{farmer.name}</strong>
                                        <span>
                                          {farmer.phone ? (
                                            <PhoneLink phone={farmer.phone} />
                                          ) : (
                                            "Nomor HP belum dicantumkan"
                                          )}
                                        </span>
                                        {farmer.quantity && (
                                          <small>
                                            Pasokan:{" "}
                                            {`${farmer.quantity} ${farmer.unit}`.trim()}
                                          </small>
                                        )}
                                        {farmer.price && (
                                          <small>Harga: {farmer.price}</small>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p>
                                      Daftar petani dan nomor HP belum
                                      dicantumkan.
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="modal-contact-locked">
                            <span className="modal-lock-icon" aria-hidden="true">
                              🔒
                            </span>
                            <div>
                              <strong>Informasi kontak dibatasi</strong>
                              <p>
                                Masuk ke akun untuk melihat informasi penawar
                                dan menghubungi secara langsung.
                              </p>
                              <Link href="/masuk?next=/direktori">
                                Masuk ke akun
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="modal-section modal-note-section">
                        <h4>Catatan Penawaran</h4>
                        <p>
                          {offerItem.note ||
                            offerItem.summary ||
                            "Belum ada catatan tambahan."}
                        </p>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
