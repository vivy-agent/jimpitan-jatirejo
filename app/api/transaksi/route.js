import { NextResponse } from "next/server";
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

function hitungTunggakanPeriode(warga, totalBayar, tahunAktif) {
  const iuranMingguan = 2000;
  const mulaiWarga = new Date(warga.tanggal_mulai);
  const sekarang = new Date();
  const tahunSekarang = sekarang.getFullYear();
  const awalPeriode = new Date(tahunAktif, 0, 1);

  let akhirPeriode;

  if (tahunAktif < tahunSekarang) {
    akhirPeriode = new Date(tahunAktif, 11, 31, 23, 59, 59);
  } else if (tahunAktif === tahunSekarang) {
    akhirPeriode = sekarang;
  } else {
    akhirPeriode = new Date(tahunAktif, 0, 1);
  }

  const mulaiHitung = mulaiWarga > awalPeriode ? mulaiWarga : awalPeriode;
  const periodeSudahBerjalan = tahunAktif <= tahunSekarang;

  if (akhirPeriode < mulaiHitung) {
    return 0;
  }

  const selisihMinggu = Math.floor(
    (akhirPeriode.getTime() - mulaiHitung.getTime()) /
      (1000 * 60 * 60 * 24 * 7)
  );

  const totalSeharusnya = selisihMinggu * iuranMingguan;
  let tunggakan = Math.floor((totalSeharusnya - totalBayar) / iuranMingguan);

  if (tunggakan <= 0 && periodeSudahBerjalan) {
    const selisihHari = Math.floor(
      (akhirPeriode.getTime() - mulaiHitung.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (selisihHari < 7 && totalBayar === 0) {
      tunggakan = 1;
    }
  }

  return Math.max(0, tunggakan);
}

// ================= POST TRANSAKSI =================
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json();

    const nama = body.nama;

    const jumlah = Number(body.jumlah);

    const admin_name =
      body.admin_name ||
      session?.user?.name ||
      "Petugas";

    const admin_email =
      body.admin_email ||
      session?.user?.email ||
      null;

    // ================= VALIDASI DASAR =================

    if (!nama || !jumlah) {
      return NextResponse.json(
        {
          message: "Data tidak lengkap",
        },
        {
          status: 400,
        }
      );
    }

    // ================= VALIDASI ANGKA =================

    if (isNaN(jumlah) || jumlah <= 0) {
      return NextResponse.json(
        {
          message: "Nominal tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    // ================= VALIDASI KELIPATAN =================

    if (jumlah % 2000 !== 0) {
      return NextResponse.json(
        {
          message: "Nominal harus kelipatan 2000",
        },
        {
          status: 400,
        }
      );
    }

    const tahunAktif = await getTahunAktif();

    // ================= AMBIL DATA WARGA =================

    const [wargaRows] = await db.query(
      `
      SELECT *
      FROM warga
      WHERE nama = ?
      LIMIT 1
      `,
      [nama]
    );

    const warga = wargaRows[0];

    if (!warga) {
      return NextResponse.json(
        {
          message: "Warga tidak ditemukan",
        },
        {
          status: 404,
        }
      );
    }

    if (warga.status && warga.status !== "aktif") {
      return NextResponse.json(
        {
          message: "Warga ini sudah nonaktif",
        },
        {
          status: 400,
        }
      );
    }

    // ================= HITUNG TOTAL BAYAR SESUAI PERIODE AKTIF =================

    const [totalRows] = await db.query(
      `
      SELECT
        COALESCE(
          SUM(jumlah),
          0
        ) AS total
      FROM transaksi
      WHERE nama_warga = ?
      AND YEAR(tanggal) = ?
      `,
      [nama, tahunAktif]
    );

    const totalBayar = Number(totalRows[0]?.total || 0);

    // ================= HITUNG TUNGGAKAN SESUAI PERIODE AKTIF =================

    let tunggakan = hitungTunggakanPeriode(warga, totalBayar, tahunAktif);

    // ================= SUDAH LUNAS =================

    if (tunggakan === 0) {
      return NextResponse.json(
        {
          message:
            tahunAktif > new Date().getFullYear()
              ? `Periode ${tahunAktif} belum berjalan`
              : "Warga sudah lunas",
        },
        {
          status: 400,
        }
      );
    }

    // ================= VALIDASI MAX =================

    const maxBayar = tunggakan * 2000;

    if (jumlah > maxBayar) {
      return NextResponse.json(
        {
          message: "Nominal melebihi tunggakan",
        },
        {
          status: 400,
        }
      );
    }

    // ================= VALIDASI MIN =================

    if (jumlah < 2000) {
      return NextResponse.json(
        {
          message: "Minimal pembayaran 2000",
        },
        {
          status: 400,
        }
      );
    }

    // ================= ANTI DUPLICATE =================

    const [lastTransaction] = await db.query(
      `
      SELECT *
      FROM transaksi
      WHERE nama_warga = ?
      AND YEAR(tanggal) = ?
      ORDER BY tanggal DESC
      LIMIT 1
      `,
      [nama, tahunAktif]
    );

    const transaksiTerakhir = lastTransaction[0];

    if (transaksiTerakhir) {
      const waktuTerakhir = new Date(transaksiTerakhir.tanggal).getTime();
      const sekarangMs = new Date().getTime();

      const selisihDetik = (sekarangMs - waktuTerakhir) / 1000;

      // cooldown 10 detik
      if (selisihDetik < 10) {
        return NextResponse.json(
          {
            message: "Tunggu beberapa detik sebelum transaksi berikutnya",
          },
          {
            status: 429,
          }
        );
      }
    }

    // ================= SIMPAN TRANSAKSI =================
    // Tanggal tetap memakai NOW() agar arsip transaksi mengikuti tanggal nyata.
    // Periode aktif hanya menjadi filter data, bukan mengubah tanggal transaksi.

    const [insertResult] = await db.query(
      `
      INSERT INTO transaksi
      (
        nama_warga,
        jumlah,
        tanggal,
        admin_name,
        admin_email
      )
      VALUES (?, ?, NOW(), ?, ?)
      `,
      [nama, jumlah, admin_name, admin_email]
    );

    const transaksiId = insertResult.insertId;

    // ================= SUCCESS =================

    return NextResponse.json({
      success: true,

      message: "Pembayaran berhasil",

      tahun_aktif: tahunAktif,

      nama,

      jumlah,

      admin_name,

      admin_email,

      sisa_tunggakan: maxBayar - jumlah,

      data: {
        id: transaksiId,
        nama_warga: nama,
        jumlah,
        admin_name,
        admin_email,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}
