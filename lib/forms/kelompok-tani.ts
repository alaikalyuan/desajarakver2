/**
 * Kelompok tani Desa Jarak dan anggotanya.
 *
 * DATA DUMMY: nama anggota di bawah hanya contoh. Ganti dengan nama asli
 * setelah daftar dari desa diterima. Jangan menaruh nomor HP di sini.
 */
function dummyMembers(group: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => `Anggota ${group} ${n}`);
}

export const KELOMPOK_TANI: Record<string, string[]> = {
  "Kelompok Tani Jaya": dummyMembers("Jaya"),
  "Kelompok Tani Makmur": dummyMembers("Makmur"),
  "Kelompok Tani Rejeki": dummyMembers("Rejeki"),
  "Kelompok Tani Budi Santoso": dummyMembers("Budi Santoso"),
};

export const KELOMPOK_TANI_NAMES = Object.keys(KELOMPOK_TANI);

export function isKelompokTaniName(name: string): boolean {
  return KELOMPOK_TANI_NAMES.includes(name);
}
