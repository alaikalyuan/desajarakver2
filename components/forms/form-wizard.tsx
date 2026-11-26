"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import Link from "next/link";
import { NumberInput } from "@/components/forms/number-input";
import { formatNumber, formatRupiah, parseDecimal, todayWIB } from "@/lib/format";
import { resizePhoto } from "@/lib/image-resize";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  ImagePlus,
  Leaf,
  Package,
  Plus,
  Send,
  Store,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  createEmptyFormData,
  createReference,
  DELIVERY_OPTIONS,
  DURATION_OPTIONS,
  type EntryStatus,
  type FormData,
  type FormEntry,
  type FormKind,
  formatTimestamp,
  FREQUENCY_OPTIONS,
  type FormErrors,
  getSteps,
  GRADE_OPTIONS,
  isEditableStatus,
  isGroupOffer,
  MAX_PROVIDERS,
  neededDateFromInput,
  neededDateToInput,
  normalizeOwnerType,
  OFFER_OWNER_TYPES,
  optionLabel,
  PERORANGAN_NAME,
  PERORANGAN_TYPE,
  PARTNERSHIP_OPTIONS,
  PAYMENT_OPTIONS,
  PRODUCT_OPTIONS,
  REQUEST_OWNER_TYPES,
  providerErrorKey,
  providerTotals,
  resolveFormData,
  type SelectOption,
  submittedStatus,
  type TargetRequestSummary,
  UNIT_OPTIONS,
  validateAllSteps,
  validateStep,
} from "@/lib/forms/form-flow";
import { buildOfferCompatibility, buildReadinessItems, getRoleMeta } from "@/lib/forms/domain";
import { isKelompokTaniName, KELOMPOK_TANI, KELOMPOK_TANI_NAMES } from "@/lib/forms/kelompok-tani";
import {
  findMyOfferForRequest,
  getTargetRequestById,
  readFormEntries,
  saveFormEntry,
} from "@/lib/listings";
import "./form-wizard.css";

/** Profile fields used to fill in the contact step for a new listing. */
export interface WizardProfile {
  fullName: string;
  businessName: string;
  phone: string;
}

interface FormWizardProps {
  kind: FormKind;
  initialRequestId?: string | null;
  initialEntryId?: string | null;
  profile?: WizardProfile | null;
}

interface StoredProgress {
  data: FormData;
  stepId?: string;
  savedAt: string;
}

/** Photos larger than this are refused before resizing (protects old phones' memory). */
const MAX_SOURCE_PHOTO_BYTES = 25 * 1024 * 1024;

const OWNER_TYPE_ICONS: Record<string, LucideIcon> = {
  "Kelompok Tani": Leaf,
  "Warga Tani": User,
  UMKM: Store,
  "BUMDes/Kopdes": Building2,
};

const PRODUCT_IMAGES: Record<string, string> = {
  "Beras & Gabah": "/assets/Images/Gambar Padi Beras Desa Jarak.jpg",
  "Jagung Pipil": "/assets/Images/Gambar Jagung Desa Jarak.jpg",
  "Cabai & Sayur Dataran Rendah": "/assets/form-kemitraan/sayuran.jpg",
};

function storageKey(kind: FormKind, entryId: string | null, requestId: string | null) {
  return `jarak-form:${kind}:${entryId || (requestId ? `req-${requestId}` : "baru")}`;
}

function readProgress(key: string): StoredProgress | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProgress;
    return parsed && parsed.data ? parsed : null;
  } catch {
    return null;
  }
}

function writeProgress(key: string, progress: StoredProgress | null) {
  try {
    if (progress) window.localStorage.setItem(key, JSON.stringify(progress));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage full or blocked (private mode): the form still works, it just
    // will not survive a reload.
  }
}

/** Error text for the user, in Indonesian, whatever the cause. */
function friendlyError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || /failed to fetch|networkerror|network request|load failed|fetch failed/i.test(message)) {
    return "Koneksi internet terputus. Isian Anda tetap tersimpan di HP ini. Coba kirim lagi saat sinyal kembali.";
  }
  if (!message || /[a-z]+Error\b|unexpected|undefined|null/i.test(message)) return fallback;
  return message;
}

export function FormWizard({
  kind,
  initialRequestId = null,
  initialEntryId = null,
  profile = null,
}: FormWizardProps) {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [targetRequest, setTargetRequest] = useState<TargetRequestSummary | null>(null);
  const [activeEntry, setActiveEntry] = useState<FormEntry | null>(null);
  const [submittedEntry, setSubmittedEntry] = useState<FormEntry | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<FormData>(() => withProfile(createEmptyFormData(kind, null), profile));
  const [errors, setErrors] = useState<FormErrors>({});
  const [productSearch, setProductSearch] = useState("");
  const [newProvider, setNewProvider] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [focusErrorTick, setFocusErrorTick] = useState(0);
  // Set when this offer cannot be made at all: the seller already offered
  // on this request, or the request is closed or missing.
  const [blocked, setBlocked] = useState<
    { reason: "duplicate"; reference: string } | { reason: "closed" } | null
  >(null);

  const steps = useMemo(() => getSteps(kind, data.ownerType), [kind, data.ownerType]);
  const reviewStep = steps.length - 1;
  const group = isGroupOffer(kind, data);
  // What will be saved: for a group, totals come from its members.
  const resolved = useMemo(() => resolveFormData(kind, data), [kind, data]);
  const totals = useMemo(() => providerTotals(data.providers), [data.providers]);
  const roleMeta = useMemo(() => getRoleMeta(kind), [kind]);
  const ownerOptions = kind === "request" ? REQUEST_OWNER_TYPES : OFFER_OWNER_TYPES;
  const progressKey = storageKey(kind, initialEntryId, initialRequestId);

  // Identity of a new listing; replaced when a draft or published one is opened.
  const [fresh] = useState(() => newIdentity(kind));
  const entryIdRef = useRef(fresh.id);
  const createdAtRef = useRef(fresh.createdAt);
  const [reference, setReference] = useState(fresh.reference);
  const [today] = useState(() => todayWIB());
  // JSON of the data as last loaded or saved; anything else is unsaved work.
  const [baseline, setBaseline] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const dirty = ready && !submittedEntry && JSON.stringify(data) !== baseline;

  /** Point the wizard at an existing listing and return its data. */
  function applyEntry(entry: FormEntry): FormData {
    setActiveEntry(entry);
    entryIdRef.current = entry.id;
    createdAtRef.current = entry.createdAt;
    setReference(entry.reference);
    if (entry.targetRequest) setTargetRequest(entry.targetRequest);
    setStepIndex(0);
    setErrors({});
    setSubmitNotice(
      entry.status === "published"
        ? `Mengubah ${entry.reference}. Perubahan langsung tampil di Direktori setelah disimpan.`
        : `Melanjutkan draf ${entry.reference}.`
    );
    return { ...createEmptyFormData(kind, entry.targetRequest), ...entry.data };
  }

  // Load drafts and the target request, then restore unsent work from this phone.
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      const offerToRequest = kind === "offer" && initialRequestId && !initialEntryId;
      const [loadedEntries, loadedTarget, existingOffer] = await Promise.all([
        readFormEntries(),
        kind === "offer" && initialRequestId ? getTargetRequestById(initialRequestId) : Promise.resolve(null),
        offerToRequest ? findMyOfferForRequest(initialRequestId) : Promise.resolve(null),
      ]);

      if (!mounted) return;
      setEntries(loadedEntries);

      if (offerToRequest) {
        if (existingOffer) {
          setBlocked({ reason: "duplicate", reference: existingOffer.reference });
          return;
        }
        if (!loadedTarget) {
          setBlocked({ reason: "closed" });
          return;
        }
      }

      let base: FormData | null = null;
      let baseUpdatedAt = "";

      // Continue a draft, or edit a published listing ("Ubah").
      if (initialEntryId) {
        const found = loadedEntries.find((item) => item.id === initialEntryId && item.kind === kind);
        if (found && !isEditableStatus(found.status)) {
          setSubmitNotice(
            `${kind === "request" ? "Permintaan" : "Penawaran"} ini sudah dikirim dan tidak bisa diubah lagi.`
          );
        } else if (found) {
          base = applyEntry(found);
          baseUpdatedAt = found.updatedAt;
        }
      }

      // An offer is only linked to a request when the URL names one
      // (?requestId=...). Never guess a target from other listings.
      if (!base && kind === "offer" && loadedTarget) {
        setTargetRequest(loadedTarget);
        base = {
          ...withProfile(createEmptyFormData(kind, loadedTarget), profile),
        };
      }

      const current = base ?? withProfile(createEmptyFormData(kind, null), profile);
      const currentJson = JSON.stringify(current);
      setBaseline(currentJson);
      setData(current);

      const stored = readProgress(progressKey);
      if (
        stored &&
        JSON.stringify(stored.data) !== currentJson &&
        (!baseUpdatedAt || stored.savedAt > baseUpdatedAt)
      ) {
        const restored = { ...current, ...stored.data };
        restored.ownerType = normalizeOwnerType(kind, restored.ownerType);
        setData(restored);
        const storedStep = getSteps(kind, restored.ownerType).findIndex((s) => s.id === stored.stepId);
        setStepIndex(Math.max(0, storedStep));
        setRestoredNotice(true);
      }
      setReady(true);
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
    // `profile` and `progressKey` come from the same props as the others.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, initialRequestId, initialEntryId]);

  function loadDraft(entry: FormEntry) {
    const next = applyEntry(entry);
    setBaseline(JSON.stringify(next));
    setData(next);
    setRestoredNotice(false);
  }

  // Autosave unsent work to this phone, so a reload or a closed tab loses nothing.
  useEffect(() => {
    if (!ready || submittedEntry) return;
    const timer = window.setTimeout(() => {
      writeProgress(
        progressKey,
        dirty ? { data, stepId: steps[stepIndex]?.id, savedAt: new Date().toISOString() } : null
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [data, steps, stepIndex, dirty, ready, submittedEntry, progressKey]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // After a failed check, move focus to the first field with an error.
  useEffect(() => {
    if (focusErrorTick === 0) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (field) {
      field.focus();
      field.scrollIntoView({ block: "center" });
    }
  }, [focusErrorTick]);

  const isEditingPublished = activeEntry?.status === "published";
  const requestIdForEntry =
    kind === "offer" ? activeEntry?.requestId ?? initialRequestId ?? targetRequest?.id ?? null : null;

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setData((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitNotice("");
  }, []);

  function chooseOwnerType(value: string) {
    if (value === data.ownerType) return;
    updateField("ownerType", value);
    // A group or "Pembeli Perorangan" is not the name of another kind of seller or buyer.
    if (isKelompokTaniName(data.ownerName) || data.ownerName === PERORANGAN_NAME) {
      updateField("ownerName", profile?.businessName || profile?.fullName || "");
      updateField("providers", []);
    }
  }

  function chooseGroup(name: string) {
    if (name !== data.ownerName) updateField("providers", []);
    updateField("ownerName", name);
  }

  function toggleProvider(name: string) {
    const selected = data.providers.some((p) => p.name === name);
    updateField(
      "providers",
      selected
        ? data.providers.filter((p) => p.name !== name)
        : [...data.providers, { name, quantity: "", price: "" }]
    );
  }

  function addProvider() {
    const name = newProvider.trim().replace(/\s+/g, " ");
    const known = memberNames.find((m) => m.toLowerCase() === name.toLowerCase());
    let problem = "";
    if (!name) problem = "Tulis nama anggota dulu.";
    else if (data.providers.some((p) => p.name === known)) problem = "Nama ini sudah dipilih.";
    else if (data.providers.length >= MAX_PROVIDERS) problem = `Maksimal ${MAX_PROVIDERS} anggota.`;

    setErrors((current) => ({ ...current, newProvider: problem || undefined }));
    if (problem) return;
    toggleProvider(known ?? name);
    setNewProvider("");
  }

  function updateProvider(name: string, field: "quantity" | "price", value: string) {
    updateField(
      "providers",
      data.providers.map((p) => (p.name === name ? { ...p, [field]: value } : p))
    );
    setErrors((current) => ({ ...current, [providerErrorKey(name, field)]: undefined }));
  }

  function goToStepId(id: string) {
    goToStep(steps.findIndex((step) => step.id === id));
  }

  function focusStepHeading() {
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
      stepHeadingRef.current?.scrollIntoView({ block: "start" });
    });
  }

  function goToStep(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    if (targetIndex <= stepIndex) {
      setStepIndex(targetIndex);
      focusStepHeading();
      return;
    }

    // Moving forward: every step on the way must be complete.
    for (let step = stepIndex; step < targetIndex; step += 1) {
      const validation = validateStep(kind, steps[step].id, data, today);
      if (!validation.valid) {
        setErrors(validation.errors);
        setStepIndex(step);
        setSubmitNotice("Ada isian yang perlu diperbaiki. Lihat tulisan merah.");
        setFocusErrorTick((n) => n + 1);
        return;
      }
    }

    setErrors({});
    setSubmitNotice("");
    setStepIndex(targetIndex);
    focusStepHeading();
  }

  function buildEntry(status: EntryStatus): FormEntry {
    return {
      id: entryIdRef.current,
      kind,
      status,
      reference,
      requestId: requestIdForEntry,
      targetRequest: kind === "offer" ? targetRequest : null,
      createdAt: createdAtRef.current,
      updatedAt: new Date().toISOString(),
      data: { ...resolved, quantity: normalizeQuantity(resolved.quantity) },
    };
  }

  async function handleSaveDraft() {
    if (!data.variety.trim() && !data.ownerName.trim()) {
      setErrors({ variety: "Tulis nama barang dulu supaya draf mudah dikenali." });
      setStepIndex(Math.max(0, steps.findIndex((step) => step.id === productStep)));
      setFocusErrorTick((n) => n + 1);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveFormEntry(buildEntry("draft"));
      const next = { ...data, photoPreview: saved.data.photoPreview };
      // Keep the uploaded photo URL so the next save does not upload it again.
      setData(next);
      setActiveEntry(saved);
      setBaseline(JSON.stringify(next));
      writeProgress(progressKey, null);
      setRestoredNotice(false);
      setSubmitNotice(`Draf ${saved.reference} tersimpan pada ${formatTimestamp(saved.updatedAt)}.`);
      setEntries(await readFormEntries());
    } catch (err) {
      setSubmitNotice(friendlyError(err, "Draf gagal disimpan. Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stepIndex < reviewStep) {
      goToStep(stepIndex + 1);
      return;
    }

    const validation = validateAllSteps(kind, data, today);
    setErrors(validation.errors);
    if (!validation.valid && validation.firstInvalidStep !== null) {
      setStepIndex(validation.firstInvalidStep);
      setSubmitNotice("Ada isian yang perlu diperbaiki. Lihat tulisan merah.");
      setFocusErrorTick((n) => n + 1);
      return;
    }

    if (!consent) {
      setConsentError("Centang pernyataan ini sebelum mengirim.");
      setFocusErrorTick((n) => n + 1);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveFormEntry(buildEntry(submittedStatus(kind, requestIdForEntry)));
      writeProgress(progressKey, null);
      setBaseline(JSON.stringify(data));
      setSubmittedEntry(saved);
    } catch (err) {
      setSubmitNotice(friendlyError(err, "Formulir gagal dikirim. Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitNotice("Pilih file foto (JPG, PNG, atau WEBP).");
      return;
    }
    if (file.size > MAX_SOURCE_PHOTO_BYTES) {
      setSubmitNotice("Foto terlalu besar. Pilih foto lain dari galeri.");
      return;
    }

    setPhotoBusy(true);
    try {
      const preview = await resizePhoto(file);
      updateField("photoName", file.name);
      updateField("photoPreview", preview);
    } catch {
      setSubmitNotice("Foto tidak bisa dibaca. Coba foto lain.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function startOver() {
    writeProgress(progressKey, null);
    const start = activeEntry
      ? { ...createEmptyFormData(kind, activeEntry.targetRequest), ...activeEntry.data }
      : withProfile(createEmptyFormData(kind, targetRequest), profile);
    setData(start);
    setBaseline(JSON.stringify(start));
    setStepIndex(0);
    setErrors({});
    setRestoredNotice(false);
  }

  /** After sending: clear the form for another listing. */
  function startNewForm() {
    const identity = newIdentity(kind);
    setSubmittedEntry(null);
    setActiveEntry(null);
    entryIdRef.current = identity.id;
    createdAtRef.current = identity.createdAt;
    setReference(identity.reference);
    const start = withProfile(createEmptyFormData(kind, targetRequest), profile);
    setBaseline(JSON.stringify(start));
    setData(start);
    setStepIndex(0);
    setConsent(false);
    setSubmitNotice("");
  }

  const drafts = useMemo(
    () => entries.filter((item) => item.kind === kind && item.status === "draft" && item.id !== activeEntry?.id),
    [entries, kind, activeEntry]
  );

  const readinessItems = useMemo(() => buildReadinessItems(kind, resolved), [kind, resolved]);

  const compatibilityItems = useMemo(
    () => (kind === "offer" && targetRequest ? buildOfferCompatibility(resolved, targetRequest) : []),
    [kind, resolved, targetRequest]
  );

  const activeStep = steps[Math.min(stepIndex, reviewStep)];

  const productMatches = PRODUCT_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(productSearch.trim().toLowerCase())
  );
  const listedMembers = KELOMPOK_TANI[data.ownerName] || [];
  const memberNames = [
    ...listedMembers,
    ...data.providers.map((p) => p.name).filter((name) => !listedMembers.includes(name)),
  ];
  const isRequest = kind === "request";
  const productStep = isRequest ? "barang" : "produk";
  const amountStep = isRequest ? "barang" : "jumlah";
  const ownerStep = isRequest ? "kontak" : "jenis";
  const infoStep = isRequest ? "kontak" : "informasi";

  if (submittedEntry) {
    return (
      <main id="jarak-forms">
        <section className="jf-success" aria-live="polite">
          <span className="tag green">{submittedEntry.reference}</span>
          <h1>
            {isEditingPublished
              ? "Perubahan Tersimpan"
              : kind === "request"
                ? "Permintaan Terkirim"
                : "Penawaran Terkirim"}
          </h1>
          <p>
            <strong>{submittedEntry.data.ownerName}</strong> - {submittedEntry.data.variety || submittedEntry.data.productType} (
            {submittedEntry.data.quantity} {submittedEntry.data.unit},{" "}
            {optionLabel(FREQUENCY_OPTIONS, submittedEntry.data.frequency)}).
          </p>
          <div>
            <Link className="btn primary" href={kind === "request" ? "/mitra" : "/usaha"}>
              Buka Halaman Saya
            </Link>
            <Link className="btn outline" href="/direktori">
              Lihat Direktori
            </Link>
            <button type="button" className="btn outline" onClick={startNewForm}>
              Isi Formulir Baru
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (blocked) {
    return (
      <main id="jarak-forms">
        <section className="jf-success" role="alert">
          <h1>{blocked.reason === "duplicate" ? "Anda sudah mengirim penawaran" : "Permintaan ini sudah ditutup"}</h1>
          <p>
            {blocked.reason === "duplicate"
              ? `Penawaran ${blocked.reference} untuk permintaan ini sudah terkirim. Satu pelaku usaha hanya bisa mengirim satu penawaran per permintaan. Lihat statusnya di Halaman Saya.`
              : "Permintaan ini sudah ditutup oleh pembeli atau tidak ditemukan, jadi tidak menerima penawaran baru."}
          </p>
          <div>
            <Link className="btn primary" href="/usaha">
              Buka Halaman Saya
            </Link>
            <Link className="btn outline" href="/direktori">
              Kembali ke Direktori
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const productTypeField = (
    <Field label="Jenis Barang" error={errors.productType}>
      <select
        value={data.productType}
        aria-invalid={Boolean(errors.productType)}
        onChange={(e) => updateField("productType", e.target.value)}
      >
        <Options options={PRODUCT_OPTIONS} />
      </select>
    </Field>
  );
  const varietyField = (
    <Field
      label={kind === "request" ? "Nama Barang yang Dicari" : "Nama Barang"}
      hint={kind === "request" ? "Contoh: Beras medium IR64" : "Contoh: Beras Ciherang, karung 50 kg"}
      error={errors.variety}
    >
      <input
        type="text"
        value={data.variety}
        aria-invalid={Boolean(errors.variety)}
        autoComplete="off"
        onChange={(e) => updateField("variety", e.target.value)}
      />
    </Field>
  );
  const quantityField = (
    <Field
      label={kind === "request" ? "Jumlah yang Dibutuhkan" : "Jumlah yang Sanggup Dikirim"}
      hint="Angka saja, misalnya 3 atau 2,5."
      error={errors.quantity}
    >
      <NumberInput
        value={data.quantity}
        error={errors.quantity}
        showMessage={false}
        onValueChange={(value) => updateField("quantity", value)}
      />
    </Field>
  );
  const unitField = (
    <Field label="Satuan" error={errors.unit}>
      <select
        value={data.unit}
        aria-invalid={Boolean(errors.unit)}
        onChange={(e) => updateField("unit", e.target.value)}
      >
        <Options options={UNIT_OPTIONS} />
      </select>
    </Field>
  );
  const frequencyField = (
    <Field
      label={kind === "request" ? "Seberapa Sering" : "Seberapa Sering Bisa Kirim"}
      error={errors.frequency}
    >
      <select
        value={data.frequency}
        aria-invalid={Boolean(errors.frequency)}
        onChange={(e) => updateField("frequency", e.target.value)}
      >
        <Options options={FREQUENCY_OPTIONS} />
      </select>
    </Field>
  );
  const neededDateField = (
    <Field
      label={kind === "request" ? "Dibutuhkan Mulai Tanggal" : "Siap Dikirim Mulai Bulan"}
      error={errors.neededDate}
    >
      <input
        type={kind === "request" ? "date" : "month"}
        value={neededDateToInput(kind, data.neededDate)}
        min={kind === "request" ? today : today.slice(0, 7)}
        aria-invalid={Boolean(errors.neededDate)}
        onChange={(e) => updateField("neededDate", neededDateFromInput(kind, e.target.value))}
      />
    </Field>
  );
  const priceNoteField = (
    <Field
      label={kind === "request" ? "Harga yang Anda Tawarkan" : "Harga Jual"}
      optional
      hint="Contoh: Rp12.000/kg, atau Rp11.800 - Rp12.300/kg"
    >
      <input
        type="text"
        value={data.priceNote}
        onChange={(e) => updateField("priceNote", e.target.value)}
      />
    </Field>
  );
  const gradeField = (
    <Field label="Mutu Barang" optional>
      <select value={data.grade} onChange={(e) => updateField("grade", e.target.value)}>
        <Options options={GRADE_OPTIONS} />
      </select>
    </Field>
  );
  const ownerNameField = (
    <Field
      label={kind === "request" ? "Nama Instansi / Usaha" : "Nama Usaha"}
      error={errors.ownerName}
    >
      <input
        type="text"
        value={data.ownerName}
        aria-invalid={Boolean(errors.ownerName)}
        autoComplete="organization"
        onChange={(e) => updateField("ownerName", e.target.value)}
      />
    </Field>
  );
  const ownerTypeField = (
    <Field label="Jenis Pembeli" error={errors.ownerType}>
      <select
        value={data.ownerType}
        aria-invalid={Boolean(errors.ownerType)}
        onChange={(e) => chooseOwnerType(e.target.value)}
      >
        <Options options={ownerOptions} />
      </select>
    </Field>
  );
  const contactNameField = (
    <Field label={group ? "Nama Ketua Kelompok" : "Nama yang Bisa Dihubungi"} error={errors.contactName}>
      <input
        type="text"
        value={data.contactName}
        aria-invalid={Boolean(errors.contactName)}
        autoComplete="name"
        onChange={(e) => updateField("contactName", e.target.value)}
      />
    </Field>
  );
  const phoneField = (
    <Field label="Nomor HP / WhatsApp" hint="Contoh: 0812 3456 7890" error={errors.phone}>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={data.phone}
        aria-invalid={Boolean(errors.phone)}
        onChange={(e) => updateField("phone", e.target.value)}
      />
    </Field>
  );
  const locationField = (
    <Field
      label={kind === "request" ? "Alamat Tujuan Kirim" : "Tempat Barang Diambil"}
      hint={kind === "request" ? "Contoh: Kecamatan Pare, Kediri" : "Contoh: Dusun Krajan, Desa Jarak"}
      error={errors.location}
    >
      <input
        type="text"
        value={data.location}
        aria-invalid={Boolean(errors.location)}
        onChange={(e) => updateField("location", e.target.value)}
      />
    </Field>
  );
  const partnershipSchemeField = (
    <Field label="Cara Kerja Sama" error={errors.partnershipScheme}>
      <select
        value={data.partnershipScheme}
        aria-invalid={Boolean(errors.partnershipScheme)}
        onChange={(e) => updateField("partnershipScheme", e.target.value)}
      >
        <Options options={PARTNERSHIP_OPTIONS} />
      </select>
    </Field>
  );
  const paymentMethodField = (
    <Field label="Cara Bayar" error={errors.paymentMethod}>
      <select
        value={data.paymentMethod}
        aria-invalid={Boolean(errors.paymentMethod)}
        onChange={(e) => updateField("paymentMethod", e.target.value)}
      >
        <Options options={PAYMENT_OPTIONS} />
      </select>
    </Field>
  );
  const deliveryTypeField = (
    <Field label="Cara Barang Diserahkan" error={errors.deliveryType}>
      <select
        value={data.deliveryType}
        aria-invalid={Boolean(errors.deliveryType)}
        onChange={(e) => updateField("deliveryType", e.target.value)}
      >
        <Options options={DELIVERY_OPTIONS} />
      </select>
    </Field>
  );
  const durationField = (
    <Field label="Lama Kerja Sama" optional>
      <select value={data.duration} onChange={(e) => updateField("duration", e.target.value)}>
        <Options options={DURATION_OPTIONS} />
      </select>
    </Field>
  );
  const descriptionField = (
    <Field
      label="Keterangan"
      hint={
        kind === "request"
          ? "Mutu, kemasan, atau jadwal ambil. Contoh: beras bersih, karung 50 kg, diambil tiap Selasa."
          : "Asal panen, kemasan, kesiapan kirim. Contoh: panen 18 petani Dusun Krajan, digiling H-2."
      }
      error={errors.description}
    >
      <textarea
        rows={3}
        value={data.description}
        aria-invalid={Boolean(errors.description)}
        onChange={(e) => updateField("description", e.target.value)}
      />
    </Field>
  );
  const positionField = (
    <Field label="Jabatan" optional hint="Contoh: Ketua Kelompok, Bagian Pembelian">
      <input
        type="text"
        value={data.position}
        onChange={(e) => updateField("position", e.target.value)}
      />
    </Field>
  );
  const emailField = (
    <Field label="Email" optional error={errors.email}>
      <input
        type="email"
        autoComplete="email"
        value={data.email}
        aria-invalid={Boolean(errors.email)}
        onChange={(e) => updateField("email", e.target.value)}
      />
    </Field>
  );
  const additionalNeedsField = (
    <Field label="Catatan Lain" optional>
      <textarea
        rows={2}
        value={data.additionalNeeds}
        onChange={(e) => updateField("additionalNeeds", e.target.value)}
      />
    </Field>
  );
  const photoField = (
    <div className="wf-field">
      <p className="wf-label" id="wf-photo-label">
        {kind === "request" ? "Foto Contoh Barang" : "Foto Barang"} <span>(opsional)</span>
      </p>
      <label className="wf-upload" aria-labelledby="wf-photo-label">
        <ImagePlus size={22} aria-hidden="true" />
        <strong>
          {photoBusy ? "Mengecilkan foto…" : data.photoName || "Pilih foto dari galeri atau kamera"}
        </strong>
        <span>Foto otomatis dikecilkan agar hemat kuota.</span>
        <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoBusy} />
      </label>

      {data.photoPreview && (
        <div className="wf-photo-grid">
          <div className="wf-photo">
            <img src={data.photoPreview} alt={data.photoName || "Foto barang"} />
            <span>{data.photoName}</span>
            <button
              type="button"
              aria-label="Hapus foto"
              onClick={() => {
                updateField("photoName", "");
                updateField("photoPreview", "");
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main id="jarak-forms">
      {kind === "offer" && targetRequest && (
        <section className="jf-notice">
          <span className="tag">{targetRequest.reference}</span>{" "}
          <strong>Menanggapi: {targetRequest.ownerName || "—"}</strong>
          {(() => {
            const detail = [
              [targetRequest.productType, targetRequest.variety && `(${targetRequest.variety})`]
                .filter(Boolean)
                .join(" "),
              [targetRequest.quantity, targetRequest.unit].filter(Boolean).join(" "),
              optionLabel(FREQUENCY_OPTIONS, targetRequest.frequency),
            ]
              .filter(Boolean)
              .join(", ");
            return detail ? ` - ${detail}.` : null;
          })()}
        </section>
      )}

      {restoredNotice && (
        <section className="jf-notice" role="status">
          Isian yang belum terkirim dipulihkan dari HP ini.{" "}
          <button type="button" className="btn outline" onClick={startOver}>
            Mulai dari awal
          </button>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="jf-drafts">
          <strong>Draf tersimpan:</strong>
          {drafts.map((item) => (
            <button key={item.id} type="button" className="btn outline" onClick={() => loadDraft(item)}>
              {item.data.variety || item.data.productType || "Draf"} ({item.reference})
            </button>
          ))}
        </section>
      )}

      <div className="form-wizard">
        <div className="wf-page-heading">
          <div>
            <h1>
              {isEditingPublished
                ? kind === "request"
                  ? "Ubah Permintaan"
                  : "Ubah Penawaran"
                : kind === "request"
                  ? "Buat Permintaan"
                  : "Buat Penawaran"}
            </h1>
            <p>
              {kind === "request"
                ? "Tulis barang yang Anda butuhkan. Pelaku usaha Desa Jarak akan mengirim penawaran."
                : "Tulis barang yang Anda jual. Pembeli bisa menghubungi Anda lewat Direktori."}
            </p>
          </div>
          <div className="wf-role">
            <span className="tag green">{reference}</span>
            <span>{roleMeta.actorTitle}</span>
          </div>
        </div>

        <form ref={formRef} className="wf-card" onSubmit={handleSubmit} noValidate>
          <nav className="wf-progress" aria-label="Langkah formulir">
            <ol>
              {steps.map((step, index) => {
                const state = index === stepIndex ? "current" : index < stepIndex ? "done" : "";
                return (
                  <li key={step.id} className={state}>
                    <button
                      type="button"
                      onClick={() => goToStep(index)}
                      aria-current={index === stepIndex ? "step" : undefined}
                    >
                      <span aria-hidden="true">{index < stepIndex ? <Check size={14} /> : index + 1}</span>
                      <small>
                        <span className="wf-sr-only">Langkah {index + 1}: </span>
                        {step.label}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="wf-content">
            <p className="wf-step-label">
              Langkah {stepIndex + 1} dari {steps.length}
            </p>
            <h2 ref={stepHeadingRef} tabIndex={-1}>
              {activeStep.title}
            </h2>
            <p className="wf-subtitle">{activeStep.description}</p>

            {activeStep.id === "barang" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Barang</legend>
                <div className="wf-two">
                  {productTypeField}
                  {varietyField}
                </div>
                <div className="wf-two">
                  {quantityField}
                  {unitField}
                </div>
                <div className="wf-two">
                  {frequencyField}
                  {neededDateField}
                </div>
                <div className="wf-two">
                  {priceNoteField}
                  {gradeField}
                </div>
                {photoField}
              </fieldset>
            )}

            {activeStep.id === "kontak" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Kontak dan cara kirim</legend>
                {data.ownerType === PERORANGAN_TYPE ? (
                  ownerTypeField
                ) : (
                  <div className="wf-two">
                    {ownerTypeField}
                    {ownerNameField}
                  </div>
                )}
                <div className="wf-two">
                  {contactNameField}
                  {phoneField}
                </div>
                {locationField}
                <div className="wf-two">
                  {partnershipSchemeField}
                  {paymentMethodField}
                </div>
                <div className="wf-two">
                  {deliveryTypeField}
                  {durationField}
                </div>
                {descriptionField}
                <details className="wf-extra" open={Boolean(data.email || data.position || data.additionalNeeds)}>
                  <summary>Tambahan (opsional): jabatan, email, catatan</summary>
                  <div className="wf-two">
                    {positionField}
                    {emailField}
                  </div>
                  {additionalNeedsField}
                </details>
              </fieldset>
            )}

            {activeStep.id === "jenis" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Jenis usaha</legend>
                <div className="wf-choice-list wf-business-types" role="radiogroup" aria-label="Jenis usaha" aria-invalid={Boolean(errors.ownerType)}>
                  {OFFER_OWNER_TYPES.map((option) => {
                    const Icon = OWNER_TYPE_ICONS[option.value] || Store;
                    const selected = data.ownerType === option.value;
                    return (
                      <label key={option.value} className={selected ? "selected" : undefined}>
                        <input
                          type="radio"
                          name="ownerType"
                          checked={selected}
                          onChange={() => chooseOwnerType(option.value)}
                        />
                        <Icon size={22} aria-hidden="true" />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span className="wf-radio-mark" aria-hidden="true">
                          {selected && <Check size={12} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.ownerType && (
                  <p className="wf-error" role="alert">
                    {errors.ownerType}
                  </p>
                )}
                {group ? (
                  <Field label="Nama Kelompok Tani" error={errors.ownerName}>
                    <select
                      value={isKelompokTaniName(data.ownerName) ? data.ownerName : ""}
                      aria-invalid={Boolean(errors.ownerName)}
                      onChange={(e) => chooseGroup(e.target.value)}
                    >
                      <option value="">Pilih kelompok tani</option>
                      {KELOMPOK_TANI_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  ownerNameField
                )}
              </fieldset>
            )}

            {activeStep.id === "produk" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Produk</legend>
                <Field label="Cari Jenis Barang" optional>
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  />
                </Field>
                <div className="wf-choice-list wf-products" role="radiogroup" aria-label="Jenis barang" aria-invalid={Boolean(errors.productType)}>
                  {productMatches.map((option) => {
                    const selected = data.productType === option.value;
                    const image = PRODUCT_IMAGES[option.value];
                    return (
                      <label key={option.value} className={selected ? "selected" : undefined}>
                        <input
                          type="radio"
                          name="productType"
                          checked={selected}
                          onChange={() => updateField("productType", option.value)}
                        />
                        {image ? (
                          <img src={image} alt="" loading="lazy" />
                        ) : (
                          <span className="wf-product-symbol" aria-hidden="true">
                            <Package size={22} />
                          </span>
                        )}
                        <strong>{option.label}</strong>
                        <span className="wf-radio-mark" aria-hidden="true">
                          {selected && <Check size={12} />}
                        </span>
                      </label>
                    );
                  })}
                  {productMatches.length === 0 && <p>Jenis barang tidak ditemukan. Coba kata lain.</p>}
                </div>
                {errors.productType && (
                  <p className="wf-error" role="alert">
                    {errors.productType}
                  </p>
                )}
                {varietyField}
              </fieldset>
            )}

            {activeStep.id === "penyedia" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Anggota penyedia</legend>
                <div className="wf-provider-list">
                  {memberNames.map((name) => {
                    const selected = data.providers.some((p) => p.name === name);
                    return (
                      <label key={name} className={selected ? "selected" : undefined}>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!selected && data.providers.length >= MAX_PROVIDERS}
                          aria-invalid={errors.providers ? true : undefined}
                          aria-describedby={errors.providers ? "wf-providers-error" : undefined}
                          onChange={() => toggleProvider(name)}
                        />
                        <span className="wf-initials" aria-hidden="true">
                          {initials(name)}
                        </span>
                        <strong>{name}</strong>
                      </label>
                    );
                  })}
                </div>
                {errors.providers && (
                  <p id="wf-providers-error" className="wf-error" role="alert">
                    {errors.providers}
                  </p>
                )}
                <div className="wf-add-provider">
                  <Field
                    label="Nama Anggota Lain"
                    optional
                    hint={`Tambahkan bila namanya belum ada di daftar. Maksimal ${MAX_PROVIDERS} anggota.`}
                    error={errors.newProvider}
                  >
                    <input
                      type="text"
                      value={newProvider}
                      maxLength={60}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.newProvider)}
                      onChange={(e) => setNewProvider(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addProvider();
                        }
                      }}
                    />
                  </Field>
                  <button type="button" className="btn outline" onClick={addProvider}>
                    <Plus size={16} aria-hidden="true" /> Tambah Anggota
                  </button>
                </div>
              </fieldset>
            )}

            {activeStep.id === "jumlah" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Jumlah dan harga</legend>
                {group ? (
                  <>
                    {unitField}
                    {data.providers.map((provider) => {
                      const quantityError = errors[providerErrorKey(provider.name, "quantity")];
                      const priceError = errors[providerErrorKey(provider.name, "price")];
                      return (
                        <div key={provider.name} className="wf-provider-amount" role="group" aria-label={provider.name}>
                          <div>
                            <span className="wf-initials" aria-hidden="true">
                              {initials(provider.name)}
                            </span>
                            <strong>{provider.name}</strong>
                          </div>
                          <div className="wf-two">
                            <Field label={`Jumlah (${data.unit})`} error={quantityError}>
                              <NumberInput
                                value={provider.quantity}
                                error={quantityError}
                                showMessage={false}
                                onValueChange={(value) => updateProvider(provider.name, "quantity", value)}
                              />
                            </Field>
                            <Field label={`Harga per ${data.unit} (Rp)`} error={priceError}>
                              <NumberInput
                                value={provider.price}
                                error={priceError}
                                showMessage={false}
                                onValueChange={(value) => updateProvider(provider.name, "price", value)}
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                    <div className="wf-total">
                      <span>Total tersedia</span>
                      <strong>
                        {formatNumber(totals.quantity, 6)} {data.unit}
                      </strong>
                    </div>
                    {totals.averagePrice !== null && (
                      <p className="wf-help">
                        Harga rata-rata {formatRupiah(totals.averagePrice)} per {data.unit}, dihitung dari jumlah tiap
                        anggota.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="wf-two">
                      {quantityField}
                      {unitField}
                    </div>
                    {priceNoteField}
                  </>
                )}
                {frequencyField}
              </fieldset>
            )}

            {activeStep.id === "informasi" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Informasi penawaran</legend>
                {descriptionField}
                <div className="wf-two">
                  {neededDateField}
                  {locationField}
                </div>
                <div className="wf-two">
                  {gradeField}
                  <Field label="Kemasan" optional hint="Contoh: karung 50 kg">
                    <input
                      type="text"
                      value={data.packaging}
                      onChange={(e) => updateField("packaging", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="wf-two">
                  {contactNameField}
                  {phoneField}
                </div>
                <div className="wf-two">
                  {partnershipSchemeField}
                  {paymentMethodField}
                </div>
                <div className="wf-two">
                  {deliveryTypeField}
                  {durationField}
                </div>
                <details className="wf-extra" open={Boolean(data.email || data.position || data.additionalNeeds)}>
                  <summary>Tambahan (opsional): jabatan, email, catatan</summary>
                  <div className="wf-two">
                    {positionField}
                    {emailField}
                  </div>
                  {additionalNeedsField}
                </details>
              </fieldset>
            )}

            {activeStep.id === "foto" && (
              <fieldset className="wf-all">
                <legend className="wf-sr-only">Foto produk</legend>
                {photoField}
              </fieldset>
            )}

            {activeStep.id === "periksa" && (
              <div>
                <div className="wf-review-banner">
                  <div>
                    <strong>{data.variety || data.productType}</strong>
                    <p>
                      {resolved.quantity || "0"} {data.unit}, {optionLabel(FREQUENCY_OPTIONS, data.frequency)} -{" "}
                      {resolved.ownerName || "Nama usaha belum diisi"}
                    </p>
                  </div>
                  <span className="tag green">{reference}</span>
                </div>

                <dl className="wf-review">
                  <ReviewRow label="Barang" onEdit={() => goToStepId(productStep)}>
                    {data.productType} - {data.variety || "-"} ({optionLabel(GRADE_OPTIONS, data.grade)})
                  </ReviewRow>
                  <ReviewRow label="Jumlah" onEdit={() => goToStepId(amountStep)}>
                    {resolved.quantity || "-"} {data.unit} - {optionLabel(FREQUENCY_OPTIONS, data.frequency)}
                  </ReviewRow>
                  <ReviewRow label="Waktu" onEdit={() => goToStepId(isRequest ? "barang" : "informasi")}>
                    {data.neededDate || "-"}
                  </ReviewRow>
                  {group && (
                    <ReviewRow label="Anggota" onEdit={() => goToStepId("penyedia")}>
                      {data.providers
                        .map(
                          (p) =>
                            `${p.name}: ${p.quantity || "-"} ${data.unit} @ ${formatRupiah(parseDecimal(p.price))}`
                        )
                        .join("\n") || "-"}
                    </ReviewRow>
                  )}
                  <ReviewRow label="Harga" onEdit={() => goToStepId(amountStep)}>
                    {resolved.priceNote || "Sesuai kesepakatan"}
                  </ReviewRow>
                  <ReviewRow label={isRequest ? "Pembeli" : "Usaha"} onEdit={() => goToStepId(ownerStep)}>
                    {resolved.ownerName || "-"} ({optionLabel(ownerOptions, data.ownerType) || "-"})
                  </ReviewRow>
                  <ReviewRow label="Kontak" onEdit={() => goToStepId(infoStep)}>
                    {data.contactName || "-"}
                    {resolved.position ? ` - ${resolved.position}` : ""}
                    {"\n"}
                    {data.phone || "-"}
                    {data.email ? ` | ${data.email}` : ""}
                    {"\n"}
                    {data.location || "-"}
                  </ReviewRow>
                  <ReviewRow label="Kerja Sama" onEdit={() => goToStepId(infoStep)}>
                    {optionLabel(PARTNERSHIP_OPTIONS, data.partnershipScheme)}
                    {"\n"}
                    {optionLabel(PAYMENT_OPTIONS, data.paymentMethod)}
                    {"\n"}
                    {optionLabel(DELIVERY_OPTIONS, data.deliveryType)}, {optionLabel(DURATION_OPTIONS, data.duration)}
                  </ReviewRow>
                  <ReviewRow label="Keterangan" onEdit={() => goToStepId(infoStep)}>
                    {data.description || "-"}
                    {data.packaging ? `\nKemasan: ${data.packaging}` : ""}
                    {data.additionalNeeds ? `\n${data.additionalNeeds}` : ""}
                  </ReviewRow>
                </dl>

                {kind === "offer" && compatibilityItems.length > 0 && (
                  <div className="wf-review-providers">
                    <h3>Dibandingkan dengan Permintaan Pembeli</h3>
                    <div className="wf-table-scroll">
                      <table className="stack-table">
                        <thead>
                          <tr>
                            <th>Hal</th>
                            <th>Permintaan Pembeli</th>
                            <th>Penawaran Anda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compatibilityItems.map((item) => (
                            <tr key={item.aspect}>
                              <td className="cell-title">{item.aspect}</td>
                              <td data-label="Pembeli">{item.target || "-"}</td>
                              <td data-label="Anda">{item.current}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <label className="wf-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    aria-invalid={consentError ? true : undefined}
                    aria-describedby={consentError ? "wf-consent-error" : undefined}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setConsentError("");
                    }}
                  />
                  <span>
                    Data ini benar. Nama, nomor HP, dan email saya hanya terlihat oleh orang yang menekan
                    &quot;Nyatakan Minat&quot;
                    {kind === "request"
                      ? " dan oleh pelaku usaha yang penawarannya saya terima."
                      : " dan oleh pembeli yang menerima penawaran saya."}
                    {group &&
                      " Anggota yang dipilih sudah setuju nama, jumlah, dan harganya ditampilkan untuk umum."}
                  </span>
                </label>
                {consentError && (
                  <small id="wf-consent-error" className="wf-error" role="alert">
                    {consentError}
                  </small>
                )}

                {readinessItems.some((item) => !item.ready) && (
                  <div className="wf-error-summary" role="alert">
                    <strong>Masih perlu dilengkapi:</strong>
                    <ul>
                      {readinessItems
                        .filter((item) => !item.ready)
                        .map((item) => (
                          <li key={item.label}>
                            <button type="button" className="wf-linkbutton" onClick={() => goToStepId(item.stepId)}>
                              {item.label}: {item.value}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="wf-notice" role="status" aria-live="polite">
            {submitNotice || (dirty ? roleMeta.draftReadyText : "")}
          </p>

          <div className="wf-actions">
            <button
              type="button"
              className="btn outline"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={stepIndex === 0 || saving}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Kembali
            </button>

            {stepIndex < reviewStep ? (
              <button type="submit" className="btn primary" disabled={saving || photoBusy}>
                Lanjut <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="btn primary" disabled={saving || photoBusy}>
                <Send size={16} aria-hidden="true" />{" "}
                {saving ? "Mengirim…" : isEditingPublished ? "Simpan Perubahan" : roleMeta.submitLabel}
              </button>
            )}
          </div>

          {!isEditingPublished && (
            <div className="wf-draft">
              <button type="button" className="btn outline" onClick={handleSaveDraft} disabled={saving || photoBusy}>
                <Bookmark size={16} aria-hidden="true" /> Simpan sebagai Draf
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

function newIdentity(kind: FormKind) {
  return {
    id: `${kind}-${Date.now().toString(36)}`,
    reference: createReference(kind),
    createdAt: new Date().toISOString(),
  };
}

/** A new listing starts with the name and phone from the user's profile. */
function withProfile(data: FormData, profile: WizardProfile | null): FormData {
  if (!profile) return data;
  return {
    ...data,
    ownerName: data.ownerName || profile.businessName || profile.fullName || "",
    contactName: data.contactName || profile.fullName || "",
    phone: data.phone || profile.phone || "",
  };
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Options({ options }: { options: SelectOption[] }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
      <dd className="wf-review-action">
        <button type="button" className="wf-linkbutton" onClick={onEdit}>
          Ubah<span className="wf-sr-only"> {label}</span>
        </button>
      </dd>
    </div>
  );
}

type FieldChildProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactElement<FieldChildProps>;
}) {
  const fieldId = useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="wf-field">
      <label htmlFor={fieldId}>
        {label} {optional && <span>(opsional)</span>}
      </label>
      {cloneElement(children, {
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-required": optional ? undefined : true,
      })}
      {error && (
        <small id={errorId} className="wf-error" role="alert">
          {error}
        </small>
      )}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}

/** "2,5" -> "2.5" so every reader of the saved data gets a plain number string. */
function normalizeQuantity(raw: string): string {
  const n = parseDecimal(raw);
  return n === null ? raw : String(n);
}
