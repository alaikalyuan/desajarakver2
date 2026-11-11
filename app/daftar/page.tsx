"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  Handshake,
  Info,
  Lock,
  Mail,
  Phone,
  Sprout,
  Store,
  TrendingUp,
  User,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  Turnstile,
  TURNSTILE_SITE_KEY,
  type TurnstileHandle,
} from "@/components/turnstile";
import { createClient } from "@/lib/supabase/client";
import { cleanPassword, PASSWORD_MIN_LENGTH, type UserRole } from "@/lib/auth";
import "./daftar.css";

type FieldKey =
  | "fullName"
  | "businessName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword"
  | "agreeTerms";

const ROLE_CHOICES: {
  value: UserRole;
  label: string;
  description: string;
  Icon: typeof Handshake;
}[] = [
  {
    value: "mitra",
    label: "Mitra",
    description: "Saya ingin membeli hasil desa (toko, pengolah, pedagang).",
    Icon: Handshake,
  },
  {
    value: "usaha",
    label: "Pelaku Usaha",
    description: "Saya menjual hasil panen atau olahan (petani, kelompok tani, UMKM).",
    Icon: Store,
  },
  {
    value: "bumdes",
    label: "BUMDes/KDMP",
    description:
      "Saya pengurus BUMDes atau Koperasi Desa Merah Putih (KDMP) yang menjual hasil warga.",
    Icon: Building2,
  },
];

const DUPLICATE_EMAIL_TEXT =
  "Pendaftaran belum berhasil. Jika email ini sudah pernah didaftarkan, silakan masuk atau pakai \"Lupa kata sandi?\".";

export default function DaftarPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("mitra");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [message, setMessage] = useState<{
    type: "error" | "success" | "";
    text: string;
  }>({ type: "", text: "" });
  const [errorField, setErrorField] = useState<FieldKey | null>(null);

  const nameLabel =
    role === "usaha"
      ? "Nama Pemilik / Penanggung Jawab"
      : role === "bumdes"
        ? "Nama Pengurus / Penanggung Jawab"
        : "Nama Lengkap";

  const namePlaceholder =
    role === "usaha"
      ? "Nama pemilik usaha"
      : role === "bumdes"
        ? "Nama pengurus"
        : "Nama lengkap Anda";

  const businessLabel =
    role === "usaha"
      ? "Nama Usaha"
      : role === "bumdes"
        ? "Nama BUMDes/KDMP"
        : "Nama usaha / instansi";

  const businessPlaceholder =
    role === "usaha"
      ? "Masukkan nama usaha"
      : role === "bumdes"
        ? "Masukkan nama BUMDes/KDMP"
        : "Masukkan nama usaha atau instansi";

  /** Show one error next to its field and move focus there. */
  function fail(field: FieldKey, text: string) {
    setErrorField(field);
    setMessage({ type: "error", text });
    requestAnimationFrame(() => document.getElementById(field)?.focus());
  }

  function invalid(field: FieldKey) {
    return errorField === field ? true : undefined;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    setErrorField(null);

    const trimmedName = fullName.trim();
    const trimmedBusiness = businessName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const cleanedPassword = cleanPassword(password);

    if (!trimmedName) {
      fail("fullName", "Nama wajib diisi.");
      return;
    }

    if (role !== "mitra" && !trimmedBusiness) {
      fail("businessName", `${businessLabel} wajib diisi.`);
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      fail("email", "Alamat email belum benar. Contoh: nama@gmail.com");
      return;
    }

    const phoneDigits = trimmedPhone.replace(/\D/g, "");
    if (!trimmedPhone || /[^\d\s+()-]/.test(trimmedPhone) || phoneDigits.length < 9) {
      fail("phone", "Nomor HP berisi angka saja, minimal 9 angka. Contoh: 0812 3456 7890");
      return;
    }

    if (cleanedPassword.length < PASSWORD_MIN_LENGTH) {
      fail("password", `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`);
      return;
    }

    if (cleanedPassword !== cleanPassword(confirmPassword)) {
      fail("confirmPassword", "Kata sandi dan ulangannya tidak sama.");
      return;
    }

    if (!agreeTerms) {
      fail("agreeTerms", "Centang persetujuan syarat dan ketentuan dulu.");
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setMessage({
        type: "error",
        text: "Tunggu centang verifikasi \"Saya bukan robot\" selesai, lalu coba lagi.",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: cleanedPassword,
        options: {
          data: {
            full_name: trimmedName,
            business_name: trimmedBusiness,
            phone: trimmedPhone,
            role,
          },
          emailRedirectTo: `${window.location.origin}/masuk`,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      // Each verification token works once.
      turnstileRef.current?.reset();

      if (error) {
        if (/captcha/i.test(error.message)) {
          throw new Error(
            "Verifikasi \"Saya bukan robot\" gagal atau kedaluwarsa. Ulangi centangnya lalu daftar lagi."
          );
        }
        if (/rate limit|too many/i.test(error.message)) {
          throw new Error(
            "Terlalu banyak percobaan pendaftaran. Tunggu beberapa menit lalu coba lagi."
          );
        }
        if (/already registered/i.test(error.message)) {
          throw new Error(DUPLICATE_EMAIL_TEXT);
        }
        if (/password/i.test(error.message)) {
          throw new Error(
            "Kata sandi terlalu mudah ditebak. Pakai gabungan huruf dan angka, minimal 8 karakter."
          );
        }
        if (
          error.code === "email_address_not_authorized" ||
          /not authorized/i.test(error.message)
        ) {
          throw new Error(
            "Email konfirmasi belum dapat dikirim ke alamat ini. Hubungi pengelola website."
          );
        }
        if (/invalid/i.test(error.message) && /email/i.test(error.message)) {
          throw new Error("Alamat email tidak valid.");
        }
        if (/rate limit/i.test(error.message)) {
          throw new Error(
            "Terlalu banyak pendaftaran. Coba lagi beberapa menit lagi."
          );
        }
        throw new Error("Pendaftaran gagal. Silakan coba lagi.");
      }

      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        throw new Error(DUPLICATE_EMAIL_TEXT);
      }

      const perluKonfirmasi = !data.session;
      if (data.session) {
        await supabase.auth.signOut();
      }

      const successText = perluKonfirmasi
        ? "Pendaftaran berhasil. Buka tautan konfirmasi di email Anda, lalu masuk."
        : "Pendaftaran berhasil. Silakan masuk.";

      setMessage({ type: "success", text: successText });

      setTimeout(
        () => {
          router.push("/masuk");
        },
        perluKonfirmasi ? 4000 : 1500
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Tidak dapat menghubungi server. Pastikan koneksi internet aktif.";
      setMessage({ type: "error", text: errorMessage });
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="register-page">
        <div className="register-container">
          <section className="register-intro">
            <span className="intro-label">JARAK CONNECT</span>

            <p className="intro-title">
              Mulai Langkah
              <br />
              Bersama
              <br />
              Desa Jarak
            </p>

            <p className="intro-description">
              Daftar gratis untuk menjual hasil desa atau mencari pemasok dari
              Desa Jarak.
            </p>

            <div className="benefits">
              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <Handshake size={20} />
                </span>
                <span>
                  <strong>Temukan pembeli</strong>
                  <br />
                  dan penjual yang cocok
                </span>
              </div>

              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <Sprout size={20} />
                </span>
                <span>
                  <strong>Dukung potensi lokal</strong>
                  <br />
                  dan produk unggulan desa
                </span>
              </div>

              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <TrendingUp size={20} />
                </span>
                <span>
                  <strong>Tumbuh bersama</strong>
                  <br />
                  menuju desa yang lebih maju
                </span>
              </div>
            </div>

            <div className="intro-quote">
              &ldquo;Kolaborasi hari ini,
              <br />
              masa depan yang lebih baik untuk Desa Jarak.&rdquo;
            </div>
          </section>

          <section className="register-form-section">
            <h1>Buat Akun Desa Jarak</h1>
            <p className="subtitle">Gratis. Pilih dulu Anda ingin membeli atau menjual.</p>

            <form id="registerForm" onSubmit={handleSubmit} noValidate>
              <fieldset className="role-fieldset">
                <legend className="section-label">Daftar sebagai</legend>
                <div className="account-options">
                  {ROLE_CHOICES.map(({ value, label, description, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`account-option ${role === value ? "active" : ""}`}
                      aria-pressed={role === value}
                      onClick={() => setRole(value)}
                    >
                      <Icon aria-hidden="true" />
                      <span className="account-option-text">
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="fullName" id="nameLabel">
                  {nameLabel}
                </label>
                <div className="input-wrapper">
                  <span className="field-icon" aria-hidden="true">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    id="fullName"
                    placeholder={namePlaceholder}
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={invalid("fullName")}
                    aria-describedby={invalid("fullName") ? "formMessage" : undefined}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {role !== "mitra" && (
                <div className="form-group" id="businessField">
                  <label htmlFor="businessName" id="businessLabel">
                    {businessLabel}
                  </label>
                  <div className="input-wrapper">
                    <span className="field-icon" aria-hidden="true">
                      <Store size={15} />
                    </span>
                    <input
                      type="text"
                      id="businessName"
                      placeholder={businessPlaceholder}
                      autoComplete="organization"
                      aria-required="true"
                      aria-invalid={invalid("businessName")}
                      aria-describedby={invalid("businessName") ? "formMessage" : undefined}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <span className="field-icon" aria-hidden="true">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    placeholder="Contoh: nama@gmail.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-required="true"
                    aria-invalid={invalid("email")}
                    aria-describedby={invalid("email") ? "formMessage" : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Nomor HP / WhatsApp</label>
                <div className="input-wrapper">
                  <span className="field-icon" aria-hidden="true">
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    placeholder="Contoh: 0812 3456 7890"
                    autoComplete="tel"
                    inputMode="tel"
                    aria-required="true"
                    aria-invalid={invalid("phone")}
                    aria-describedby={invalid("phone") ? "formMessage" : undefined}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="two-columns">
                <div className="form-group">
                  <label htmlFor="password">Kata Sandi</label>
                  <div className="input-wrapper">
                    <span className="field-icon" aria-hidden="true">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={invalid("password")}
                      aria-describedby={invalid("password") ? "formMessage" : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={
                        showPassword
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Ulangi Kata Sandi</label>
                  <div className="input-wrapper">
                    <span className="field-icon" aria-hidden="true">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      placeholder="Ketik ulang kata sandi"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={invalid("confirmPassword")}
                      aria-describedby={invalid("confirmPassword") ? "formMessage" : undefined}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? "Sembunyikan konfirmasi kata sandi"
                          : "Tampilkan konfirmasi kata sandi"
                      }
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <label className="terms">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  aria-invalid={invalid("agreeTerms")}
                  aria-describedby={invalid("agreeTerms") ? "formMessage" : undefined}
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span>
                  Saya menyetujui syarat dan ketentuan serta kebijakan privasi
                  Desa Jarak.
                </span>
              </label>

              <Turnstile
                ref={turnstileRef}
                onToken={setCaptchaToken}
                onError={() =>
                  setMessage({
                    type: "error",
                    text: "Verifikasi tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.",
                  })
                }
              />

              <p
                id="formMessage"
                className={`message ${message.type}`}
                role={message.type === "error" ? "alert" : "status"}
              >
                {message.text}
              </p>

              <button
                type="submit"
                className="register-button"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Daftar Sekarang"}
              </button>
            </form>

            <p className="signin">
              Sudah memiliki akun?
              <Link href="/masuk">Masuk sekarang</Link>
            </p>

            <div className="register-info">
              <Info size={18} className="info-icon-svg" aria-hidden="true" />
              <p>
                Belum yakin? <Link href="/cara-kerja">Baca cara kerjanya</Link>.
                Jenis akun tidak bisa diganti setelah mendaftar.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
