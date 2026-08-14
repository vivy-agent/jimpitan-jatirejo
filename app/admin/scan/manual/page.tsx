"use client";

import BottomNav from "@/components/BottomNav";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const IURAN_MINGGUAN = 2000;

/* =========================================================
   WRAPPER PAGE
========================================================= */

export default function ManualScanPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-page">
          Loading...
        </div>
      }
    >
      <ManualScanContent />
    </Suspense>
  );
}

/* =========================================================
   CONTENT
========================================================= */

function ManualScanContent() {
  const [kodeParts, setKodeParts] = useState(["", "", "", "", ""]);

  const [data, setData] = useState<any>(null);
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());

  const [tunggakan, setTunggakan] = useState(0);
  const [jumlah, setJumlah] = useState(IURAN_MINGGUAN);

  const [loadingCari, setLoadingCari] = useState(false);
  const [loadingBayar, setLoadingBayar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  // ================= RESET =================
  const resetForm = () => {
    setKodeParts(["", "", "", "", ""]);
    setData(null);
    setTunggakan(0);
    setJumlah(IURAN_MINGGUAN);
    setShowSuccess(false);

    setTimeout(() => {
      const first = document.getElementById("input-0") as HTMLInputElement | null;
      first?.focus();
    }, 100);
  };

  useEffect(() => {
    if (searchParams.get("refresh")) {
      resetForm();
    }
  }, [searchParams]);

  // ================= INPUT OTP =================
  const handleChange = (value: string, index: number) => {
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;

    const newKode = [...kodeParts];

    newKode[index] = value.toUpperCase();

    setKodeParts(newKode);

    const next = document.getElementById(`input-${index + 1}`);

    if (value && next) {
      (next as HTMLInputElement).focus();
    }
  };

  const handleBackspace = (value: string, index: number, key: string) => {
    if (key !== "Backspace") return;

    if (value) return;

    const prev = document.getElementById(`input-${index - 1}`);

    if (prev) {
      (prev as HTMLInputElement).focus();
    }
  };

  // ================= CARI =================
  const handleCari = async () => {
    const kodeManual = kodeParts.join("");

    if (kodeManual.length < 5) {
      alert("Kode belum lengkap");
      return;
    }

    const kode = `JTR-${kodeManual}`;

    try {
      setLoadingCari(true);
      setData(null);

      // Menggunakan endpoint scan agar logika periode dan tunggakan sama dengan scan kamera.
      const res = await fetch("/api/transaksi/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kode }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Warga tidak ditemukan");
        return;
      }

      const warga = result.warga;

      if (warga.status && warga.status !== "aktif") {
        alert("Warga ini sudah NONAKTIF");
        setData(null);
        return;
      }

      const tunggakanAktif = Number(result.tunggakan || 0);

      setData(warga);
      setTahunAktif(Number(result.tahun_aktif || new Date().getFullYear()));
      setTunggakan(tunggakanAktif);
      setJumlah(tunggakanAktif > 0 ? IURAN_MINGGUAN : IURAN_MINGGUAN);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mencari warga");
    } finally {
      setLoadingCari(false);
    }
  };

  // ================= BAYAR =================
  const handleBayar = async () => {
    if (!data) return;
    if (loadingBayar) return;

    if (!session?.user?.email) {
      alert("Session petugas tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (tunggakan === 0) {
      alert("Tidak ada tunggakan");
      return;
    }

    if (jumlah % IURAN_MINGGUAN !== 0) {
      alert("Nominal harus kelipatan Rp2.000");
      return;
    }

    if (jumlah > tunggakan * IURAN_MINGGUAN) {
      alert("Nominal melebihi tunggakan");
      return;
    }

    const confirmBayar = confirm(
      `Konfirmasi pembayaran ${formatRupiah(jumlah)} untuk ${data.nama}?`
    );

    if (!confirmBayar) return;

    try {
      setLoadingBayar(true);

      const res = await fetch("/api/transaksi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          nama: data.nama,
          jumlah,
          admin_email: session.user.email,
          admin_name: session.user.name,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Gagal menyimpan pembayaran");
        return;
      }

      localStorage.setItem("lastPaidWarga", data.nama);

      const audio = new Audio("/ting.mp3");
      audio.play().catch(() => {});

      setShowSuccess(true);

      setTimeout(() => {
        if (result?.data?.id) {
          window.location.href = `/admin/struk/${result.data.id}`;
        } else {
          window.location.href = "/admin/iuran";
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    } finally {
      setLoadingBayar(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="loading-page">
        Loading session...
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        {/* HEADER */}
        <div className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => (window.location.href = "/admin/scan")}
          >
            ←
          </button>

          <div className="header-text">
            <p>Backup Scanner</p>
            <h1>Input Manual</h1>
          </div>

          <div className="scan-badge">JTR</div>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-top">
            <div>
              <p className="mini-title">Kode Manual</p>
              <h2>Masukkan Kode Warga</h2>
              <span>
                Gunakan fitur ini jika kamera scanner mengalami kendala saat
                membaca QR warga.
              </span>
            </div>

            <div className="hero-icon">⌨</div>
          </div>

          <div className="petugas-box">
            <p>Petugas Login</p>
            <strong>{session?.user?.name || "Memuat petugas..."}</strong>
            <small>{session?.user?.email || "-"}</small>
          </div>
        </div>

        {/* INPUT CARD */}
        <div className="input-card">
          <div className="section-title">
            <div>
              <p>Kode Warga</p>
              <h3>Masukkan 5 karakter kode</h3>
            </div>
          </div>

          <div className="code-row">
            <div className="prefix-box">JTR</div>

            {kodeParts.map((item, index) => (
              <input
                key={index}
                id={`input-${index}`}
                maxLength={1}
                value={item}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleBackspace(item, index, e.key)}
                inputMode="text"
                autoComplete="off"
              />
            ))}
          </div>

          <p className="helper-text">Contoh kode: JTR-AB123</p>

          <button
            type="button"
            onClick={handleCari}
            disabled={loadingCari}
            className="search-btn"
          >
            {loadingCari ? "Mencari..." : "Cari Warga"}
          </button>
        </div>

        {/* RESULT */}
        {data && (
          <div className="result-card">
            <div className="result-top">
              <div>
                <p>Data Warga</p>
                <h3>{data.nama}</h3>
                <span>JTR-{data.kode_unik}</span>
              </div>

              <div className={tunggakan > 0 ? "status-pill danger" : "status-pill success"}>
                {tunggakan > 0 ? `${tunggakan}x` : "Lunas"}
              </div>
            </div>

            <div className="payment-grid">
              <div>
                <p>Periode</p>
                <strong>{tahunAktif}</strong>
              </div>

              <div>
                <p>Maksimal Bayar</p>
                <strong>{formatRupiah(tunggakan * IURAN_MINGGUAN)}</strong>
              </div>
            </div>

            {tunggakan > 0 ? (
              <>
                <div className="amount-box">
                  <label>Nominal Bayar</label>

                  <input
                    type="number"
                    step={IURAN_MINGGUAN}
                    value={jumlah}
                    disabled={loadingBayar}
                    onChange={(e) => {
                      let val = Number(e.target.value);

                      if (val % IURAN_MINGGUAN !== 0) return;

                      const maxBayar = tunggakan * IURAN_MINGGUAN;

                      if (val > maxBayar) val = maxBayar;
                      if (val < IURAN_MINGGUAN) val = IURAN_MINGGUAN;

                      setJumlah(val);
                    }}
                  />

                  <small>
                    Nominal harus kelipatan Rp2.000 dan tidak boleh melebihi
                    tunggakan.
                  </small>
                </div>

                <button
                  type="button"
                  className="pay-btn"
                  onClick={handleBayar}
                  disabled={loadingBayar}
                >
                  {loadingBayar ? "Memproses..." : "Bayar Sekarang"}
                </button>
              </>
            ) : (
              <div className="empty-box">
                <div>✓</div>
                <h4>Warga sudah lunas</h4>
                <p>Tidak ada tunggakan pada periode {tahunAktif}.</p>
              </div>
            )}

            <button type="button" className="reset-btn" onClick={resetForm}>
              Cari Kode Lain
            </button>
          </div>
        )}
      </div>

      {showSuccess && (
        <div className="overlay">
          <div className="success-card">
            <div>✓</div>
            <h3>Pembayaran Berhasil</h3>
            <p>Mengarahkan ke struk pembayaran...</p>
          </div>
        </div>
      )}

      <BottomNav />

      <style jsx>{`
        .loading-page {
          min-height: 100vh;
          background: #f4f8ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 14px;
          font-weight: 900;
        }

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
        .input-card,
        .result-card {
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

        .input-card,
        .result-card {
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

        .code-row {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .prefix-box {
          min-width: 52px;
          height: 50px;
          border-radius: 15px;
          background: #eff6ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .code-row input {
          width: 46px;
          min-width: 46px;
          height: 50px;
          border-radius: 15px;
          border: 1.5px solid #dbeafe;
          background: #ffffff;
          color: #111827;
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          outline: none;
          flex-shrink: 0;
        }

        .helper-text {
          margin: 10px 0 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .search-btn,
        .pay-btn,
        .reset-btn {
          width: 100%;
          margin-top: 14px;
          padding: 14px;
          border: none;
          border-radius: 18px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .search-btn {
          background: linear-gradient(180deg, #1677ff, #0f6fff);
        }

        .search-btn:disabled,
        .pay-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .result-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .result-top p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .result-top h3 {
          margin: 4px 0 0;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.3;
        }

        .result-top span {
          display: inline-flex;
          margin-top: 6px;
          color: #1677ff;
          background: #eff6ff;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
        }

        .status-pill {
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-pill.danger {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-pill.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .payment-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .payment-grid div,
        .empty-box {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .payment-grid p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .payment-grid strong {
          display: block;
          margin-top: 5px;
          color: #111827;
          font-size: 13px;
          font-weight: 900;
        }

        .amount-box {
          margin-top: 14px;
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
          line-height: 1.5;
        }

        .pay-btn {
          background: linear-gradient(180deg, #22c55e, #16a34a);
        }

        .reset-btn {
          background: linear-gradient(180deg, #111827, #1f2937);
        }

        .empty-box {
          margin-top: 14px;
          text-align: center;
        }

        .empty-box div {
          width: 42px;
          height: 42px;
          margin: 0 auto;
          border-radius: 16px;
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
        }

        .empty-box h4 {
          margin: 8px 0 0;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .empty-box p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
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

        .success-card {
          width: 100%;
          max-width: 320px;
          background: #ffffff;
          border-radius: 28px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22);
        }

        .success-card div {
          width: 58px;
          height: 58px;
          margin: 0 auto;
          border-radius: 22px;
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
        }

        .success-card h3 {
          margin: 12px 0 0;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
        }

        .success-card p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }
      `}</style>
    </>
  );
}
