"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

type PeriodeData = {
  tahun_aktif: number;
  updated_by_name?: string | null;
  updated_by_email?: string | null;
  updated_at?: string;
};

export default function PeriodePage() {
  const { data: session, status } = useSession();

  const role = (session?.user as any)?.role;
  const isMaster = role === "master";

  const tahunSekarang = new Date().getFullYear();

  const [data, setData] = useState<PeriodeData | null>(null);
  const [tahunAktif, setTahunAktif] = useState(tahunSekarang);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pilihanTahun = [
    tahunSekarang - 2,
    tahunSekarang - 1,
    tahunSekarang,
    tahunSekarang + 1,
    tahunSekarang + 2,
    tahunSekarang + 3,
  ];

  const fetchPeriode = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/periode", {
        cache: "no-store",
      });

      const result = await res.json();

      if (res.ok) {
        setData(result);
        setTahunAktif(Number(result.tahun_aktif) || tahunSekarang);
      } else {
        alert(result.message || "Gagal mengambil periode aktif");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengambil periode aktif");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchPeriode();
    }
  }, [status]);

  const handleSave = async () => {
    if (!isMaster) {
      alert("Hanya Master Admin yang boleh mengganti periode aktif");
      return;
    }

    const yakin = confirm(
      `Ubah periode aktif sistem menjadi ${tahunAktif}?\n\nData lama tidak akan dihapus. Sistem hanya mengubah tahun default yang dibaca oleh dashboard, target, dan laporan.`
    );

    if (!yakin) return;

    try {
      setSaving(true);

      const res = await fetch("/api/periode", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tahun_aktif: tahunAktif,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Periode aktif berhasil diperbarui");
        fetchPeriode();
      } else {
        alert(result.message || "Gagal memperbarui periode aktif");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan periode aktif");
    } finally {
      setSaving(false);
    }
  };

  const formatTanggal = (value?: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat sesi...</p>

        <style jsx>{loadingStyle}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="loading-page">
        <p>Silakan login terlebih dahulu.</p>

        <style jsx>{loadingStyle}</style>
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="blue-bg" />

        <div className="header">
          <button
            type="button"
            className="back-btn"
            onClick={() => (window.location.href = "/admin")}
          >
            ←
          </button>

          <div className="header-text">
            <p>Master Access</p>
            <h1>Kelola Periode</h1>
          </div>

          <div className="role-badge">{isMaster ? "Master" : "Petugas"}</div>
        </div>

        <div className="hero-card">
          <div>
            <p>Periode Aktif Saat Ini</p>

            <h2>{loading ? "..." : data?.tahun_aktif || tahunSekarang}</h2>

            <span>
              Digunakan sebagai tahun default untuk dashboard, target, dan
              laporan.
            </span>
          </div>

          <div className="calendar-icon">🗓️</div>
        </div>

        <div className="info-card">
          <div>ℹ️</div>

          <p>
            Mengganti periode tidak menghapus data lama. Transaksi tahun 2026
            tetap tersimpan, dan ketika periode diubah ke 2027 sistem hanya
            membaca data tahun 2027 sebagai tampilan default.
          </p>
        </div>

        <div className="form-card">
          <div className="section-title">
            <div>
              <p>Pengaturan</p>
              <h3>Ganti Tahun Aktif</h3>
            </div>
          </div>

          {!isMaster && (
            <div className="warning-box">
              Petugas hanya dapat melihat periode aktif. Perubahan periode hanya
              bisa dilakukan oleh Master Admin.
            </div>
          )}

          <label>Tahun Aktif</label>

          <select
            value={tahunAktif}
            onChange={(e) => setTahunAktif(Number(e.target.value))}
            disabled={!isMaster || loading}
          >
            {pilihanTahun.map((tahun) => (
              <option key={tahun} value={tahun}>
                {tahun}
              </option>
            ))}
          </select>

          <div className="quick-row">
            <button
              type="button"
              onClick={() => setTahunAktif(tahunSekarang)}
              disabled={!isMaster}
            >
              Tahun Ini
            </button>

            <button
              type="button"
              onClick={() => setTahunAktif(tahunSekarang + 1)}
              disabled={!isMaster}
            >
              Tahun Depan
            </button>
          </div>

          {isMaster && (
            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? "Menyimpan..." : "Simpan Periode Aktif"}
            </button>
          )}
        </div>

        <div className="detail-card">
          <div className="section-title">
            <div>
              <p>Riwayat Update</p>
              <h3>Informasi Terakhir</h3>
            </div>
          </div>

          <div className="detail-list">
            <div>
              <span>Terakhir Diubah Oleh</span>
              <strong>{data?.updated_by_name || "-"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{data?.updated_by_email || "-"}</strong>
            </div>

            <div>
              <span>Waktu Update</span>
              <strong>{formatTanggal(data?.updated_at)}</strong>
            </div>
          </div>
        </div>
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
    padding-bottom: 120px;
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
  }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .header-text p {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    font-weight: 800;
  }

  .header-text h1 {
    margin: 2px 0 0;
    font-size: 22px;
    color: #ffffff;
    font-weight: 900;
  }

  .role-badge {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .hero-card,
  .info-card,
  .form-card,
  .detail-card {
    position: relative;
    z-index: 2;
    margin-top: 16px;
    padding: 18px;
    border-radius: 24px;
    background: #ffffff;
    border: 1px solid rgba(226, 232, 240, 0.95);
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  }

  .hero-card {
    margin-top: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    box-shadow: 0 18px 40px rgba(37, 99, 235, 0.14);
  }

  .hero-card p {
    margin: 0;
    font-size: 13px;
    color: #1677ff;
    font-weight: 900;
  }

  .hero-card h2 {
    margin: 6px 0 0;
    font-size: 44px;
    color: #111827;
    font-weight: 900;
    letter-spacing: -1px;
  }

  .hero-card span {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: #64748b;
    font-weight: 700;
    line-height: 1.5;
  }

  .calendar-icon {
    width: 50px;
    height: 50px;
    border-radius: 18px;
    background: #eaf4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .info-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: #eff6ff;
    border-color: #dbeafe;
  }

  .info-card p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: #64748b;
    font-weight: 700;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
  }

  .section-title p {
    margin: 0;
    font-size: 11px;
    color: #64748b;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .section-title h3 {
    margin: 4px 0 0;
    font-size: 17px;
    color: #111827;
    font-weight: 900;
  }

  .warning-box {
    margin-bottom: 14px;
    padding: 12px;
    border-radius: 16px;
    background: #fff7ed;
    color: #c2410c;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 800;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #64748b;
    font-weight: 800;
  }

  select {
    width: 100%;
    border: 1px solid #dbe4f0;
    background: #f9fbff;
    color: #111827;
    border-radius: 15px;
    padding: 13px;
    outline: none;
    font-size: 14px;
    font-weight: 800;
  }

  .quick-row {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .quick-row button {
    border: none;
    padding: 10px 8px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1677ff;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .quick-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-btn {
    width: 100%;
    margin-top: 14px;
    padding: 15px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(180deg, #1677ff, #0f6fff);
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(22, 119, 255, 0.22);
  }

  .save-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .detail-list {
    display: grid;
    gap: 10px;
  }

  .detail-list div {
    padding: 12px;
    border-radius: 17px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
  }

  .detail-list span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
  }

  .detail-list strong {
    display: block;
    margin-top: 5px;
    color: #111827;
    font-size: 13px;
    font-weight: 900;
    word-break: break-word;
  }
`;
