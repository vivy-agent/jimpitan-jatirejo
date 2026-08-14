import db from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM warga ORDER BY nama ASC"
    );

    return Response.json(rows);
  } catch (error) {
    return Response.json(
      { message: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}