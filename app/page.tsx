import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUserProfile();
  const sellHref = user ? (user.role === "mitra" ? "/direktori" : "/usaha/penawaran/baru") : "/daftar";

  return (
    <>
      <Navbar initialUser={user} />
      <main>
        <section className="hero hero-video">
          <img
            className="hero-video-bg"
            src="/assets/Images/Gambar Padi Beras Desa Jarak.jpg"
            alt=""
            width={1600}
            height={900}
            fetchPriority="high"
          />

          <div className="hero-overlay"></div>

          <p className="hero-label">SELAMAT DATANG DI</p>

          <h1>JARAK CONNECT</h1>

          <p className="hero-description">
            Jual hasil Desa Jarak, atau cari pemasok dari desa. Gratis.
          </p>

          <Link href="/direktori" className="button">
            Jelajahi Direktori Usaha
          </Link>
        </section>

        <section className="home-paths" aria-label="Apa yang bisa Anda lakukan">
          <Link className="home-path" href={sellHref}>
            <span className="home-path-icon" aria-hidden="true">🌾</span>
            <h2>Jual hasil desa Anda</h2>
            <p>
              Untuk petani, kelompok tani, UMKM, dan BUMDes. Tawarkan hasil
              panen dan olahan ke pembeli dari luar desa.
            </p>
            <span className="home-path-cta">
              {user ? "Buat penawaran →" : "Daftar sebagai Pelaku Usaha →"}
            </span>
          </Link>
          <Link className="home-path" href="/direktori">
            <span className="home-path-icon" aria-hidden="true">🔎</span>
            <h2>Cari hasil desa</h2>
            <p>
              Untuk pembeli, toko, dan pengolah. Lihat barang yang tersedia,
              atau tulis kebutuhan Anda agar penjual mengirim penawaran.
            </p>
            <span className="home-path-cta">Buka Direktori →</span>
          </Link>
          <p className="home-steps-link">
            Baru di sini? <Link href="/cara-kerja">Baca cara kerjanya (2 menit)</Link>
          </p>
        </section>
      </main>
    </>
  );
}
