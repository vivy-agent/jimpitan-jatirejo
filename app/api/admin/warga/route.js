import db from "@/lib/db";
import { generateQR } from "@/lib/qr";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 🔥 CEK MASTER
async function requireMaster() {
  const session =
    await getServerSession(authOptions);

  if (!session) {
    return {
      ok: false,
      response: Response.json(
        { message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "master") {
    return {
      ok: false,
      response: Response.json(
        {
          message:
            "Hanya Master Admin yang boleh melakukan aksi ini",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

// 🔥 GENERATE KODE
function generateKode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";

  let result = "";

  for (let i = 0; i < 5; i++) {
    result +=
      chars[
        Math.floor(
          Math.random() *
            chars.length
        )
      ];
  }

  return result;
}

// ================= GET =================
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        nama,
        tanggal_mulai,
        status,
        kode_unik
      FROM warga
      ORDER BY nama ASC
    `);

    return Response.json(rows);
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        message:
          "error get warga",
      },
      {
        status: 500,
      }
    );
  }
}

// ================= POST =================
export async function POST(req) {
  const access =
    await requireMaster();

  if (!access.ok)
    return access.response;

  try {
    const {
      nama,
      tanggal_mulai,
    } = await req.json();

    if (
      !nama ||
      !tanggal_mulai
    ) {
      return Response.json(
        {
          message:
            "Data tidak lengkap",
        },
        {
          status: 400,
        }
      );
    }

    const [cek] =
      await db.query(
        `
        SELECT id
        FROM warga
        WHERE nama = ?
      `,
        [nama]
      );

    if (cek.length > 0) {
      return Response.json(
        {
          message:
            "Warga sudah ada",
        },
        {
          status: 400,
        }
      );
    }

    let kode_unik;
    let valid = false;

    while (!valid) {
      kode_unik =
        generateKode();

      const [checkKode] =
        await db.query(
          `
          SELECT id
          FROM warga
          WHERE kode_unik = ?
        `,
          [kode_unik]
        );

      if (
        checkKode.length === 0
      ) {
        valid = true;
      }
    }

    await db.query(
      `
      INSERT INTO warga
      (
        nama,
        tanggal_mulai,
        status,
        kode_unik
      )
      VALUES
      (
        ?,
        ?,
        'aktif',
        ?
      )
    `,
      [
        nama,
        tanggal_mulai,
        kode_unik,
      ]
    );

    return Response.json({
      message:
        "Warga berhasil ditambahkan",
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        message:
          "error tambah warga",
      },
      {
        status: 500,
      }
    );
  }
}

// ================= PUT =================
export async function PUT(req) {
  const access =
    await requireMaster();

  if (!access.ok)
    return access.response;

  try {
    const {
      id,
      nama,
      tanggal_mulai,
      status,
    } = await req.json();

    await db.query(
      `
      UPDATE warga
      SET
        nama = ?,
        tanggal_mulai = ?,
        status = ?
      WHERE id = ?
    `,
      [
        nama,
        tanggal_mulai,
        status,
        id,
      ]
    );

    return Response.json({
      message:
        "Warga diupdate",
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        message:
          "error update warga",
      },
      {
        status: 500,
      }
    );
  }
}