"use client";

import { useEffect, useState } from "react";

type TargetData = {
  target: number;
  terkumpul: number;
  persen: number;
};

export default function TargetCard() {
  const [data, setData] = useState<TargetData | null>(null);

  useEffect(() => {
    fetch("/api/admin/target")
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch(() => setData(null));
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka || 0);
  };

  const target = Number(data?.target || 0);
  const terkumpul = Number(data?.terkumpul || 0);
  const persenAsli = Number(data?.persen || 0);
  const persenBar = Math.min(Math.max(persenAsli, 0), 100);
  const sisaTarget = Math.max(target - terkumpul, 0);

  return (
    <div className="target-card">
      <div className="target-header">
        <div>
          <p>Target Tahunan</p>
          <h3>Progress Iuran</h3>
        </div>

        <button type="button" onClick={() => (window.location.href = "/admin/report")}>
          Report
        </button>
      </div>

      {!data ? (
        <div className="target-loading">
          <div>⏳</div>
          <p>Memuat target...</p>
        </div>
      ) : (
        <>
          <div className="target-main">
            <div>
              <p>Terkumpul</p>
              <h2>{formatRupiah(terkumpul)}</h2>
            </div>

            <div className="percent-badge">{persenAsli}%</div>
          </div>

          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${persenBar}%` }} />
          </div>

          <div className="target-grid">
            <div>
              <span>Target</span>
              <strong>{formatRupiah(target)}</strong>
            </div>

            <div>
              <span>Sisa</span>
              <strong>{formatRupiah(sisaTarget)}</strong>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .target-card {
          position: relative;
          z-index: 2;
          margin-top: 14px;
          padding: 17px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }

        .target-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .target-header p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .target-header h3 {
          margin: 4px 0 0;
          font-size: 17px;
          color: #111827;
          font-weight: 900;
        }

        .target-header button {
          border: none;
          border-radius: 999px;
          padding: 8px 11px;
          background: #eff6ff;
          color: #1677ff;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .target-loading {
          margin-top: 14px;
          padding: 20px 12px;
          border-radius: 18px;
          background: #f8fafc;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .target-loading p {
          margin: 6px 0 0;
        }

        .target-main {
          margin-top: 15px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .target-main p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
        }

        .target-main h2 {
          margin: 5px 0 0;
          font-size: 24px;
          color: #111827;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .percent-badge {
          min-width: 58px;
          height: 38px;
          padding: 0 10px;
          border-radius: 15px;
          background: linear-gradient(180deg, #1677ff, #0f6fff);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 10px 24px rgba(22, 119, 255, 0.22);
        }

        .progress-bg {
          margin-top: 14px;
          height: 10px;
          background: #e8eefb;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 10px;
          background: linear-gradient(90deg, #1677ff, #38bdf8);
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .target-grid {
          margin-top: 13px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .target-grid div {
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .target-grid span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .target-grid strong {
          display: block;
          margin-top: 5px;
          color: #111827;
          font-size: 13px;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
