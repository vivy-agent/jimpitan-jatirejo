import db from "@/lib/db";
import { generateKodeUnik } from "@/lib/generateCode";

export async function POST(req) {
  const body = await req.json();
  const { nama, alamat } = body;

  let kode;

  // 🔁 pastikan kode tidak duplikat
  while (true) {
    kode = generateKodeUnik();

    const [check] = await db.query(
      "SELECT * FROM warga WHERE kode_unik = ?",
      [kode]
    );

    if (check.length === 0) break;
  }

  await db.query(
    "INSERT INTO warga (nama, alamat, kode_unik) VALUES (?, ?, ?)",
    [nama, alamat, kode]
  );

  return Response.json({
    message: "Warga berhasil ditambahkan",
    kode_unik: kode,
  });
}