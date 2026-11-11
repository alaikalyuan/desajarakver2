import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cara Kerja",
  description: "Cara menjual dan mencari hasil Desa Jarak lewat JARAK CONNECT.",
};

export default async function CaraKerjaPage() {
  const user = await getCurrentUserProfile();

  return (
    <>
      <Navbar initialUser={user} />
      <main className="info-page">
        <h1>Cara Kerja JARAK CONNECT</h1>
        <p>
          JARAK CONNECT mempertemukan penjual hasil Desa Jarak dengan pembeli.
          Daftar gratis, lalu pilih peran Anda saat mendaftar.
        </p>

        <h2>Untuk penjual (Pelaku Usaha atau BUMDes)</h2>
        <ol className="info-steps">
          <li>Daftar akun dan pilih &quot;Pelaku Usaha&quot;.</li>
          <li>
            Buat penawaran: tulis barang, jumlah, harga, dan foto. Penawaran
            tampil di Direktori.
          </li>
          <li>
            Atau buka Direktori, cari permintaan pembeli, lalu tekan
            &quot;Ajukan Penawaran&quot;.
          </li>
          <li>
            Jika pembeli menerima penawaran Anda, nomor WhatsApp kedua pihak
            saling terlihat. Atur pengiriman lewat WhatsApp.
          </li>
          <li>Catat penjualan dan biaya di Analisis Desa untuk melihat untung-rugi.</li>
        </ol>

        <h2>Untuk pembeli (Mitra)</h2>
        <ol className="info-steps">
          <li>Daftar akun dan pilih &quot;Mitra&quot;.</li>
          <li>Cari hasil desa di Direktori, atau buat permintaan barang yang Anda butuhkan.</li>
          <li>
            Tekan &quot;Nyatakan Minat&quot; untuk melihat nomor penjual, atau
            tunggu penawaran masuk di Halaman Saya.
          </li>
          <li>Terima atau tolak penawaran. Setelah diterima, hubungi penjual lewat WhatsApp.</li>
        </ol>

        <h2>Siapa yang melihat nomor HP saya?</h2>
        <p>
          Nomor HP hanya terlihat oleh orang yang menekan &quot;Nyatakan
          Minat&quot; pada barang Anda, dan oleh pihak yang penawarannya Anda
          terima. Pengunjung yang belum masuk tidak bisa melihatnya.
        </p>

        <div className="info-actions">
          {user ? (
            <Link className="button" href={user.role === "mitra" ? "/mitra" : "/usaha"}>
              Buka Halaman Saya
            </Link>
          ) : (
            <Link className="button" href="/daftar">
              Daftar Gratis
            </Link>
          )}
          <Link className="button secondary" href="/direktori">
            Lihat Direktori
          </Link>
        </div>
      </main>
    </>
  );
}
