import db from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest
) {
  const body = await req.json();

  const { email, status } =
    body;

  await db.query(
    "UPDATE users SET status = ? WHERE email = ?",
    [status, email]
  );

  return Response.json({
    success: true,
  });
}