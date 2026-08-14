import db from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let kode = searchParams.get("kode");

    if (!kode) {
      return Response.json(
        { message: "Kode tidak ditemukan" },
        { status: 400 }
      );
    }

    // 🔥 Normalisasi kode
    kode = kode.toUpperCase().trim();

    if (kode.startsWith("JTR-")) {
      kode = kode.replace("JTR-", "");
    }

    const [rows] = await db.query(
      "SELECT * FROM warga WHERE kode_unik = ?",
      [kode]
    );

    if (rows.length === 0) {
      return Response.json(
        { message: "Warga tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json(rows[0]);

  } catch (err) {
    console.error(err);
    return Response.json(
      { message: "error bykode" },
      { status: 500 }
    );
  }
}