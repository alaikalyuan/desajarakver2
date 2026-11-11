"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu } from "lucide-react";

/**
 * Analisis header. On phones the only menu button is the ☰ on the left,
 * which opens the sidebar; the sidebar holds the same links as this bar.
 */
export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const linkClass =
    "inline-flex items-center min-h-11 px-2 hover:text-[#74c69d] transition-colors whitespace-nowrap";

  return (
    <header className="relative w-full bg-[#1b4332] text-white z-40">
      <div className="flex justify-between items-center px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 text-white"
            aria-label="Buka menu"
          >
            <Menu className="w-7 h-7" aria-hidden="true" />
          </button>

          <Link href="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img
              src="/assets/logo-desa-jarak-96.png"
              alt="Logo Desa Jarak"
              width={38}
              height={38}
              className="object-contain w-8 h-8 md:w-10 md:h-10"
            />
            <div className="text-lg md:text-2xl tracking-wide whitespace-nowrap">
              <span className="font-bold text-white">Desa </span>
              <span className="font-bold text-[#74c69d]">Jarak</span>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Menu utama"
          className="hidden md:flex items-center gap-3 lg:gap-5 text-sm font-medium text-gray-100"
        >
          <Link href="/" className={linkClass}>
            BERANDA
          </Link>
          <Link href="/direktori" className={linkClass}>
            DIREKTORI USAHA
          </Link>
          <Link href="/usaha" className={linkClass}>
            HALAMAN SAYA
          </Link>
          <button type="button" onClick={handleLogout} className={linkClass}>
            KELUAR
          </button>
        </nav>
      </div>
    </header>
  );
}
