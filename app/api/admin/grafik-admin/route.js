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
        users.email AS admin_email,
        users.name AS admin_name,

        COALESCE(SUM(transaksi.jumlah), 0) AS total

      FROM users

      LEFT JOIN transaksi
      ON users.email = transaksi.admin_email
      AND YEAR(transaksi.tanggal) = ?

      WHERE
        users.role IN ('master', 'admin')
        AND users.status = 'approved'

      GROUP BY
        users.email,
        users.name

      ORDER BY
        total DESC,
        users.name ASC
      `,
      [tahunAktif]
    );

    return Response.json(rows);
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "error grafik admin" },
      { status: 500 }
    );
  }
}