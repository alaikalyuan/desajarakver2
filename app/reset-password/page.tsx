"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/lib/supabase/client";
import "../masuk/login.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [introText, setIntroText] = useState("Memeriksa tautan reset...");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    function enableReset() {
      setIntroText("Masukkan kata sandi baru untuk akun Anda.");
      setReady(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        enableReset();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        enableReset();
      } else if (
        typeof window !== "undefined" &&
        !window.location.hash.includes("access_token") &&
        !window.location.search.includes("code=")
      ) {
        setIntroText(
          "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman masuk (Lupa kata sandi?)."
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");

    if (newPassword.length < 8) {
      setErrorText("Kata sandi minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorText("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorText(
        /same/i.test(error.message)
          ? "Kata sandi baru harus berbeda dari kata sandi lama."
          : "Kata sandi belum dapat disimpan. Minta tautan reset baru lalu coba lagi."
      );
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();
    setSavedSuccess(true);
    setIntroText(
      "Kata sandi berhasil diubah. Mengarahkan ke halaman masuk..."
    );
    setTimeout(() => {
      router.push("/masuk");
    }, 1500);
  }

  return (
    <>
      <Navbar />
      <main className="login-page">
        <div className="login-container single-column">
          <section className="login-form-section">
            <div className="form-wrapper">
              <div className="form-heading">
                <h2>Atur Ulang Kata Sandi</h2>
                <p id="resetIntro">{introText}</p>
              </div>

              {ready && !savedSuccess && (
                <form id="resetForm" onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="newPassword">Kata Sandi Baru</label>
                    <div className="input-wrapper">
                      <span className="input-icon" aria-hidden="true">
                        <Lock size={16} />
                      </span>
                      <input
                        type="password"
                        id="newPassword"
                        placeholder="Minimal 8 karakter"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmNewPassword">
                      Ulangi Kata Sandi Baru
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon" aria-hidden="true">
                        <Lock size={16} />
                      </span>
                      <input
                        type="password"
                        id="confirmNewPassword"
                        placeholder="Ketik ulang kata sandi"
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                    <small className="error-message" id="resetError">
                      {errorText}
                    </small>
                  </div>

                  <button
                    type="submit"
                    className="login-button"
                    id="resetButton"
                    disabled={saving}
                  >
                    {saving ? "Menyimpan..." : "Simpan Kata Sandi"}
                  </button>
                </form>
              )}

              <p className="register-text">
                <Link href="/masuk">Kembali ke halaman masuk</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
