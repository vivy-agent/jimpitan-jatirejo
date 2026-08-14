import db from "@/lib/db";

export async function GET() {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE status = 'pending'"
  );

  return Response.json(rows);
}