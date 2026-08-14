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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return Response.json(
        { message: "Email wajib" },
        { status: 400 }
      );
    }

    const tahunAktif = await getTahunAktif();

    // ================= JUMLAH TOTAL PERIODE AKTIF =================
    const [total] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total_uang
      FROM transaksi
      WHERE admin_email = ?
      AND YEAR(tanggal) = ?
      `,
      [email, tahunAktif]
    );

    // ================= JUMLAH BULAN BERJALAN DI PERIODE AKTIF =================
    const [bulan] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS uang_bulan
      FROM transaksi
      WHERE admin_email = ?
      AND YEAR(tanggal) = ?
      AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `,
      [email, tahunAktif]
    );

    return Response.json({
      tahun_aktif: tahunAktif,
      total: Number(total[0]?.total_uang || 0),
      bulan: Number(bulan[0]?.uang_bulan || 0),
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "error statistik" },
      { status: 500 }
    );
  }
}