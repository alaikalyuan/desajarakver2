"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
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
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Terjadi kesalahan</h1>
      <p className="max-w-md text-base text-gray-700">
        Halaman ini gagal dimuat. Periksa koneksi internet Anda, lalu coba lagi.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center rounded-lg bg-[#1b4332] px-5 font-semibold text-white hover:bg-[#2d6a4f]"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#1b4332] px-5 font-semibold text-[#1b4332] hover:bg-[#e8f5e9]"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
