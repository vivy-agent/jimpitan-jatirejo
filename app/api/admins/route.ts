import db from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        email,
        image,
        role,
        status
      FROM users
      WHERE role IN ('master', 'admin')
      ORDER BY
        CASE
          WHEN role = 'master' THEN 0
          ELSE 1
        END,
        CASE
          WHEN status = 'approved' THEN 0
          ELSE 1
        END,
        name ASC
    `);

    return Response.json(rows);
  } catch (err: any) {
    console.error("GET ADMINS ERROR:", err);

    return Response.json(
      {
        message: "Error mengambil data admin",
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email) {
      return Response.json(
        {
          message: "Email wajib diisi",
        },
        {
          status: 400,
        }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    if (!user) {
      return Response.json(
        {
          message: "Akun tidak ditemukan",
        },
        {
          status: 404,
        }
      );
    }

    if (user.role === "master") {
      return Response.json(
        {
          message: "Master Admin tidak dapat dihapus",
        },
        {
          status: 400,
        }
      );
    }

    if (user.status === "approved") {
      return Response.json(
        {
          message: "Nonaktifkan petugas terlebih dahulu sebelum menghapus akun",
        },
        {
          status: 400,
        }
      );
    }

    await db.query(
      `
      DELETE FROM users
      WHERE email = ?
      AND role = 'admin'
      AND status <> 'approved'
      `,
      [email]
    );

    return Response.json({
      success: true,
      message: "Akun petugas berhasil dihapus",
    });
  } catch (err: any) {
    console.error("DELETE ADMIN ERROR:", err);

    return Response.json(
      {
        message: "Error hapus admin",
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}