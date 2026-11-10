"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it cannot rely on globals.css.
// Styles are inline on purpose.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          fontFamily: "Poppins, system-ui, sans-serif",
          background: "#ffffff",
          color: "#1f2937",
          textAlign: "center",
        }}
      >
        <title>Terjadi kesalahan - Desa Jarak</title>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>Terjadi kesalahan</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px" }}>
            Situs Desa Jarak gagal dimuat. Periksa koneksi internet Anda, lalu
            coba lagi.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 44,
              padding: "0 20px",
              border: "none",
              borderRadius: 8,
              background: "#1b4332",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
          <p style={{ marginTop: 16 }}>
            {/* Plain <a>: the app's router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#1b4332", fontWeight: 600 }}>
              Kembali ke beranda
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
