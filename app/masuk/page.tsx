"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Handshake,
  Info,
  Lock,
  Mail,
  Sprout,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/lib/supabase/client";
import { dashboardUrl, ROLE_NAMES, type UserRole } from "@/lib/auth";
import "./login.css";

function pesanErrorLogin(error: { code?: string; message?: string } | null) {
  const code = error?.code || "";
  const msg = error?.message || "";

  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(msg)
  ) {
    return "Email atau kata sandi salah.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) {
    return "Email belum dikonfirmasi. Periksa kotak masuk atau folder spam email Anda.";
  }
  if (/too many requests|rate limit/i.test(msg)) {
    return "Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.";
  }
  if (/network|fetch/i.test(msg)) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  }
  return "Gagal masuk. Periksa kembali email dan kata sandi Anda.";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<UserRole>("mitra");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleBanner, setShowGoogleBanner] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    const errDesc = searchParams.get("error_description") || "";
    const actualRole = searchParams.get("actualRole") as UserRole | null;

    if (
      err === "google_not_registered" ||
      /Database error saving new user/i.test(errDesc)
    ) {
      setShowGoogleBanner(true);
    } else if (err === "role_mismatch" && actualRole) {
      const roleName = ROLE_NAMES[actualRole] || actualRole;
      setSelectedRole(actualRole);
      setPasswordError(
        `Akun Google ini terdaftar sebagai ${roleName}. Silakan masuk sebagai ${roleName}.`
      );
    } else if (err === "oauth_failed") {
      setPasswordError("Gagal masuk dengan Google. Silakan coba lagi.");
    }
  }, [searchParams]);

  function getPostLoginRedirect(role: UserRole): string {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      const targetUrl = new URL(next, window.location.origin);
      searchParams.forEach((value, key) => {
        if (
          key !== "next" &&
          key !== "error" &&
          key !== "actualRole" &&
          key !== "selectedRole" &&
          !targetUrl.searchParams.has(key)
        ) {
          targetUrl.searchParams.set(key, value);
        }
      });
      return targetUrl.pathname + targetUrl.search + targetUrl.hash;
    }
    return dashboardUrl(role);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");
    setInfoMessage("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    let valid = true;

    if (!trimmedEmail) {
      setEmailError("Email wajib diisi.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Format email tidak valid.");
      valid = false;
    }

    if (!trimmedPassword) {
      setPasswordError("Kata sandi wajib diisi.");
      valid = false;
    } else if (trimmedPassword.length < 6) {
      setPasswordError("Kata sandi minimal 6 karakter.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error || !data.user) {
        setPasswordError(pesanErrorLogin(error));
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, business_name, phone, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setPasswordError(
          "Profil akun tidak ditemukan. Hubungi pengelola website."
        );
        setLoading(false);
        return;
      }

      if (profile.role !== selectedRole) {
        await supabase.auth.signOut();
        const roleLabel = ROLE_NAMES[profile.role as UserRole] || profile.role;
        setPasswordError(
          `Akun ini terdaftar sebagai ${roleLabel}. Pilih peran ${roleLabel} di atas.`
        );
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "jarakConnectDemoUser",
          JSON.stringify({
            role: profile.role,
            fullName: profile.full_name,
          })
        );
      }

      const destination = getPostLoginRedirect(profile.role as UserRole);
      router.push(destination);
      router.refresh();
    } catch {
      setPasswordError(
        "Tidak dapat menghubungi server. Periksa koneksi internet Anda."
      );
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setEmailError("");
    setPasswordError("");
    setInfoMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(
        "Masukkan email Anda terlebih dahulu, lalu klik Lupa kata sandi?"
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Format email tidak valid.");
      return;
    }

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (error) {
      setPasswordError(
        /rate limit|too many/i.test(error.message)
          ? "Terlalu banyak permintaan reset. Coba lagi beberapa menit lagi."
          : "Permintaan reset kata sandi belum berhasil. Coba lagi."
      );
      return;
    }

    setInfoMessage(
      `Tautan untuk mengatur ulang kata sandi telah dikirim ke ${trimmedEmail}. Periksa kotak masuk atau folder spam Anda.`
    );
  }

  async function handleGoogleLogin() {
    setShowGoogleBanner(false);
    setEmailError("");
    setPasswordError("");
    setGoogleLoading(true);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("role", selectedRole);

    const next = searchParams.get("next");
    if (next) {
      callbackUrl.searchParams.set("next", next);
    }
    searchParams.forEach((value, key) => {
      if (
        key !== "next" &&
        key !== "error" &&
        key !== "actualRole" &&
        key !== "selectedRole"
      ) {
        callbackUrl.searchParams.set(key, value);
      }
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setPasswordError("Gagal memulai login Google. Silakan coba lagi.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-intro">
          <div className="intro-overlay"></div>
          <div className="intro-content">
            <span className="intro-label">JARAK CONNECT</span>
            <h1>
              Bersama
              <br />
              Membangun
              <br />
              Desa Jarak
            </h1>
            <p>
              Menghubungkan kebutuhan mitra dengan potensi desa untuk
              menciptakan peluang kerja sama yang berkelanjutan.
            </p>

            <div className="benefits">
              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <Handshake size={20} />
                </span>
                <div>
                  <strong>Akses kesempatan</strong>
                  <small>kemitraan</small>
                </div>
              </div>

              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <Sprout size={20} />
                </span>
                <div>
                  <strong>Dukung pertumbuhan</strong>
                  <small>ekonomi desa</small>
                </div>
              </div>

              <div className="benefit">
                <span className="benefit-icon" aria-hidden="true">
                  <TrendingUp size={20} />
                </span>
                <div>
                  <strong>Wujudkan desa yang</strong>
                  <small>lebih maju</small>
                </div>
              </div>
            </div>

            <div className="intro-quote">
              <p>
                &ldquo;Kolaborasi hari ini,
                <br />
                masa depan yang lebih baik untuk Desa Jarak.&rdquo;
              </p>
              <span></span>
            </div>
          </div>
        </section>

        <section className="login-form-section">
          <div className="form-wrapper">
            <div className="form-heading">
              <h2>Masuk ke Desa Jarak</h2>
              <p>
                Silakan masuk untuk melanjutkan ke fitur yang Anda butuhkan.
              </p>
            </div>

            {showGoogleBanner && (
              <div
                className="login-banner"
                id="googleNotRegisteredBanner"
                role="alert"
              >
                <span className="login-banner-icon" aria-hidden="true">
                  <AlertCircle size={18} />
                </span>
                <div className="login-banner-text">
                  <strong>Akun Google ini belum terdaftar</strong>
                  <p>
                    Daftar terlebih dahulu dengan email yang sama, lalu masuk
                    kembali dengan Google.
                  </p>
                  <Link href="/daftar">Daftar sekarang</Link>
                </div>
                <button
                  type="button"
                  className="login-banner-close"
                  id="googleBannerClose"
                  aria-label="Tutup pemberitahuan"
                  onClick={() => setShowGoogleBanner(false)}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form id="loginForm" onSubmit={handleSubmit} noValidate>
              <div className="account-type">
                <p className="account-type-title">Masuk sebagai</p>
                <div className="account-options">
                  <button
                    type="button"
                    className={`account-option ${
                      selectedRole === "mitra" ? "active" : ""
                    }`}
                    data-role="mitra"
                    onClick={() => setSelectedRole("mitra")}
                  >
                    <Handshake />
                    <span>Mitra</span>
                  </button>

                  <button
                    type="button"
                    className={`account-option ${
                      selectedRole === "usaha" ? "active" : ""
                    }`}
                    data-role="usaha"
                    onClick={() => setSelectedRole("usaha")}
                  >
                    <Store />
                    <span>Pelaku Usaha</span>
                  </button>

                  <button
                    type="button"
                    className={`account-option ${
                      selectedRole === "bumdes" ? "active" : ""
                    }`}
                    data-role="bumdes"
                    onClick={() => setSelectedRole("bumdes")}
                  >
                    <Building2 />
                    <span>BUMDes/KDMP</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="identity">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon" aria-hidden="true">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    id="identity"
                    name="identity"
                    placeholder="Masukkan email Anda"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    className={emailError ? "input-error" : ""}
                  />
                </div>
                <small className="error-message" id="identityError">
                  {emailError}
                </small>
              </div>

              <div className="form-group">
                <div className="password-label">
                  <label htmlFor="password">Kata Sandi</label>
                  <button
                    type="button"
                    id="forgotPassword"
                    className="forgot-link"
                    onClick={handleForgotPassword}
                  >
                    Lupa kata sandi?
                  </button>
                </div>

                <div className="input-wrapper">
                  <span className="input-icon" aria-hidden="true">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Masukkan kata sandi Anda"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    className={passwordError ? "input-error" : ""}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    id="togglePassword"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small className="error-message" id="passwordError">
                  {passwordError}
                </small>
                {infoMessage && (
                  <small className="info-message" role="status">
                    {infoMessage}
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="login-button"
                id="loginButton"
                disabled={loading || googleLoading}
              >
                <span id="buttonText">
                  {loading ? "Memproses..." : "Masuk"}
                </span>
              </button>

              <div className="login-divider">
                <span>atau</span>
              </div>

              <button
                type="button"
                className="google-button"
                id="googleLoginButton"
                disabled={loading || googleLoading}
                onClick={handleGoogleLogin}
              >
                <svg
                  className="google-icon"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>
                  {googleLoading
                    ? "Mengarahkan ke Google..."
                    : "Masuk dengan Google"}
                </span>
              </button>

              <p className="register-text">
                Belum memiliki akun?
                <Link href="/daftar">Daftar sekarang</Link>
              </p>

              <div className="login-info">
                <span className="info-icon" aria-hidden="true">
                  <Info size={12} />
                </span>
                <p>
                  <strong>Pilih akun sesuai peran Anda</strong>
                  <br />
                  Mitra (perusahaan/instansi) untuk membuat permintaan
                  kemitraan, atau Pelaku Usaha untuk mengajukan penawaran.
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MasukPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="login-page">
            <div className="login-container single-column">
              <section className="login-form-section">
                <p>Memuat halaman masuk...</p>
              </section>
            </div>
          </main>
        }
      >
        <LoginContent />
      </Suspense>
    </>
  );
}
