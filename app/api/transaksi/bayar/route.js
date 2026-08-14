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

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Session petugas tidak ditemukan" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { kode } = body;

    if (!kode) {
      return NextResponse.json(
        { message: "Kode tidak valid" },
        { status: 400 }
      );
    }

    const tahunAktif = await getTahunAktif();

    const resWarga = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/warga/list`,
      { cache: "no-store" }
    );

    const wargaList = await resWarga.json();

    const warga = wargaList.find((w) => `JTR-${w.kode_unik}` === kode);

    if (!warga) {
      return NextResponse.json(
        { message: "Warga tidak ditemukan" },
        { status: 404 }
      );
    }

    if (warga.status && warga.status !== "aktif") {
      return NextResponse.json(
        { message: "Warga ini sudah nonaktif" },
        { status: 400 }
      );
    }

    const resTotal = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaksi/total?nama=${encodeURIComponent(
        warga.nama
      )}`,
      { cache: "no-store" }
    );

    const totalData = await resTotal.json();
    const totalBayar = Number(totalData.total || 0);

    const tunggakan = hitungTunggakanPeriode(warga, totalBayar, tahunAktif);

    if (tunggakan === 0) {
      return NextResponse.json(
        {
          message:
            tahunAktif > new Date().getFullYear()
              ? `Periode ${tahunAktif} belum berjalan`
              : "Sudah lunas",
        },
        { status: 400 }
      );
    }

    const jumlahBayar = 2000;

    const resTransaksi = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaksi`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: warga.nama,
          jumlah: jumlahBayar,
          admin_name: session.user.name || "Petugas",
          admin_email: session.user.email,
        }),
      }
    );

    const transaksiData = await resTransaksi.json();

    if (!resTransaksi.ok) {
      return NextResponse.json(
        {
          message: transaksiData.message || "Gagal menyimpan transaksi",
        },
        { status: resTransaksi.status }
      );
    }

    return NextResponse.json({
      message: "Pembayaran berhasil",
      tahun_aktif: tahunAktif,
      warga,
      dibayar: jumlahBayar,
      sisa: tunggakan - 1,
      transaksi: transaksiData.data || null,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
