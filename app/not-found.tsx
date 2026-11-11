import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-semibold text-[#2d6a4f]">404</p>
      <h1 className="text-2xl font-bold text-gray-900">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-base text-gray-700">
        Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali
        alamatnya, atau kembali ke beranda.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg bg-[#1b4332] px-5 font-semibold text-white hover:bg-[#2d6a4f]"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/direktori"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#1b4332] px-5 font-semibold text-[#1b4332] hover:bg-[#e8f5e9]"
        >
          Buka direktori
        </Link>
      </div>
    </main>
  );
}
