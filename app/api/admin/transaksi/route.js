import { getServerSession } from "next-auth";

import db from "@/lib/db";
import { authOptions } from "@/lib/auth";

async function getTahunAktif() {
  const [periodeRows] = await db.query(`
    SELECT tahun_aktif
    FROM pengaturan_periode
    ORDER BY id ASC
    LIMIT 1
  `);

  return Number(periodeRows[0]?.tahun_aktif) || new Date().getFullYear();
}

async function requireMaster() {
  const session = await getServerSession(authOptions);

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
        { message: "Hanya Master Admin yang boleh mengakses transaksi" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session,
  };
}

// ================= GET SEMUA TRANSAKSI =================
export async function GET(req) {
  const access = await requireMaster();

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";
    const filter = searchParams.get("filter") || "semua";

    const tahunAktif = await getTahunAktif();

    const where = [`YEAR(tanggal) = ?`];
    const values = [tahunAktif];

    if (search) {
      where.push(`
        (
          nama_warga LIKE ?
          OR admin_name LIKE ?
          OR admin_email LIKE ?
        )
      `);

      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (filter === "hari_ini") {
      where.push(`DATE(tanggal) = CURRENT_DATE()`);
    }

    if (filter === "bulan_ini") {
      where.push(`MONTH(tanggal) = MONTH(CURRENT_DATE())`);
    }

    if (filter === "custom") {
      if (start) {
        where.push(`DATE(tanggal) >= ?`);
        values.push(start);
      }

      if (end) {
        where.push(`DATE(tanggal) <= ?`);
        values.push(end);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        id,
        nama_warga,
        jumlah,
        tanggal,
        admin_id,
        admin_name,
        admin_email
      FROM transaksi
      ${whereSql}
      ORDER BY tanggal DESC, id DESC
      `,
      values
    );

    const [summaryRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_transaksi,
        COALESCE(SUM(jumlah), 0) AS total_uang
      FROM transaksi
      ${whereSql}
      `,
      values
    );

    return Response.json({
      tahun_aktif: tahunAktif,
      summary: {
        total_transaksi: Number(summaryRows[0]?.total_transaksi || 0),
        total_uang: Number(summaryRows[0]?.total_uang || 0),
      },
      data: rows,
    });
  } catch (err) {
    console.error("GET ADMIN TRANSAKSI ERROR:", err);

    return Response.json(
      {
        message: "error mengambil transaksi",
        error: err.message,
      },
      { status: 500 }
    );
  }
}

// ================= UPDATE TRANSAKSI =================
export async function PUT(req) {
  const access = await requireMaster();

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await req.json();

    const id = Number(body.id);
    const jumlah = Number(body.jumlah);

    if (!id || !jumlah) {
      return Response.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (isNaN(jumlah) || jumlah <= 0) {
      return Response.json(
        { message: "Nominal tidak valid" },
        { status: 400 }
      );
    }

    if (jumlah % 2000 !== 0) {
      return Response.json(
        { message: "Nominal harus kelipatan 2000" },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE transaksi
      SET jumlah = ?
      WHERE id = ?
      `,
      [jumlah, id]
    );

    return Response.json({
      success: true,
      message: "Transaksi berhasil diperbarui",
    });
  } catch (err) {
    console.error("PUT ADMIN TRANSAKSI ERROR:", err);

    return Response.json(
      {
        message: "error update transaksi",
        error: err.message,
      },
      { status: 500 }
    );
  }
}

// ================= DELETE TRANSAKSI =================
export async function DELETE(req) {
  const access = await requireMaster();

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await req.json();

    const id = Number(body.id);

    if (!id) {
      return Response.json(
        { message: "ID transaksi wajib" },
        { status: 400 }
      );
    }

    await db.query(
      `
      DELETE FROM transaksi
      WHERE id = ?
      `,
      [id]
    );

    return Response.json({
      success: true,
      message: "Transaksi berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE ADMIN TRANSAKSI ERROR:", err);

    return Response.json(
      {
        message: "error hapus transaksi",
        error: err.message,
      },
      { status: 500 }
    );
  }
}
