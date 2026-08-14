import db from "@/lib/db";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const type = searchParams.get("type") || "setoran";

    if (!start || !end) {
      return Response.json(
        { message: "Tanggal tidak valid" },
        { status: 400 }
      );
    }

    if (!["ringkas", "setoran", "lengkap"].includes(type)) {
      return Response.json(
        { message: "Jenis laporan tidak valid" },
        { status: 400 }
      );
    }

    const tahunAktif = await getTahunAktif();

    // ================= DATA TRANSAKSI =================
    const [transaksi] = await db.query(
      `
      SELECT
        id,
        nama_warga,
        jumlah,
        tanggal,
        admin_name,
        admin_email
      FROM transaksi
      WHERE DATE(tanggal) BETWEEN ? AND ?
      AND YEAR(tanggal) = ?
      ORDER BY tanggal ASC, id ASC
      `,
      [start, end, tahunAktif]
    );

    // ================= REKAP SETORAN PETUGAS =================
    const [rekapPetugas] = await db.query(
      `
      SELECT
        COALESCE(admin_name, 'Tidak diketahui') AS admin_name,
        COALESCE(admin_email, '-') AS admin_email,
        COUNT(*) AS jumlah_transaksi,
        COALESCE(SUM(jumlah), 0) AS total_setoran,
        MIN(tanggal) AS tanggal_awal,
        MAX(tanggal) AS tanggal_akhir
      FROM transaksi
      WHERE DATE(tanggal) BETWEEN ? AND ?
      AND YEAR(tanggal) = ?
      GROUP BY admin_name, admin_email
      ORDER BY total_setoran DESC, admin_name ASC
      `,
      [start, end, tahunAktif]
    );

    // ================= DATA KAS =================
    const [kasMasukManualRows] = await db.query(
      `
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pemasukan'
      `
    );

    const [kasKeluarRows] = await db.query(
      `
      SELECT COALESCE(SUM(nominal), 0) AS total
      FROM kas
      WHERE jenis = 'pengeluaran'
      `
    );

    const [totalJimpitanRows] = await db.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM transaksi
      `
    );

    const totalJimpitanSemuaWaktu = Number(totalJimpitanRows[0]?.total || 0);
    const totalKasManualMasuk = Number(kasMasukManualRows[0]?.total || 0);
    const totalKasKeluar = Number(kasKeluarRows[0]?.total || 0);

    const saldoKasBerjalan =
      totalJimpitanSemuaWaktu + totalKasManualMasuk - totalKasKeluar;

    const totalPemasukan = transaksi.reduce(
      (total, item) => total + Number(item.jumlah || 0),
      0
    );

    const totalTransaksi = transaksi.length;

    // ================= DATA TUNGGAKAN UNTUK LAPORAN LENGKAP =================
    let wargaMenunggak = [];

    if (type === "lengkap") {
      const [wargaRows] = await db.query(`
        SELECT id, nama, kode_unik, tanggal_mulai, status
        FROM warga
        WHERE status IS NULL
        OR status = ''
        OR status = 'aktif'
        ORDER BY nama ASC
      `);

      const [bayarRows] = await db.query(
        `
        SELECT nama_warga, COALESCE(SUM(jumlah), 0) AS total_bayar
        FROM transaksi
        WHERE YEAR(tanggal) = ?
        GROUP BY nama_warga
        `,
        [tahunAktif]
      );

      const totalBayarMap = {};

      bayarRows.forEach((item) => {
        totalBayarMap[item.nama_warga] = Number(item.total_bayar || 0);
      });

      wargaMenunggak = wargaRows
        .map((warga) => {
          const totalBayar = totalBayarMap[warga.nama] || 0;
          const tunggakan = hitungTunggakanPeriode(
            warga,
            totalBayar,
            tahunAktif
          );

          return {
            ...warga,
            total_bayar: totalBayar,
            tunggakan,
            nominal_tunggakan: tunggakan * 2000,
          };
        })
        .filter((warga) => warga.tunggakan > 0);
    }

    // ================= PDF SETUP =================
    const fontRegularCandidates = [
      path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"),
      "C:\\Windows\\Fonts\\arial.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ];

    const fontBoldCandidates = [
      path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"),
      "C:\\Windows\\Fonts\\arialbd.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ];

    const fontRegular = fontRegularCandidates.find((item) =>
      fs.existsSync(item)
    );

    const fontBold =
      fontBoldCandidates.find((item) => fs.existsSync(item)) || fontRegular;

    if (!fontRegular) {
      return Response.json(
        {
          message:
            "Font PDF tidak ditemukan. Tambahkan file Roboto-Regular.ttf ke folder public/fonts.",
        },
        { status: 500 }
      );
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      bufferPages: true,
      font: fontRegular,
    });

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));

    const pdfBufferPromise = new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    const blue = "#1677ff";
    const dark = "#111827";
    const gray = "#64748b";
    const lightGray = "#f1f5f9";
    const border = "#dbe4f0";
    const green = "#16a34a";
    const red = "#dc2626";

    const formatRupiah = (num) =>
      `Rp ${Number(num || 0).toLocaleString("id-ID")}`;

    const formatTanggal = (tgl) =>
      new Date(tgl).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const formatTanggalJam = (tgl) =>
      new Date(tgl).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const safeText = (value) => String(value ?? "-");

    const ensureSpace = (height = 70) => {
      if (doc.y + height > pageHeight - 58) {
        doc.addPage();
      }
    };

    const sectionTitle = (subtitle, title) => {
      ensureSpace(56);

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor(gray)
        .text(String(subtitle).toUpperCase(), margin, doc.y);

      doc
        .moveDown(0.15)
        .font(fontBold)
        .fontSize(13)
        .fillColor(dark)
        .text(title, margin, doc.y);

      doc.moveDown(0.55);
    };

    const summaryBox = (x, y, w, h, label, value, color = dark) => {
      doc
        .roundedRect(x, y, w, h, 12)
        .fillAndStroke(lightGray, border);

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor(gray)
        .text(label, x + 12, y + 12, {
          width: w - 24,
        });

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(color)
        .text(value, x + 12, y + 28, {
          width: w - 24,
        });
    };

    const drawHeader = () => {
      doc.rect(0, 0, pageWidth, 110).fill(blue);

      doc
        .font(fontBold)
        .fontSize(18)
        .fillColor("#ffffff")
        .text("LAPORAN JIMPITAN DESA JATIREJO", margin, 30, {
          width: contentWidth,
          align: "center",
        });

      const jenisLabel =
        type === "ringkas"
          ? "Laporan Ringkas"
          : type === "lengkap"
          ? "Laporan Lengkap"
          : "Laporan Setoran Petugas";

      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor("#eaf4ff")
        .text(
          `${jenisLabel} | Periode aktif ${tahunAktif} | ${formatTanggal(
            start
          )} - ${formatTanggal(end)}`,
          margin,
          58,
          {
            width: contentWidth,
            align: "center",
          }
        );

      doc
        .roundedRect(pageWidth / 2 - 72, 78, 144, 22, 11)
        .fill("#ffffff");

      doc
        .font(fontBold)
        .fontSize(9)
        .fillColor(blue)
        .text("KARANG TARUNA", pageWidth / 2 - 72, 84, {
          width: 144,
          align: "center",
        });

      doc.y = 132;
    };

    const drawFooter = () => {
      const pages = doc.bufferedPageRange();

      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        doc
          .moveTo(margin, pageHeight - 42)
          .lineTo(pageWidth - margin, pageHeight - 42)
          .lineWidth(0.5)
          .strokeColor(border)
          .stroke();

        doc
          .font(fontRegular)
          .fontSize(8)
          .fillColor(gray)
          .text(
            `Dicetak otomatis oleh Sistem Jimpitan | ${formatTanggalJam(
              new Date()
            )}`,
            margin,
            pageHeight - 32,
            {
              width: contentWidth / 2,
            }
          );

        doc
          .font(fontRegular)
          .fontSize(8)
          .fillColor(gray)
          .text(`Halaman ${i + 1} dari ${pages.count}`, margin, pageHeight - 32, {
            width: contentWidth,
            align: "right",
          });
      }
    };

    const drawMainSummary = () => {
      sectionTitle("Ringkasan", "Ikhtisar Laporan");

      const boxGap = 10;
      const boxW = (contentWidth - boxGap * 2) / 3;
      const y = doc.y;

      summaryBox(
        margin,
        y,
        boxW,
        58,
        "Total Pemasukan",
        formatRupiah(totalPemasukan),
        green
      );

      summaryBox(
        margin + boxW + boxGap,
        y,
        boxW,
        58,
        "Total Transaksi",
        `${totalTransaksi} transaksi`,
        dark
      );

      summaryBox(
        margin + (boxW + boxGap) * 2,
        y,
        boxW,
        58,
        "Saldo Kas Berjalan",
        formatRupiah(saldoKasBerjalan),
        blue
      );

      doc.y = y + 76;
    };

    const drawPetugasTable = () => {
      sectionTitle("Setoran", "Rekap Setoran Setiap Petugas");

      if (rekapPetugas.length === 0) {
        const yBox = doc.y;

        doc
          .roundedRect(margin, yBox, contentWidth, 40, 10)
          .fillAndStroke(lightGray, border);

        doc
          .font(fontRegular)
          .fontSize(9)
          .fillColor(gray)
          .text("Belum ada transaksi pada rentang tanggal ini.", margin + 12, yBox + 14, {
            width: contentWidth - 24,
          });

        doc.y = yBox + 56;
        return;
      }

      const tableX = margin;
      const tableW = contentWidth;
      const headerH = 26;
      const rowH = 30;

      const cols = {
        no: { x: tableX + 10, w: 28, label: "No" },
        petugas: { x: tableX + 42, w: 162, label: "Nama Petugas" },
        trx: { x: tableX + 210, w: 68, label: "Transaksi" },
        tanggal: { x: tableX + 284, w: 130, label: "Rentang Tanggal" },
        total: { x: tableX + 420, w: 96, label: "Total Setoran" },
      };

      ensureSpace(headerH + rowH + 12);

      let y = doc.y;

      doc.roundedRect(tableX, y, tableW, headerH, 8).fill(blue);

      doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
      doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
      doc.text(cols.petugas.label, cols.petugas.x, y + 9, { width: cols.petugas.w });
      doc.text(cols.trx.label, cols.trx.x, y + 9, {
        width: cols.trx.w,
        align: "center",
      });
      doc.text(cols.tanggal.label, cols.tanggal.x, y + 9, {
        width: cols.tanggal.w,
      });
      doc.text(cols.total.label, cols.total.x, y + 9, {
        width: cols.total.w,
        align: "right",
      });

      y += headerH;

      rekapPetugas.forEach((item, index) => {
        if (y + rowH > pageHeight - 58) {
          doc.addPage();
          y = margin;

          doc.roundedRect(tableX, y, tableW, headerH, 8).fill(blue);

          doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
          doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
          doc.text(cols.petugas.label, cols.petugas.x, y + 9, { width: cols.petugas.w });
          doc.text(cols.trx.label, cols.trx.x, y + 9, {
            width: cols.trx.w,
            align: "center",
          });
          doc.text(cols.tanggal.label, cols.tanggal.x, y + 9, {
            width: cols.tanggal.w,
          });
          doc.text(cols.total.label, cols.total.x, y + 9, {
            width: cols.total.w,
            align: "right",
          });

          y += headerH;
        }

        const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

        doc.rect(tableX, y, tableW, rowH).fill(bg);

        doc
          .moveTo(tableX, y + rowH)
          .lineTo(tableX + tableW, y + rowH)
          .lineWidth(0.35)
          .strokeColor(border)
          .stroke();

        const rentang =
          item.tanggal_awal && item.tanggal_akhir
            ? `${formatTanggal(item.tanggal_awal)} - ${formatTanggal(item.tanggal_akhir)}`
            : "-";

        doc.font(fontRegular).fontSize(7.8).fillColor(dark);

        doc.text(index + 1, cols.no.x, y + 10, {
          width: cols.no.w,
        });

        doc.text(safeText(item.admin_name), cols.petugas.x, y + 7, {
          width: cols.petugas.w,
          height: 18,
          ellipsis: true,
        });

        doc.text(String(item.jumlah_transaksi), cols.trx.x, y + 10, {
          width: cols.trx.w,
          align: "center",
        });

        doc.text(rentang, cols.tanggal.x, y + 10, {
          width: cols.tanggal.w,
          ellipsis: true,
        });

        doc.font(fontBold).fontSize(8).fillColor(dark).text(
          formatRupiah(item.total_setoran),
          cols.total.x,
          y + 10,
          {
            width: cols.total.w,
            align: "right",
          }
        );

        y += rowH;
      });

      doc.y = y + 14;
    };

    const drawTransactions = () => {
      sectionTitle("Detail", "Daftar Transaksi Periode Laporan");

      if (transaksi.length === 0) {
        const yBox = doc.y;

        doc
          .roundedRect(margin, yBox, contentWidth, 40, 10)
          .fillAndStroke(lightGray, border);

        doc
          .font(fontRegular)
          .fontSize(9)
          .fillColor(gray)
          .text("Belum ada transaksi pada rentang tanggal ini.", margin + 12, yBox + 14, {
            width: contentWidth - 24,
          });

        doc.y = yBox + 56;
        return;
      }

      const tableX = margin;
      const tableW = contentWidth;
      const headerH = 26;
      const rowH = 30;

      const cols = {
        no: { x: tableX + 10, w: 26, label: "No" },
        warga: { x: tableX + 40, w: 142, label: "Nama Warga" },
        petugas: { x: tableX + 188, w: 128, label: "Petugas" },
        tanggal: { x: tableX + 322, w: 104, label: "Tanggal" },
        jumlah: { x: tableX + 432, w: 84, label: "Jumlah" },
      };

      ensureSpace(headerH + rowH + 12);

      let y = doc.y;

      doc.roundedRect(tableX, y, tableW, headerH, 8).fill(blue);

      doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
      doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
      doc.text(cols.warga.label, cols.warga.x, y + 9, { width: cols.warga.w });
      doc.text(cols.petugas.label, cols.petugas.x, y + 9, { width: cols.petugas.w });
      doc.text(cols.tanggal.label, cols.tanggal.x, y + 9, { width: cols.tanggal.w });
      doc.text(cols.jumlah.label, cols.jumlah.x, y + 9, {
        width: cols.jumlah.w,
        align: "right",
      });

      y += headerH;

      transaksi.forEach((item, index) => {
        if (y + rowH > pageHeight - 58) {
          doc.addPage();
          y = margin;

          doc.roundedRect(tableX, y, tableW, headerH, 8).fill(blue);

          doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
          doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
          doc.text(cols.warga.label, cols.warga.x, y + 9, { width: cols.warga.w });
          doc.text(cols.petugas.label, cols.petugas.x, y + 9, { width: cols.petugas.w });
          doc.text(cols.tanggal.label, cols.tanggal.x, y + 9, { width: cols.tanggal.w });
          doc.text(cols.jumlah.label, cols.jumlah.x, y + 9, {
            width: cols.jumlah.w,
            align: "right",
          });

          y += headerH;
        }

        const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

        doc.rect(tableX, y, tableW, rowH).fill(bg);

        doc
          .moveTo(tableX, y + rowH)
          .lineTo(tableX + tableW, y + rowH)
          .lineWidth(0.35)
          .strokeColor(border)
          .stroke();

        doc.font(fontRegular).fontSize(7.8).fillColor(dark);

        doc.text(index + 1, cols.no.x, y + 10, {
          width: cols.no.w,
        });

        doc.text(safeText(item.nama_warga), cols.warga.x, y + 7, {
          width: cols.warga.w,
          height: 18,
          ellipsis: true,
        });

        doc.text(safeText(item.admin_name), cols.petugas.x, y + 7, {
          width: cols.petugas.w,
          height: 18,
          ellipsis: true,
        });

        doc.text(formatTanggal(item.tanggal), cols.tanggal.x, y + 10, {
          width: cols.tanggal.w,
          ellipsis: true,
        });

        doc.font(fontBold).fontSize(8).fillColor(dark).text(
          formatRupiah(item.jumlah),
          cols.jumlah.x,
          y + 10,
          {
            width: cols.jumlah.w,
            align: "right",
          }
        );

        y += rowH;
      });

      doc.y = y + 14;
    };

    const drawWargaMenunggak = () => {
      sectionTitle("Tunggakan", "Daftar Warga Menunggak");

      if (wargaMenunggak.length === 0) {
        const yBox = doc.y;

        doc
          .roundedRect(margin, yBox, contentWidth, 40, 10)
          .fillAndStroke(lightGray, border);

        doc
          .font(fontRegular)
          .fontSize(9)
          .fillColor(gray)
          .text("Tidak ada warga menunggak pada periode aktif.", margin + 12, yBox + 14, {
            width: contentWidth - 24,
          });

        doc.y = yBox + 56;
        return;
      }

      const tableX = margin;
      const tableW = contentWidth;
      const headerH = 26;
      const rowH = 30;

      const cols = {
        no: { x: tableX + 10, w: 26, label: "No" },
        warga: { x: tableX + 40, w: 165, label: "Nama Warga" },
        kode: { x: tableX + 210, w: 95, label: "Kode QR" },
        tunggakan: { x: tableX + 310, w: 86, label: "Tunggakan" },
        nominal: { x: tableX + 402, w: 114, label: "Total Tunggakan" },
      };

      ensureSpace(headerH + rowH + 12);

      let y = doc.y;

      doc.roundedRect(tableX, y, tableW, headerH, 8).fill(red);

      doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
      doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
      doc.text(cols.warga.label, cols.warga.x, y + 9, { width: cols.warga.w });
      doc.text(cols.kode.label, cols.kode.x, y + 9, { width: cols.kode.w });
      doc.text(cols.tunggakan.label, cols.tunggakan.x, y + 9, {
        width: cols.tunggakan.w,
        align: "center",
      });
      doc.text(cols.nominal.label, cols.nominal.x, y + 9, {
        width: cols.nominal.w,
        align: "right",
      });

      y += headerH;

      wargaMenunggak.forEach((item, index) => {
        if (y + rowH > pageHeight - 58) {
          doc.addPage();
          y = margin;

          doc.roundedRect(tableX, y, tableW, headerH, 8).fill(red);

          doc.font(fontBold).fontSize(7.6).fillColor("#ffffff");
          doc.text(cols.no.label, cols.no.x, y + 9, { width: cols.no.w });
          doc.text(cols.warga.label, cols.warga.x, y + 9, { width: cols.warga.w });
          doc.text(cols.kode.label, cols.kode.x, y + 9, { width: cols.kode.w });
          doc.text(cols.tunggakan.label, cols.tunggakan.x, y + 9, {
            width: cols.tunggakan.w,
            align: "center",
          });
          doc.text(cols.nominal.label, cols.nominal.x, y + 9, {
            width: cols.nominal.w,
            align: "right",
          });

          y += headerH;
        }

        const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

        doc.rect(tableX, y, tableW, rowH).fill(bg);

        doc
          .moveTo(tableX, y + rowH)
          .lineTo(tableX + tableW, y + rowH)
          .lineWidth(0.35)
          .strokeColor(border)
          .stroke();

        doc.font(fontRegular).fontSize(7.8).fillColor(dark);

        doc.text(index + 1, cols.no.x, y + 10, {
          width: cols.no.w,
        });

        doc.text(safeText(item.nama), cols.warga.x, y + 7, {
          width: cols.warga.w,
          height: 18,
          ellipsis: true,
        });

        doc.text(`JTR-${item.kode_unik}`, cols.kode.x, y + 10, {
          width: cols.kode.w,
          ellipsis: true,
        });

        doc.text(`${item.tunggakan}x`, cols.tunggakan.x, y + 10, {
          width: cols.tunggakan.w,
          align: "center",
        });

        doc.font(fontBold).fontSize(8).fillColor(red).text(
          formatRupiah(item.nominal_tunggakan),
          cols.nominal.x,
          y + 10,
          {
            width: cols.nominal.w,
            align: "right",
          }
        );

        y += rowH;
      });

      doc.y = y + 14;
    };

    // ================= GENERATE PDF =================
    drawHeader();
    drawMainSummary();
    drawPetugasTable();

    if (type === "lengkap") {
      drawTransactions();
      drawWargaMenunggak();
    }

    if (type === "ringkas") {
      doc.moveDown(0.5);

      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor(gray)
        .text(
          "Catatan: laporan ringkas menampilkan ikhtisar dan rekap setoran petugas. Gunakan laporan lengkap untuk melihat detail transaksi dan tunggakan warga.",
          margin,
          doc.y,
          {
            width: contentWidth,
            align: "left",
          }
        );
    }

    if (type === "setoran") {
      doc.moveDown(0.5);

      doc
        .font(fontRegular)
        .fontSize(9)
        .fillColor(gray)
        .text(
          "Catatan: laporan ini digunakan untuk membantu bendahara memeriksa jumlah setoran masing-masing petugas pada rentang tanggal yang dipilih.",
          margin,
          doc.y,
          {
            width: contentWidth,
            align: "left",
          }
        );
    }

    drawFooter();

    doc.end();

    const pdfBuffer = await pdfBufferPromise;

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=laporan-${type}-${start}-sd-${end}.pdf`,
      },
    });
  } catch (err) {
    console.error("ERROR REPORT:", err);

    return Response.json(
      {
        message: "error report",
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}
