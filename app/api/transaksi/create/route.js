import db from "@/lib/db";

export async function POST(req) {
  try {
    const { nama_warga, jumlah, admin_email, admin_name } =
      await req.json();

    // ================= VALIDASI =================
    if (!nama_warga || !jumlah) {
      return Response.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (Number(jumlah) <= 0) {
      return Response.json(
        { message: "Jumlah tidak valid" },
        { status: 400 }
      );
    }

    // ================= CEK WARGA =================
    const [warga] = await db.query(
      `SELECT * FROM warga WHERE nama = ?`,
      [nama_warga]
    );

    if (warga.length === 0) {
      return Response.json(
        { message: "Warga tidak ditemukan" },
        { status: 404 }
      );
    }

    if (warga[0].status !== "aktif") {
      return Response.json(
        { message: "Warga nonaktif tidak bisa bayar" },
        { status: 400 }
      );
    }

    // ================= INSERT =================
    const [result] = await db.query(
  `
  INSERT INTO transaksi 
  (nama_warga, jumlah, tanggal, admin_email, admin_name)
  VALUES (?, ?, NOW(), ?, ?)
  `,
  [nama_warga, jumlah, admin_email, admin_name]
);

// 🔥 ambil ID hasil insert
const insertId = result.insertId;

return Response.json({
  message: "Transaksi berhasil",
  data: {
    id: insertId,
  },
});

    // ================= AMBIL DATA LENGKAP =================
    const [transaksi] = await db.query(
      `SELECT * FROM transaksi WHERE id = ?`,
      [insertedId]
    );

    return Response.json({
      message: "Transaksi berhasil",
      data: transaksi[0], // 🔥 ini penting
    });

  } catch (err) {
    console.error(err);
    return Response.json(
      { message: "error transaksi" },
      { status: 500 }
    );
  }
}