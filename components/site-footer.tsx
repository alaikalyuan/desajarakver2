"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HELP_WHATSAPP, helpWhatsAppUrl } from "@/lib/contact";

/**
 * Footer for the public pages. The dashboards (/mitra, /usaha) are full-screen
 * work areas with their own help links, so it is left off there.
 */
export function SiteFooter() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/mitra") || pathname.startsWith("/usaha")) return null;

  const helpUrl = helpWhatsAppUrl("Halo Kantor Desa Jarak, saya butuh bantuan tentang JARAK CONNECT.");

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <h2>Kantor Desa Jarak</h2>
          <p>Desa Jarak, Kecamatan Plosoklaten, Kabupaten Kediri, Jawa Timur.</p>
          {helpUrl ? (
            <a href={helpUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp kantor desa: +{HELP_WHATSAPP}
            </a>
          ) : (
            <p>Butuh bantuan? Datang ke kantor desa pada jam kerja.</p>
          )}
        </div>
        <nav aria-label="Tautan bawah">
          <h2>Mulai</h2>
          <ul>
            <li>
              <Link href="/cara-kerja">Cara Kerja</Link>
            </li>
            <li>
              <Link href="/daftar">Daftar Akun</Link>
            </li>
            <li>
              <Link href="/masuk">Masuk</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Direktori">
          <h2>Direktori</h2>
          <ul>
            <li>
              <Link href="/direktori">Cari hasil desa</Link>
            </li>
            <li>
              <Link href="/direktori?tab=permintaan">Lihat permintaan pembeli</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
