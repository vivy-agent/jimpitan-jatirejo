"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type StrukData = {
  id: number;
  nama_warga: string;
  jumlah: number;
  tanggal: string;
  admin_name?: string | null;
  admin_email?: string | null;
};

export default function StrukPage() {
  const [data, setData] = useState<StrukData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useParams();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const formatTanggal = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/transaksi/${id}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (!res.ok) {
          setError(result.message || "Struk tidak ditemukan");
          setData(null);
          return;
        }

        setData(result);
      } catch (err) {
        console.error("Error fetch struk:", err);
        setError("Gagal memuat struk pembayaran");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSelesai = () => {
    window.location.href = "/admin";
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-card">
          <div className="spinner" />
          <h3>Memuat struk...</h3>
          <p>Mohon tunggu sebentar.</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #f4f8ff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .loading-card {
            width: 100%;
            max-width: 320px;
            background: #ffffff;
            border-radius: 24px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
          }

          .spinner {
            width: 36px;
            height: 36px;
            margin: 0 auto;
            border-radius: 999px;
            border: 4px solid #bfdbfe;
            border-top-color: #1677ff;
            animation: spin 0.8s linear infinite;
          }

          h3 {
            margin: 14px 0 0;
            color: #111827;
            font-size: 17px;
            font-weight: 900;
          }

          p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="loading-page">
        <div className="loading-card">
          <div className="error-icon">!</div>
          <h3>Struk tidak tersedia</h3>
          <p>{error || "Data transaksi tidak ditemukan."}</p>

          <button type="button" onClick={handleSelesai}>
            Kembali Dashboard
          </button>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #f4f8ff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .loading-card {
            width: 100%;
            max-width: 320px;
            background: #ffffff;
            border-radius: 24px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
          }

          .error-icon {
            width: 54px;
            height: 54px;
            margin: 0 auto;
            border-radius: 20px;
            background: #fee2e2;
            color: #dc2626;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            font-weight: 900;
          }

          h3 {
            margin: 14px 0 0;
            color: #111827;
            font-size: 17px;
            font-weight: 900;
          }

          p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }

          button {
            width: 100%;
            margin-top: 18px;
            padding: 14px;
            border: none;
            border-radius: 18px;
            background: linear-gradient(180deg, #111827, #1f2937);
            color: #ffffff;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="blue-bg" />

      <div className="receipt-card">
        <div className="success-icon">✓</div>

        <p className="mini-title">Pembayaran Berhasil</p>

        <h1>{formatRupiah(Number(data.jumlah || 0))}</h1>

        <p className="subtitle">
          Transaksi jimpitan berhasil dicatat oleh sistem.
        </p>

        <div className="divider" />

        <div className="detail-list">
          <div className="detail-row">
            <span>ID Transaksi</span>
            <strong>#{data.id}</strong>
          </div>

          <div className="detail-row">
            <span>Nama Warga</span>
            <strong>{data.nama_warga || "-"}</strong>
          </div>

          <div className="detail-row">
            <span>Petugas</span>
            <strong>{data.admin_name || "Petugas"}</strong>
          </div>

          <div className="detail-row">
            <span>Tanggal</span>
            <strong>{formatTanggal(data.tanggal)}</strong>
          </div>
        </div>

        <div className="note-box">
          <div>ℹ️</div>
          <p>
            Struk ini menjadi bukti bahwa pembayaran jimpitan warga telah
            tercatat pada sistem.
          </p>
        </div>

        <button type="button" onClick={handleSelesai} className="done-btn">
          Selesai
        </button>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 20px;
          background: #f4f8ff;
          background-image: radial-gradient(
            rgba(37, 99, 235, 0.05) 1px,
            transparent 1px
          );
          background-size: 18px 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          position: relative;
          overflow: hidden;
        }

        .blue-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 260px;
          background: linear-gradient(
            180deg,
            #0f6fff 0%,
            #1677ff 70%,
            rgba(22, 119, 255, 0.04) 100%
          );
          border-bottom-left-radius: 38px;
          border-bottom-right-radius: 38px;
          z-index: 0;
        }

        .receipt-card {
          width: 100%;
          max-width: 380px;
          position: relative;
          z-index: 2;
          background: #ffffff;
          border-radius: 30px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          padding: 24px;
          text-align: center;
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.13);
        }

        .success-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto;
          border-radius: 24px;
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          font-weight: 900;
        }

        .mini-title {
          margin: 16px 0 0;
          color: #16a34a;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        h1 {
          margin: 8px 0 0;
          color: #111827;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .subtitle {
          margin: 8px auto 0;
          max-width: 280px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          font-weight: 700;
        }

        .divider {
          margin: 20px 0;
          border-top: 1px dashed #cbd5e1;
        }

        .detail-list {
          display: grid;
          gap: 10px;
          text-align: left;
        }

        .detail-row {
          padding: 13px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .detail-row span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .detail-row strong {
          display: block;
          margin-top: 4px;
          color: #111827;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 900;
          word-break: break-word;
        }

        .note-box {
          margin-top: 14px;
          padding: 12px;
          border-radius: 17px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          text-align: left;
        }

        .note-box p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
          font-weight: 700;
        }

        .done-btn {
          width: 100%;
          margin-top: 16px;
          padding: 15px;
          border: none;
          border-radius: 19px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(22, 119, 255, 0.22);
        }
      `}</style>
    </div>
  );
}
