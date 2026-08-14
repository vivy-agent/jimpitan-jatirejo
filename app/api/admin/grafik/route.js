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

    const [rows] = await db.query(
      `
      SELECT 
        DATE_FORMAT(tanggal, '%Y-%m') AS bulan,
        COALESCE(SUM(jumlah), 0) AS total
      FROM transaksi
      WHERE YEAR(tanggal) = ?
      GROUP BY bulan
      ORDER BY bulan ASC
      `,
      [tahunAktif]
    );

    return Response.json(rows);
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "error grafik" },
      { status: 500 }
    );
  }
}