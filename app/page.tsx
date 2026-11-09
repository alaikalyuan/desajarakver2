import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUserProfile();

  return (
    <>
      <Navbar initialUser={user} />
      <main>
        <section className="hero hero-video">
          <img
            className="hero-video-bg"
            src="/assets/Images/Gambar Padi Beras Desa Jarak.jpg"
            alt="Hamparan sawah padi Desa Jarak"
            width={1600}
            height={900}
            fetchPriority="high"
          />

          <div className="hero-overlay"></div>

          <p className="hero-label">SELAMAT DATANG DI</p>

          <h1>JARAK CONNECT</h1>

          <p className="hero-description">
            Menghubungkan Potensi Desa dengan Pasar dan Mitra.
          </p>

          <Link href="/direktori" className="button">
            Jelajahi Direktori Usaha
          </Link>
        </section>
      </main>
    </>
  );
}
