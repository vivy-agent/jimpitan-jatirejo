"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import BottomNav from "@/components/BottomNav";

const IURAN_MINGGUAN = 2000;

export default function DetailWargaPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [warga, setWarga] = useState<any>(null);
  const [histori, setHistori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());

  const [summary, setSummary] = useState({
    totalBayar: 0,
    tunggakan: 0,
    seharusnya: 0,
    mingguWajib: 0,
    mingguTerbayar: 0,
  });

  const [detailTunggakan, setDetailTunggakan] = useState<any[]>([]);
  const [showAllTunggakan, setShowAllTunggakan] = useState(false);

  // ================= FORMAT =================
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const formatTanggal = (value: any) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTanggalJam = (value: any) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tambahHari = (date: Date, jumlahHari: number) => {
    const hasil = new Date(date);
    hasil.setDate(hasil.getDate() + jumlahHari);
    return hasil;
  };

  // ================= PERIODE =================
  const getPeriodeAktif = async () => {
    try {
      const res = await fetch("/api/periode", {
        cache: "no-store",
      });

      const data = await res.json();
      const tahun = Number(data?.tahun_aktif) || new Date().getFullYear();

      setTahunAktif(tahun);
      return tahun;
    } catch (err) {
      const tahun = new Date().getFullYear();

      setTahunAktif(tahun);
      return tahun;
    }
  };

  // ================= HITUNG KEWAJIBAN =================
  const hitungKewajibanPeriode = (
    dataWarga: any,
    totalBayar: number,
    tahun: number
  ) => {
    const mulaiWarga = new Date(dataWarga.tanggal_mulai);
    const sekarang = new Date();
    const tahunSekarang = sekarang.getFullYear();

    const awalPeriode = new Date(tahun, 0, 1);

    let akhirPeriode: Date;

    if (tahun < tahunSekarang) {
      akhirPeriode = new Date(tahun, 11, 31, 23, 59, 59);
    } else if (tahun === tahunSekarang) {
      akhirPeriode = sekarang;
    } else {
      // Tahun depan belum berjalan, jadi belum ada kewajiban.
      akhirPeriode = new Date(tahun, 0, 1);
    }

    const mulaiHitung = mulaiWarga > awalPeriode ? mulaiWarga : awalPeriode;
    const periodeSudahBerjalan = tahun <= tahunSekarang;

    if (akhirPeriode < mulaiHitung) {
      return {
        mingguWajib: 0,
        mingguTerbayar: Math.floor(totalBayar / IURAN_MINGGUAN),
        tunggakan: 0,
        totalSeharusnya: 0,
        detail: [],
      };
    }

    const selisihMinggu = Math.floor(
      (akhirPeriode.getTime() - mulaiHitung.getTime()) /
        (1000 * 60 * 60 * 24 * 7)
    );

    let mingguWajib = selisihMinggu;

    // FIX warga baru:
    // Tetap mengikuti alur lama: jika belum genap 7 hari dan belum bayar,
    // warga muncul 1x tagihan.
    if (mingguWajib <= 0 && periodeSudahBerjalan && totalBayar === 0) {
      const selisihHari = Math.floor(
        (akhirPeriode.getTime() - mulaiHitung.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (selisihHari < 7) {
        mingguWajib = 1;
      }
    }

    const mingguTerbayar = Math.floor(totalBayar / IURAN_MINGGUAN);
    const tunggakan = Math.max(0, mingguWajib - mingguTerbayar);
    const totalSeharusnya = mingguWajib * IURAN_MINGGUAN;

    // Catatan:
    // Karena transaksi belum menyimpan minggu ke berapa yang dibayar,
    // sistem memakai logika FIFO: pembayaran dianggap melunasi minggu paling awal.
    const detail = [];

    for (let minggu = mingguTerbayar + 1; minggu <= mingguWajib; minggu++) {
      const tanggalAwal = tambahHari(mulaiHitung, (minggu - 1) * 7);
      const tanggalAkhir = tambahHari(tanggalAwal, 6);

      detail.push({
        minggu_ke: minggu,
        tanggal_awal: tanggalAwal,
        tanggal_akhir: tanggalAkhir,
        nominal: IURAN_MINGGUAN,
      });
    }

    return {
      mingguWajib,
      mingguTerbayar,
      tunggakan,
      totalSeharusnya,
      detail,
    };
  };

  // ================= DOWNLOAD QR =================
  const handleDownloadQR = async () => {
    if (!warga) {
      alert("Data warga belum siap");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        alert("Canvas tidak tersedia");
        return;
      }

      const width = 340;
      const height = 470;

      canvas.width = width;
      canvas.height = height;

      const qrData = `JTR-${warga.kode_unik}`;
      const qrBase64 = await QRCode.toDataURL(qrData);

      const img = new Image();
      img.src = qrBase64;

      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#1677ff";
        ctx.fillRect(0, 0, width, 120);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("KARTU WARGA", width / 2, 45);

        ctx.font = "bold 22px sans-serif";
        ctx.fillText(warga.nama, width / 2, 88);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(45, 145, 250, 250);

        ctx.drawImage(img, 70, 170, 200, 200);

        ctx.fillStyle = "#111827";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`JTR-${warga.kode_unik}`, width / 2, 445);

        const link = document.createElement("a");

        link.download = `JTR-${warga.nama}-${warga.kode_unik}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
    } catch (err) {
      console.error(err);
      alert("Gagal download QR");
    }
  };

  // ================= FETCH =================
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const periode = await getPeriodeAktif();

        const res = await fetch("/api/warga/list", {
          cache: "no-store",
        });

        const data = await res.json();

        const found = Array.isArray(data)
          ? data.find((w: any) => String(w.id) === String(id))
          : null;

        setWarga(found);

        if (!found) return;

        // TOTAL PERIODE AKTIF
        const resTotal = await fetch(
          `/api/transaksi/total?nama=${encodeURIComponent(found.nama)}`,
          { cache: "no-store" }
        );

        const totalData = await resTotal.json();
        const totalBayar = Number(totalData.total || 0);

        const kewajiban = hitungKewajibanPeriode(found, totalBayar, periode);

        setSummary({
          totalBayar,
          tunggakan: kewajiban.tunggakan,
          seharusnya: kewajiban.totalSeharusnya,
          mingguWajib: kewajiban.mingguWajib,
          mingguTerbayar: kewajiban.mingguTerbayar,
        });

        setDetailTunggakan(kewajiban.detail);

        // HISTORI PERIODE AKTIF
        const resHistori = await fetch(
          `/api/transaksi/by-warga?nama=${encodeURIComponent(found.nama)}`,
          { cache: "no-store" }
        );

        const dataHistori = await resHistori.json();

        setHistori(Array.isArray(dataHistori) ? dataHistori : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const statusWarga = warga?.status || "aktif";
  const isAktif = statusWarga === "aktif" || !warga?.status;

  const tunggakanCompact = useMemo(() => {
    if (showAllTunggakan) return detailTunggakan;

    return detailTunggakan.slice(0, 4);
  }, [detailTunggakan, showAllTunggakan]);

  if (loading || !warga) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat detail warga...</p>

        <style jsx>{loadingStyle}</style>
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        {/* HEADER */}
        <div className="header">
          <button type="button" className="back-btn" onClick={() => router.back()}>
            ←
          </button>

          <div className="header-text">
            <p>Periode {tahunAktif}</p>
            <h1>Detail Warga</h1>
          </div>

          <div className={isAktif ? "status-badge aktif" : "status-badge nonaktif"}>
            {statusWarga}
          </div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Data Warga</p>
              <h2>{warga.nama}</h2>
              <span>JTR-{warga.kode_unik}</span>
            </div>

            <button type="button" className="qr-small-btn" onClick={handleDownloadQR}>
              QR
            </button>
          </div>

          <div className="meta-grid">
            <div>
              <p>Tanggal Mulai</p>
              <strong>{formatTanggal(warga.tanggal_mulai)}</strong>
            </div>

            <div>
              <p>Iuran</p>
              <strong>{formatRupiah(IURAN_MINGGUAN)} / minggu</strong>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="summary-grid">
          <div className="summary-card primary">
            <p>Total Bayar</p>
            <h3>{formatRupiah(summary.totalBayar)}</h3>
          </div>

          <div className="summary-card">
            <p>Tunggakan</p>
            <h3 className={summary.tunggakan > 0 ? "red-text" : "green-text"}>
              {summary.tunggakan}x
            </h3>
          </div>

          <div className="summary-card">
            <p>Seharusnya</p>
            <h3>{formatRupiah(summary.seharusnya)}</h3>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="card">
          <div className="section-title">
            <div>
              <p>Ringkasan Periode</p>
              <h3>Progress Pembayaran</h3>
            </div>
          </div>

          <div className="progress-row">
            <div>
              <span>Minggu wajib</span>
              <strong>{summary.mingguWajib} minggu</strong>
            </div>

            <div>
              <span>Sudah dibayar</span>
              <strong>{summary.mingguTerbayar} minggu</strong>
            </div>
          </div>

          <div className="progress-bg">
            <div
              className="progress-fill"
              style={{
                width:
                  summary.mingguWajib > 0
                    ? `${Math.min(
                        (summary.mingguTerbayar / summary.mingguWajib) * 100,
                        100
                      )}%`
                    : "0%",
              }}
            />
          </div>
        </div>

        {/* DETAIL TUNGGAKAN */}
        <div className="card">
          <div className="section-title">
            <div>
              <p>Informasi Tunggakan</p>
              <h3>Minggu Belum Terbayar</h3>
            </div>

            <span className="count-badge">{detailTunggakan.length}</span>
          </div>

          {detailTunggakan.length === 0 ? (
            <div className="empty-box">
              <div>✅</div>
              <h4>Tidak ada tunggakan</h4>
              <p>Semua kewajiban pada periode {tahunAktif} sudah aman.</p>
            </div>
          ) : (
            <>
              <div className="tunggakan-list">
                {tunggakanCompact.map((item) => (
                  <div key={item.minggu_ke} className="tunggakan-item">
                    <div className="week-pill">M{item.minggu_ke}</div>

                    <div>
                      <h4>
                        {formatTanggal(item.tanggal_awal)} -{" "}
                        {formatTanggal(item.tanggal_akhir)}
                      </h4>
                      <p>{formatRupiah(item.nominal)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {detailTunggakan.length > 4 && (
                <button
                  type="button"
                  className="show-more-btn"
                  onClick={() => setShowAllTunggakan(!showAllTunggakan)}
                >
                  {showAllTunggakan
                    ? "Tampilkan lebih sedikit"
                    : `Lihat semua ${detailTunggakan.length} minggu`}
                </button>
              )}
            </>
          )}
        </div>

        {/* HISTORI */}
        <div className="card">
          <div className="section-title">
            <div>
              <p>Aktivitas</p>
              <h3>Histori Pembayaran</h3>
            </div>

            <span className="count-badge">{histori.length}</span>
          </div>

          {histori.length === 0 ? (
            <div className="empty-box">
              <div>📭</div>
              <h4>Belum ada transaksi</h4>
              <p>Belum ada pembayaran pada periode {tahunAktif}.</p>
            </div>
          ) : (
            <div className="histori-list">
              {histori.map((trx, i) => (
                <div key={trx.id || i} className="histori-item">
                  <div>
                    <h4>{formatRupiah(Number(trx.jumlah || 0))}</h4>
                    <p>{formatTanggalJam(trx.tanggal)}</p>
                  </div>

                  <span>{trx.admin_name || "Admin"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sticky-wrap">
        <button type="button" onClick={() => router.push("/admin/iuran")}>
          ← Kembali ke Iuran
        </button>
      </div>

      <BottomNav />

      <style jsx>{pageStyle}</style>
    </>
  );
}

const loadingStyle = `
  .loading-page {
    min-height: 100vh;
    background: #f4f8ff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #64748b;
    font-size: 14px;
    font-weight: 800;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 4px solid #dbeafe;
    border-top-color: #1677ff;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const pageStyle = `
  .page {
    min-height: 100vh;
    padding: 20px;
    padding-bottom: 145px;
    background: #f4f8ff;
    background-image: radial-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px);
    background-size: 18px 18px;
    color: #111827;
    position: relative;
    overflow: hidden;
  }

  .blue-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 210px;
    background: linear-gradient(180deg, #0f6fff 0%, #1677ff 70%, rgba(22, 119, 255, 0.04) 100%);
    border-bottom-left-radius: 34px;
    border-bottom-right-radius: 34px;
    z-index: 0;
  }

  .header {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .back-btn {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
    font-size: 22px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .header-text {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .header-text p {
    margin: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.78);
    font-weight: 800;
  }

  .header-text h1 {
    margin: 2px 0 0;
    font-size: 21px;
    color: #ffffff;
    font-weight: 900;
  }

  .status-badge {
    padding: 8px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    text-transform: capitalize;
    flex-shrink: 0;
  }

  .status-badge.aktif {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  .status-badge.nonaktif {
    background: rgba(255, 255, 255, 0.18);
    color: #fee2e2;
  }

  .hero-card,
  .card {
    position: relative;
    z-index: 2;
    background: #ffffff;
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  }

  .hero-card {
    margin-top: 22px;
    padding: 18px;
    box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
  }

  .hero-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
  }

  .mini-title {
    margin: 0;
    color: #1677ff;
    font-size: 12px;
    font-weight: 900;
  }

  .hero-card h2 {
    margin: 5px 0 0;
    color: #111827;
    font-size: 24px;
    line-height: 1.15;
    font-weight: 900;
  }

  .hero-card span {
    display: inline-flex;
    margin-top: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 11px;
    font-weight: 900;
  }

  .qr-small-btn {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 18px;
    background: linear-gradient(180deg, #22c55e, #16a34a);
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    flex-shrink: 0;
  }

  .meta-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .meta-grid div,
  .summary-card,
  .progress-row div {
    padding: 12px;
    border-radius: 17px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
  }

  .meta-grid p,
  .summary-card p,
  .progress-row span {
    margin: 0;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .meta-grid strong,
  .progress-row strong {
    display: block;
    margin-top: 5px;
    color: #111827;
    font-size: 13px;
    font-weight: 900;
  }

  .summary-grid {
    position: relative;
    z-index: 2;
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 0.8fr 1fr;
    gap: 10px;
  }

  .summary-card.primary {
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    color: #ffffff;
    border: none;
  }

  .summary-card.primary p {
    color: rgba(255, 255, 255, 0.78);
  }

  .summary-card h3 {
    margin: 6px 0 0;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
    line-height: 1.25;
  }

  .summary-card.primary h3 {
    color: #ffffff;
  }

  .green-text {
    color: #16a34a !important;
  }

  .red-text {
    color: #dc2626 !important;
  }

  .card {
    margin-top: 14px;
    padding: 17px;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .section-title p {
    margin: 0;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .section-title h3 {
    margin: 4px 0 0;
    color: #111827;
    font-size: 17px;
    font-weight: 900;
  }

  .count-badge {
    min-width: 34px;
    height: 34px;
    border-radius: 14px;
    background: #eff6ff;
    color: #1677ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 900;
  }

  .progress-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .progress-bg {
    margin-top: 12px;
    height: 9px;
    border-radius: 999px;
    background: #e8eefb;
    overflow: hidden;
  }

  .progress-fill {
    height: 9px;
    border-radius: 999px;
    background: linear-gradient(90deg, #1677ff, #38bdf8);
  }

  .empty-box {
    margin-top: 14px;
    padding: 22px 12px;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    text-align: center;
  }

  .empty-box div {
    font-size: 24px;
  }

  .empty-box h4 {
    margin: 7px 0 0;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
  }

  .empty-box p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }

  .tunggakan-list,
  .histori-list {
    margin-top: 14px;
    display: grid;
    gap: 9px;
  }

  .tunggakan-item {
    padding: 12px;
    border-radius: 18px;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .week-pill {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: #ffedd5;
    color: #ea580c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .tunggakan-item h4 {
    margin: 0;
    color: #111827;
    font-size: 13px;
    font-weight: 900;
  }

  .tunggakan-item p {
    margin: 4px 0 0;
    color: #ea580c;
    font-size: 12px;
    font-weight: 900;
  }

  .show-more-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    border: none;
    border-radius: 999px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .histori-item {
    padding: 13px;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .histori-item h4 {
    margin: 0;
    color: #111827;
    font-size: 14px;
    font-weight: 900;
  }

  .histori-item p {
    margin: 4px 0 0;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 700;
  }

  .histori-item span {
    padding: 7px 10px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .sticky-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 72px;
    z-index: 998;
    padding: 10px 16px;
    background: linear-gradient(180deg, transparent, rgba(244, 248, 255, 0.96));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .sticky-wrap button {
    width: 100%;
    padding: 14px;
    border-radius: 18px;
    border: none;
    background: linear-gradient(180deg, #111827, #1f2937);
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  }
`;
