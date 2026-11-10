"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NumberInput } from "@/components/forms/number-input";
import { parseDecimal } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ImagePlus,
  Send,
  Trash2,
} from "lucide-react";
import {
  createEmptyFormData,
  createReference,
  DELIVERY_OPTIONS,
  DURATION_OPTIONS,
  EntryStatus,
  FormData,
  FormEntry,
  FormKind,
  formatTimestamp,
  FREQUENCY_OPTIONS,
  getSteps,
  GRADE_OPTIONS,
  isEditableStatus,
  OFFER_OWNER_TYPES,
  PARTNERSHIP_OPTIONS,
  PAYMENT_OPTIONS,
  PRODUCT_OPTIONS,
  REQUEST_OWNER_TYPES,
  submittedStatus,
  TargetRequestSummary,
  UNIT_OPTIONS,
  validateAllSteps,
  validateStep,
} from "@/lib/forms/form-flow";
import {
  buildOfferCompatibility,
  buildReadinessItems,
  getRoleMeta,
} from "@/lib/forms/domain";
import {
  findMyOfferForRequest,
  getTargetRequestById,
  readFormEntries,
  saveFormEntry,
} from "@/lib/listings";
import "./form-wizard.css";

interface FormWizardProps {
  kind: FormKind;
  initialRequestId?: string | null;
  initialEntryId?: string | null;
}

export function FormWizard({
  kind,
  initialRequestId = null,
  initialEntryId = null,
}: FormWizardProps) {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [targetRequest, setTargetRequest] =
    useState<TargetRequestSummary | null>(null);
  const [activeEntry, setActiveEntry] = useState<FormEntry | null>(null);
  const [submittedEntry, setSubmittedEntry] = useState<FormEntry | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<FormData>(() =>
    createEmptyFormData(kind, null)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [saving, setSaving] = useState(false);
  // Set when this offer cannot be made at all (2.10): the seller already
  // offered on this request, or the request is closed or missing.
  const [blocked, setBlocked] = useState<
    | { reason: "duplicate"; reference: string }
    | { reason: "closed" }
    | null
  >(null);

  const steps = useMemo(() => getSteps(kind), [kind]);
  const roleMeta = useMemo(() => getRoleMeta(kind), [kind]);
  const ownerOptions =
    kind === "request" ? REQUEST_OWNER_TYPES : OFFER_OWNER_TYPES;

  const entryIdRef = useRef(
    activeEntry?.id ?? `${kind}-${Date.now().toString(36)}`
  );
  const referenceRef = useRef(
    activeEntry?.reference ?? createReference(kind)
  );
  const createdAtRef = useRef(
    activeEntry?.createdAt ?? new Date().toISOString()
  );
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  // Load entries & target request on mount
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      const offerToRequest = kind === "offer" && initialRequestId && !initialEntryId;
      const [loadedEntries, loadedTarget, existingOffer] = await Promise.all([
        readFormEntries(),
        kind === "offer" && initialRequestId
          ? getTargetRequestById(initialRequestId)
          : Promise.resolve(null),
        offerToRequest
          ? findMyOfferForRequest(initialRequestId)
          : Promise.resolve(null),
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

      // Continue a draft, or edit a published listing ("Ubah").
      if (initialEntryId) {
        const found = loadedEntries.find(
          (item) => item.id === initialEntryId && item.kind === kind
        );
        if (found) {
          if (!isEditableStatus(found.status)) {
            setSubmitNotice(
              `${
                kind === "request" ? "Permintaan" : "Penawaran"
              } ini sudah dikirim dan bersifat final.`
            );
          } else {
            loadDraftIntoState(found);
            return;
          }
        }
      }

      // An offer is only linked to a request when the URL names one
      // (?requestId=...). Never guess a target from other listings.
      if (kind === "offer") {
        if (loadedTarget) {
          setTargetRequest(loadedTarget);
          setData((prev) => ({
            ...prev,
            productType: loadedTarget.productType || prev.productType,
            variety: loadedTarget.variety || prev.variety,
            unit: loadedTarget.unit || prev.unit,
            frequency: loadedTarget.frequency || prev.frequency,
            partnershipScheme:
              loadedTarget.partnershipScheme || prev.partnershipScheme,
            deliveryType: loadedTarget.deliveryType || prev.deliveryType,
          }));
        }
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [kind, initialRequestId, initialEntryId]);

  function loadDraftIntoState(draft: FormEntry) {
    setActiveEntry(draft);
    entryIdRef.current = draft.id;
    referenceRef.current = draft.reference;
    createdAtRef.current = draft.createdAt;
    if (draft.targetRequest) {
      setTargetRequest(draft.targetRequest);
    }
    setData({
      ...createEmptyFormData(kind, draft.targetRequest),
      ...draft.data,
    });
    setStepIndex(0);
    setErrors({});
    setSubmitNotice(
      draft.status === "published"
        ? `Mengubah ${draft.reference}. Perubahan langsung tampil di direktori setelah disimpan.`
        : `Melanjutkan draf ${draft.reference}.`
    );
  }

  const isEditingPublished = activeEntry?.status === "published";
  const requestIdForEntry =
    kind === "offer"
      ? activeEntry?.requestId ?? initialRequestId ?? targetRequest?.id ?? null
      : null;

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitNotice("");
  }

  function focusStepHeading() {
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function goToStep(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    if (targetIndex <= stepIndex) {
      setStepIndex(targetIndex);
      focusStepHeading();
      return;
    }

    const validation = validateStep(kind, stepIndex, data);
    setErrors(validation.errors);
    if (!validation.valid) {
      setSubmitNotice(
        "Lengkapi kolom wajib pada langkah ini sebelum melanjutkan."
      );
      return;
    }

    setSubmitNotice("");
    setStepIndex(targetIndex);
    focusStepHeading();
  }

  function handleNext() {
    goToStep(stepIndex + 1);
  }

  function handleBack() {
    goToStep(stepIndex - 1);
  }

  function buildEntry(status: EntryStatus): FormEntry {
    const now = new Date().toISOString();
    return {
      id: entryIdRef.current,
      kind,
      status,
      reference: referenceRef.current,
      requestId: requestIdForEntry,
      targetRequest: kind === "offer" ? targetRequest : null,
      createdAt: createdAtRef.current,
      updatedAt: now,
      data: { ...data, quantity: normalizeQuantity(data.quantity) },
    };
  }

  async function handleSaveDraft() {
    if (!data.ownerName.trim() && !data.productType.trim()) {
      setErrors({
        ownerName:
          "Isi minimal nama usaha/kelompok atau pilih komoditas sebelum menyimpan draf.",
      });
      setSubmitNotice(
        "Tambahkan identitas singkat terlebih dahulu agar draf mudah dikenali."
      );
      return;
    }

    setSaving(true);
    try {
      const entry = buildEntry("draft");
      const saved = await saveFormEntry(entry);
      // Keep the uploaded photo URL so the next save does not upload it again.
      if (saved.data.photoPreview !== data.photoPreview) {
        setData((current) => ({
          ...current,
          photoPreview: saved.data.photoPreview,
        }));
      }
      setSubmitNotice(
        `Draf ${saved.reference} tersimpan pada ${formatTimestamp(
          saved.updatedAt
        )}.`
      );
      const updatedList = await readFormEntries();
      setEntries(updatedList);
    } catch (err) {
      setSubmitNotice(
        err instanceof Error ? err.message : "Gagal menyimpan draf."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateAllSteps(kind, data);
    setErrors(validation.errors);

    if (!validation.valid && validation.firstInvalidStep !== null) {
      setStepIndex(validation.firstInvalidStep);
      setSubmitNotice("Masih ada kolom wajib yang perlu dilengkapi.");
      focusStepHeading();
      return;
    }

    if (!consent) {
      setConsentError(
        "Centang pernyataan kebenaran data sebelum mengirim formulir."
      );
      setSubmitNotice(
        "Konfirmasi pernyataan data pada bagian akhir tinjauan."
      );
      return;
    }

    setSaving(true);
    try {
      const entry = buildEntry(submittedStatus(kind, requestIdForEntry));
      const saved = await saveFormEntry(entry);
      setSubmittedEntry(saved);
    } catch (err) {
      setSubmitNotice(
        err instanceof Error ? err.message : "Gagal mengirim formulir."
      );
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitNotice("Pilih berkas gambar (JPG, PNG, atau WEBP).");
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setSubmitNotice(
        "Ukuran foto maksimal 2,5 MB agar ringan disimpan di peramban."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("photoName", file.name);
      updateField(
        "photoPreview",
        typeof reader.result === "string" ? reader.result : ""
      );
    };
    reader.readAsDataURL(file);
  }

  const drafts = useMemo(
    () =>
      entries.filter((item) => item.kind === kind && item.status === "draft"),
    [entries, kind]
  );

  const readinessItems = useMemo(
    () => buildReadinessItems(kind, data),
    [kind, data]
  );

  const compatibilityItems = useMemo(
    () =>
      kind === "offer" && targetRequest
        ? buildOfferCompatibility(data, targetRequest)
        : [],
    [kind, data, targetRequest]
  );

  const activeStep = steps[stepIndex];

  if (submittedEntry) {
    return (
      <main id="jarak-forms">
        <section className="jf-success">
          <span className="tag green">{submittedEntry.reference}</span>
          <h1>
            {isEditingPublished
              ? "Perubahan Tersimpan"
              : kind === "request"
                ? "Permintaan Kemitraan Terkirim"
                : "Penawaran Desa Terkirim"}
          </h1>
          <p>
            <strong>{submittedEntry.data.ownerName}</strong> -{" "}
            {submittedEntry.data.productType} ({submittedEntry.data.quantity}{" "}
            {submittedEntry.data.unit}, {submittedEntry.data.frequency}).
          </p>
          <div>
            <Link className="btn primary" href="/direktori">
              Kembali ke Direktori Usaha
            </Link>
            <Link
              className="btn outline"
              href={kind === "request" ? "/mitra" : "/usaha"}
            >
              Buka Dashboard Saya
            </Link>
            <button
              type="button"
              className="btn outline"
              onClick={() => {
                setSubmittedEntry(null);
                setActiveEntry(null);
                entryIdRef.current = `${kind}-${Date.now().toString(36)}`;
                referenceRef.current = createReference(kind);
                createdAtRef.current = new Date().toISOString();
                setData(createEmptyFormData(kind, targetRequest));
                setStepIndex(0);
                setConsent(false);
                setSubmitNotice("");
              }}
            >
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
          <h1>
            {blocked.reason === "duplicate"
              ? "Anda sudah mengirim penawaran"
              : "Permintaan ini sudah ditutup"}
          </h1>
          <p>
            {blocked.reason === "duplicate"
              ? `Penawaran ${blocked.reference} untuk permintaan ini sudah terkirim. Satu pelaku usaha hanya bisa mengirim satu penawaran per permintaan. Lihat statusnya di dasbor Anda.`
              : "Permintaan ini sudah ditutup oleh pembeli atau tidak ditemukan, jadi tidak menerima penawaran baru."}
          </p>
          <div>
            <Link className="btn primary" href="/usaha">
              Buka Dashboard Saya
            </Link>
            <Link className="btn outline" href="/direktori">
              Kembali ke Direktori Usaha
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="jarak-forms">
      {kind === "offer" && targetRequest && (
        <section className="jf-notice">
          <div>
            <span className="tag">{targetRequest.reference}</span>{" "}
            <strong>Menanggapi: {targetRequest.ownerName || "—"}</strong>
            {(() => {
              const detail = [
                [targetRequest.productType, targetRequest.variety && `(${targetRequest.variety})`]
                  .filter(Boolean)
                  .join(" "),
                [targetRequest.quantity, targetRequest.unit].filter(Boolean).join(" "),
                targetRequest.frequency,
              ]
                .filter(Boolean)
                .join(", ");
              return detail ? ` - ${detail}.` : null;
            })()}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="jf-drafts">
          <strong>Draf tersimpan:</strong>
          {drafts.map((item) => (
            <button
              key={item.id}
              type="button"
              className="btn outline"
              onClick={() => loadDraftIntoState(item)}
            >
              {item.reference} -{" "}
              {item.data.ownerName || item.data.productType || "Draf"}
            </button>
          ))}
        </section>
      )}

      <div className="form-wizard">
        <div className="wf-page-heading">
          <div>
            <p className="wf-eyebrow">
              {kind === "request"
                ? "DIREKTORI USAHA - FORMULIR PERMINTAAN"
                : "DIREKTORI USAHA - FORMULIR PENAWARAN"}
            </p>
            <h1>
              {kind === "request"
                ? "Ajukan Permintaan Kemitraan"
                : "Ajukan Penawaran Komoditas Desa"}
            </h1>
            <p>
              {kind === "request"
                ? "Sampaikan kebutuhan pasokan secara terstruktur agar BUMDes dan pelaku usaha Desa Jarak dapat menilai kecocokan kerja sama."
                : "Susun penawaran pasokan dari Desa Jarak secara jelas agar mitra pembeli mengetahui kapasitas dan kesiapan pengiriman."}
            </p>
          </div>
          <div className="wf-role">
            <span className="tag green">{referenceRef.current}</span>
            <span>{roleMeta.actorTitle}</span>
          </div>
        </div>

        <form className="wf-card" onSubmit={handleSubmit} noValidate>
          <nav className="wf-progress" aria-label="Tahapan formulir">
            <ol>
              {steps.map((step, index) => {
                const state =
                  index === stepIndex
                    ? "current"
                    : index < stepIndex
                      ? "done"
                      : "";
                return (
                  <li key={step.id} className={state}>
                    <button
                      type="button"
                      onClick={() => goToStep(index)}
                      aria-current={index === stepIndex ? "step" : undefined}
                    >
                      <span>
                        {index < stepIndex ? <Check size={14} /> : index + 1}
                      </span>
                      <small>{step.label}</small>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="wf-content">
            <p className="wf-step-label">
              LANGKAH {stepIndex + 1} DARI {steps.length} -{" "}
              {activeStep.label.toUpperCase()}
            </p>
            <h2 ref={stepHeadingRef} tabIndex={-1}>
              {activeStep.title}
            </h2>
            <p className="wf-subtitle">{activeStep.description}</p>

            {stepIndex === 0 && (
              <fieldset className="wf-all">
                <div className="wf-field">
                  <label>
                    {kind === "request"
                      ? "Kategori Pemohon"
                      : "Kategori Penyedia Desa"}
                  </label>
                  <div className="wf-choice-list">
                    {ownerOptions.map((option) => {
                      const selected = data.ownerType === option.value;
                      return (
                        <label
                          key={option.value}
                          className={selected ? "selected" : ""}
                        >
                          <input
                            type="radio"
                            name="ownerType"
                            value={option.value}
                            checked={selected}
                            onChange={() =>
                              updateField("ownerType", option.value)
                            }
                          />
                          <div>
                            <strong>{option.label}</strong>
                            {option.description && (
                              <small>{option.description}</small>
                            )}
                          </div>
                          <span className="wf-radio-mark" aria-hidden="true">
                            {selected ? <Check size={12} /> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.ownerType && (
                    <small className="wf-error">{errors.ownerType}</small>
                  )}
                </div>

                <div className="wf-two">
                  <Field
                    label={
                      kind === "request"
                        ? "Nama Usaha / Lembaga Pemohon"
                        : "Nama Kelompok / Usaha Penyedia"
                    }
                    hint={
                      kind === "request"
                        ? "Contoh: CV Pangan Lestari Kediri"
                        : "Contoh: Kelompok Tani Margo Rukun"
                    }
                    error={errors.ownerName}
                  >
                    <input
                      type="text"
                      value={data.ownerName}
                      aria-invalid={Boolean(errors.ownerName)}
                      placeholder={
                        kind === "request"
                          ? "Tulis nama usaha atau lembaga"
                          : "Tulis nama kelompok tani, BUMDes, atau UMKM"
                      }
                      onChange={(e) => updateField("ownerName", e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Nama Penanggung Jawab (PIC)"
                    hint="Nama yang akan dihubungi saat tindak lanjut kemitraan."
                    error={errors.contactName}
                  >
                    <input
                      type="text"
                      value={data.contactName}
                      aria-invalid={Boolean(errors.contactName)}
                      placeholder="Nama lengkap penanggung jawab"
                      onChange={(e) =>
                        updateField("contactName", e.target.value)
                      }
                    />
                  </Field>
                </div>

                <div className="wf-two">
                  <Field
                    label="Jabatan / Peran"
                    optional
                    hint="Contoh: Bagian Pembelian, Ketua Kelompok, Koordinator Gudang."
                  >
                    <input
                      type="text"
                      value={data.position}
                      placeholder="Peran dalam usaha atau kelompok"
                      onChange={(e) => updateField("position", e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Nomor WhatsApp / Telepon Aktif"
                    hint="Gunakan nomor yang aktif menerima pesan atau panggilan."
                    error={errors.phone}
                  >
                    <input
                      type="tel"
                      value={data.phone}
                      aria-invalid={Boolean(errors.phone)}
                      placeholder="Contoh: 0812-3456-7890"
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="wf-two">
                  <Field
                    label="Alamat Email"
                    optional
                    hint="Opsional, berguna bila memerlukan dokumen penawaran tertulis."
                    error={errors.email}
                  >
                    <input
                      type="email"
                      value={data.email}
                      aria-invalid={Boolean(errors.email)}
                      placeholder="nama@usaha.co.id"
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                  </Field>

                  <Field
                    label={
                      kind === "request"
                        ? "Lokasi Usaha / Gudang Tujuan"
                        : "Dusun / Titik Kumpul Desa Jarak"
                    }
                    hint={
                      kind === "request"
                        ? "Sebutkan kecamatan/kabupaten tujuan pengiriman."
                        : "Sebutkan dusun, gudang kelompok, atau titik muat."
                    }
                    error={errors.location}
                  >
                    <input
                      type="text"
                      value={data.location}
                      aria-invalid={Boolean(errors.location)}
                      placeholder={
                        kind === "request"
                          ? "Contoh: Kecamatan Pare, Kabupaten Kediri"
                          : "Contoh: Dusun Krajan, Balai Kelompok Tani Desa Jarak"
                      }
                      onChange={(e) => updateField("location", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>
            )}

            {stepIndex === 1 && (
              <fieldset className="wf-all">
                <div className="wf-two">
                  <Field
                    label="Kategori Komoditas / Produk"
                    error={errors.productType}
                  >
                    <select
                      value={data.productType}
                      aria-invalid={Boolean(errors.productType)}
                      onChange={(e) =>
                        updateField("productType", e.target.value)
                      }
                    >
                      {PRODUCT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={
                      kind === "request"
                        ? "Varietas / Spesifikasi Singkat"
                        : "Varietas / Bentuk Produk Ditawarkan"
                    }
                    error={errors.variety}
                  >
                    <input
                      type="text"
                      value={data.variety}
                      aria-invalid={Boolean(errors.variety)}
                      placeholder={
                        kind === "request"
                          ? "Contoh: Beras putih medium IR64, kadar air <= 14%"
                          : "Contoh: Beras Ciherang giling baru, karung 50 kg"
                      }
                      onChange={(e) => updateField("variety", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="wf-field">
                  <label>Standar Mutu / Sortir</label>
                  <div className="wf-choice-list">
                    {GRADE_OPTIONS.map((option) => {
                      const selected = data.grade === option.value;
                      return (
                        <label
                          key={option.value}
                          className={selected ? "selected" : ""}
                        >
                          <input
                            type="radio"
                            name="grade"
                            value={option.value}
                            checked={selected}
                            onChange={() => updateField("grade", option.value)}
                          />
                          <div>
                            <strong>{option.label}</strong>
                            {option.description && (
                              <small>{option.description}</small>
                            )}
                          </div>
                          <span className="wf-radio-mark" aria-hidden="true">
                            {selected ? <Check size={12} /> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="wf-two">
                  <Field
                    label={
                      kind === "request"
                        ? "Volume Kebutuhan per Pengiriman"
                        : "Kapasitas Pasok yang Ditawarkan"
                    }
                    hint="Tulis angka saja, misalnya 3, 750 atau 2,5."
                    error={errors.quantity}
                  >
                    <NumberInput
                      value={data.quantity}
                      error={errors.quantity}
                      showMessage={false}
                      placeholder="Contoh: 3 atau 2,5"
                      onValueChange={(value) => updateField("quantity", value)}
                    />
                  </Field>

                  <Field label="Satuan" error={errors.unit}>
                    <select
                      value={data.unit}
                      aria-invalid={Boolean(errors.unit)}
                      onChange={(e) => updateField("unit", e.target.value)}
                    >
                      {UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="wf-two">
                  <Field
                    label={
                      kind === "request"
                        ? "Frekuensi Kebutuhan"
                        : "Ritme Ketersediaan Pasokan"
                    }
                    error={errors.frequency}
                  >
                    <select
                      value={data.frequency}
                      aria-invalid={Boolean(errors.frequency)}
                      onChange={(e) => updateField("frequency", e.target.value)}
                    >
                      {FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={
                      kind === "request"
                        ? "Target Mulai Pasok"
                        : "Periode Panen / Ketersediaan"
                    }
                    error={errors.neededDate}
                  >
                    <input
                      type="text"
                      value={data.neededDate}
                      aria-invalid={Boolean(errors.neededDate)}
                      placeholder={
                        kind === "request"
                          ? "Contoh: Minggu ke-2 Mei 2026"
                          : "Contoh: Siap kirim mulai Mei - Juli 2026"
                      }
                      onChange={(e) =>
                        updateField("neededDate", e.target.value)
                      }
                    />
                  </Field>
                </div>

                <Field
                  label={
                    kind === "request"
                      ? "Kisaran Harga Acuan / Anggaran"
                      : "Harga Penawaran / Acuan Titik Kumpul"
                  }
                  optional
                  hint="Opsional, membantu mempercepat penjajakan awal antara mitra dan desa."
                >
                  <input
                    type="text"
                    value={data.priceNote}
                    placeholder={
                      kind === "request"
                        ? "Contoh: Rp11.800 - Rp12.300/kg di titik kumpul"
                        : "Contoh: Rp12.000/kg bersih karung 50 kg di gudang kelompok"
                    }
                    onChange={(e) => updateField("priceNote", e.target.value)}
                  />
                </Field>
              </fieldset>
            )}

            {stepIndex === 2 && (
              <fieldset className="wf-all">
                <div className="wf-field">
                  <label>Skema Kerja Sama yang Diinginkan</label>
                  <div className="wf-choice-list">
                    {PARTNERSHIP_OPTIONS.map((option) => {
                      const selected = data.partnershipScheme === option.value;
                      return (
                        <label
                          key={option.value}
                          className={selected ? "selected" : ""}
                        >
                          <input
                            type="radio"
                            name="partnershipScheme"
                            value={option.value}
                            checked={selected}
                            onChange={() =>
                              updateField("partnershipScheme", option.value)
                            }
                          />
                          <div>
                            <strong>{option.label}</strong>
                            {option.description && (
                              <small>{option.description}</small>
                            )}
                          </div>
                          <span className="wf-radio-mark" aria-hidden="true">
                            {selected ? <Check size={12} /> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.partnershipScheme && (
                    <small className="wf-error">
                      {errors.partnershipScheme}
                    </small>
                  )}
                </div>

                <div className="wf-two">
                  <Field
                    label="Cara Pembayaran"
                    error={errors.paymentMethod}
                  >
                    <select
                      value={data.paymentMethod}
                      aria-invalid={Boolean(errors.paymentMethod)}
                      onChange={(e) =>
                        updateField("paymentMethod", e.target.value)
                      }
                    >
                      {PAYMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Mekanisme Penyerahan Barang"
                    error={errors.deliveryType}
                  >
                    <select
                      value={data.deliveryType}
                      aria-invalid={Boolean(errors.deliveryType)}
                      onChange={(e) =>
                        updateField("deliveryType", e.target.value)
                      }
                    >
                      {DELIVERY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Durasi Komitmen Awal">
                  <select
                    value={data.duration}
                    onChange={(e) => updateField("duration", e.target.value)}
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={
                    kind === "request"
                      ? "Uraian Kebutuhan & Standar Penerimaan"
                      : "Uraian Kondisi Komoditas & Kesiapan Pasok"
                  }
                  hint={
                    kind === "request"
                      ? "Jelaskan pengemasan, jam bongkar muat, atau kriteria mutu yang wajib dipenuhi."
                      : "Jelaskan asal panen warga, kapasitas sortir harian, pengemasan, dan kesiapan angkut."
                  }
                  error={errors.description}
                >
                  <textarea
                    rows={4}
                    value={data.description}
                    aria-invalid={Boolean(errors.description)}
                    placeholder={
                      kind === "request"
                        ? "Contoh: Dibutuhkan beras medium bersih tanpa bau apek, dikemas karung 50 kg, pengambilan rutin setiap hari Selasa pagi."
                        : "Contoh: Gabah berasal dari 18 petani anggota Dusun Krajan, digiling maksimal H-2 sebelum jadwal angkut."
                    }
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </Field>

                <Field
                  label="Catatan Tambahan / Dokumen Pendukung"
                  optional
                  hint="Opsional, misalnya kebutuhan sampel awal, surat jalan kelompok, atau jadwal survei lokasi."
                >
                  <textarea
                    rows={2}
                    value={data.additionalNeeds}
                    placeholder="Tulis catatan tambahan bila ada"
                    onChange={(e) =>
                      updateField("additionalNeeds", e.target.value)
                    }
                  />
                </Field>

                <div className="wf-field">
                  <label>
                    {kind === "request"
                      ? "Lampiran Contoh Spesifikasi / Kemasan"
                      : "Foto Komoditas / Gudang Pasok"}{" "}
                    <span>(opsional)</span>
                  </label>
                  <label className="wf-upload">
                    <ImagePlus size={22} />
                    <strong>
                      {data.photoName || "Pilih foto pendukung dari perangkat"}
                    </strong>
                    <span>
                      Format JPG, PNG, atau WEBP - maksimal 2,5 MB.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>

                  {data.photoPreview && (
                    <div className="wf-photo-grid">
                      <div className="wf-photo">
                        <img
                          src={data.photoPreview}
                          alt={data.photoName || "Lampiran komoditas"}
                        />
                        <span>{data.photoName}</span>
                        <button
                          type="button"
                          aria-label="Hapus foto lampiran"
                          onClick={() => {
                            updateField("photoName", "");
                            updateField("photoPreview", "");
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </fieldset>
            )}

            {stepIndex === 3 && (
              <div>
                <div className="wf-review-banner">
                  <div>
                    <strong>
                      {data.ownerName || "Identitas belum dilengkapi"} -{" "}
                      {data.productType}
                    </strong>
                    <p>
                      {data.variety || "Spesifikasi belum ditulis"} -{" "}
                      {data.quantity || "0"} {data.unit} ({data.frequency})
                    </p>
                  </div>
                  <span className="tag green">{referenceRef.current}</span>
                </div>

                <div className="wf-review-edit">
                  {steps.slice(0, 3).map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                    >
                      Ubah Langkah {index + 1}: {step.label}
                    </button>
                  ))}
                </div>

                <dl className="wf-review">
                  <div>
                    <dt>
                      {kind === "request" ? "Pemohon" : "Penyedia Desa"}
                    </dt>
                    <dd>
                      {data.ownerName || "-"} ({data.ownerType || "-"})
                    </dd>
                  </div>
                  <div>
                    <dt>Penanggung Jawab</dt>
                    <dd>
                      {data.contactName || "-"}
                      {data.position ? ` - ${data.position}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Kontak & Lokasi</dt>
                    <dd>
                      {data.phone || "-"}
                      {data.email ? ` | ${data.email}` : ""}
                      {"\n"}
                      {data.location || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Komoditas & Mutu</dt>
                    <dd>
                      {data.productType} - {data.variety || "-"} ({data.grade})
                    </dd>
                  </div>
                  <div>
                    <dt>Volume & Jadwal</dt>
                    <dd>
                      {data.quantity || "-"} {data.unit} - {data.frequency} -{" "}
                      {data.neededDate || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Acuan Harga</dt>
                    <dd>
                      {data.priceNote || "Menyesuaikan kesepakatan"}
                    </dd>
                  </div>
                  <div>
                    <dt>Skema & Pembayaran</dt>
                    <dd>
                      {data.partnershipScheme} | {data.paymentMethod}
                    </dd>
                  </div>
                  <div>
                    <dt>Penyerahan & Durasi</dt>
                    <dd>
                      {data.deliveryType} | {data.duration}
                    </dd>
                  </div>
                  <div>
                    <dt>Rincian</dt>
                    <dd>{data.description || "-"}</dd>
                  </div>
                  {data.additionalNeeds && (
                    <div>
                      <dt>Catatan Tambahan</dt>
                      <dd>{data.additionalNeeds}</dd>
                    </div>
                  )}
                </dl>

                {kind === "offer" && compatibilityItems.length > 0 && (
                  <div className="wf-review-providers">
                    <h3>Kesesuaian dengan Permintaan Mitra</h3>
                    <div className="wf-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Aspek</th>
                            <th>Kebutuhan Mitra</th>
                            <th>Penawaran Anda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compatibilityItems.map((item) => (
                            <tr key={item.aspect}>
                              <td>{item.aspect}</td>
                              <td>{item.target}</td>
                              <td>{item.current}</td>
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
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setConsentError("");
                    }}
                  />
                  <span>
                    Saya menyatakan data{" "}
                    {kind === "request"
                      ? "permintaan kemitraan"
                      : "penawaran komoditas desa"}{" "}
                    ini benar dan siap ditindaklanjuti melalui koordinasi resmi
                    Desa Jarak. Nama, nomor HP, dan email kontak hanya
                    terlihat oleh pengguna yang menekan &quot;Nyatakan Minat&quot;
                    {kind === "request"
                      ? " dan oleh pelaku usaha yang penawarannya Anda terima."
                      : " dan oleh pembeli yang menerima penawaran Anda."}
                  </span>
                </label>
                {consentError && (
                  <small className="wf-error">{consentError}</small>
                )}

                {readinessItems.some((item) => !item.ready) && (
                  <div className="wf-error-summary">
                    <strong>Bagian yang masih perlu dilengkapi:</strong>
                    <ul>
                      {readinessItems
                        .filter((item) => !item.ready)
                        .map((item) => (
                          <li key={item.label}>
                            {item.label}: {item.value}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="wf-actions">
            <button
              type="button"
              className="btn outline"
              onClick={handleBack}
              disabled={stepIndex === 0 || saving}
            >
              <ArrowLeft size={16} /> Sebelumnya
            </button>

            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                className="btn primary"
                onClick={handleNext}
                disabled={saving}
              >
                Lanjutkan <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn primary"
                disabled={saving}
              >
                <Send size={16} />{" "}
                {saving
                  ? "Menyimpan..."
                  : isEditingPublished
                    ? "Simpan Perubahan"
                    : roleMeta.submitLabel}
              </button>
            )}
          </div>

          <div className="wf-draft">
            {!isEditingPublished && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                <Bookmark size={14} /> Simpan sebagai Draf
              </button>
            )}
            <span role="status">
              {submitNotice || roleMeta.draftReadyText}
            </span>
          </div>
        </form>
      </div>
    </main>
  );
}

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
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const fieldId = useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="wf-field">
      <label htmlFor={fieldId}>
        {label} {optional && <span>(opsional)</span>}
      </label>
      {children && typeof children === "object"
        ? {
            ...children,
            props: {
              ...children.props,
              id: fieldId,
              "aria-describedby": describedBy,
            },
          }
        : children}
      {hint && <small id={hintId}>{hint}</small>}
      {error && (
        <small id={errorId} className="wf-error">
          {error}
        </small>
      )}
    </div>
  );
}

/** "2,5" -> "2.5" so every reader of the saved data gets a plain number string. */
function normalizeQuantity(raw: string): string {
  const n = parseDecimal(raw);
  return n === null ? raw : String(n);
}
