import db from "@/lib/db";

export async function GET(req, context) {
  try {
    const params = await context.params; // Next 16
    const id = params.id;

    if (!id) {
      return Response.json(
        { message: "ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        nama_warga,
        jumlah,
        tanggal,
        admin_name,
        admin_email
      FROM transaksi
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return Response.json(
        { message: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json(rows[0]);
  } catch (err) {
    console.error(err);

    return Response.json(
      { message: "Error ambil transaksi" },
      { status: 500 }
    );
  }
}
