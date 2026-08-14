import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import db from "@/lib/db";
import { authOptions } from "@/lib/auth";

// ================= CEK LOGIN =================
async function requireLogin() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    session,
  };
}

// ================= CEK MASTER =================
async function requireMaster() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "master") {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Hanya Master Admin yang boleh mengubah periode" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session,
  };
}

// ================= GET PERIODE AKTIF =================
export async function GET() {
  const access = await requireLogin();

  if (!access.ok) {
    return access.response;
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        tahun_aktif,
        updated_by_name,
        updated_by_email,
        updated_at
      FROM pengaturan_periode
      ORDER BY id ASC
      LIMIT 1
      `
    );

    // Jika tabel masih kosong, otomatis buat periode tahun sekarang
    if (rows.length === 0) {
      const tahunSekarang = new Date().getFullYear();

      await db.query(
        `
        INSERT INTO pengaturan_periode
        (tahun_aktif, updated_by_name, updated_by_email)
        VALUES (?, ?, ?)
        `,
        [
          tahunSekarang,
          access.session.user.name || null,
          access.session.user.email || null,
        ]
      );

      return NextResponse.json({
        tahun_aktif: tahunSekarang,
        updated_by_name: access.session.user.name || null,
        updated_by_email: access.session.user.email || null,
        updated_at: new Date(),
      });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Gagal mengambil periode aktif" },
      { status: 500 }
    );
  }
}

// ================= UPDATE PERIODE AKTIF =================
export async function PUT(req) {
  const access = await requireMaster();

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await req.json();

    const tahunAktif = Number(body.tahun_aktif);

    if (!tahunAktif) {
      return NextResponse.json(
        { message: "Tahun aktif wajib diisi" },
        { status: 400 }
      );
    }

    if (tahunAktif < 2020 || tahunAktif > 2100) {
      return NextResponse.json(
        { message: "Tahun aktif tidak valid" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT id
      FROM pengaturan_periode
      ORDER BY id ASC
      LIMIT 1
      `
    );

    if (rows.length === 0) {
      await db.query(
        `
        INSERT INTO pengaturan_periode
        (tahun_aktif, updated_by_name, updated_by_email)
        VALUES (?, ?, ?)
        `,
        [
          tahunAktif,
          access.session.user.name || null,
          access.session.user.email || null,
        ]
      );
    } else {
      await db.query(
        `
        UPDATE pengaturan_periode
        SET
          tahun_aktif = ?,
          updated_by_name = ?,
          updated_by_email = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          tahunAktif,
          access.session.user.name || null,
          access.session.user.email || null,
          rows[0].id,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Periode aktif berhasil diperbarui",
      tahun_aktif: tahunAktif,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Gagal memperbarui periode aktif" },
      { status: 500 }
    );
  }
}