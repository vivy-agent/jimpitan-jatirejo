"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

type ReportType = "ringkas" | "setoran" | "lengkap";

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>("setoran");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const formatTanggalInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const setTanggalBulanIni = (tahun = tahunAktif) => {
    const now = new Date();

    if (tahun === now.getFullYear()) {
      const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
      setStart(formatTanggalInput(awalBulan));
      setEnd(formatTanggalInput(now));
      return;
    }

    setStart(`${tahun}-01-01`);
    setEnd(`${tahun}-01-31`);
  };

  const setTanggalTahunAktif = (tahun = tahunAktif) => {
    const now = new Date();

    setStart(`${tahun}-01-01`);

    if (tahun === now.getFullYear()) {
      setEnd(formatTanggalInput(now));
    } else {
      setEnd(`${tahun}-12-31`);
    }
  };

  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const res = await fetch("/api/periode", {
          cache: "no-store",
        });

        const data = await res.json();
        const tahun = Number(data?.tahun_aktif) || new Date().getFullYear();

        setTahunAktif(tahun);
        setTanggalBulanIni(tahun);
      } catch (err) {
        const tahun = new Date().getFullYear();

        setTahunAktif(tahun);
        setTanggalBulanIni(tahun);
      }
    };

    fetchPeriode();
  }, []);

  const reportInfo = useMemo(() => {
    if (reportType === "ringkas") {
      return {
        title: "Laporan Ringkas",
        desc: "Cocok untuk melihat kondisi umum pemasukan dan kas secara cepat.",
        icon: "▣",
      };
    }

    if (reportType === "lengkap") {
      return {
        title: "Laporan Lengkap",
        desc: "Berisi ringkasan, rekap petugas, transaksi, dan warga menunggak.",
        icon: "≡",
      };
    }

    return {
      title: "Laporan Setoran Petugas",
      desc: "Cocok untuk rapat Karang Taruna dan pengecekan setoran bendahara.",
      icon: "◎",
    };
  }, [reportType]);

  const handleDownload = async () => {
    if (!start || !end) {
      alert("Pilih tanggal laporan terlebih dahulu");
      return;
    }

    if (new Date(start) > new Date(end)) {
      alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        start,
        end,
        type: reportType,
      });

      const res = await fetch(`/api/admin/report?${params.toString()}`, {
        cache: "no-store",
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const err = await res.json();
          alert(err.message || "Gagal membuat laporan");
        } else {
          alert("Gagal membuat laporan");
        }

        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${reportType}-${start}_sd_${end}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Gagal download PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        {/* HEADER */}
        <div className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => (window.location.href = "/admin")}
          >
            ←
          </button>

          <div className="header-text">
            <p>Periode {tahunAktif}</p>
            <h1>Report PDF</h1>
          </div>

          <div className="report-badge">PDF</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Jenis Laporan</p>
              <h2>{reportInfo.title}</h2>
              <span>{reportInfo.desc}</span>
            </div>

            <div className="hero-icon">{reportInfo.icon}</div>
          </div>
        </div>

        {/* TYPE SELECTOR */}
        <div className="type-card">
          <div className="section-title">
            <div>
              <p>Format</p>
              <h3>Pilih Kebutuhan Laporan</h3>
            </div>
          </div>

          <div className="type-grid">
            <button
              type="button"
              className={reportType === "ringkas" ? "active" : ""}
              onClick={() => setReportType("ringkas")}
            >
              <span>▣</span>
              <strong>Ringkas</strong>
              <small>Ikhtisar cepat</small>
            </button>

            <button
              type="button"
              className={reportType === "setoran" ? "active" : ""}
              onClick={() => setReportType("setoran")}
            >
              <span>◎</span>
              <strong>Setoran</strong>
              <small>Rekap petugas</small>
            </button>

            <button
              type="button"
              className={reportType === "lengkap" ? "active" : ""}
              onClick={() => setReportType("lengkap")}
            >
              <span>≡</span>
              <strong>Lengkap</strong>
              <small>Arsip detail</small>
            </button>
          </div>
        </div>

        {/* DATE FILTER */}
        <div className="filter-card">
          <div className="section-title">
            <div>
              <p>Rentang Tanggal</p>
              <h3>Periode Laporan</h3>
            </div>
          </div>

          <div className="quick-row">
            <button type="button" onClick={() => setTanggalBulanIni()}>
              Bulan Ini
            </button>

            <button type="button" onClick={() => setTanggalTahunAktif()}>
              Tahun Aktif
            </button>
          </div>

          <div className="date-grid">
            <div>
              <label>Tanggal Mulai</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>

            <div>
              <label>Tanggal Akhir</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* INFO */}
        <div className="info-card">
          <div>ℹ️</div>
          <p>
            Laporan mengikuti periode aktif sistem. Data warga, QR, dan akun
            petugas tidak berubah. Transaksi akan difilter berdasarkan tanggal
            yang dipilih dan tahun aktif.
          </p>
        </div>

        {/* DOWNLOAD */}
        <button
          type="button"
          className="download-btn"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? "Membuat PDF..." : "Download PDF"}
        </button>
      </div>

      <BottomNav />

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 20px;
          padding-bottom: 120px;
          background: #f4f8ff;
          background-image: radial-gradient(
            rgba(37, 99, 235, 0.05) 1px,
            transparent 1px
          );
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
          background: linear-gradient(
            180deg,
            #0f6fff 0%,
            #1677ff 70%,
            rgba(22, 119, 255, 0.04) 100%
          );
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
          color: #ffffff;
          font-size: 21px;
          font-weight: 900;
        }

        .report-badge {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .hero-card,
        .type-card,
        .filter-card,
        .info-card {
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
          align-items: flex-start;
          justify-content: space-between;
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
          letter-spacing: -0.4px;
        }

        .hero-card span {
          display: block;
          margin-top: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
        }

        .hero-icon {
          width: 50px;
          height: 50px;
          border-radius: 18px;
          background: #eaf4ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .type-card,
        .filter-card,
        .info-card {
          margin-top: 14px;
          padding: 17px;
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

        .type-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .type-grid button {
          border: 1px solid #eef2f7;
          background: #f8fafc;
          border-radius: 18px;
          padding: 12px 8px;
          color: #111827;
          cursor: pointer;
          text-align: center;
        }

        .type-grid button.active {
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          border-color: #1677ff;
          box-shadow: 0 10px 24px rgba(22, 119, 255, 0.2);
        }

        .type-grid span {
          display: block;
          font-size: 19px;
          font-weight: 900;
        }

        .type-grid strong {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 900;
        }

        .type-grid small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.3;
        }

        .type-grid button.active small {
          color: rgba(255, 255, 255, 0.78);
        }

        .quick-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .quick-row button {
          border: none;
          border-radius: 999px;
          padding: 11px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .date-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        input {
          width: 100%;
          padding: 12px;
          border-radius: 15px;
          border: 1px solid #dbe4f0;
          background: #f9fbff;
          color: #111827;
          font-size: 12px;
          font-weight: 800;
          outline: none;
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #eff6ff;
          border-color: #dbeafe;
        }

        .info-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          font-weight: 700;
        }

        .download-btn {
          position: relative;
          z-index: 2;
          width: 100%;
          margin-top: 14px;
          padding: 15px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(180deg, #111827, #1f2937);
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
        }

        .download-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
