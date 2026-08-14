import db from "@/lib/db";

export async function GET() {
  try {
    // ================= AMBIL PERIODE AKTIF =================
    const [periodeRows] = await db.query(`
      SELECT tahun_aktif
      FROM pengaturan_periode
      ORDER BY id ASC
      LIMIT 1
    `);

    const tahunAktif =
      Number(periodeRows[0]?.tahun_aktif) || new Date().getFullYear();

    // ================= HITUNG JUMLAH WARGA =================
    // Sistem akan mencoba menghitung warga aktif dulu.
    // Jika kolom status tidak ditemukan, sistem otomatis fallback menghitung semua warga.
    let totalWarga = 0;

    try {
      const [wargaAktif] = await db.query(`
        SELECT COUNT(*) AS total_warga
        FROM warga
        WHERE status IS NULL
        OR status = ''
        OR status = 'aktif'
      `);

      totalWarga = Number(wargaAktif[0]?.total_warga || 0);
    } catch (err) {
      const [semuaWarga] = await db.query(`
        SELECT COUNT(*) AS total_warga
        FROM warga
      `);

      totalWarga = Number(semuaWarga[0]?.total_warga || 0);
    }

    // ================= TARGET TAHUNAN =================
    // Rumus:
    // jumlah warga x iuran mingguan x 52 minggu
    const iuranMingguan = 2000;
    const jumlahMinggu = 52;

    const target = totalWarga * iuranMingguan * jumlahMinggu;

    // ================= UANG TERKUMPUL SESUAI PERIODE AKTIF =================
    const [uang] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total_uang
      FROM transaksi
      WHERE YEAR(tanggal) = ?
      `,
      [tahunAktif]
    );

    const totalUang = Number(uang[0]?.total_uang || 0);

    // ================= HITUNG PERSEN =================
    const persen = target > 0 ? Math.round((totalUang / target) * 100) : 0;

    return Response.json({
      tahun_aktif: tahunAktif,
      total_warga: totalWarga,
      iuran_mingguan: iuranMingguan,
      jumlah_minggu: jumlahMinggu,
      target,
      terkumpul: totalUang,
      persen,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "error target" },
      { status: 500 }
    );
  }
}