"use client";

import { useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/auth";
import "./daftar.css";

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
  const [message, setMessage] = useState<{
    type: "error" | "success" | "";
    text: string;
  }>({ type: "", text: "" });

  const nameLabel =
    role === "usaha"
      ? "Nama Pemilik / Penanggung Jawab"
      : role === "bumdes"
        ? "Nama Pengurus / Penanggung Jawab"
        : "Nama lengkap / nama PIC";

  const namePlaceholder =
    role === "usaha"
      ? "Masukkan nama pemilik atau PIC"
      : role === "bumdes"
        ? "Masukkan nama pengurus atau PIC"
        : "Masukkan nama lengkap Anda";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const trimmedName = fullName.trim();
    const trimmedBusiness = businessName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setMessage({ type: "error", text: "Nama lengkap wajib diisi." });
      return;
    }

    if (role !== "mitra" && !trimmedBusiness) {
      setMessage({
        type: "error",
        text: `${businessLabel} wajib diisi.`,
      });
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMessage({ type: "error", text: "Alamat email tidak valid." });
      return;
    }

    if (!trimmedPhone) {
      setMessage({ type: "error", text: "Nomor telepon wajib diisi." });
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: "error",
        text: "Kata sandi harus minimal 8 karakter.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Konfirmasi kata sandi tidak sama.",
      });
      return;
    }

    if (!agreeTerms) {
      setMessage({
        type: "error",
        text: "Setujui syarat dan ketentuan terlebih dahulu.",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            business_name: trimmedBusiness,
            phone: trimmedPhone,
            role,
          },
          emailRedirectTo: `${window.location.origin}/masuk`,
        },
      });

      if (error) {
        if (/already registered/i.test(error.message)) {
          throw new Error("Email sudah terdaftar. Silakan masuk.");
        }
        if (/password/i.test(error.message)) {
          throw new Error(
            "Kata sandi terlalu lemah. Gunakan minimal 8 karakter."
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
        throw new Error("Email sudah terdaftar. Silakan masuk.");
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

            <h1>
              Mulai Langkah
              <br />
              Bersama
              <br />
              Desa Jarak
            </h1>

            <p className="intro-description">
              Bergabunglah dengan ekosistem Desa Jarak untuk membuka peluang
              kolaborasi dan mendukung pertumbuhan ekonomi lokal.
            </p>

            <div className="benefits">
              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <Handshake size={20} />
                </span>
                <span>
                  <strong>Bangun kemitraan</strong>
                  <br />
                  dengan peluang yang tepat
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
            <h2>Buat Akun Desa Jarak</h2>
            <p className="subtitle">
              Daftar untuk mulai menggunakan fitur yang Anda butuhkan.
            </p>

            <form id="registerForm" onSubmit={handleSubmit} noValidate>
              <p className="section-label">Daftar sebagai</p>

              <div className="account-options">
                <button
                  type="button"
                  className={`account-option ${
                    role === "mitra" ? "active" : ""
                  }`}
                  data-role="mitra"
                  onClick={() => setRole("mitra")}
                >
                  <Handshake />
                  <span>Mitra</span>
                </button>

                <button
                  type="button"
                  className={`account-option ${
                    role === "usaha" ? "active" : ""
                  }`}
                  data-role="usaha"
                  onClick={() => setRole("usaha")}
                >
                  <Store />
                  <span>Pelaku Usaha</span>
                </button>

                <button
                  type="button"
                  className={`account-option ${
                    role === "bumdes" ? "active" : ""
                  }`}
                  data-role="bumdes"
                  onClick={() => setRole("bumdes")}
                >
                  <Building2 />
                  <span>BUMDes/KDMP</span>
                </button>
              </div>

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
                    placeholder="Masukkan email Anda"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Nomor Telepon</label>
                <div className="input-wrapper">
                  <span className="field-icon" aria-hidden="true">
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    placeholder="Contoh: 081234567890"
                    autoComplete="tel"
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
                      placeholder="Minimal 8 karakter"
                      minLength={8}
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
                  <label htmlFor="confirmPassword">Konfirmasi Sandi</label>
                  <div className="input-wrapper">
                    <span className="field-icon" aria-hidden="true">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      placeholder="Ulangi kata sandi"
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
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span>
                  Saya menyetujui syarat dan ketentuan serta kebijakan privasi
                  Desa Jarak.
                </span>
              </label>

              <button
                type="submit"
                className="register-button"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Daftar Sekarang"}
              </button>

              {message.text && (
                <p
                  id="formMessage"
                  className={`message ${message.type}`}
                  role="status"
                >
                  {message.text}
                </p>
              )}
            </form>

            <p className="signin">
              Sudah memiliki akun?
              <Link href="/masuk">Masuk sekarang</Link>
            </p>

            <div className="register-info">
              <Info size={18} className="info-icon-svg" aria-hidden="true" />
              <p>
                <strong>Pilih akun sesuai peran Anda</strong>
                <br />
                Mitra dapat membuat permintaan kemitraan, sedangkan Pelaku Usaha
                dapat mengajukan penawaran. BUMDes/KDMP dapat mendaftar sebagai
                pengelola usaha desa.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
