import db from "@/lib/db";

async function getTahunAktif() {
  const [periodeRows] = await db.query(`
    SELECT tahun_aktif
    FROM pengaturan_periode
    ORDER BY id ASC
    LIMIT 1
  `);

  return Number(periodeRows[0]?.tahun_aktif) || new Date().getFullYear();
}

export async function GET() {
  try {
    const tahunAktif = await getTahunAktif();

    const [totalJimpitanRows] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM transaksi
    `);

    const [totalPemasukanManualRows] = await db.query(`
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pemasukan'
    `);

    const [totalPengeluaranRows] = await db.query(`
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pengeluaran'
    `);

    const pemasukanJimpitan = Number(totalJimpitanRows[0]?.total || 0);
    const pemasukanManual = Number(totalPemasukanManualRows[0]?.total || 0);
    const pengeluaran = Number(totalPengeluaranRows[0]?.total || 0);
    const totalPemasukan = pemasukanJimpitan + pemasukanManual;
    const saldoKas = totalPemasukan - pengeluaran;

    const [jimpitanPeriodeRows] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total, COUNT(*) AS jumlah_transaksi
      FROM transaksi
      WHERE YEAR(tanggal) = ?
      `,
      [tahunAktif]
    );

    const [pemasukanManualPeriodeRows] = await db.query(
      `
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pemasukan'
      AND YEAR(tanggal) = ?
      `,
      [tahunAktif]
    );

    const [pengeluaranPeriodeRows] = await db.query(
      `
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pengeluaran'
      AND YEAR(tanggal) = ?
      `,
      [tahunAktif]
    );

    const pemasukanJimpitanPeriode = Number(jimpitanPeriodeRows[0]?.total || 0);
    const pemasukanManualPeriode = Number(pemasukanManualPeriodeRows[0]?.total || 0);
    const pengeluaranPeriode = Number(pengeluaranPeriodeRows[0]?.total || 0);
    const totalPemasukanPeriode = pemasukanJimpitanPeriode + pemasukanManualPeriode;
    const saldoPeriode = totalPemasukanPeriode - pengeluaranPeriode;

    const [riwayatManual] = await db.query(
      `
      SELECT id, tanggal, jenis, kategori, keterangan, nominal, created_by_name
      FROM kas
      WHERE YEAR(tanggal) = ?
      ORDER BY tanggal DESC, id DESC
      LIMIT 20
      `,
      [tahunAktif]
    );

    return Response.json({
      tahun_aktif: tahunAktif,
      ringkasan: {
        pemasukan_jimpitan: pemasukanJimpitan,
        pemasukan_manual: pemasukanManual,
        total_pemasukan: totalPemasukan,
        total_pengeluaran: pengeluaran,
        saldo_kas: saldoKas,
        pemasukan_jimpitan_periode: pemasukanJimpitanPeriode,
        pemasukan_manual_periode: pemasukanManualPeriode,
        total_pemasukan_periode: totalPemasukanPeriode,
        total_pengeluaran_periode: pengeluaranPeriode,
        saldo_periode: saldoPeriode,
        jumlah_transaksi_jimpitan: Number(jimpitanPeriodeRows[0]?.jumlah_transaksi || 0),
      },
      riwayat_manual: riwayatManual,
    });
  } catch (err) {
    console.error("PUBLIC KAS ERROR:", err);

    return Response.json(
      {
        message: "Gagal mengambil laporan kas publik",
        error: err.message,
      },
      { status: 500 }
    );
  }
}
