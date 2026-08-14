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
        { message: "Hanya Master Admin yang boleh melakukan aksi ini" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session,
  };
}

// ================= GET RINGKASAN KAS =================
export async function GET(req) {
  const access = await requireLogin();

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(req.url);

    const now = new Date();

    const bulan = Number(searchParams.get("bulan")) || now.getMonth() + 1;
    const tahun = Number(searchParams.get("tahun")) || now.getFullYear();

    // =====================================================
    // TOTAL KAS BERJALAN / SEMUA WAKTU
    // =====================================================

    const [totalJimpitanRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(jumlah), 0) AS total
      FROM transaksi
      `
    );

    const totalPemasukanJimpitan = Number(totalJimpitanRows[0]?.total || 0);

    const [totalPemasukanManualRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pemasukan'
      `
    );

    const totalPemasukanManual = Number(
      totalPemasukanManualRows[0]?.total || 0
    );

    const [totalPengeluaranRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pengeluaran'
      `
    );

    const totalPengeluaran = Number(totalPengeluaranRows[0]?.total || 0);

    const totalPemasukan = totalPemasukanJimpitan + totalPemasukanManual;
    const saldoKas = totalPemasukan - totalPengeluaran;

    // =====================================================
    // DATA PERIODE / BULAN YANG DIPILIH
    // =====================================================

    const [jimpitanPeriodeRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(jumlah), 0) AS total,
        COUNT(*) AS jumlah_transaksi
      FROM transaksi
      WHERE MONTH(tanggal) = ?
      AND YEAR(tanggal) = ?
      `,
      [bulan, tahun]
    );

    const pemasukanJimpitanPeriode = Number(
      jimpitanPeriodeRows[0]?.total || 0
    );

    const jumlahTransaksiJimpitan = Number(
      jimpitanPeriodeRows[0]?.jumlah_transaksi || 0
    );

    const [pemasukanManualPeriodeRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pemasukan'
      AND MONTH(tanggal) = ?
      AND YEAR(tanggal) = ?
      `,
      [bulan, tahun]
    );

    const pemasukanManualPeriode = Number(
      pemasukanManualPeriodeRows[0]?.total || 0
    );

    const [pengeluaranPeriodeRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pengeluaran'
      AND MONTH(tanggal) = ?
      AND YEAR(tanggal) = ?
      `,
      [bulan, tahun]
    );

    const pengeluaranPeriode = Number(
      pengeluaranPeriodeRows[0]?.total || 0
    );

    const totalPemasukanPeriode =
      pemasukanJimpitanPeriode + pemasukanManualPeriode;

    const saldoPeriode = totalPemasukanPeriode - pengeluaranPeriode;

    // ================= RIWAYAT KAS MANUAL PERIODE =================
    const [riwayatManual] = await db.query(
      `
      SELECT
        id,
        tanggal,
        jenis,
        kategori,
        keterangan,
        nominal,
        created_by_name,
        created_by_email,
        created_at
      FROM kas
      WHERE MONTH(tanggal) = ?
      AND YEAR(tanggal) = ?
      ORDER BY tanggal DESC, id DESC
      `,
      [bulan, tahun]
    );

    return NextResponse.json({
      bulan,
      tahun,

      ringkasan: {
        // TOTAL KAS BERJALAN / SEMUA WAKTU
        pemasukan_jimpitan: totalPemasukanJimpitan,
        pemasukan_manual: totalPemasukanManual,
        total_pemasukan: totalPemasukan,
        total_pengeluaran: totalPengeluaran,
        saldo_kas: saldoKas,

        // DATA PERIODE / BULAN DIPILIH
        pemasukan_jimpitan_periode: pemasukanJimpitanPeriode,
        pemasukan_manual_periode: pemasukanManualPeriode,
        total_pemasukan_periode: totalPemasukanPeriode,
        total_pengeluaran_periode: pengeluaranPeriode,
        saldo_periode: saldoPeriode,
        jumlah_transaksi_jimpitan: jumlahTransaksiJimpitan,
      },

      riwayat_manual: riwayatManual,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Gagal mengambil data kas" },
      { status: 500 }
    );
  }
}

// ================= POST TAMBAH DATA KAS MANUAL =================
export async function POST(req) {
  const access = await requireMaster();

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await req.json();

    const tanggal = body.tanggal;
    const jenis = body.jenis;
    const kategori = body.kategori;
    const keterangan = body.keterangan || "";
    const nominal = Number(body.nominal || 0);

    // ================= VALIDASI =================
    if (!tanggal || !jenis || !kategori || !nominal) {
      return NextResponse.json(
        { message: "Data belum lengkap" },
        { status: 400 }
      );
    }

    if (jenis !== "pemasukan" && jenis !== "pengeluaran") {
      return NextResponse.json(
        { message: "Jenis kas tidak valid" },
        { status: 400 }
      );
    }

    if (isNaN(nominal) || nominal <= 0) {
      return NextResponse.json(
        { message: "Nominal tidak valid" },
        { status: 400 }
      );
    }

    // ================= SIMPAN =================
    await db.query(
      `
      INSERT INTO kas
      (
        tanggal,
        jenis,
        kategori,
        keterangan,
        nominal,
        created_by_name,
        created_by_email
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tanggal,
        jenis,
        kategori,
        keterangan,
        nominal,
        access.session.user.name || null,
        access.session.user.email || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Data kas berhasil ditambahkan",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Gagal menambahkan data kas" },
      { status: 500 }
    );
  }
}