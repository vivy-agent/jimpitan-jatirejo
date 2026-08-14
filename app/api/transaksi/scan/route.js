import { NextResponse } from "next/server";
import db from "@/lib/db";

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

export async function POST(req) {
  try {
    const body = await req.json();
    const kode = body.kode;

    if (!kode) {
      return NextResponse.json(
        { message: "Kode tidak valid" },
        { status: 400 }
      );
    }

    const kodeUnik = kode.replace("JTR-", "");

    const [rows] = await db.query(
      `
      SELECT *
      FROM warga
      WHERE kode_unik = ?
      LIMIT 1
      `,
      [kodeUnik]
    );

    const warga = rows[0];

    if (!warga) {
      return NextResponse.json(
        { message: "Warga tidak ditemukan" },
        { status: 404 }
      );
    }

    const tahunAktif = await getTahunAktif();

    const [trxRows] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM transaksi
      WHERE nama_warga = ?
      AND YEAR(tanggal) = ?
      `,
      [warga.nama, tahunAktif]
    );

    const totalBayar = Number(trxRows[0]?.total || 0);

    const tunggakan = hitungTunggakanPeriode(
      warga,
      totalBayar,
      tahunAktif
    );

    return NextResponse.json({
      message: "Scan berhasil",
      tahun_aktif: tahunAktif,
      warga,
      tunggakan: Math.max(0, tunggakan),
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
