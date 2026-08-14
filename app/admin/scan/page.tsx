"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useSession } from "next-auth/react";

const IURAN_MINGGUAN = 2000;

export default function ScanPage() {
  const { data: session, status } = useSession();

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const [popup, setPopup] = useState<any>(null);

  const [lastScan, setLastScan] = useState("");
  const [scanLocked, setScanLocked] = useState(false);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  // ================= SOUND =================
  const playSound = () => {
    const audio = new Audio("/ting.mp3");
    audio.play().catch(() => {});
  };

  // ================= PROCESS SCAN =================
  const processScan = async (raw: string) => {
    if (!raw) return;

    if (raw === lastScan || loading || scanLocked || popup) {
      return;
    }

    setLastScan(raw);
    setLoading(true);
    setScanLocked(true);

    try {
      const res = await fetch("/api/transaksi/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kode: raw,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "QR tidak valid");

        setLoading(false);

        setTimeout(() => {
          setScanLocked(false);
          setLastScan("");
        }, 1500);

        return;
      }

      const warga = data.warga;

      if (warga?.status && warga.status !== "aktif") {
        alert("Warga ini sudah nonaktif");

        setLoading(false);

        setTimeout(() => {
          setScanLocked(false);
          setLastScan("");
        }, 1500);

        return;
      }

      playSound();

      const tunggakan = Number(data.tunggakan || 0);
      const isLunas = tunggakan === 0;

      setPopup({
        nama: warga.nama,
        kode: warga.kode_unik,
        tahunAktif: data.tahun_aktif || new Date().getFullYear(),
        tunggakan,
        maxBayar: tunggakan * IURAN_MINGGUAN,
        jumlah: tunggakan > 0 ? IURAN_MINGGUAN : IURAN_MINGGUAN,
        status: isLunas ? "lunas" : "tunggakan",
      });
    } catch (err) {
      console.error(err);
      alert("Gagal scan QR");

      setTimeout(() => {
        setScanLocked(false);
        setLastScan("");
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  // ================= HANDLE SCAN =================
  const handleScan = (result: any) => {
    if (Array.isArray(result)) {
      if (result.length > 0 && result[0]?.rawValue) {
        processScan(result[0].rawValue);
      }

      return;
    }

    if (result?.text) {
      processScan(result.text);
      return;
    }

    if (result?.rawValue) {
      processScan(result.rawValue);
    }
  };

  // ================= BAYAR =================
  const handleBayar = async () => {
    if (payLoading || !popup) return;

    if (status === "loading") {
      alert("Session masih dimuat");
      return;
    }

    if (!session?.user?.email) {
      alert("Session petugas tidak ditemukan. Silakan login ulang.");
      return;
    }

    try {
      setPayLoading(true);

      if (popup.jumlah % IURAN_MINGGUAN !== 0) {
        alert("Nominal harus kelipatan Rp2.000");
        setPayLoading(false);
        return;
      }

      if (popup.jumlah > popup.maxBayar) {
        alert("Nominal melebihi tunggakan");
        setPayLoading(false);
        return;
      }

      const adminName = session?.user?.name || "Petugas";
      const adminEmail = session?.user?.email || "";

      const res = await fetch("/api/transaksi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: popup.nama,
          jumlah: popup.jumlah,
          admin_name: adminName,
          admin_email: adminEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Gagal bayar");
        setPayLoading(false);
        return;
      }

      playSound();

      localStorage.setItem("lastPaidWarga", popup.nama);

      setPopup(null);
      setScanning(false);
      setLastScan("");
      setScanLocked(false);

      if (data?.data?.id) {
        window.location.href = `/admin/struk/${data.data.id}`;
      } else {
        alert("Pembayaran berhasil");
        window.location.href = "/admin/iuran";
      }
    } catch (err) {
      console.error(err);
      alert("Gagal bayar");
    } finally {
      setPayLoading(false);
    }
  };

  // ================= CLOSE =================
  const handleClosePopup = () => {
    setPopup(null);

    setTimeout(() => {
      setScanLocked(false);
      setLastScan("");
    }, 500);
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
            <p>Petugas Jimpitan</p>
            <h1>Scan QR</h1>
          </div>

          <div className="scan-badge">QR</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">QR Scanner</p>
              <h2>Scan Jimpitan</h2>
              <span>
                Scan QR warga untuk validasi pembayaran dan mencatat nama
                petugas secara otomatis.
              </span>
            </div>

            <div className="hero-icon">▦</div>
          </div>

          <div className="petugas-box">
            <p>Petugas Login</p>
            <strong>{session?.user?.name || "Memuat petugas..."}</strong>
            <small>{session?.user?.email || "-"}</small>
          </div>
        </div>

        {/* SCANNER CARD */}
        <div className="scanner-card">
          {!scanning && !popup ? (
            <button
              type="button"
              className="camera-btn"
              onClick={() => setScanning(true)}
            >
              📷 Buka Kamera
            </button>
          ) : (
            !popup && (
              <div className="scanner-wrapper">
                <Scanner
                  onScan={handleScan}
                  paused={!!popup || payLoading || loading}
                  constraints={{
                    facingMode: "environment",
                  }}
                />
              </div>
            )
          )}

          {loading && (
            <div className="loading-box">
              <div className="spinner" />
              <p>Memproses QR...</p>
            </div>
          )}

          <div className="manual-box">
            <span>Kamera bermasalah?</span>
            <Link href="/admin/scan/manual">Input manual</Link>
          </div>
        </div>
      </div>

      {/* ================= POPUP ================= */}
      {popup && (
        <div className="overlay">
          <div className="popup-card">
            <div className={popup.status === "lunas" ? "status-icon success" : "status-icon warning"}>
              {popup.status === "lunas" ? "✓" : "!"}
            </div>

            <p className="popup-mini">Periode {popup.tahunAktif}</p>

            <h2 className={popup.status === "lunas" ? "success-text" : "danger-text"}>
              {popup.status === "lunas"
                ? "Sudah Lunas"
                : `Tunggakan ${popup.tunggakan}x`}
            </h2>

            <div className="warga-info">
              <h3>{popup.nama}</h3>
              <span>{popup.kode ? `JTR-${popup.kode}` : "Data warga"}</span>
            </div>

            <div className="amount-box">
              <label>Nominal Bayar</label>

              <input
                type="number"
                step={IURAN_MINGGUAN}
                value={popup.jumlah}
                disabled={popup.status === "lunas" || payLoading}
                onChange={(e) => {
                  let val = Number(e.target.value);

                  if (val % IURAN_MINGGUAN !== 0) return;

                  if (val > popup.maxBayar) {
                    val = popup.maxBayar;
                  }

                  if (val < IURAN_MINGGUAN) {
                    val = IURAN_MINGGUAN;
                  }

                  setPopup({
                    ...popup,
                    jumlah: val,
                  });
                }}
              />

              {popup.status !== "lunas" && (
                <small>Maksimal {formatRupiah(popup.maxBayar)}</small>
              )}
            </div>

            <button
              type="button"
              onClick={handleBayar}
              disabled={popup.status === "lunas" || payLoading}
              className={popup.status === "lunas" ? "pay-btn disabled" : "pay-btn"}
            >
              {payLoading ? "Memproses..." : "Bayar Sekarang"}
            </button>

            <button
              type="button"
              onClick={handleClosePopup}
              disabled={payLoading}
              className="close-btn"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

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

        .back-btn,
        .scan-badge {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        .back-btn {
          font-size: 22px;
          cursor: pointer;
        }

        .scan-badge {
          font-size: 12px;
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

        .hero-card,
        .scanner-card {
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
          font-size: 25px;
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
          font-size: 26px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .petugas-box {
          margin-top: 14px;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .petugas-box p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .petugas-box strong {
          display: block;
          margin-top: 4px;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .petugas-box small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .scanner-card {
          margin-top: 14px;
          padding: 17px;
        }

        .camera-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(22, 119, 255, 0.22);
        }

        .scanner-wrapper {
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid #dbeafe;
          background: #111827;
        }

        .loading-box {
          margin-top: 12px;
          padding: 12px;
          border-radius: 17px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .loading-box p {
          margin: 0;
          color: #1677ff;
          font-size: 12px;
          font-weight: 900;
        }

        .spinner {
          width: 17px;
          height: 17px;
          border-radius: 999px;
          border: 3px solid #bfdbfe;
          border-top-color: #1677ff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .manual-box {
          margin-top: 14px;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }

        .manual-box span {
          color: #64748b;
          margin-right: 4px;
        }

        .manual-box a {
          color: #1677ff;
          text-decoration: none;
          font-weight: 900;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15, 23, 42, 0.62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .popup-card {
          width: 100%;
          max-width: 360px;
          background: #ffffff;
          border-radius: 28px;
          padding: 22px;
          text-align: center;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22);
        }

        .status-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
        }

        .status-icon.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-icon.warning {
          background: #fee2e2;
          color: #dc2626;
        }

        .popup-mini {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .popup-card h2 {
          margin: 6px 0 0;
          font-size: 22px;
          font-weight: 900;
        }

        .success-text {
          color: #16a34a;
        }

        .danger-text {
          color: #dc2626;
        }

        .warga-info {
          margin-top: 14px;
          padding: 13px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .warga-info h3 {
          margin: 0;
          color: #111827;
          font-size: 17px;
          font-weight: 900;
        }

        .warga-info span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .amount-box {
          margin-top: 14px;
          text-align: left;
        }

        .amount-box label {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .amount-box input {
          width: 100%;
          padding: 14px;
          border-radius: 17px;
          border: 1px solid #dbe4f0;
          background: #f9fbff;
          color: #111827;
          font-size: 15px;
          font-weight: 900;
          outline: none;
        }

        .amount-box small {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
        }

        .pay-btn,
        .close-btn {
          width: 100%;
          margin-top: 12px;
          padding: 14px;
          border: none;
          border-radius: 18px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .pay-btn {
          background: linear-gradient(180deg, #22c55e, #16a34a);
        }

        .pay-btn.disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .close-btn {
          background: linear-gradient(180deg, #111827, #1f2937);
        }
      `}</style>
    </>
  );
}
