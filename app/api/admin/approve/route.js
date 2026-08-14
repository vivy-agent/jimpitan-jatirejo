import db from "@/lib/db";

export async function POST(req) {
  const body = await req.json();
  const { email } = body;

  await db.query(
    "UPDATE users SET status = 'approved' WHERE email = ?",
    [email]
  );

  return Response.json({ message: "User approved" });
}