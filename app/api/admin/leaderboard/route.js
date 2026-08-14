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
        users.name AS admin_name,
        users.email AS admin_email,
        users.image,
        users.role,
        users.status,

        COALESCE(SUM(transaksi.jumlah), 0) AS total_uang,

        COALESCE(
          SUM(
            CASE
              WHEN MONTH(transaksi.tanggal) = MONTH(CURRENT_DATE())
              THEN transaksi.jumlah
              ELSE 0
            END
          ),
          0
        ) AS uang_bulan,

        COUNT(transaksi.id) AS jumlah_scan,

        COALESCE(
          SUM(
            CASE
              WHEN MONTH(transaksi.tanggal) = MONTH(CURRENT_DATE())
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS jumlah_scan_bulan

      FROM users

      LEFT JOIN transaksi
      ON users.email = transaksi.admin_email
      AND YEAR(transaksi.tanggal) = ?

      WHERE
        users.role = 'admin'
        AND users.status = 'approved'

      GROUP BY
        users.email,
        users.name,
        users.image,
        users.role,
        users.status

      ORDER BY
        total_uang DESC,
        users.name ASC
      `,
      [tahunAktif]
    );

    return Response.json(rows);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);

    return Response.json(
      {
        message: "error leaderboard",
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}
