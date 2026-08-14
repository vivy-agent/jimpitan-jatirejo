import db from "@/lib/db";

const IURAN_MINGGUAN = 2000;

async function getTahunAktif() {
  const [periodeRows] = await db.query(`
    SELECT tahun_aktif
    FROM pengaturan_periode
    ORDER BY id ASC
    LIMIT 1
  `);

  return Number(periodeRows[0]?.tahun_aktif) || new Date().getFullYear();
}

function tambahHari(date, jumlahHari) {
  const hasil = new Date(date);
  hasil.setDate(hasil.getDate() + jumlahHari);
  return hasil;
}

function hitungKewajibanPeriode(warga, totalBayar, tahunAktif) {
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
    return {
      minggu_wajib: 0,
      minggu_terbayar: Math.floor(totalBayar / IURAN_MINGGUAN),
      tunggakan: 0,
      total_seharusnya: 0,
      detail_tunggakan: [],
    };
  }

  const selisihMinggu = Math.floor(
    (akhirPeriode.getTime() - mulaiHitung.getTime()) /
      (1000 * 60 * 60 * 24 * 7)
  );

  let mingguWajib = selisihMinggu;

  if (mingguWajib <= 0 && periodeSudahBerjalan && totalBayar === 0) {
    const selisihHari = Math.floor(
      (akhirPeriode.getTime() - mulaiHitung.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (selisihHari < 7) mingguWajib = 1;
  }

  const mingguTerbayar = Math.floor(totalBayar / IURAN_MINGGUAN);
  const tunggakan = Math.max(0, mingguWajib - mingguTerbayar);
  const totalSeharusnya = mingguWajib * IURAN_MINGGUAN;

  const detailTunggakan = [];

  for (let minggu = mingguTerbayar + 1; minggu <= mingguWajib; minggu++) {
    const tanggalAwal = tambahHari(mulaiHitung, (minggu - 1) * 7);
    const tanggalAkhir = tambahHari(tanggalAwal, 6);

    detailTunggakan.push({
      minggu_ke: minggu,
      tanggal_awal: tanggalAwal,
      tanggal_akhir: tanggalAkhir,
      nominal: IURAN_MINGGUAN,
    });
  }

  return {
    minggu_wajib: mingguWajib,
    minggu_terbayar: mingguTerbayar,
    tunggakan,
    total_seharusnya: totalSeharusnya,
    detail_tunggakan: detailTunggakan,
  };
}

export async function GET() {
  try {
    const tahunAktif = await getTahunAktif();

    const [wargaRows] = await db.query(`
      SELECT id, nama, kode_unik, tanggal_mulai, status
      FROM warga
      ORDER BY nama ASC
    `);

    const [transaksiRows] = await db.query(
      `
      SELECT id, nama_warga, jumlah, tanggal, admin_name
      FROM transaksi
      WHERE YEAR(tanggal) = ?
      ORDER BY tanggal DESC, id DESC
      `,
      [tahunAktif]
    );

    const transaksiByNama = new Map();

    transaksiRows.forEach((trx) => {
      const key = trx.nama_warga || "";
      if (!transaksiByNama.has(key)) transaksiByNama.set(key, []);
      transaksiByNama.get(key).push(trx);
    });

    const warga = wargaRows.map((item) => {
      const riwayat = transaksiByNama.get(item.nama) || [];
      const totalBayar = riwayat.reduce(
        (total, trx) => total + Number(trx.jumlah || 0),
        0
      );

      const kewajiban = hitungKewajibanPeriode(item, totalBayar, tahunAktif);

      return {
        ...item,
        total_bayar: totalBayar,
        tunggakan: kewajiban.tunggakan,
        total_seharusnya: kewajiban.total_seharusnya,
        minggu_wajib: kewajiban.minggu_wajib,
        minggu_terbayar: kewajiban.minggu_terbayar,
        detail_tunggakan: kewajiban.detail_tunggakan,
        riwayat,
      };
    });

    return Response.json({
      tahun_aktif: tahunAktif,
      iuran_mingguan: IURAN_MINGGUAN,
      warga,
    });
  } catch (err) {
    console.error("PUBLIC WARGA ERROR:", err);

    return Response.json(
      {
        message: "Gagal mengambil data warga publik",
        error: err.message,
      },
      { status: 500 }
    );
  }
}
