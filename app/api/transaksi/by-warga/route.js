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
    const nama = searchParams.get("nama");

    if (!nama) {
      return Response.json(
        { message: "Nama warga wajib" },
        { status: 400 }
      );
    }

    const tahunAktif = await getTahunAktif();

    const [rows] = await db.query(
      `
      SELECT *
      FROM transaksi
      WHERE nama_warga = ?
      AND YEAR(tanggal) = ?
      ORDER BY tanggal DESC
      `,
      [nama, tahunAktif]
    );

    return Response.json(rows);
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "error transaksi warga" },
      { status: 500 }
    );
  }
}
