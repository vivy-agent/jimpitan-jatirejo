import db from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return Response.json(rows[0]);
}